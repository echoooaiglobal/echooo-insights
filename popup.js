// Popup script for Echo Outreach Agent Extension
class EchoExtensionPopup {
    constructor() {
        this.apiBaseUrl = 'http://localhost:8000/api/v0';
        this.frontendUrl = 'http://localhost:3000';
        this.isRegistered = false;
        this.userData = null;
        this.categoriesData = [];
        
        this.init();
    }

    async init() {
        console.log('Echo Extension Popup initialized');
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Check authentication status
        await this.checkAuthStatus();
        
        // Get current page info
        await this.getCurrentPageInfo();
    }

    setupEventListeners() {
        // Register button
        const registerBtn = document.getElementById('register-btn');
        if (registerBtn) {
            registerBtn.addEventListener('click', () => this.handleRegistration());
        }

        // REMOVED: Open dashboard button event listener
        // REMOVED: Logout button event listener

        // Retry button
        const retryBtn = document.getElementById('retry-btn');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => this.checkAuthStatus());
        }
    }

    async checkAuthStatus() {
        console.log('Checking authentication status...');
        this.showSection('loading');

        try {
            // Check if user data exists in Chrome storage
            const stored = await this.getStoredData();
            console.log('Stored extension data:', stored);

            // Also check browser localStorage for JWT token (from your frontend)
            const localJWT = await this.getLocalStorageToken();
            console.log('Local storage JWT found:', !!localJWT);

            // Determine which token to use
            const tokenToUse = stored.accessToken || localJWT;
            const emailToUse = stored.userEmail || await this.getLocalStorageEmail();

            if (tokenToUse) {
                console.log('Token found, validating...');
                
                // Validate token with backend
                const validationResult = await this.validateToken(tokenToUse);
                
                if (validationResult.isValid) {
                    // Token is valid, setup user session
                    this.isRegistered = true;
                    this.userData = {
                        accessToken: tokenToUse,
                        userEmail: emailToUse || validationResult.userData?.email,
                        userDetails: validationResult.userData
                    };

                    // Save to extension storage if not already saved
                    if (!stored.accessToken || stored.accessToken !== tokenToUse) {
                        await this.saveToStorage(this.userData);
                    }

                    // Load dashboard
                    await this.loadDashboardData();
                    this.showSection('dashboard');
                    
                    console.log('User authenticated successfully');
                } else {
                    // Token invalid, clear all storage and show registration
                    await this.clearAllStorage();
                    this.showRegistrationRequired();
                }
            } else {
                // No token found anywhere, show registration
                console.log('No authentication token found');
                this.showRegistrationRequired();
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            this.showError('Authentication check failed. Please try again.');
        }
    }

    async getLocalStorageToken() {
        try {
            // Inject script to get localStorage from the current tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (tab && tab.url.includes('localhost:3000')) {
                const result = await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: () => {
                        // Common JWT storage keys your frontend might use
                        return localStorage.getItem('accessToken') || 
                               localStorage.getItem('authToken') || 
                               localStorage.getItem('token') ||
                               localStorage.getItem('jwt') ||
                               localStorage.getItem('access_token');
                    }
                });
                
                return result[0]?.result || null;
            }
        } catch (error) {
            console.log('Could not access localStorage from current tab:', error);
        }
        return null;
    }

    async getLocalStorageEmail() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (tab && tab.url.includes('localhost:3000')) {
                const result = await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: () => {
                        return localStorage.getItem('userEmail') || 
                               localStorage.getItem('email') ||
                               localStorage.getItem('user_email');
                    }
                });
                
                return result[0]?.result || null;
            }
        } catch (error) {
            console.log('Could not access email from localStorage:', error);
        }
        return null;
    }

    async validateToken(token) {
        try {
            console.log('🔍 Validating token with /auth/me endpoint...');
            
            // Use auth/me endpoint to get ONLY logged-in user details
            const authResponse = await fetch(`${this.apiBaseUrl}/auth/me`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (authResponse.ok) {
                const userData = await authResponse.json();
                console.log('✅ Token validation successful!');
                console.log('✅ User data from token validation:', userData);
                return {
                    isValid: true,
                    userData: userData
                };
            }

            console.log('❌ Token validation failed - invalid token');
            return { isValid: false };

        } catch (error) {
            console.error('❌ Token validation failed:', error);
            return { isValid: false };
        }
    }

    async loadDashboardData() {
        try {
            // Load categories data
            await this.loadCategories();
            
            // Load user details if not already loaded
            if (!this.userData.userDetails) {
                await this.loadUserDetails();
            }
            
            // Update stats and user info
            this.updateStats();
            this.updateUserInfo(); // This will display the user name
            
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
            this.showError('Failed to load data from backend');
        }
    }

    async loadUserDetails() {
        try {
            const token = this.userData?.accessToken;
            if (!token) return;

            console.log('🔑 Loading logged-in user details from /auth/me...');
            
            // Use auth/me endpoint to get ONLY current user's details
            const response = await fetch(`${this.apiBaseUrl}/auth/me`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const userData = await response.json();
                console.log('🎉 API Response - Logged-in user details:', userData);
                console.log('🎉 User Name Fields Available:');
                console.log('   full_name:', userData.full_name);
                console.log('   name:', userData.name);
                console.log('   first_name:', userData.first_name);
                console.log('   email:', userData.email);
                
                // Store the current user's details
                this.userData.userDetails = userData;
                
                // Update stored email if we got better info
                if (userData.email) {
                    this.userData.userEmail = userData.email;
                    await this.saveToStorage(this.userData);
                }
                
            } else {
                console.error('❌ Failed to load user details. Status:', response.status);
                console.error('❌ Response:', await response.text());
            }
        } catch (error) {
            console.error('❌ Error loading user details:', error);
        }
    }

    async loadCategories() {
        try {
            console.log('Loading categories from API...');
            
            const token = this.userData?.accessToken;
            const headers = {
                'Content-Type': 'application/json'
            };
            
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(`${this.apiBaseUrl}/categories/`, {
                method: 'GET',
                headers: headers
            });

            if (response.ok) {
                const data = await response.json();
                this.categoriesData = Array.isArray(data) ? data : data.items || [];
                this.renderCategories();
                console.log('Categories loaded:', this.categoriesData);
            } else {
                throw new Error(`API responded with status: ${response.status}`);
            }
        } catch (error) {
            console.error('Failed to load categories:', error);
            // Show fallback message
            const categoriesList = document.getElementById('categories-list');
            if (categoriesList) {
                categoriesList.innerHTML = '<div class="category-item">Unable to load categories</div>';
            }
        }
    }

    renderCategories() {
        const categoriesList = document.getElementById('categories-list');
        if (!categoriesList) return;

        if (this.categoriesData.length === 0) {
            categoriesList.innerHTML = '<div class="category-item">No categories available</div>';
            return;
        }

        categoriesList.innerHTML = this.categoriesData.map(category => `
            <div class="category-item">
                <span class="category-name">${category.name || 'Unnamed Category'}</span>
                <span class="category-count">${category.count || '0'}</span>
            </div>
        `).join('');
    }

    updateStats() {
        const activeCampaigns = document.getElementById('active-campaigns');
        const categoriesCount = document.getElementById('categories-count');

        if (activeCampaigns) {
            // You can get this from your campaigns API
            activeCampaigns.textContent = this.userData?.activeCampaigns || '0';
        }

        if (categoriesCount) {
            categoriesCount.textContent = this.categoriesData.length;
        }
    }

    showRegistrationRequired() {
        this.isRegistered = false;
        this.showSection('registration-required');
        
        // Add additional message for popup access restriction
        const registrationSection = document.getElementById('registration-required');
        if (registrationSection) {
            const existingMessage = registrationSection.querySelector('.access-restriction-message');
            if (!existingMessage) {
                const restrictionMessage = document.createElement('div');
                restrictionMessage.className = 'access-restriction-message';
                restrictionMessage.innerHTML = `
                    <div class="restriction-notice">
                        <strong>🔒 Access Restricted</strong>
                        <p>This extension requires authentication. Please complete registration to access features.</p>
                    </div>
                `;
                
                // Insert after the welcome message
                const welcomeText = registrationSection.querySelector('p');
                if (welcomeText) {
                    welcomeText.after(restrictionMessage);
                }
            }
        }
    }

    async handleRegistration() {
        console.log('Redirecting to registration...');
        
        try {
            // Open registration page in new tab
            await chrome.tabs.create({
                url: `${this.frontendUrl}/register?source=extension`,
                active: true
            });

            // Close the popup
            window.close();
        } catch (error) {
            console.error('Failed to open registration:', error);
            this.showError('Failed to open registration page');
        }
    }

    // REMOVED: openDashboard function
    // REMOVED: handleLogout function

    async refreshData() {
        console.log('Refreshing categories...');
        try {
            await this.loadCategories();
            console.log('Categories refreshed successfully');
        } catch (error) {
            console.error('Failed to refresh categories:', error);
            this.showError('Failed to refresh categories');
        }
    }

    async getCurrentPageInfo() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (tab) {
                document.getElementById('current-url').textContent = tab.url || 'Unknown';
                document.getElementById('current-title').textContent = tab.title || 'Unknown';
                
                // Detect social media platforms
                this.detectSocialPlatforms(tab.url);
                
                // Show page analysis section
                this.showPageAnalysis();
            }
        } catch (error) {
            console.error('Failed to get current page info:', error);
        }
    }

    detectSocialPlatforms(url) {
        const socialPlatforms = [
            { name: 'Instagram', pattern: /instagram\.com/i },
            { name: 'Twitter/X', pattern: /(twitter\.com|x\.com)/i },
            { name: 'LinkedIn', pattern: /linkedin\.com/i },
            { name: 'TikTok', pattern: /tiktok\.com/i },
            { name: 'YouTube', pattern: /youtube\.com/i },
            { name: 'Facebook', pattern: /facebook\.com/i }
        ];

        const detected = socialPlatforms.filter(platform => platform.pattern.test(url));
        
        const socialDetection = document.getElementById('social-detection');
        if (socialDetection) {
            if (detected.length > 0) {
                socialDetection.innerHTML = `
                    <strong>Detected Platforms:</strong><br>
                    ${detected.map(p => `<span class="social-platform">${p.name}</span>`).join('')}
                `;
            } else {
                socialDetection.innerHTML = '<span style="color: #666;">No social media platforms detected</span>';
            }
        }
    }

    showPageAnalysis() {
        const pageAnalysis = document.getElementById('page-analysis');
        if (pageAnalysis) {
            pageAnalysis.classList.remove('hidden');
        }
    }

    showSection(sectionId) {
        // Hide all sections
        const sections = ['loading', 'registration-required', 'dashboard', 'error-state'];
        sections.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.classList.add('hidden');
            }
        });

        // Show requested section
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.remove('hidden');
        }
    }

    showError(message) {
        const errorMessage = document.getElementById('error-message');
        if (errorMessage) {
            errorMessage.textContent = message;
        }
        this.showSection('error-state');
    }

    updateUserInfo() {
        const userEmail = document.getElementById('user-email');
        const userFullName = document.getElementById('user-full-name'); // This element exists in the HTML
        const userDetails = this.userData?.userDetails;
        
        // Update the user full name display
        if (userFullName) {
            if (userDetails) {
                const displayName = userDetails.full_name || 
                                  userDetails.name || 
                                  userDetails.user?.full_name || 
                                  userDetails.user?.name || 
                                  this.userData.userEmail || 
                                  'User';
                
                userFullName.textContent = displayName;
            } else {
                userFullName.textContent = this.userData.userEmail || 'User';
            }
        }

        // If user email element exists, update it too
        if (userEmail) {
            if (userDetails) {
                // Display user details from API
                const displayName = userDetails.full_name || 
                                  userDetails.name || 
                                  userDetails.user?.full_name || 
                                  userDetails.user?.name || 
                                  this.userData.userEmail || 
                                  'User';
                
                const email = userDetails.email || 
                            userDetails.user?.email || 
                            this.userData.userEmail || 
                            'No email';

                // Create detailed user info display
                userEmail.innerHTML = `
                    <div class="user-details">
                        <div class="user-name">${displayName}</div>
                        <div class="user-email-text">${email}</div>
                        ${userDetails.user_type ? `<div class="user-type">Type: ${userDetails.user_type}</div>` : ''}
                        ${userDetails.status ? `<div class="user-status status-${userDetails.status.toLowerCase()}">${userDetails.status}</div>` : ''}
                    </div>
                `;
            } else {
                // Fallback to basic email display
                userEmail.textContent = this.userData.userEmail || 'User';
            }
        }

        // Update other user-related elements
        this.updateUserStats();
    }

    updateUserStats() {
        const userDetails = this.userData?.userDetails;
        if (!userDetails) return;

        // Update active campaigns if user has campaign-related data
        const activeCampaigns = document.getElementById('active-campaigns');
        if (activeCampaigns && userDetails.active_campaigns) {
            activeCampaigns.textContent = userDetails.active_campaigns;
        }

        // Add any other user-specific stats here
        if (userDetails.total_campaigns) {
            const totalCampaigns = document.getElementById('total-campaigns');
            if (totalCampaigns) {
                totalCampaigns.textContent = userDetails.total_campaigns;
            }
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

    async saveToStorage(data) {
        return new Promise((resolve) => {
            // Always mark registration as complete when saving auth data
            if (data.accessToken) {
                data.registrationComplete = true;
            }
            
            chrome.storage.local.set(data, () => {
                console.log('Data saved to storage:', data);
                resolve();
            });
        });
    }

    async clearAllStorage() {
        // Clear extension storage
        await this.clearStoredData();
        
        // Also try to clear localStorage from frontend tabs
        try {
            const tabs = await chrome.tabs.query({ url: '*://localhost:3000/*' });
            
            for (const tab of tabs) {
                try {
                    await chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        func: () => {
                            // Clear common JWT storage keys
                            localStorage.removeItem('accessToken');
                            localStorage.removeItem('authToken');
                            localStorage.removeItem('token');
                            localStorage.removeItem('jwt');
                            localStorage.removeItem('access_token');
                            localStorage.removeItem('userEmail');
                            localStorage.removeItem('email');
                            localStorage.removeItem('user_email');
                            console.log('Extension: Cleared localStorage tokens');
                        }
                    });
                } catch (error) {
                    console.log('Could not clear localStorage for tab:', tab.id);
                }
            }
        } catch (error) {
            console.log('Could not access frontend tabs for cleanup:', error);
        }
    }

    async clearStoredData() {
        return new Promise((resolve) => {
            chrome.storage.local.clear(() => {
                console.log('Extension storage cleared');
                resolve();
            });
        });
    }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new EchoExtensionPopup();
});

// Listen for messages from content script or background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Popup received message:', message);
    
    if (message.type === 'USER_REGISTERED') {
        // User completed registration, refresh the popup
        window.location.reload();
    }
    
    sendResponse({ success: true });
});