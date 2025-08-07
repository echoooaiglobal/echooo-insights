// Background service worker for Echo Outreach Agent Extension - Function-Based TypeScript version
interface BackgroundAuthData {
    token?: string;
    email?: string;
    source?: string;
    accessToken?: string;
    userEmail?: string;
}

interface BackgroundMessageData {
    type: string;
    data?: any;
    url?: string;
    platform?: string;
}

interface BackgroundApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
}

interface BackgroundUserData {
    id: number;
    email: string;
    full_name?: string;
    created_at: string;
    updated_at: string;
    is_active: boolean;
}

// Global configuration constants
const BACKGROUND_API_BASE_URL = 'http://localhost:8000/api/v0';
const BACKGROUND_FRONTEND_URL = 'http://localhost:3000';

// Main initialization function
function initializeBackgroundScript(): void {
    console.log('Echo Extension Background Service Worker started');
    setupAllEventListeners();
    updateBadge();
}

// SINGLE EVENT LISTENERS SETUP FUNCTION - No duplicates
function setupAllEventListeners(): void {
    // Extension lifecycle events
    chrome.runtime.onInstalled.addListener((details: chrome.runtime.InstalledDetails) => {
        console.log('Extension installed:', details.reason);
        
        if (details.reason === 'install') {
            openWelcomePage();
        } else if (details.reason === 'update') {
            console.log('Extension updated to version:', chrome.runtime.getManifest().version);
        }
        
        updateBadge();
    });

    chrome.runtime.onStartup.addListener(() => {
        console.log('Extension started');
        updateBadge();
    });

    // Message handling
    chrome.runtime.onMessage.addListener((message: BackgroundMessageData, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
        if (message.type === 'AUTH_DATA_DETECTED') {
            handleJWTDetection(message.data);
            sendResponse({ success: true });
            return true;
        }
        
        handleMessage(message, sender, sendResponse);
        return true;
    });

    // Tab update monitoring
    chrome.tabs.onUpdated.addListener((tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
        if (changeInfo.status === 'complete' && tab.url) {
            const url = new URL(tab.url);
            
            if (url.hostname.includes('localhost') && url.port === '3000') {
                if (url.pathname.includes('/dashboard') || url.pathname.includes('/campaign')) {
                    console.log('User navigated to Echo dashboard');
                    updateBadge('🚀');
                }
            }
            
            if (isSocialMediaSite(url.hostname)) {
                updateBadge('📊');
            }
        }
    });

    // Set up API interceptors
    console.log('API interceptors set up for monitoring auth tokens');
}

// COMBINED FUNCTION: Get stored auth data and use it
async function getStoredAuthDataAndExecute<T>(
    callback: (authData: Record<string, any>) => Promise<T>,
    requireAuth: boolean = true
): Promise<T | null> {
    try {
        // Get stored auth data
        const authData = await new Promise<Record<string, any> | null>((resolve) => {
            chrome.storage.local.get(['accessToken', 'userEmail', 'lastSync', 'userDetails'], (result) => {
                resolve(Object.keys(result).length > 0 ? result : null);
            });
        });

        if (requireAuth && !authData?.accessToken) {
            throw new Error('No authentication data available');
        }

        // Execute callback with auth data
        return await callback(authData || {});
    } catch (error) {
        console.error('Error in auth data operation:', error);
        return null;
    }
}

async function handleJWTDetection(data: BackgroundAuthData): Promise<void> {
    try {
        console.log('JWT token detected:', { 
            hasToken: !!data.token,
            email: data.email,
            source: data.source 
        });

        if (data.token && data.email) {
            await storeAuthData({
                accessToken: data.token,
                userEmail: data.email,
                lastSync: Date.now()
            });

            updateBadge('✓');
            console.log('Auth data stored successfully');
            notifyContentScript('AUTH_SAVED', { success: true });
        }
    } catch (error) {
        console.error('Error handling JWT detection:', error);
    }
}

async function handleMessage(message: BackgroundMessageData, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void): Promise<void> {
    try {
        switch (message.type) {
            case 'GET_AUTH_STATUS':
                const authResult = await getStoredAuthDataAndExecute(async (authData) => {
                    return {
                        success: true,
                        isAuthenticated: !!authData.accessToken,
                        data: authData
                    };
                }, false);
                sendResponse(authResult || { success: true, isAuthenticated: false });
                break;

            case 'SAVE_AUTH_DATA':
                await storeAuthData(message.data);
                await validateAndSyncUser(message.data);
                sendResponse({ success: true });
                break;

            case 'CLEAR_AUTH_DATA':
                await clearAuthData();
                sendResponse({ success: true });
                break;

            case 'ANALYZE_PROFILE':
                const analyzeResult = await analyzeProfile(message.data);
                sendResponse({ success: !!analyzeResult });
                break;

            case 'SAVE_PROFILE':
                const saveResult = await saveProfileToCampaign(message.data);
                sendResponse({ success: !!saveResult });
                break;

            case 'OPEN_DASHBOARD':
                await openDashboard();
                sendResponse({ success: true });
                break;

            case 'PROFILE_DETECTED':
                await handleProfileDetection(message.data);
                sendResponse({ success: true });
                break;

            default:
                console.warn('Unknown message type:', message.type);
                sendResponse({ success: false, error: 'Unknown message type' });
        }
    } catch (error) {
        console.error('Error handling message:', error);
        sendResponse({ success: false, error: (error as Error).message });
    }
}

async function openWelcomePage(): Promise<void> {
    try {
        await chrome.tabs.create({
            url: `${BACKGROUND_FRONTEND_URL}/register?source=extension&welcome=true`
        });
    } catch (error) {
        console.error('Failed to open welcome page:', error);
    }
}

function isSocialMediaSite(hostname: string): boolean {
    const socialSites = [
        'instagram.com',
        'twitter.com',
        'x.com',
        'linkedin.com',
        'tiktok.com',
        'youtube.com',
        'facebook.com'
    ];
    
    return socialSites.some(site => hostname.includes(site));
}

async function storeAuthData(authData: Record<string, any>): Promise<void> {
    return new Promise((resolve) => {
        chrome.storage.local.set(authData, () => {
            console.log('Auth data stored:', Object.keys(authData));
            resolve();
        });
    });
}

async function clearAuthData(): Promise<void> {
    return new Promise((resolve) => {
        chrome.storage.local.clear(() => {
            console.log('Auth data cleared');
            updateBadge();
            resolve();
        });
    });
}

async function validateAndSyncUser(authData: BackgroundAuthData): Promise<void> {
    await getStoredAuthDataAndExecute(async (storedData) => {
        const token = authData.accessToken || storedData.accessToken;
        const email = authData.userEmail || storedData.userEmail;

        if (!token || !email) {
            throw new Error('Missing auth data for validation');
        }

        const response = await fetch(`${BACKGROUND_API_BASE_URL}/users/me`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const userData: BackgroundUserData = await response.json();
            console.log('User validation successful:', userData.email);
            
            await storeAuthData({
                ...authData,
                userDetails: userData,
                lastValidation: Date.now()
            });

            updateBadge('✓');
        } else {
            console.warn('User validation failed:', response.status);
            if (response.status === 401 || response.status === 403) {
                await clearAuthData();
            }
        }

        return true;
    });
}

async function analyzeProfile(data: { url: string; platform: string }): Promise<boolean> {
    return await getStoredAuthDataAndExecute(async (authData) => {
        const response = await fetch(`${BACKGROUND_API_BASE_URL}/profiles/analyze`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authData.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                profile_url: data.url,
                platform: data.platform
            })
        });

        const result: BackgroundApiResponse = await response.json();
        
        if (result.success) {
            console.log('Profile analysis completed:', result.data);
            showNotification('Profile analysis completed!', `Analysis for ${data.platform} profile is ready.`);
            return true;
        } else {
            throw new Error(result.error || 'Analysis failed');
        }
    }) ?? false;
}

async function saveProfileToCampaign(data: { url: string; platform: string }): Promise<boolean> {
    return await getStoredAuthDataAndExecute(async (authData) => {
        const response = await fetch(`${BACKGROUND_API_BASE_URL}/campaigns/add-profile`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authData.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                profile_url: data.url,
                platform: data.platform
            })
        });

        const result: BackgroundApiResponse = await response.json();
        
        if (result.success) {
            console.log('Profile saved to campaign:', result.data);
            showNotification('Profile Saved!', `${data.platform} profile added to your campaign.`);
            return true;
        } else {
            throw new Error(result.error || 'Save failed');
        }
    }) ?? false;
}

async function openDashboard(): Promise<void> {
    try {
        await chrome.tabs.create({
            url: `${BACKGROUND_FRONTEND_URL}/dashboard`,
            active: true
        });
    } catch (error) {
        console.error('Failed to open dashboard:', error);
    }
}

async function handleProfileDetection(profileData: Record<string, any>): Promise<void> {
    console.log('Profile detected:', profileData);
    
    await getStoredAuthDataAndExecute(async (authData) => {
        if (authData.accessToken) {
            console.log('Storing detected profile data');
        } else {
            console.log('Profile detected but user not authenticated');
        }
        return true;
    }, false);
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

function notifyContentScript(type: string, data: any): void {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].id) {
            chrome.tabs.sendMessage(tabs[0].id, { type, data });
        }
    });
}

// Initialize background service worker
initializeBackgroundScript();