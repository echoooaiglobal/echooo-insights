// File: popup.js
// Popup script for Echo Outreach Agent Extension - Simplified Version

class EchoExtensionPopup {
    constructor() {
        this.apiBaseUrl = 'http://localhost:8000/api/v0';
        this.frontendUrl = 'http://localhost:3000';
        this.userData = null;
        this.campaignsData = [];
        this.jwtToken = null;
        
        this.init();
    }

    async init() {
        console.log('Echo Extension Popup initialized - Icon clicked!');
        
        // Set up event listeners
        this.setupEventListeners();
        
        // IMMEDIATELY call campaigns API when icon is clicked
        await this.callCampaignsAPIImmediately();
        
        // Direct data retrieval without complex auth checks
        await this.retrieveUserData();
        
        // Get current page info
        await this.getCurrentPageInfo();
    }

    async fetchCampaigns() {
        console.log('🔄 Secondary campaigns fetch for UI display...');
        
        if (!this.jwtToken && localData.token && localData.companyData) {
            console.error('No JWT token available for secondary API call');
            this.showCampaignsError('No authentication token available');
            return;
        }

        try {
            const localData = await this.getLocalStorageData();
            const company_id = localData.companyData.id || localData.companyData.company_id;
            console.log('Company id = ', company_id);
            // Use exact API endpoint as specified
            const response = await fetch(`http://localhost:8000/api/v0/campaigns/company/${company_id}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.jwtToken}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('🔄 Secondary Campaigns API response status:', response.status);

            if (response.ok) {
                const data = await response.json();
                console.log('🔄 Secondary Campaigns API response data:', data);
                
                // Handle different possible response structures
                this.campaignsData = data.campaigns || data.data?.campaigns || data.data || [];
                
                if (Array.isArray(this.campaignsData)) {
                    console.log('🔄 Successfully loaded campaigns for UI:', this.campaignsData.length);
                    this.renderCampaigns();
                } else {
                    console.log('🔄 Campaigns data is not an array:', this.campaignsData);
                    this.campaignsData = [];
                    this.renderCampaigns();
                }
            } else {
                const errorText = await response.text();
                console.error('🔄 Secondary Campaigns API error:', response.status, errorText);
                this.showCampaignsError(`API Error: ${response.status}`);
            }
        } catch (error) {
            console.error('🔄 Secondary campaigns fetch failed:', error);
            this.showCampaignsError('Network error: ' + error.message);
        }
    }

    async retrieveUserData() {
        console.log('Retrieving user data from localStorage...');
        this.showSection('loading');

        try {
            // Get JWT token, user data, and company data from localStorage
            const localData = await this.getLocalStorageData();
            console.log('Retrieved localStorage data:', localData);

            if (localData.token && localData.userData) {
                this.jwtToken = localData.token;
                this.userData = localData.userData;
                this.companyData = localData.companyData; // Store company data
                
                console.log('JWT Token found:', !!this.jwtToken);
                console.log('User Data:', this.userData);
                console.log('Company Data:', this.companyData);
                
                // Display user information
                this.displayUserInfo();
                
                // Fetch campaigns from backend using company ID
                await this.fetchCampaigns();
                
                // Show dashboard
                this.showSection('dashboard');
                this.updateStats();
                
            } else {
                console.log('No user data or token found in localStorage');
                this.showRegistrationRequired();
            }

        } catch (error) {
            console.error('Failed to retrieve user data:', error);
            this.showError('Failed to retrieve user data: ' + error.message);
        }
    }

    async getLocalStorageData() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (tab && tab.url && tab.url.startsWith('http://localhost:3000')) {
                const results = await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    function: () => {
                        // Get JWT token from various possible keys
                        const token = localStorage.getItem('accessToken') || 
                                     localStorage.getItem('authToken') || 
                                     localStorage.getItem('token') ||
                                     localStorage.getItem('jwt');
                        
                        // Get user data - stored with key 'user' in array format
                        let userData = null;
                        try {
                            // Use 'user' as the primary key (as specified by user)
                            const userDataStr = localStorage.getItem('user');
                            if (userDataStr) {
                                const parsed = JSON.parse(userDataStr);
                                
                                // Data is in array format, take the first element
                                if (Array.isArray(parsed) && parsed.length > 0) {
                                    userData = parsed[0];
                                    console.log('Found user data as array with key "user", taking first element');
                                } 
                                // If it's an object, use it directly
                                else if (parsed && typeof parsed === 'object') {
                                    userData = parsed;
                                    console.log('Found user data as object with key "user"');
                                }
                            }
                            
                            // Fallback to other possible keys if 'user' key doesn't exist
                            if (!userData) {
                                const fallbackKeys = ['userData', 'loggedInUser', 'currentUser'];
                                
                                for (const key of fallbackKeys) {
                                    const userDataStr = localStorage.getItem(key);
                                    if (userDataStr) {
                                        const parsed = JSON.parse(userDataStr);
                                        
                                        // If it's an array, take the first element
                                        if (Array.isArray(parsed) && parsed.length > 0) {
                                            userData = parsed[0];
                                            console.log(`Found user data as array with fallback key "${key}", taking first element`);
                                            break;
                                        } 
                                        // If it's an object, use it directly
                                        else if (parsed && typeof parsed === 'object') {
                                            userData = parsed;
                                            console.log(`Found user data as object with fallback key "${key}"`);
                                            break;
                                        }
                                    }
                                }
                            }
                        } catch (e) {
                            console.log('Could not parse user data from localStorage:', e);
                        }
                        
                        // Get company data - stored as array with ID
                        let companyData = null;
                        try {
                            const companyStr = localStorage.getItem('company');
                            if (companyStr) {
                                const parsed = JSON.parse(companyStr);
                                
                                // If it's an array, take the first element
                                if (Array.isArray(parsed) && parsed.length > 0) {
                                    companyData = parsed[0];
                                    console.log('Found company data as array, taking first element');
                                } 
                                // If it's an object, use it directly
                                else if (parsed && typeof parsed === 'object') {
                                    companyData = parsed;
                                    console.log('Found company data as object');
                                }
                            }
                        } catch (e) {
                            console.log('Could not parse company data from localStorage:', e);
                        }
                        
                        return { token, userData, companyData };
                    }
                });
                
                return results && results[0] && results[0].result || { token: null, userData: null, companyData: null };
            }
        } catch (error) {
            console.log('Could not access localStorage:', error);
        }
        
        return { token: null, userData: null, companyData: null };
    }

    displayUserInfo() {
        const userFullName = document.getElementById('user-full-name');
        if (userFullName && this.userData) {
            // Use exact field names from your user data structure
            const name = this.userData.full_name || this.userData.email || 'User';
            const userType = this.userData.user_type;
            
            let displayText = `👋 Welcome, ${name}`;
            
            // Add user type indication
            if (userType === 'b2c') {
                displayText += ' (Personal)';
            } else if (userType === 'b2b') {
                displayText += ' (Business)';
            }
            
            userFullName.textContent = displayText;
            
            // Log detailed user information using exact field names
            console.log('Displaying user info:', {
                id: this.userData.id,
                email: this.userData.email,
                full_name: this.userData.full_name,
                phone_number: this.userData.phone_number,
                email_verified: this.userData.email_verified,
                status: this.userData.status,
                user_type: this.userData.user_type,
                last_login_at: this.userData.last_login_at,
                created_at: this.userData.created_at,
                updated_at: this.userData.updated_at,
                profile_image_url: this.userData.profile_image_url
            });
        }
    }

    setupEventListeners() {
        // Register button
        const registerBtn = document.getElementById('register-btn');
        if (registerBtn) {
            registerBtn.addEventListener('click', () => this.handleRegistration());
        }

        // Retry button
        const retryBtn = document.getElementById('retry-btn');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => this.retrieveUserData());
        }
    }

    // IMMEDIATE API CALL - Called as soon as icon is clicked
    async callCampaignsAPIImmediately() {
        console.log('🚀 IMMEDIATE CAMPAIGNS API CALL - Icon clicked!');
        
        try {
            // Get JWT token and company data immediately
            const localData = await this.getLocalStorageData();
            console.log('🔑 JWT Token retrieved:', !!localData.token);
            console.log('🏢 Company Data retrieved:', localData.companyData);
            
            if (localData.token && localData.companyData) {
                // Extract company ID from company data
                const company_id = localData.companyData.id || localData.companyData.company_id;
                console.log('🆔 Company ID extracted:', company_id);
                
                if (company_id) {
                    console.log('📡 Calling company-specific campaigns API endpoint...');
                    
                    // ONLY use company-specific endpoint
                    const apiUrl = `http://localhost:8000/api/v0/campaigns/company/${company_id}`;
                    console.log('🔗 API URL:', apiUrl);
                    
                    const response = await fetch(apiUrl, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${localData.token}`,
                            'Content-Type': 'application/json'
                        }
                    });

                    console.log('📊 CAMPAIGNS API RESPONSE STATUS:', response.status);
                    console.log('📊 CAMPAIGNS API RESPONSE HEADERS:', Object.fromEntries(response.headers.entries()));

                    if (response.ok) {
                        const data = await response.json();
                        console.log('✅ CAMPAIGNS API SUCCESS - Full Response:');
                        console.log(JSON.stringify(data, null, 2));
                        console.log('📈 Number of company campaigns found:', Array.isArray(data.campaigns) ? data.campaigns.length : Array.isArray(data.data) ? data.data.length : 'Not an array');
                        
                        // Store the response for later use
                        this.campaignsAPIResponse = data;
                    } else {
                        const errorText = await response.text();
                        console.error('❌ CAMPAIGNS API ERROR:');
                        console.error('Status:', response.status);
                        console.error('Status Text:', response.statusText);
                        console.error('Error Response:', errorText);
                    }
                } else {
                    console.warn('⚠️ No Company ID found in company data');
                    console.log('Company data structure:', localData.companyData);
                }
            } else {
                if (!localData.token) {
                    console.warn('⚠️ No JWT token found - Cannot call campaigns API');
                }
                if (!localData.companyData) {
                    console.warn('⚠️ No company data found - Cannot get company ID');
                }
            }
        } catch (error) {
            console.error('💥 CAMPAIGNS API CALL FAILED:');
            console.error('Error Type:', error.name);
            console.error('Error Message:', error.message);
            console.error('Full Error:', error);
        }
    }

    renderCampaigns() {
        const campaignsList = document.getElementById('campaigns-list');
        if (!campaignsList) return;

        if (!Array.isArray(this.campaignsData) || this.campaignsData.length === 0) {
            campaignsList.innerHTML = '<div class="campaign-item">No campaigns available</div>';
            return;
        }

        // Render campaigns using exact field names
        campaignsList.innerHTML = this.campaignsData.map(campaign => {
            // Use exact field names that might exist in your campaign data
            const campaignName = campaign.name || campaign.title || campaign.campaign_name || 'Unnamed Campaign';
            const campaignCount = campaign.influencer_count || campaign.count || campaign.total_influencers || '0';
            
            return `
                <div class="campaign-item">
                    <span class="campaign-name">${campaignName}</span>
                    <span class="campaign-count">${campaignCount}</span>
                </div>
            `;
        }).join('');
    }

    showCampaignsError(message) {
        const campaignsList = document.getElementById('campaigns-list');
        if (campaignsList) {
            campaignsList.innerHTML = `<div class="campaign-item">Error: ${message}</div>`;
        }
    }

    updateStats() {
        const campaignsCount = document.getElementById('campaigns-count');

        if (campaignsCount) {
            campaignsCount.textContent = this.campaignsData.length;
        }
    }

    showRegistrationRequired() {
        this.showSection('registration-required');
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

    async getCurrentPageInfo() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab) {
                console.log('Current page:', tab.url);
                
                // Update page analysis section if it exists
                const currentUrl = document.getElementById('current-url');
                const detectedPlatform = document.getElementById('detected-platform');
                
                if (currentUrl) {
                    currentUrl.textContent = tab.url;
                }
                
                if (detectedPlatform) {
                    // Simple platform detection
                    let platform = 'Unknown';
                    if (tab.url.includes('instagram.com')) platform = 'Instagram';
                    else if (tab.url.includes('tiktok.com')) platform = 'TikTok';
                    else if (tab.url.includes('youtube.com')) platform = 'YouTube';
                    else if (tab.url.includes('twitter.com') || tab.url.includes('x.com')) platform = 'Twitter/X';
                    
                    detectedPlatform.textContent = platform;
                }
            }
        } catch (error) {
            console.error('Failed to get current page info:', error);
        }
    }

    showSection(sectionId) {
        // Hide all sections
        const sections = document.querySelectorAll('.section');
        sections.forEach(section => section.classList.add('hidden'));
        
        // Show the requested section
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.remove('hidden');
        }
    }

    showError(message) {
        this.showSection('error-state');
        const errorMessage = document.getElementById('error-message');
        if (errorMessage) {
            errorMessage.textContent = message;
        }
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