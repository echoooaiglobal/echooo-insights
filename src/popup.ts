// Popup interface for Echo Outreach Agent Extension - Function-Based TypeScript version
interface PopupCampaignData {
    id: number;
    name: string;
    description?: string;
    status: 'active' | 'paused' | 'completed' | 'draft';
    created_at: string;
    updated_at: string;
    profiles_count: number;
}

interface PopupUserData {
    userDetails?: {
        id: number;
        email: string;
        full_name?: string;
        created_at: string;
        updated_at: string;
        is_active: boolean;
    };
    activeCampaigns?: number;
}

interface PopupPageInfo {
    url: string;
    title: string;
    platform: string;
}

interface PopupMessageData {
    type: string;
    data?: any;
}

interface PopupApiResponse<T = any> {
    success: boolean;
    data?: T;
    items?: T[];
    error?: string;
}

// Global state variables
const POPUP_FRONTEND_URL = 'http://localhost:3000';
const POPUP_API_BASE_URL = 'http://localhost:8000/api/v0';

let popupIsRegistered: boolean = false;
let popupCampaignsData: PopupCampaignData[] = [];
let popupUserData: PopupUserData | null = null;

async function initializePopup(): Promise<void> {
    console.log('Echo Extension Popup initialized');
    
    showSection('loading');
    
    try {
        console.log('Checking authentication status...');
        const authStatus = await checkAuthStatus();
        console.log('Auth status result:', authStatus);
        
        if (authStatus.isAuthenticated) {
            console.log('User is authenticated, loading dashboard...');
            popupIsRegistered = true;
            popupUserData = authStatus.data;
            await loadDashboard();
        } else {
            console.log('User is not authenticated, showing registration...');
            showRegistrationRequired();
        }
    } catch (error) {
        console.error('Failed to initialize popup:', error);
        showError('Failed to load extension. Please try again.');
    }

    setupEventListeners();
    detectCurrentPage();
}

async function checkAuthStatus(): Promise<{ isAuthenticated: boolean; data?: any }> {
    return new Promise((resolve) => {
        // First check Chrome storage
        chrome.storage.local.get(['accessToken', 'userEmail', 'userDetails'], (result: Record<string, any>) => {
            if (chrome.runtime.lastError) {
                console.error('Storage error:', chrome.runtime.lastError);
                resolve({ isAuthenticated: false });
                return;
            }
            
            console.log('Storage result:', result);
            
            if (result.accessToken && result.userEmail) {
                console.log('Found auth data in storage');
                resolve({
                    isAuthenticated: true,
                    data: result
                });
                return;
            }
            
            // If not in storage, check if we can detect from current page
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs: chrome.tabs.Tab[]) => {
                if (chrome.runtime.lastError || !tabs[0] || !tabs[0].id) {
                    resolve({ isAuthenticated: false });
                    return;
                }
                
                const currentTab = tabs[0];
                
                // Check if user is on Echo frontend
                if (currentTab.url && currentTab.url.includes('localhost:3000')) {
                    console.log('User is on Echo frontend, checking for tokens...');
                    
                    chrome.scripting.executeScript({
                        target: { tabId: currentTab.id! },
                        func: () => {
                            const token = localStorage.getItem('accessToken') || 
                                        localStorage.getItem('authToken') || 
                                        localStorage.getItem('token');
                            const email = localStorage.getItem('userEmail') ||
                                        localStorage.getItem('email') ||
                                        localStorage.getItem('user_email');
                            
                            return { token, email };
                        }
                    }, (results: chrome.scripting.InjectionResult<{token: string | null, email: string | null}>[]) => {
                        if (chrome.runtime.lastError || !results || results.length === 0) {
                            resolve({ isAuthenticated: false });
                            return;
                        }
                        
                        const result = results[0].result;
                        if (result && result.token && result.email) {
                            console.log('Found tokens in frontend localStorage');
                            
                            // Save to extension storage
                            const authData = {
                                accessToken: result.token,
                                userEmail: result.email,
                                lastSync: Date.now()
                            };
                            
                            chrome.storage.local.set(authData, () => {
                                if (chrome.runtime.lastError) {
                                    console.error('Failed to save auth data:', chrome.runtime.lastError);
                                    resolve({ isAuthenticated: false });
                                } else {
                                    console.log('Auth data saved to extension storage');
                                    resolve({
                                        isAuthenticated: true,
                                        data: authData
                                    });
                                }
                            });
                        } else {
                            resolve({ isAuthenticated: false });
                        }
                    });
                } else {
                    resolve({ isAuthenticated: false });
                }
            });
        });
    });
}

async function loadDashboard(): Promise<void> {
    try {
        console.log('Loading dashboard...');
        showSection('dashboard');
        
        updateUserInfo();
        
        // Load campaigns
        await loadCampaignsWithAuth();
        
        updateStats();
        showPageAnalysisIfApplicable();
        
        console.log('Dashboard loaded successfully');
    } catch (error) {
        console.error('Failed to load dashboard:', error);
        showError('Failed to load dashboard data');
    }
}

function setupEventListeners(): void {
    const registerBtn = document.getElementById('register-btn');
    if (registerBtn) {
        registerBtn.addEventListener('click', () => handleRegistration());
    }

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => handleLogout());
    }

    const retryBtn = document.getElementById('retry-btn');
    if (retryBtn) {
        retryBtn.addEventListener('click', () => {
            console.log('Retry button clicked, reinitializing...');
            initializePopup();
        });
    }

    // Add refresh button listener for campaigns section
    const refreshBtn = document.getElementById('refresh-campaigns');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => refreshData());
    }

    const analyzeBtn = document.getElementById('analyze-current-page');
    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', () => analyzeCurrentPage());
    }

    const saveBtn = document.getElementById('save-to-campaign');
    if (saveBtn) {
        saveBtn.addEventListener('click', () => saveCurrentPageProfile());
    }
}

async function handleLogout(): Promise<void> {
    console.log('Logging out user...');
    
    try {
        // Clear all user data immediately
        clearUserDataFromUI();
        
        // Clear storage
        await clearStoredData();
        
        // Clear frontend tokens
        await clearFrontendTokens();
        
        // Notify background script
        chrome.runtime.sendMessage({ type: 'CLEAR_AUTH_DATA' }, (response: any) => {
            if (chrome.runtime.lastError) {
                console.log('Could not notify background script of logout:', chrome.runtime.lastError.message);
            }
        });
        
        // Reset global state
        popupIsRegistered = false;
        popupCampaignsData = [];
        popupUserData = null;
        
        // Show registration screen
        showRegistrationRequired();
        
        showSuccess('Logged out successfully!');
        
    } catch (error) {
        console.error('Error during logout:', error);
        showError('Error during logout. Please try again.');
    }
}

function clearUserDataFromUI(): void {
    // Clear user info
    const userFullName = document.getElementById('user-full-name');
    if (userFullName) {
        userFullName.textContent = '';
    }
    
    // Clear campaigns
    const campaignsList = document.getElementById('campaigns-list');
    if (campaignsList) {
        campaignsList.innerHTML = '';
    }
    
    // Clear counts
    const campaignsCount = document.getElementById('campaigns-count');
    if (campaignsCount) {
        campaignsCount.textContent = '0';
    }
}

// COMBINED FUNCTION: Get auth data and load campaigns in one function
async function loadCampaignsWithAuth(): Promise<void> {
    if (!popupIsRegistered) {
        return; // Don't load if not authenticated
    }
    
    try {
        // Get stored auth data using callback-based Chrome API
        const authData = await new Promise<Record<string, any> | null>((resolve) => {
            chrome.storage.local.get(['accessToken', 'userEmail', 'userDetails'], (result: Record<string, any>) => {
                if (chrome.runtime.lastError) {
                    console.error('Storage error:', chrome.runtime.lastError);
                    resolve(null);
                    return;
                }
                resolve(Object.keys(result).length > 0 ? result : null);
            });
        });

        if (!authData?.accessToken) {
            throw new Error('No authentication token available');
        }

        // Load campaigns using auth data
        const response = await fetch(`${POPUP_API_BASE_URL}/campaigns`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authData.accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data: PopupApiResponse<PopupCampaignData[]> = await response.json();
            console.log('API Response:', data);
            
            // Handle different API response formats with proper type checking
            if (Array.isArray(data.data)) {
                popupCampaignsData = data.data;
            } else if (Array.isArray(data.items)) {
                // Handle nested array case properly
                const items = data.items;
                if (items.length > 0 && Array.isArray(items[0])) {
                    // If nested array, flatten it with proper type assertion
                    popupCampaignsData = (items as PopupCampaignData[][]).flat();
                } else {
                    // If already flat array
                    popupCampaignsData = (items as PopupCampaignData[][]).flat();
                }
            } else if (Array.isArray(data)) {
                popupCampaignsData = data as PopupCampaignData[];
            } else {
                console.warn('Unexpected API response format:', data);
                popupCampaignsData = [];
            }
            
            console.log('Campaigns data processed:', popupCampaignsData);
            renderCampaigns();
        } else {
            if (response.status === 401 || response.status === 403) {
                // Token expired or invalid - logout user
                await handleLogout();
                return;
            }
            throw new Error(`API responded with status: ${response.status}`);
        }
    } catch (error) {
        console.error('Failed to load campaigns:', error);
        const campaignsList = document.getElementById('campaigns-list');
        if (campaignsList) {
            campaignsList.innerHTML = '<div class="campaign-item">Unable to load campaigns</div>';
        }
    }
}

async function detectCurrentPage(): Promise<void> {
    try {
        const pageInfo = await getCurrentPageInfo();
        updatePageInfo(pageInfo);
    } catch (error) {
        console.error('Failed to detect current page:', error);
    }
}

function showPageAnalysisIfApplicable(): void {
    getCurrentPageInfo().then(pageInfo => {
        if (pageInfo.platform && pageInfo.platform !== 'unknown') {
            showSection('page-analysis');
            updatePageInfo(pageInfo);
        }
    });
}

async function analyzeCurrentPage(): Promise<void> {
    if (!popupIsRegistered) {
        showError('Please login to use this feature');
        return;
    }
    
    try {
        const pageInfo = await getCurrentPageInfo();
        
        if (!pageInfo.platform || pageInfo.platform === 'unknown') {
            showError('This page is not supported for analysis');
            return;
        }

        chrome.runtime.sendMessage({
            type: 'ANALYZE_PROFILE',
            data: {
                url: pageInfo.url,
                platform: pageInfo.platform
            }
        }, (response: any) => {
            if (chrome.runtime.lastError) {
                console.error('Message error:', chrome.runtime.lastError);
                showError('Failed to send analysis request');
                return;
            }
            
            if (response && response.success) {
                console.log('Analysis started');
                showSuccess('Analysis started! Check your dashboard for results.');
            } else {
                showError('Failed to start analysis');
            }
        });
    } catch (error) {
        console.error('Failed to analyze page:', error);
        showError('Failed to analyze current page');
    }
}

async function saveCurrentPageProfile(): Promise<void> {
    if (!popupIsRegistered) {
        showError('Please login to use this feature');
        return;
    }
    
    try {
        const pageInfo = await getCurrentPageInfo();
        
        if (!pageInfo.platform || pageInfo.platform === 'unknown') {
            showError('This page is not supported for saving');
            return;
        }

        chrome.runtime.sendMessage({
            type: 'SAVE_PROFILE',
            data: {
                url: pageInfo.url,
                platform: pageInfo.platform
            }
        }, (response: any) => {
            if (chrome.runtime.lastError) {
                console.error('Message error:', chrome.runtime.lastError);
                showError('Failed to send save request');
                return;
            }
            
            if (response && response.success) {
                console.log('Profile saved');
                showSuccess('Profile saved to campaign!');
                refreshData();
            } else {
                showError('Failed to save profile');
            }
        });
    } catch (error) {
        console.error('Failed to save page:', error);
        showError('Failed to save current page');
    }
}

function updatePageInfo(pageInfo: PopupPageInfo): void {
    const pageTitle = document.getElementById('current-page-title');
    const pagePlatform = document.getElementById('current-page-platform');
    const platformDetection = document.getElementById('social-detection');

    if (pageTitle) {
        pageTitle.textContent = pageInfo.title.length > 50 
            ? pageInfo.title.substring(0, 50) + '...' 
            : pageInfo.title;
    }

    if (platformDetection) {
        if (pageInfo.platform && pageInfo.platform !== 'unknown') {
            platformDetection.innerHTML = `
                <strong>🔍 Platform Detection:</strong><br>
                <span class="social-platform">
                    ${getPlatformIcon(pageInfo.platform)} ${pageInfo.platform.toUpperCase()}
                </span>
            `;
        } else {
            platformDetection.innerHTML = `
                <strong>🔍 Platform Detection:</strong><br>
                <span style="color: #666;">No social media platform detected</span>
            `;
        }
    }
}

function getPlatformIcon(platform: string): string {
    const icons: Record<string, string> = {
        'instagram': '📸',
        'twitter': '🐦',
        'linkedin': '💼',
        'tiktok': '🎵',
        'youtube': '📺',
        'facebook': '👥'
    };
    return icons[platform] || '🌐';
}

function renderCampaigns(): void {
    const campaignsList = document.getElementById('campaigns-list');
    if (!campaignsList) return;

    if (popupCampaignsData.length === 0) {
        campaignsList.innerHTML = '<div class="campaign-item">No campaigns available</div>';
        return;
    }

    campaignsList.innerHTML = popupCampaignsData.map(campaign => `
        <div class="campaign-item">
            <div class="campaign-info">
                <span class="campaign-name">${campaign.name || 'Unnamed Campaign'}</span>
                <span class="campaign-status campaign-status-${campaign.status}">${campaign.status}</span>
            </div>
            <div class="campaign-meta">
                <span class="campaign-profiles">${campaign.profiles_count} profiles</span>
            </div>
        </div>
    `).join('');
}

function updateStats(): void {
    const campaignsCount = document.getElementById('campaigns-count');
    const activeCampaignsCount = document.getElementById('active-campaigns-count');

    if (campaignsCount) {
        campaignsCount.textContent = popupCampaignsData.length.toString();
    }

    if (activeCampaignsCount) {
        const activeCampaigns = popupCampaignsData.filter(c => c.status === 'active').length;
        activeCampaignsCount.textContent = activeCampaigns.toString();
    }
}

function showRegistrationRequired(): void {
    popupIsRegistered = false;
    showSection('registration-required');
    
    const registrationSection = document.getElementById('registration-required');
    if (registrationSection) {
        const existingMessage = registrationSection.querySelector('.access-restriction-message');
        if (!existingMessage) {
            const restrictionMessage = document.createElement('div');
            restrictionMessage.className = 'access-restriction-message';
            restrictionMessage.innerHTML = `
                <div class="restriction-notice">
                    <strong>🔒 Access Restricted</strong>
                    <p>Please complete registration to access features.</p>
                </div>
            `;
            
            const welcomeText = registrationSection.querySelector('p');
            if (welcomeText) {
                welcomeText.after(restrictionMessage);
            }
        }
    }
}

async function handleRegistration(): Promise<void> {
    console.log('Redirecting to registration...');
    
    try {
        await new Promise<void>((resolve, reject) => {
            chrome.tabs.create({
                url: `${POPUP_FRONTEND_URL}/register?source=extension`,
                active: true
            }, (tab: chrome.tabs.Tab) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message || 'Failed to create tab'));
                } else {
                    resolve();
                }
            });
        });

        window.close();
    } catch (error) {
        console.error('Failed to open registration:', error);
        showError('Failed to open registration page');
    }
}

async function refreshData(): Promise<void> {
    if (!popupIsRegistered) return;
    
    console.log('Refreshing campaigns...');
    try {
        await loadCampaignsWithAuth();
        console.log('Campaigns refreshed successfully');
    } catch (error) {
        console.error('Failed to refresh campaigns:', error);
        showError('Failed to refresh campaigns');
    }
}

async function getCurrentPageInfo(): Promise<PopupPageInfo> {
    return new Promise((resolve, reject) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs: chrome.tabs.Tab[]) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message || 'Tab query failed'));
                return;
            }
            
            if (tabs[0] && tabs[0].id) {
                chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_PAGE_INFO' }, (response: any) => {
                    if (chrome.runtime.lastError) {
                        // Content script might not be loaded, use basic page info
                        const pageInfo: PopupPageInfo = {
                            url: tabs[0].url || '',
                            title: tabs[0].title || 'Unknown Page',
                            platform: 'unknown'
                        };
                        resolve(pageInfo);
                        return;
                    }
                    
                    if (response && response.success) {
                        resolve(response.data);
                    } else {
                        const pageInfo: PopupPageInfo = {
                            url: tabs[0].url || '',
                            title: tabs[0].title || 'Unknown Page',
                            platform: 'unknown'
                        };
                        resolve(pageInfo);
                    }
                });
            } else {
                reject(new Error('No active tab found'));
            }
        });
    });
}

function showSection(sectionId: string): void {
    const sections = ['loading', 'registration-required', 'dashboard', 'error-state', 'page-analysis'];
    sections.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.classList.add('hidden');
        }
    });

    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.remove('hidden');
    }
}

function showError(message: string): void {
    const errorMessage = document.getElementById('error-message');
    if (errorMessage) {
        errorMessage.textContent = message;
    }
    showSection('error-state');
}

function showSuccess(message: string): void {
    console.log('Success:', message);
    
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 10px;
        left: 10px;
        right: 10px;
        background: #4CAF50;
        color: white;
        padding: 8px 12px;
        border-radius: 4px;
        z-index: 1000;
        font-size: 12px;
        text-align: center;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function updateUserInfo(): void {
    const userFullName = document.getElementById('user-full-name');
    const userDetails = popupUserData?.userDetails;
    
    if (userFullName) {
        if (userDetails) {
            const displayName = userDetails.full_name || 
                             userDetails.email.split('@')[0] || 
                             'User';
            userFullName.textContent = `👋 Hello, ${displayName}`;
        } else {
            userFullName.textContent = '👋 Hello, User';
        }
    }
}

async function clearStoredData(): Promise<void> {
    return new Promise((resolve) => {
        chrome.storage.local.clear(() => {
            if (chrome.runtime.lastError) {
                console.error('Error clearing storage:', chrome.runtime.lastError);
            } else {
                console.log('Extension storage cleared');
            }
            resolve();
        });
    });
}

async function clearFrontendTokens(): Promise<void> {
    try {
        const tabs = await new Promise<chrome.tabs.Tab[]>((resolve, reject) => {
            chrome.tabs.query({ url: 'http://localhost:3000/*' }, (tabs: chrome.tabs.Tab[]) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message || 'Tab query failed'));
                } else {
                    resolve(tabs);
                }
            });
        });
        
        for (const tab of tabs) {
            if (tab.id) {
                try {
                    await new Promise<void>((resolve, reject) => {
                        chrome.scripting.executeScript({
                            target: { tabId: tab.id! },
                            func: () => {
                                localStorage.removeItem('accessToken');
                                localStorage.removeItem('authToken');
                                localStorage.removeItem('token');
                                localStorage.removeItem('userEmail');
                                localStorage.removeItem('email');
                                localStorage.removeItem('user_email');
                                console.log('Extension: Cleared localStorage tokens');
                            }
                        }, (results: chrome.scripting.InjectionResult<void>[]) => {
                            if (chrome.runtime.lastError) {
                                console.log('Could not clear localStorage for tab:', tab.id, chrome.runtime.lastError.message);
                                resolve(); // Don't reject, just log the error
                            } else {
                                resolve();
                            }
                        });
                    });
                } catch (error) {
                    console.log('Could not clear localStorage for tab:', tab.id);
                }
            }
        }
    } catch (error) {
        console.log('Could not access frontend tabs for cleanup:', error);
    }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializePopup();
});

// Listen for messages from content script or background
chrome.runtime.onMessage.addListener((message: PopupMessageData, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
    console.log('Popup received message:', message);
    
    if (message.type === 'USER_REGISTERED') {
        initializePopup(); // Reinitialize instead of refresh
        sendResponse({ success: true });
    } else if (message.type === 'USER_LOGGED_OUT') {
        handleLogout();
        sendResponse({ success: true });
    } else {
        sendResponse({ success: false, error: 'Unknown message type' });
    }
    
    return true; // Keep the message channel open for async responses
});