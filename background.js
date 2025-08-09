// File: background.js
// Background service worker for Echo Outreach Agent Extension - Unified Popup Version

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

        // Handle browser action click (toolbar icon) - MODIFIED for unified popup
        chrome.action.onClicked.addListener((tab) => {
            this.handleBrowserActionClick(tab);
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
                case 'FLOATING_ICON_CLICKED':
                    console.log('Profile icon clicked:', message.data);
                    sendResponse({ success: true });
                    break;

                case 'OPEN_FULL_ANALYSIS':
                    chrome.tabs.create({ 
                        url: `${this.frontendUrl}/influencer-analysis?data=${encodeURIComponent(JSON.stringify(message.data))}`
                    });
                    sendResponse({ success: true });
                    break;

                case 'SAVE_TO_CAMPAIGN':
                    chrome.tabs.create({ 
                        url: `${this.frontendUrl}/campaigns?add_influencer=${encodeURIComponent(JSON.stringify(message.data))}`
                    });
                    sendResponse({ success: true });
                    break;

                case 'SHOW_UNIVERSAL_POPUP':
                    // Show the same slide-in popup regardless of source
                    this.showUniversalPopup(sender.tab.id, message.data);
                    sendResponse({ success: true });
                    break;

                case 'FETCH_CAMPAIGNS':
                    // Extract company ID from user's stored company data and fetch campaigns
                    const userStorageData = await this.getUserDataFromStorage();
                    if (userStorageData && userStorageData.companyData && userStorageData.token) {
                        const companyId = userStorageData.companyData.id || userStorageData.companyData.company_id;
                        console.log(`🚀 Background: Fetching campaigns for company ${companyId}`);
                        const campaigns = await this.fetchCampaigns(userStorageData.token, companyId);
                        sendResponse({ success: true, data: campaigns });
                    } else {
                        console.error('❌ Background: No company data or token found');
                        sendResponse({ success: false, error: 'No company data or authentication found' });
                    }
                    break;

                case 'CAMPAIGN_SELECTED':
                    console.log('📊 Background: Campaign selected:', message.data);
                    // You can add logic here to handle campaign selection
                    // For example, store the selected campaign or send it to your backend
                    sendResponse({ success: true, message: 'Campaign selection received' });
                    break;

                case 'GET_USER_DATA':
                    const userDataResult = await this.getUserDataFromStorage();
                    sendResponse({ success: true, data: userDataResult });
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

    // Handle browser action click (main extension icon in toolbar) - UNIFIED APPROACH
    async handleBrowserActionClick(tab) {
        console.log('🚀 Browser action clicked on tab:', tab.url);
        
        try {
            // Send message to content script to show the universal popup
            await chrome.tabs.sendMessage(tab.id, {
                type: 'SHOW_UNIVERSAL_POPUP',
                data: {
                    source: 'browser_action',
                    tabUrl: tab.url
                }
            });
        } catch (error) {
            console.error('Failed to inject popup:', error);
            // Fallback: open dashboard
            chrome.tabs.create({ url: this.frontendUrl });
        }
    }

    async showUniversalPopup(tabId, data) {
        try {
            // First, get user data to fetch campaigns if needed
            const userStorageData = await this.getUserDataFromStorage();
            let campaigns = [];
            
            // Fetch campaigns if user data is available
            if (userStorageData && userStorageData.companyData && userStorageData.token) {
                try {
                    const companyId = userStorageData.companyData.id || userStorageData.companyData.company_id;
                    console.log(`🚀 Background: Fetching campaigns for popup, company ${companyId}`);
                    campaigns = await this.fetchCampaigns(userStorageData.token, companyId);
                    console.log(`📋 Background: Found ${campaigns.length} campaigns for dropdown`);
                } catch (error) {
                    console.error('❌ Background: Failed to fetch campaigns for popup:', error);
                    campaigns = [];
                }
            }

            // Inject the universal popup script with campaigns data
            await chrome.scripting.executeScript({
                target: { tabId: tabId },
                function: this.createUniversalPopup,
                args: [{ ...data, campaigns }]
            });
        } catch (error) {
            console.error('Failed to show universal popup:', error);
        }
    }

    // Universal popup function to inject (same design for all sources)
    createUniversalPopup(data) {
        // Remove existing popup if any
        const existingPopup = document.getElementById('echo-universal-popup');
        if (existingPopup) {
            existingPopup.remove();
        }

        // Get user data from localStorage or use provided data (your original project's approach)
        let userDataLocal = null;
        let companyDataLocal = null;
        let profileDataLocal = data?.profileData || null;
        let campaignsLocal = data?.campaigns || [];
        
        console.log(`📋 Universal Popup: Received ${campaignsLocal.length} campaigns for dropdown`);
        
        try {
            // Get JWT token from localStorage (your original project's approach)
            const token = localStorage.getItem('accessToken') || 
                         localStorage.getItem('authToken') || 
                         localStorage.getItem('token') ||
                         localStorage.getItem('jwt');
            
            // Get user data - stored with key 'user' (as per your original project)
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const parsed = JSON.parse(userStr);
                // Data is in array format, take the first element (your original approach)
                userDataLocal = Array.isArray(parsed) ? parsed[0] : parsed;
            }
            
            // Get company data - stored with key 'company' (as per your original project)
            const companyStr = localStorage.getItem('company');
            if (companyStr) {
                const parsed = JSON.parse(companyStr);
                // If it's an array, take the first element (your original approach)
                companyDataLocal = Array.isArray(parsed) ? parsed[0] : parsed;
            }

            console.log('🔑 Universal Popup: Token found:', !!token);
            console.log('👤 Universal Popup: User data found:', !!userDataLocal);
            console.log('🏢 Universal Popup: Company data found:', !!companyDataLocal);
            if (companyDataLocal) {
                const companyId = companyDataLocal.id || companyDataLocal.company_id;
                console.log('🆔 Universal Popup: Company ID extracted:', companyId);
            }
        } catch (e) {
            console.log('Universal Popup: Could not parse data from localStorage:', e);
        }

        // Determine popup content based on source and data
        let userName, userHandle, platformBadge, isProfileContext;
        
        if (profileDataLocal) {
            // Profile icon was clicked - show profile info
            userName = profileDataLocal.profileName || profileDataLocal.channelName || profileDataLocal.username || 'Unknown User';
            userHandle = profileDataLocal.username ? `@${profileDataLocal.username}` : '';
            platformBadge = profileDataLocal.platform || 'Unknown';
            isProfileContext = true;
        } else {
            // Browser action was clicked - show user/dashboard info (your original project's user data)
            userName = userDataLocal?.full_name || userDataLocal?.name || userDataLocal?.email || 'Echo User';
            userHandle = userDataLocal?.email ? `@${userDataLocal.email.split('@')[0]}` : '';
            platformBadge = 'Dashboard';
            isProfileContext = false;
        }

        // Create the unified slide-in popup
        const universalPopup = document.createElement('div');
        universalPopup.id = 'echo-universal-popup';
        
        const campaignsDropdownHTML = (!isProfileContext && campaignsLocal.length > 0) ? `
            <!-- Campaigns Dropdown Section -->
            <div class="echo-campaigns-section">
                <h4>📊 Select Campaign</h4>
                <div class="echo-dropdown-container">
                    <select class="echo-campaigns-dropdown" id="campaignsDropdown">
                        <option value="">Select a campaign...</option>
                        ${campaignsLocal.map(campaign => `
                            <option value="${campaign.id}" data-name="${campaign.name}">
                                ${campaign.name} (${campaign.status || 'Active'})
                            </option>
                        `).join('')}
                    </select>
                </div>
            </div>
        ` : '';

        universalPopup.innerHTML = `
            <div class="echo-slide-popup">
                <!-- Header with user info and close button -->
                <div class="echo-popup-header">
                    <div class="echo-user-info">
                        <div class="echo-user-avatar">
                            <div class="echo-avatar-placeholder">
                                ${userName.charAt(0).toUpperCase()}
                            </div>
                        </div>
                        <div class="echo-user-details">
                            <h3 class="echo-user-name">${userName}</h3>
                            <p class="echo-user-handle">${userHandle}</p>
                            <span class="echo-platform-badge">${platformBadge}</span>
                        </div>
                    </div>
                    <button class="echo-close-btn">×</button>
                </div>

                <!-- Content area -->
                <div class="echo-popup-content">
                    <!-- Stats section -->
                    <div class="echo-stats-section">
                        ${isProfileContext ? `
                            <div class="echo-stat-item">
                                <span class="echo-stat-label">Platform</span>
                                <span class="echo-stat-value">${profileDataLocal.platform.charAt(0).toUpperCase() + profileDataLocal.platform.slice(1)}</span>
                            </div>
                            ${profileDataLocal.followerCount ? `
                                <div class="echo-stat-item">
                                    <span class="echo-stat-label">Followers</span>
                                    <span class="echo-stat-value">${profileDataLocal.followerCount}</span>
                                </div>
                            ` : ''}
                            ${profileDataLocal.subscriberCount ? `
                                <div class="echo-stat-item">
                                    <span class="echo-stat-label">Subscribers</span>
                                    <span class="echo-stat-value">${profileDataLocal.subscriberCount}</span>
                                </div>
                            ` : ''}
                        ` : `
                            <div class="echo-stat-item">
                                <span class="echo-stat-label">Status</span>
                                <span class="echo-stat-value">Active</span>
                            </div>
                            <div class="echo-stat-item">
                                <span class="echo-stat-label">Company</span>
                                <span class="echo-stat-value">${companyDataLocal?.name || companyDataLocal?.company_name || 'Company'}</span>
                            </div>
                            <div class="echo-stat-item">
                                <span class="echo-stat-label">Campaigns</span>
                                <span class="echo-stat-value">${campaignsLocal.length}</span>
                            </div>
                        `}
                    </div>

                    ${campaignsDropdownHTML}

                    <!-- Analysis section -->
                    <div class="echo-analysis-section">
                        <h4>${isProfileContext ? '🔍 Quick Analysis' : '🚀 Quick Actions'}</h4>
                        <div class="echo-analysis-items">
                            ${isProfileContext ? `
                                <div class="echo-analysis-item">
                                    <span class="echo-analysis-icon">📊</span>
                                    <span>Profile detected and extracted</span>
                                </div>
                                <div class="echo-analysis-item">
                                    <span class="echo-analysis-icon">✅</span>
                                    <span>Ready for campaign analysis</span>
                                </div>
                                <div class="echo-analysis-item">
                                    <span class="echo-analysis-icon">🎯</span>
                                    <span>Engagement data available</span>
                                </div>
                            ` : `
                                <div class="echo-analysis-item">
                                    <span class="echo-analysis-icon">📊</span>
                                    <span>View company campaigns</span>
                                </div>
                                <div class="echo-analysis-item">
                                    <span class="echo-analysis-icon">🎯</span>
                                    <span>Manage influencer outreach</span>
                                </div>
                                <div class="echo-analysis-item">
                                    <span class="echo-analysis-icon">📈</span>
                                    <span>Track campaign performance</span>
                                </div>
                            `}
                        </div>
                    </div>

                    <!-- Action buttons -->
                    <div class="echo-actions-section">
                        ${isProfileContext ? `
                            <button class="echo-btn echo-btn-primary echo-analyze">
                                <span class="echo-btn-icon">🔍</span>
                                Full Analysis
                            </button>
                            <button class="echo-btn echo-btn-secondary echo-save">
                                <span class="echo-btn-icon">💾</span>
                                Add to Campaign
                            </button>
                        ` : `
                            <button class="echo-btn echo-btn-primary echo-dashboard">
                                <span class="echo-btn-icon">🏠</span>
                                Open Dashboard
                            </button>
                        `}
                    </div>
                </div>
            </div>
        `;

        // Same slide-in styling
        universalPopup.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            right: -400px !important;
            width: 350px !important;
            height: 100vh !important;
            z-index: 1000000 !important;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
            transition: right 0.3s ease-out !important;
        `;

        // Add the same popup styles
        if (!document.getElementById('echo-universal-popup-styles')) {
            const popupStyle = document.createElement('style');
            popupStyle.id = 'echo-universal-popup-styles';
            popupStyle.textContent = `
                .echo-slide-popup {
                    width: 100% !important;
                    height: 100% !important;
                    background: white !important;
                    box-shadow: -4px 0 20px rgba(0, 0, 0, 0.15) !important;
                    display: flex !important;
                    flex-direction: column !important;
                }
                
                .echo-popup-header {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
                    color: white !important;
                    padding: 20px !important;
                    display: flex !important;
                    justify-content: space-between !important;
                    align-items: flex-start !important;
                }
                
                .echo-user-info {
                    display: flex !important;
                    align-items: center !important;
                    gap: 12px !important;
                }
                
                .echo-user-avatar {
                    width: 50px !important;
                    height: 50px !important;
                    border-radius: 50% !important;
                    background: rgba(255, 255, 255, 0.2) !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    border: 2px solid rgba(255, 255, 255, 0.3) !important;
                }
                
                .echo-avatar-placeholder {
                    font-size: 20px !important;
                    font-weight: bold !important;
                    color: white !important;
                }
                
                .echo-user-details {
                    flex: 1 !important;
                }
                
                .echo-user-name {
                    margin: 0 0 4px 0 !important;
                    font-size: 18px !important;
                    font-weight: 600 !important;
                    color: white !important;
                }
                
                .echo-user-handle {
                    margin: 0 0 8px 0 !important;
                    font-size: 14px !important;
                    color: rgba(255, 255, 255, 0.8) !important;
                }
                
                .echo-platform-badge {
                    background: rgba(255, 255, 255, 0.2) !important;
                    color: white !important;
                    padding: 4px 8px !important;
                    border-radius: 12px !important;
                    font-size: 11px !important;
                    font-weight: 500 !important;
                    text-transform: capitalize !important;
                }
                
                .echo-close-btn {
                    background: none !important;
                    border: none !important;
                    color: white !important;
                    font-size: 24px !important;
                    cursor: pointer !important;
                    padding: 0 !important;
                    width: 30px !important;
                    height: 30px !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    border-radius: 50% !important;
                    transition: background 0.2s ease !important;
                }
                
                .echo-close-btn:hover {
                    background: rgba(255, 255, 255, 0.2) !important;
                }
                
                .echo-popup-content {
                    flex: 1 !important;
                    padding: 20px !important;
                    overflow-y: auto !important;
                }
                
                .echo-stats-section {
                    margin-bottom: 24px !important;
                }
                
                .echo-stat-item {
                    display: flex !important;
                    justify-content: space-between !important;
                    align-items: center !important;
                    padding: 12px 0 !important;
                    border-bottom: 1px solid #f1f5f9 !important;
                }
                
                .echo-stat-item:last-child {
                    border-bottom: none !important;
                }
                
                .echo-stat-label {
                    font-size: 14px !important;
                    color: #64748b !important;
                    font-weight: 500 !important;
                }
                
                .echo-stat-value {
                    font-size: 14px !important;
                    color: #1e293b !important;
                    font-weight: 600 !important;
                }
                
                .echo-analysis-section {
                    margin-bottom: 24px !important;
                }
                
                .echo-campaigns-section {
                    margin-bottom: 24px !important;
                }
                
                .echo-campaigns-section h4 {
                    margin: 0 0 16px 0 !important;
                    font-size: 16px !important;
                    color: #1e293b !important;
                    font-weight: 600 !important;
                }
                
                .echo-dropdown-container {
                    position: relative !important;
                }
                
                .echo-campaigns-dropdown {
                    width: 100% !important;
                    padding: 12px 16px !important;
                    border: 2px solid #e2e8f0 !important;
                    border-radius: 8px !important;
                    background: white !important;
                    color: #1e293b !important;
                    font-size: 14px !important;
                    font-weight: 500 !important;
                    cursor: pointer !important;
                    transition: all 0.2s ease !important;
                    outline: none !important;
                    appearance: none !important;
                    background-image: url('data:image/svg+xml;charset=US-ASCII,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 5"><path fill="%23666" d="m0 1 2 2 2-2z"/></svg>') !important;
                    background-repeat: no-repeat !important;
                    background-position: right 12px center !important;
                    background-size: 12px !important;
                }
                
                .echo-campaigns-dropdown:hover {
                    border-color: #667eea !important;
                    background-color: #f8fafc !important;
                }
                
                .echo-campaigns-dropdown:focus {
                    border-color: #667eea !important;
                    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1) !important;
                }
                
                .echo-campaigns-dropdown option {
                    padding: 8px 12px !important;
                    color: #1e293b !important;
                    background: white !important;
                }
                
                .echo-analysis-section h4 {
                    margin: 0 0 16px 0 !important;
                    font-size: 16px !important;
                    color: #1e293b !important;
                    font-weight: 600 !important;
                }
                
                .echo-analysis-items {
                    display: flex !important;
                    flex-direction: column !important;
                    gap: 12px !important;
                }
                
                .echo-analysis-item {
                    display: flex !important;
                    align-items: center !important;
                    gap: 12px !important;
                    padding: 12px !important;
                    background: #f8fafc !important;
                    border-radius: 8px !important;
                    border-left: 3px solid #667eea !important;
                }
                
                .echo-analysis-icon {
                    font-size: 16px !important;
                }
                
                .echo-analysis-item span:last-child {
                    font-size: 13px !important;
                    color: #475569 !important;
                    font-weight: 500 !important;
                }
                
                .echo-actions-section {
                    display: flex !important;
                    flex-direction: column !important;
                    gap: 12px !important;
                    margin-top: auto !important;
                }
                
                .echo-btn {
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    gap: 8px !important;
                    padding: 14px 20px !important;
                    border: none !important;
                    border-radius: 8px !important;
                    font-size: 14px !important;
                    font-weight: 600 !important;
                    cursor: pointer !important;
                    transition: all 0.2s ease !important;
                }
                
                .echo-btn-primary {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
                    color: white !important;
                }
                
                .echo-btn-secondary {
                    background: #f1f5f9 !important;
                    color: #374151 !important;
                    border: 1px solid #d1d5db !important;
                }
                
                .echo-btn:hover {
                    transform: translateY(-1px) !important;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
                }
                
                .echo-btn-icon {
                    font-size: 16px !important;
                }
            `;
            document.head.appendChild(popupStyle);
        }

        // Add event listeners
        const closeBtn = universalPopup.querySelector('.echo-close-btn');
        closeBtn.addEventListener('click', () => {
            universalPopup.style.right = '-400px';
            setTimeout(() => universalPopup.remove(), 300);
        });

        // Profile context buttons
        const analyzeBtn = universalPopup.querySelector('.echo-analyze');
        if (analyzeBtn) {
            analyzeBtn.addEventListener('click', () => {
                chrome.runtime.sendMessage({
                    type: 'OPEN_FULL_ANALYSIS',
                    data: profileDataLocal
                });
                universalPopup.style.right = '-400px';
                setTimeout(() => universalPopup.remove(), 300);
            });
        }

        const saveBtn = universalPopup.querySelector('.echo-save');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                chrome.runtime.sendMessage({
                    type: 'SAVE_TO_CAMPAIGN',
                    data: profileDataLocal
                });
                universalPopup.style.right = '-400px';
                setTimeout(() => universalPopup.remove(), 300);
            });
        }

        // Dashboard context buttons
        const dashboardBtn = universalPopup.querySelector('.echo-dashboard');
        if (dashboardBtn) {
            dashboardBtn.addEventListener('click', () => {
                window.open('http://localhost:3000', '_blank');
                universalPopup.style.right = '-400px';
                setTimeout(() => universalPopup.remove(), 300);
            });
        }

        // Campaigns dropdown change handler
        const campaignsDropdown = universalPopup.querySelector('#campaignsDropdown');
        if (campaignsDropdown) {
            campaignsDropdown.addEventListener('change', (event) => {
                const selectedCampaignId = event.target.value;
                const selectedOption = event.target.selectedOptions[0];
                const campaignName = selectedOption?.dataset.name || 'Unknown Campaign';
                
                if (selectedCampaignId) {
                    console.log(`📊 Universal Popup: Campaign selected - ID: ${selectedCampaignId}, Name: ${campaignName}`);
                    
                    // Send message to background script about campaign selection
                    chrome.runtime.sendMessage({
                        type: 'CAMPAIGN_SELECTED',
                        data: {
                            campaignId: selectedCampaignId,
                            campaignName: campaignName,
                            profileData: profileDataLocal
                        }
                    });
                    
                    // Show success feedback
                    event.target.style.borderColor = '#10b981';
                    event.target.style.backgroundColor = '#f0fdf4';
                    
                    setTimeout(() => {
                        event.target.style.borderColor = '#e2e8f0';
                        event.target.style.backgroundColor = 'white';
                    }, 1500);
                }
            });
        }

        // Add to page and trigger slide-in
        document.body.appendChild(universalPopup);
        setTimeout(() => {
            universalPopup.style.right = '0px';
        }, 10);
    }

    async fetchCampaigns(token, companyId) {
        try {
            if (!token) {
                throw new Error('No JWT token provided');
            }

            if (!companyId) {
                throw new Error('No company ID provided');
            }

            console.log(`🚀 Background: Fetching campaigns for company ${companyId}`);
            
            // Use your original project's exact API endpoint
            const apiUrl = `http://localhost:8000/api/v0/campaigns/company/${companyId}`;
            console.log('📞 Background: Making API call to:', apiUrl);

            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('📊 Background: Campaigns API response status:', response.status);

            if (response.ok) {
                const data = await response.json();
                
                // DETAILED CONSOLE LOGGING FOR DEBUGGING
                console.log('🔍 Background: ==== CAMPAIGN DATA DEBUG ====');
                console.log('📦 Background: Full API Response:', data);
                console.log('📦 Background: Response Type:', typeof data);
                console.log('📦 Background: Response Keys:', Object.keys(data));
                
                if (data.campaigns) {
                    console.log('📋 Background: Found data.campaigns:', data.campaigns);
                    console.log('📋 Background: data.campaigns type:', typeof data.campaigns);
                    console.log('📋 Background: data.campaigns is array:', Array.isArray(data.campaigns));
                    console.log('📋 Background: data.campaigns length:', data.campaigns.length);
                    
                    if (Array.isArray(data.campaigns) && data.campaigns.length > 0) {
                        console.log('📋 Background: First campaign sample:', data.campaigns[0]);
                    }
                }
                
                if (data.data) {
                    console.log('📋 Background: Found data.data:', data.data);
                    console.log('📋 Background: data.data type:', typeof data.data);
                    console.log('📋 Background: data.data is array:', Array.isArray(data.data));
                    
                    if (Array.isArray(data.data) && data.data.length > 0) {
                        console.log('📋 Background: data.data length:', data.data.length);
                        console.log('📋 Background: First data.data item:', data.data[0]);
                        
                        // Check if data.data contains nested arrays
                        if (Array.isArray(data.data[0])) {
                            console.log('📋 Background: NESTED ARRAY DETECTED in data.data[0]');
                            console.log('📋 Background: data.data[0] length:', data.data[0].length);
                            console.log('📋 Background: First nested campaign:', data.data[0][0]);
                        }
                    }
                    
                    if (data.data.campaigns) {
                        console.log('📋 Background: Found data.data.campaigns:', data.data.campaigns);
                        console.log('📋 Background: data.data.campaigns type:', typeof data.data.campaigns);
                        console.log('📋 Background: data.data.campaigns is array:', Array.isArray(data.data.campaigns));
                        
                        if (Array.isArray(data.data.campaigns) && data.data.campaigns.length > 0) {
                            console.log('📋 Background: data.data.campaigns length:', data.data.campaigns.length);
                            console.log('📋 Background: First data.data.campaigns item:', data.data.campaigns[0]);
                        }
                    }
                }
                
                console.log('🔍 Background: ==== END CAMPAIGN DATA DEBUG ====');
                
                // Handle different possible response structures from your original project
                let campaigns = [];
                
                // Check for direct campaigns array
                if (data.campaigns && Array.isArray(data.campaigns)) {
                    campaigns = data.campaigns;
                    console.log('✅ Background: Using data.campaigns array');
                }
                // Check for data.campaigns
                else if (data.data?.campaigns && Array.isArray(data.data.campaigns)) {
                    campaigns = data.data.campaigns;
                    console.log('✅ Background: Using data.data.campaigns array');
                }
                // Check for direct data array
                else if (data.data && Array.isArray(data.data)) {
                    // Handle nested array case
                    if (data.data.length > 0 && Array.isArray(data.data[0])) {
                        campaigns = data.data[0]; // Extract from nested array
                        console.log('✅ Background: Using nested array data.data[0]');
                    } else {
                        campaigns = data.data;
                        console.log('✅ Background: Using data.data array');
                    }
                }
                // Last fallback
                else if (Array.isArray(data)) {
                    campaigns = data;
                    console.log('✅ Background: Using direct data array');
                }
                
                console.log(`📈 Background: Final campaigns array:`, campaigns);
                console.log(`📈 Background: Final campaigns count: ${campaigns.length}`);
                
                if (campaigns.length > 0) {
                    console.log('📋 Background: Sample campaign structure:', campaigns[0]);
                    campaigns.forEach((campaign, index) => {
                        console.log(`📋 Background: Campaign ${index + 1}:`, {
                            id: campaign.id,
                            name: campaign.name,
                            status: campaign.status
                        });
                    });
                }
                
                return campaigns;
            } else {
                const errorText = await response.text();
                console.error('❌ Background: Campaigns API error:', response.status, errorText);
                throw new Error(`API responded with status: ${response.status}`);
            }
        } catch (error) {
            console.error('💥 Background: Failed to fetch campaigns:', error);
            throw error;
        }
    }

    async getUserDataFromStorage() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (tab && tab.url && tab.url.startsWith(this.frontendUrl)) {
                const results = await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    function: () => {
                        // Get JWT token from localStorage (your original project's approach)
                        const token = localStorage.getItem('accessToken') || 
                                     localStorage.getItem('authToken') || 
                                     localStorage.getItem('token') ||
                                     localStorage.getItem('jwt');
                        
                        // Get user data - stored with key 'user' (as per your original project)
                        let userData = null;
                        try {
                            const userDataStr = localStorage.getItem('user');
                            if (userDataStr) {
                                const parsed = JSON.parse(userDataStr);
                                
                                // Data is in array format, take the first element (your original approach)
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
                        
                        // Get company data - stored with key 'company' (as per your original project)
                        let companyData = null;
                        try {
                            const companyStr = localStorage.getItem('company');
                            if (companyStr) {
                                const parsed = JSON.parse(companyStr);
                                
                                // If it's an array, take the first element (your original approach)
                                if (Array.isArray(parsed) && parsed.length > 0) {
                                    companyData = parsed[0];
                                    console.log('Background: Found company data as array, taking first element');
                                } 
                                // If it's an object, use it directly
                                else if (parsed && typeof parsed === 'object') {
                                    companyData = parsed;
                                    console.log('Background: Found company data as object');
                                }
                            }
                        } catch (e) {
                            console.log('Background: Could not parse company data:', e);
                        }
                        
                        return { token, userData, companyData };
                    }
                });
                
                const result = results && results[0] && results[0].result;
                
                // Log the extracted data
                if (result) {
                    console.log('🔑 Background: Token found:', !!result.token);
                    console.log('👤 Background: User data found:', !!result.userData);
                    console.log('🏢 Background: Company data found:', !!result.companyData);
                    if (result.companyData) {
                        const companyId = result.companyData.id || result.companyData.company_id;
                        console.log('🆔 Background: Company ID extracted:', companyId);
                    }
                }
                
                return result || { token: null, userData: null, companyData: null };
            }
        } catch (error) {
            console.error('Background: Failed to get user data from storage:', error);
        }
        
        return { token: null, userData: null, companyData: null };
    }

    async handleTabUpdate(tabId, changeInfo, tab) {
        if (changeInfo.status === 'complete' && tab.url) {
            if (tab.url.includes(this.frontendUrl) && tab.url.includes('/dashboard')) {
                console.log('User reached dashboard - updating badge');
                this.updateBadge('✓');
            }
        }
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
                iconUrl: 'icons/echooo-favicon-48x48.png',
                title: 'Echo Outreach Agent',
                message: 'Extension installed successfully! Please register to get started.'
            });
        }
    }
}

// Initialize background service worker
new EchoExtensionBackground();