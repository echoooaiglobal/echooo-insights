// File: background.js
// Background service worker for Echo Outreach Agent Extension - Simplified Version

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

        // Message handling
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleMessage(message, sender, sendResponse);
            return true; // Keep message channel open for async response
        });

        // Tab updates - monitor for user login/registration
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            this.handleTabUpdate(tabId, changeInfo, tab);
        });
    }

    async handleInstallation(details) {
        if (details.reason === 'install') {
            console.log('Extension installed');
            
            // Open registration page
            chrome.tabs.create({
                url: `${this.frontendUrl}/register?source=extension_install`,
                active: true
            });
        } else if (details.reason === 'update') {
            console.log('Extension updated from version:', details.previousVersion);
        }
    }

    async handleMessage(message, sender, sendResponse) {
        console.log('Background received message:', message);

        try {
            switch (message.type) {
                case 'FETCH_CAMPAIGNS':
                    const campaigns = await this.fetchCampaigns(message.token);
                    sendResponse({ success: true, data: campaigns });
                    break;

                case 'GET_USER_DATA':
                    const userData = await this.getUserDataFromStorage();
                    sendResponse({ success: true, data: userData });
                    break;

                case 'UPDATE_BADGE':
                    await this.updateBadge(message.text);
                    sendResponse({ success: true });
                    break;

                case 'OPEN_DASHBOARD':
                    chrome.tabs.create({ url: this.frontendUrl });
                    sendResponse({ success: true });
                    break;

                case 'PROFILE_DETECTED':
                    console.log('Profile detected:', message.data);
                    sendResponse({ success: true });
                    break;

                default:
                    sendResponse({ success: false, error: 'Unknown message type' });
            }
        } catch (error) {
            console.error('Message handling error:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    async handleTabUpdate(tabId, changeInfo, tab) {
        if (changeInfo.status === 'complete' && tab.url) {
            // Monitor for user reaching dashboard (indicates successful login)
            if (tab.url.includes(this.frontendUrl) && tab.url.includes('/dashboard')) {
                console.log('User reached dashboard - updating badge');
                this.updateBadge('✓');
            }
        }
    }

    async fetchCampaigns(token) {
        try {
            if (!token) {
                throw new Error('No JWT token provided');
            }

            // Use exact API endpoint as specified
            const response = await fetch('http://localhost:8000/api/v0/campaigns', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('Background: Campaigns API response status:', response.status);

            if (response.ok) {
                const data = await response.json();
                console.log('Background: Campaigns API response:', data);
                
                // Handle different possible response structures
                return data.campaigns || data.data?.campaigns || data.data || [];
            } else {
                const errorText = await response.text();
                console.error('Background: Campaigns API error:', response.status, errorText);
                throw new Error(`API responded with status: ${response.status}`);
            }
        } catch (error) {
            console.error('Background: Failed to fetch campaigns:', error);
            throw error;
        }
    }

    async getUserDataFromStorage() {
        try {
            // Get current active tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (tab && tab.url && tab.url.startsWith(this.frontendUrl)) {
                const results = await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    function: () => {
                        // Get user data from localStorage - stored with key 'user' in array format
                        let userData = null;
                        try {
                            // Use 'user' as the primary key (as specified)
                            const userDataStr = localStorage.getItem('user');
                            if (userDataStr) {
                                const parsed = JSON.parse(userDataStr);
                                
                                // Data is in array format, take the first element
                                if (Array.isArray(parsed) && parsed.length > 0) {
                                    userData = parsed[0];
                                    console.log('Background: Found user data as array with key "user"');
                                } 
                                // If it's an object, use it directly
                                else if (parsed && typeof parsed === 'object') {
                                    userData = parsed;
                                    console.log('Background: Found user data as object with key "user"');
                                }
                            }
                            
                            // Fallback to other possible keys if 'user' key doesn't exist
                            if (!userData) {
                                const fallbackKeys = ['userData', 'loggedInUser', 'currentUser'];
                                
                                for (const key of fallbackKeys) {
                                    const userDataStr = localStorage.getItem(key);
                                    if (userDataStr) {
                                        const parsed = JSON.parse(userDataStr);
                                        
                                        if (Array.isArray(parsed) && parsed.length > 0) {
                                            userData = parsed[0];
                                            console.log(`Background: Found user data with fallback key "${key}"`);
                                            break;
                                        } 
                                        else if (parsed && typeof parsed === 'object') {
                                            userData = parsed;
                                            console.log(`Background: Found user data with fallback key "${key}"`);
                                            break;
                                        }
                                    }
                                }
                            }
                        } catch (e) {
                            console.log('Background: Could not parse user data:', e);
                        }
                        
                        return userData;
                    }
                });
                
                return results && results[0] && results[0].result;
            }
        } catch (error) {
            console.error('Failed to get user data from storage:', error);
        }
        
        return null;
    }

    async updateBadge(text = '') {
        try {
            await chrome.action.setBadgeText({ text: text });
            await chrome.action.setBadgeBackgroundColor({ color: '#667eea' });
        } catch (error) {
            console.error('Failed to update badge:', error);
        }
    }

    showWelcomeNotification() {
        if (chrome.notifications) {
            chrome.notifications.create('welcome', {
                type: 'basic',
                iconUrl: 'icons/echooo-favicon-white-48x48.png',
                title: 'Echo Outreach Agent',
                message: 'Extension installed successfully! Please register to get started.'
            });
        }
    }
}

// Initialize background service worker
new EchoExtensionBackground();