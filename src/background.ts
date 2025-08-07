// src/background.ts - Enhanced background service worker with user data handling
interface BackgroundAuthData {
    accessToken?: string;
    userEmail?: string;
    userFullName?: string;
    companyId?: string;
    companyName?: string;
    userId?: number;
    refreshToken?: string;
}

// Updated to match exact backend model fields
interface BackgroundUserData {
    id: string;                     // UUID field from User model
    email: string;
    first_name?: string;            // NEW - matches User model
    last_name?: string;             // NEW - matches User model  
    full_name: string;              // Required in User model
    phone_number?: string;          // matches User model
    profile_image_url?: string;     // matches User model
    status: string;                 // matches User model
    user_type: string;              // matches User model
    email_verified: boolean;        // matches User model
    is_active: boolean;
    created_at: string;
    updated_at: string;
    last_login_at?: string;         // matches User model
    roles?: Array<{
        id: string;
        name: string;
        description?: string;
    }>;
    company?: {
        id: string;
        name: string;
        domain?: string;
        logo?: string;
    } | null;
}

interface BackgroundMessageData {
    type: string;
    data?: any;
    url?: string;
    platform?: string;
    campaignId?: string;
    profileData?: any;
}

interface BackgroundApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

// Global configuration constants
const BACKGROUND_API_BASE_URL = 'http://localhost:8000/api/v0';
const BACKGROUND_FRONTEND_URL = 'http://localhost:3000';

// Global state
let lastAuthCheck = 0;
const AUTH_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

// Main initialization function
function initializeBackgroundScript(): void {
    console.log('Background: Echo Extension Service Worker started');
    setupAllEventListeners();
    updateBadge();
    checkPeriodicAuth();
}

// SINGLE EVENT LISTENERS SETUP FUNCTION
function setupAllEventListeners(): void {
    // Extension lifecycle events
    chrome.runtime.onInstalled.addListener(handleExtensionInstalled);
    chrome.runtime.onStartup.addListener(handleExtensionStartup);
    
    // Message handling
    chrome.runtime.onMessage.addListener(handleMessage);
    
    // Storage changes
    chrome.storage.onChanged.addListener(handleStorageChanged);
    
    // Tab updates (for profile detection)
    chrome.tabs.onUpdated.addListener(handleTabUpdated);
    chrome.tabs.onActivated.addListener(handleTabActivated);
}

// Event Handlers
function handleExtensionInstalled(details: chrome.runtime.InstalledDetails): void {
    console.log('Background: Extension installed:', details.reason);
    
    if (details.reason === 'install') {
        openWelcomePage();
    } else if (details.reason === 'update') {
        console.log('Background: Extension updated to version:', chrome.runtime.getManifest().version);
        // Check if user needs to re-authenticate after update
        checkAuthenticationAfterUpdate();
    }
    
    updateBadge();
}

function handleExtensionStartup(): void {
    console.log('Background: Extension started');
    updateBadge();
    checkPeriodicAuth();
}

function handleMessage(
    message: BackgroundMessageData, 
    sender: chrome.runtime.MessageSender, 
    sendResponse: (response?: any) => void
): boolean {
    console.log('Background: Received message:', message.type, message);
    
    switch (message.type) {
        case 'GET_AUTH_STATUS':
            handleGetAuthStatus(sendResponse);
            break;
            
        case 'SAVE_PROFILE':
            handleSaveProfile(message.data, sendResponse);
            break;
            
        case 'GET_USER_DATA':
            handleGetUserData(sendResponse);
            break;
            
        case 'LOGOUT':
            handleLogoutMessage(sendResponse);
            break;
            
        case 'OPEN_DASHBOARD':
            handleOpenDashboardFromBackground(sendResponse);
            break;
            
        case 'CHECK_PROFILE_ON_TAB':
            handleCheckProfileOnTab(message.data, sendResponse);
            break;
            
        case 'USER_REGISTERED':
        case 'USER_LOGGED_IN':
            handleUserAuthenticated(message.data, sendResponse);
            break;
            
        default:
            console.log('Background: Unknown message type:', message.type);
            sendResponse({ success: false, error: 'Unknown message type' });
            break;
    }
    
    return true; // Keep the message channel open for async responses
}

function handleStorageChanged(
    changes: { [key: string]: chrome.storage.StorageChange }, 
    areaName: string
): void {
    console.log('Background: Storage changed:', areaName, changes);
    
    if (areaName === 'local') {
        // Check if auth data changed
        if (changes.accessToken || changes.userEmail) {
            updateBadge();
            notifyAllTabs('AUTH_STATUS_CHANGED', { 
                hasAuth: !!changes.accessToken?.newValue 
            });
        }
    }
}

function handleTabUpdated(
    tabId: number, 
    changeInfo: chrome.tabs.TabChangeInfo, 
    tab: chrome.tabs.Tab
): void {
    // Only act on complete page loads
    if (changeInfo.status === 'complete' && tab.url) {
        checkForInstagramProfile(tab.url, tabId);
    }
}

function handleTabActivated(activeInfo: chrome.tabs.TabActiveInfo): void {
    chrome.tabs.get(activeInfo.tabId, (tab) => {
        if (chrome.runtime.lastError || !tab.url) return;
        
        checkForInstagramProfile(tab.url, activeInfo.tabId);
    });
}

// Message Handlers
async function handleGetAuthStatus(sendResponse: (response?: any) => void): Promise<void> {
    try {
        const authData = await getStoredAuthDataFromBackground();
        const hasAuth = !!(authData?.accessToken);
        
        sendResponse({ 
            success: true, 
            hasAuth,
            userData: hasAuth ? {
                email: authData.userEmail,
                fullName: authData.userFullName,
                companyName: authData.companyName
            } : null
        });
    } catch (error) {
        console.error('Background: Error getting auth status:', error);
        sendResponse({ success: false, error: 'Failed to get auth status' });
    }
}

async function handleSaveProfile(profileData: any, sendResponse: (response?: any) => void): Promise<void> {
    try {
        const authData = await getStoredAuthDataFromBackground();
        
        if (!authData?.accessToken) {
            sendResponse({ success: false, error: 'Not authenticated' });
            return;
        }

        // Save profile logic here
        const result = await saveProfileToCampaign(profileData, authData);
        
        if (result) {
            showNotification('Profile Saved', `${profileData.platform} profile added to your campaign.`);
            updateBadge('✓');
            sendResponse({ success: true });
        } else {
            sendResponse({ success: false, error: 'Failed to save profile' });
        }
        
    } catch (error) {
        console.error('Background: Error saving profile:', error);
        sendResponse({ success: false, error: 'Failed to save profile' });
    }
}

async function handleGetUserData(sendResponse: (response?: any) => void): Promise<void> {
    try {
        const authData = await getStoredAuthDataFromBackground();
        
        if (!authData?.accessToken) {
            sendResponse({ success: false, error: 'Not authenticated' });
            return;
        }

        // Fetch fresh user data from API
        const userData = await fetchUserData(authData.accessToken);
        
        if (userData) {
            // Update stored data with fresh info
            await updateStoredUserDataFromBackground(userData);
            sendResponse({ success: true, data: userData });
        } else {
            sendResponse({ success: false, error: 'Failed to fetch user data' });
        }
        
    } catch (error) {
        console.error('Background: Error getting user data:', error);
        sendResponse({ success: false, error: 'Failed to get user data' });
    }
}

async function handleLogoutMessage(sendResponse: (response?: any) => void): Promise<void> {
    try {
        await clearAllAuthData();
        updateBadge();
        showNotification('Logged Out', 'You have been successfully logged out.');
        
        // Notify all tabs about logout
        notifyAllTabs('USER_LOGGED_OUT', {});
        
        sendResponse({ success: true });
    } catch (error) {
        console.error('Background: Error during logout:', error);
        sendResponse({ success: false, error: 'Logout failed' });
    }
}

async function handleOpenDashboardFromBackground(sendResponse: (response?: any) => void): Promise<void> {
    try {
        await chrome.tabs.create({
            url: `${BACKGROUND_FRONTEND_URL}/dashboard`,
            active: true
        });
        sendResponse({ success: true });
    } catch (error) {
        console.error('Background: Error opening dashboard:', error);
        sendResponse({ success: false, error: 'Failed to open dashboard' });
    }
}

async function handleCheckProfileOnTab(tabData: any, sendResponse: (response?: any) => void): Promise<void> {
    try {
        // Logic to check if current tab has a detectable profile
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs[0] && tabs[0].url) {
                const isInstagramProfile = checkForInstagramProfile(tabs[0].url, tabs[0].id!);
                sendResponse({ success: true, hasProfile: isInstagramProfile });
            } else {
                sendResponse({ success: false, error: 'No active tab found' });
            }
        });
    } catch (error) {
        console.error('Background: Error checking profile on tab:', error);
        sendResponse({ success: false, error: 'Failed to check profile' });
    }
}

async function handleUserAuthenticated(userData: any, sendResponse: (response?: any) => void): Promise<void> {
    try {
        console.log('Background: User authenticated, updating stored data');
        
        if (userData.accessToken) {
            await storeAuthData(userData);
            updateBadge('✓');
            
            // Notify popup about authentication
            notifyPopup('USER_AUTHENTICATED', userData);
        }
        
        sendResponse({ success: true });
    } catch (error) {
        console.error('Background: Error handling user authentication:', error);
        sendResponse({ success: false, error: 'Failed to handle authentication' });
    }
}

// Authentication Functions
async function getStoredAuthDataFromBackground(): Promise<BackgroundAuthData | null> {
    return new Promise((resolve) => {
        chrome.storage.local.get([
            'accessToken', 
            'userEmail', 
            'userFullName', 
            'companyId', 
            'companyName',
            'userId',
            'refreshToken'
        ], (result) => {
            if (chrome.runtime.lastError) {
                console.error('Background: Error getting stored auth data:', chrome.runtime.lastError);
                resolve(null);
                return;
            }

            resolve({
                accessToken: result.accessToken,
                userEmail: result.userEmail,
                userFullName: result.userFullName,
                companyId: result.companyId,
                companyName: result.companyName,
                userId: result.userId,
                refreshToken: result.refreshToken
            });
        });
    });
}

async function storeAuthData(authData: BackgroundAuthData): Promise<void> {
    return new Promise((resolve) => {
        chrome.storage.local.set({
            accessToken: authData.accessToken,
            userEmail: authData.userEmail,
            userFullName: authData.userFullName,
            companyId: authData.companyId,
            companyName: authData.companyName,
            userId: authData.userId,
            refreshToken: authData.refreshToken
        }, () => {
            if (chrome.runtime.lastError) {
                console.error('Background: Error storing auth data:', chrome.runtime.lastError);
            } else {
                console.log('Background: Auth data stored successfully');
            }
            resolve();
        });
    });
}

async function updateStoredUserDataFromBackground(userData: BackgroundUserData): Promise<void> {
    return new Promise((resolve) => {
        const dataToStore: any = {};
        
        if (userData.full_name) {
            dataToStore.userFullName = userData.full_name;
        }
        
        if (userData.company) {
            dataToStore.companyId = userData.company.id;
            dataToStore.companyName = userData.company.name;
        }
        
        if (userData.id) {
            dataToStore.userId = userData.id;
        }

        chrome.storage.local.set(dataToStore, () => {
            if (chrome.runtime.lastError) {
                console.error('Background: Error updating user data:', chrome.runtime.lastError);
            } else {
                console.log('Background: User data updated successfully');
            }
            resolve();
        });
    });
}

async function clearAllAuthData(): Promise<void> {
    return new Promise((resolve) => {
        chrome.storage.local.remove([
            'accessToken',
            'userEmail', 
            'userFullName',
            'companyId',
            'companyName',
            'userId',
            'refreshToken'
        ], () => {
            if (chrome.runtime.lastError) {
                console.error('Background: Error clearing auth data:', chrome.runtime.lastError);
            } else {
                console.log('Background: Auth data cleared successfully');
            }
            resolve();
        });
    });
}

// API Functions
async function fetchUserData(accessToken: string): Promise<BackgroundUserData | null> {
    try {
        const response = await fetch(`${BACKGROUND_API_BASE_URL}/auth/me`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                // Token expired, clear auth data
                await clearAllAuthData();
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const userData: BackgroundUserData = await response.json();
        console.log('Background: User data fetched:', userData);
        return userData;

    } catch (error) {
        console.error('Background: Error fetching user data:', error);
        return null;
    }
}

async function saveProfileToCampaign(profileData: any, authData: BackgroundAuthData): Promise<boolean> {
    try {
        // Implementation would depend on your API structure
        // This is a placeholder for the actual save functionality
        console.log('Background: Saving profile to campaign:', profileData);
        
        // Example API call structure:
        /*
        const response = await fetch(`${BACKGROUND_API_BASE_URL}/campaign-list-members`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authData.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                campaign_id: profileData.campaignId,
                platform_account_id: profileData.platformAccountId,
                // ... other profile data
            })
        });
        
        return response.ok;
        */
        
        return true; // Placeholder
    } catch (error) {
        console.error('Background: Error saving profile:', error);
        return false;
    }
}

// Profile Detection
function checkForInstagramProfile(url: string, tabId: number): boolean {
    const instagramProfileRegex = /^https?:\/\/(www\.)?instagram\.com\/([^\/\?]+)\/?/;
    const match = url.match(instagramProfileRegex);
    
    if (match) {
        const username = match[2];
        console.log('Background: Instagram profile detected:', username);
        
        // Notify content script about profile detection
        chrome.tabs.sendMessage(tabId, {
            type: 'INSTAGRAM_PROFILE_DETECTED',
            data: { username, url }
        }).catch(() => {
            // Content script might not be ready yet
            console.log('Background: Could not notify content script about profile detection');
        });
        
        updateBadge('📊');
        return true;
    }
    
    return false;
}

// Periodic authentication check
async function checkPeriodicAuth(): Promise<void> {
    const now = Date.now();
    
    if (now - lastAuthCheck < AUTH_CHECK_INTERVAL) {
        return; // Too soon to check again
    }
    
    lastAuthCheck = now;
    
    try {
        const authData = await getStoredAuthDataFromBackground();
        
        if (authData?.accessToken) {
            const userData = await fetchUserData(authData.accessToken);
            
            if (!userData) {
                console.log('Background: Periodic auth check failed, clearing stored auth');
                await clearAllAuthData();
                updateBadge();
                showNotification('Session Expired', 'Please log in again to continue using the extension.');
            } else {
                console.log('Background: Periodic auth check successful');
                await updateStoredUserDataFromBackground(userData);
            }
        }
    } catch (error) {
        console.error('Background: Error during periodic auth check:', error);
    }
    
    // Schedule next check
    setTimeout(checkPeriodicAuth, AUTH_CHECK_INTERVAL);
}

async function checkAuthenticationAfterUpdate(): Promise<void> {
    const authData = await getStoredAuthDataFromBackground();
    
    if (authData?.accessToken) {
        // Verify token is still valid after update
        const userData = await fetchUserData(authData.accessToken);
        
        if (!userData) {
            showNotification('Re-authentication Required', 'Please log in again after the extension update.');
            await clearAllAuthData();
        }
    }
}

// Utility Functions
async function openWelcomePage(): Promise<void> {
    try {
        await chrome.tabs.create({
            url: `${BACKGROUND_FRONTEND_URL}/register?source=extension&welcome=true`,
            active: true
        });
    } catch (error) {
        console.error('Background: Failed to open welcome page:', error);
    }
}

function updateBadge(text: string = ''): void {
    chrome.action.setBadgeText({ text });
    
    if (text === '✓') {
        chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
    } else if (text === '📊') {
        chrome.action.setBadgeBackgroundColor({ color: '#2196F3' });
    } else if (text === '🚀') {
        chrome.action.setBadgeBackgroundColor({ color: '#FF9800' });
    } else {
        chrome.action.setBadgeBackgroundColor({ color: '#757575' });
    }
}

function showNotification(title: string, message: string): void {
    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/echooo-favicon-48x48.png',
        title,
        message
    });
}

function notifyPopup(type: string, data: any): void {
    chrome.runtime.sendMessage({ type, data }).catch(() => {
        console.log('Background: No popup to notify');
    });
}

function notifyAllTabs(type: string, data: any): void {
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
            if (tab.id) {
                chrome.tabs.sendMessage(tab.id, { type, data }).catch(() => {
                    // Tab might not have content script, which is fine
                });
            }
        });
    });
}

// Initialize background service worker
initializeBackgroundScript();