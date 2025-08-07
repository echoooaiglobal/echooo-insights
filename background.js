// Background service worker for Echo Outreach Agent Extension
class EchoExtensionBackground {
    constructor() {
        this.apiBaseUrl = 'http://localhost:8000/api/v0';
        this.frontendUrl = 'http://localhost:3000';
        
        this.init();
    }

    init() {
        console.log('Echo Extension Background Service Worker started');
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Initialize extension badge
        this.updateBadge();
    }

    setupEventListeners() {
        // Extension installation
        chrome.runtime.onInstalled.addListener((details) => {
            this.handleInstallation(details);
        });

        // Extension startup
        chrome.runtime.onStartup.addListener(() => {
            console.log('Extension started');
            this.updateBadge();
        });

        // Message handling - Single listener for all messages
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            // Handle JWT detection messages
            if (message.type === 'AUTH_DATA_DETECTED') {
                this.handleJWTDetection(message.data);
                sendResponse({ success: true });
                return true;
            }
            
            // Handle other messages
            this.handleMessage(message, sender, sendResponse);
            return true; // Keep message channel open for async response
        });

        // Tab updates - monitor for registration completion and JWT tokens
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            this.handleTabUpdate(tabId, changeInfo, tab);
        });

        // Web request handling for API calls
        this.setupApiInterceptors();
    }

    // ADD THE MISSING handleJWTDetection FUNCTION
    async handleJWTDetection(data) {
        try {
            console.log('JWT token detected:', { 
                hasToken: !!data.token, 
                email: data.email, 
                source: data.source 
            });

            if (data.token) {
                // Save the auth data
                await this.saveAuthData({
                    accessToken: data.token,
                    userEmail: data.email,
                    registrationComplete: true,
                    source: data.source
                });

                // Fetch and store user details
                if (data.token) {
                    await this.fetchAndStoreUserDetails(data.token);
                }

                // Update badge to show authenticated state
                this.updateBadge('✓');

                // Notify popup if it's open
                chrome.runtime.sendMessage({ 
                    type: 'USER_REGISTERED',
                    data: { token: data.token, email: data.email }
                }).catch(() => {
                    // Popup might not be open, that's okay
                    console.log('Popup not available to notify');
                });

                console.log('JWT detection handled successfully');
            }
        } catch (error) {
            console.error('Error handling JWT detection:', error);
        }
    }

    handleInstallation(details) {
        console.log('Extension installed:', details);
        
        if (details.reason === 'install') {
            // First time installation
            this.showWelcomeNotification();
            
            // Clear any existing data
            chrome.storage.local.clear();
            
            // Open registration page
            chrome.tabs.create({
                url: `${this.frontendUrl}/register?source=extension_install`,
                active: true
            });
        } else if (details.reason === 'update') {
            console.log('Extension updated from version:', details.previousVersion);
            // Handle updates if needed
        }
    }

    async handleMessage(message, sender, sendResponse) {
        console.log('Background received message:', message);

        try {
            switch (message.type) {
                case 'CHECK_AUTH':
                    const authStatus = await this.checkAuthStatus();
                    sendResponse({ success: true, data: authStatus });
                    break;

                case 'SAVE_AUTH_DATA':
                    await this.saveAuthData(message.data);
                    sendResponse({ success: true });
                    break;

                case 'FETCH_CATEGORIES':
                    const categories = await this.fetchCategories();
                    sendResponse({ success: true, data: categories });
                    break;

                case 'FETCH_USER_DETAILS':
                    const userDetails = await this.fetchUserDetails(message.token);
                    sendResponse({ success: true, data: userDetails });
                    break;

                case 'UPDATE_BADGE':
                    await this.updateBadge(message.count);
                    sendResponse({ success: true });
                    break;

                case 'LOGOUT':
                    await this.handleLogout();
                    sendResponse({ success: true });
                    break;

                default:
                    console.log('Unknown message type:', message.type);
                    sendResponse({ success: false, error: 'Unknown message type' });
            }
        } catch (error) {
            console.error('Error handling message:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    handleTabUpdate(tabId, changeInfo, tab) {
        // Monitor for registration completion and JWT token presence
        if (changeInfo.status === 'complete' && tab.url) {
            if (tab.url.includes(`${this.frontendUrl}/dashboard`) || 
                tab.url.includes(`${this.frontendUrl}/campaigns`) ||
                tab.url.includes(`${this.frontendUrl}/profile`)) {
                
                // User might have completed registration, check for JWT in URL or page
                this.checkRegistrationCompletion(tab.url);
                
                // Also inject script to check localStorage for JWT
                this.checkLocalStorageJWT(tabId);
            }
        }
    }

    async checkLocalStorageJWT(tabId) {
        try {
            const result = await chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: () => {
                    const jwtKeys = ['accessToken', 'authToken', 'token', 'jwt', 'access_token'];
                    const emailKeys = ['userEmail', 'email', 'user_email'];
                    
                    let foundToken = null;
                    let foundEmail = null;
                    
                    for (const key of jwtKeys) {
                        const token = localStorage.getItem(key);
                        if (token) {
                            foundToken = token;
                            break;
                        }
                    }
                    
                    for (const key of emailKeys) {
                        const email = localStorage.getItem(key);
                        if (email) {
                            foundEmail = email;
                            break;
                        }
                    }
                    
                    return { token: foundToken, email: foundEmail };
                }
            });

            const authData = result[0]?.result;
            if (authData?.token) {
                console.log('JWT found in localStorage during tab update');
                await this.handleJWTDetection({
                    ...authData,
                    source: 'tab_update_check'
                });
            }
        } catch (error) {
            console.log('Could not check localStorage for JWT:', error);
        }
    }

    async checkRegistrationCompletion(url) {
        try {
            // Extract any auth tokens from URL params if present
            const urlParams = new URLSearchParams(url.split('?')[1]);
            const token = urlParams.get('token');
            const email = urlParams.get('email');

            if (token && email) {
                // Save auth data with registration complete flag
                await this.saveAuthData({ 
                    accessToken: token, 
                    userEmail: email,
                    registrationComplete: true 
                });
                
                // Fetch and store user details immediately
                await this.fetchAndStoreUserDetails(token);
                
                // Notify popup to refresh
                chrome.runtime.sendMessage({ type: 'USER_REGISTERED' });
                
                // Update badge
                this.updateBadge('✓');
                
                this.showSuccessNotification();
            }
        } catch (error) {
            console.error('Error checking registration completion:', error);
        }
    }

    async fetchAndStoreUserDetails(token) {
        try {
            // Use auth/me to get ONLY logged-in user details
            const response = await fetch(`${this.apiBaseUrl}/auth/me`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const userData = await response.json();
                console.log('Logged-in user details fetched in background:', userData);
                
                // Store user details
                await chrome.storage.local.set({ 
                    userDetails: userData,
                    userEmail: userData.email || (await this.getStoredData()).userEmail
                });
            }
        } catch (error) {
            console.error('Failed to fetch user details in background:', error);
        }
    }

    async checkAuthStatus() {
        try {
            const stored = await this.getStoredData();
            
            if (stored.accessToken) {
                // Validate token with backend
                const response = await fetch(`${this.apiBaseUrl}/auth/me`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${stored.accessToken}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (response.ok) {
                    const userData = await response.json();
                    return { isAuthenticated: true, user: userData };
                } else {
                    // Token invalid, clear storage
                    await chrome.storage.local.clear();
                    return { isAuthenticated: false };
                }
            }

            return { isAuthenticated: false };
        } catch (error) {
            console.error('Auth check failed:', error);
            return { isAuthenticated: false, error: error.message };
        }
    }

    async fetchCategories() {
        try {
            const stored = await this.getStoredData();
            const headers = { 'Content-Type': 'application/json' };
            
            if (stored.accessToken) {
                headers['Authorization'] = `Bearer ${stored.accessToken}`;
            }

            const response = await fetch(`${this.apiBaseUrl}/categories/`, {
                method: 'GET',
                headers: headers
            });

            if (response.ok) {
                const data = await response.json();
                return Array.isArray(data) ? data : data.items || [];
            } else {
                throw new Error(`API responded with status: ${response.status}`);
            }
        } catch (error) {
            console.error('Failed to fetch categories:', error);
            throw error;
        }
    }

    async saveAuthData(authData) {
        try {
            await chrome.storage.local.set(authData);
            console.log('Auth data saved:', authData);
            
            // Update badge to show authenticated state
            this.updateBadge('✓');
        } catch (error) {
            console.error('Failed to save auth data:', error);
            throw error;
        }
    }

    async handleLogout() {
        try {
            // Clear storage
            await chrome.storage.local.clear();
            
            // Update badge
            this.updateBadge('');
            
            console.log('User logged out');
        } catch (error) {
            console.error('Logout failed:', error);
            throw error;
        }
    }

    async updateBadge(text = '') {
        try {
            if (text === '') {
                // Check if user is authenticated
                const stored = await this.getStoredData();
                text = stored.accessToken ? '✓' : '';
            }

            await chrome.action.setBadgeText({ text: text });
            await chrome.action.setBadgeBackgroundColor({ color: '#667eea' });
        } catch (error) {
            console.error('Failed to update badge:', error);
        }
    }

    setupApiInterceptors() {
        // Monitor network requests to detect API calls
        if (chrome.webRequest) {
            chrome.webRequest.onCompleted.addListener(
                (details) => {
                    if (details.url.includes(this.apiBaseUrl)) {
                        console.log('API call completed:', details.url, details.statusCode);
                    }
                },
                { urls: [`${this.apiBaseUrl}/*`] }
            );
        }
    }

    showWelcomeNotification() {
        if (chrome.notifications) {
            chrome.notifications.create('welcome', {
                type: 'basic',
                iconUrl: 'icons/icon48.png',
                title: 'Echo Outreach Agent',
                message: 'Extension installed successfully! Please register to get started.'
            });
        }
    }

    showSuccessNotification() {
        if (chrome.notifications) {
            chrome.notifications.create('success', {
                type: 'basic',
                iconUrl: 'icons/icon48.png',
                title: 'Registration Complete',
                message: 'You can now use the Echo Outreach Agent extension!'
            });
        }
    }

    async fetchUserDetails(token) {
        try {
            // Use auth/me to get ONLY logged-in user details
            const response = await fetch(`${this.apiBaseUrl}/auth/me`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const userData = await response.json();
                return userData;
            } else {
                throw new Error(`API responded with status: ${response.status}`);
            }
        } catch (error) {
            console.error('Failed to fetch user details:', error);
            throw error;
        }
    }

    // Storage helpers
    async getStoredData() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['accessToken', 'userEmail', 'userDetails', 'registrationComplete'], (result) => {
                resolve(result);
            });
        });
    }
}

// Initialize background service worker
new EchoExtensionBackground();

// Simple periodic check - only for keeping auth status updated
setInterval(async () => {
    try {
        const background = new EchoExtensionBackground();
        const authStatus = await background.checkAuthStatus();
        
        if (authStatus.isAuthenticated) {
            console.log('User still authenticated - periodic check');
        }
    } catch (error) {
        console.error('Periodic auth check failed:', error);
    }
}, 10 * 60 * 1000); // Every 10 minutes - just auth check