// Popup interface for Echo Outreach Agent Extension - Function-Based TypeScript version
interface PopupCategoryData {
    name: string;
    count: number;
    id?: number;
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
let popupCategoriesData: PopupCategoryData[] = [];
let popupUserData: PopupUserData | null = null;

async function initializePopup(): Promise<void> {
    console.log('Echo Extension Popup initialized');
    
    showSection('loading');
    
    try {
        const authStatus = await checkAuthStatus();
        
        if (authStatus.isAuthenticated) {
            popupIsRegistered = true;
            popupUserData = authStatus.data;
            await loadDashboard();
        } else {
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
        chrome.runtime.sendMessage({ type: 'GET_AUTH_STATUS' }, (response) => {
            if (response && response.success) {
                resolve({
                    isAuthenticated: response.isAuthenticated,
                    data: response.data
                });
            } else {
                resolve({ isAuthenticated: false });
            }
        });
    });
}

async function loadDashboard(): Promise<void> {
    try {
        showSection('dashboard');
        await loadCategoriesWithAuth();
        updateUserInfo();
        updateStats();
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

    const refreshBtn = document.getElementById('refresh-btn');
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

// COMBINED FUNCTION: Get auth data and load categories in one function
async function loadCategoriesWithAuth(): Promise<void> {
    try {
        // Get stored auth data
        const authData = await new Promise<Record<string, any> | null>((resolve) => {
            chrome.storage.local.get(['accessToken', 'userEmail', 'userDetails'], (result) => {
                resolve(Object.keys(result).length > 0 ? result : null);
            });
        });

        if (!authData?.accessToken) {
            throw new Error('No authentication token available');
        }

        // Load categories using auth data
        const response = await fetch(`${POPUP_API_BASE_URL}/categories`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authData.accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data: PopupApiResponse<PopupCategoryData[]> = await response.json();
            
            // Handle different API response formats with proper type checking
            if (Array.isArray(data.data)) {
                popupCategoriesData = data.data;
            } else if (Array.isArray(data.items)) {
                // Ensure data.items is flat array, not nested array
                const items = data.items;
                if (items.length > 0 && Array.isArray(items[0])) {
                    // If nested array, flatten it with proper type conversion
                    popupCategoriesData = (items as unknown as PopupCategoryData[][]).flat();
                } else {
                    // If already flat array
                    popupCategoriesData = items;
                }
            } else if (Array.isArray(data)) {
                popupCategoriesData = data as PopupCategoryData[];
            } else {
                popupCategoriesData = [];
            }
            
            renderCategories();
            console.log('Categories loaded:', popupCategoriesData);
        } else {
            throw new Error(`API responded with status: ${response.status}`);
        }
    } catch (error) {
        console.error('Failed to load categories:', error);
        const categoriesList = document.getElementById('categories-list');
        if (categoriesList) {
            categoriesList.innerHTML = '<div class="category-item">Unable to load categories</div>';
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

async function analyzeCurrentPage(): Promise<void> {
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
        }, (response) => {
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
        }, (response) => {
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
    const platformDetection = document.getElementById('platform-detection');

    if (pageTitle) {
        pageTitle.textContent = pageInfo.title.length > 50 
            ? pageInfo.title.substring(0, 50) + '...' 
            : pageInfo.title;
    }

    if (pagePlatform) {
        if (pageInfo.platform && pageInfo.platform !== 'unknown') {
            pagePlatform.innerHTML = `
                <span class="platform-badge platform-${pageInfo.platform}">
                    ${getPlatformIcon(pageInfo.platform)} ${pageInfo.platform}
                </span>
            `;
        } else {
            pagePlatform.innerHTML = '<span style="color: #666;">No social media platform detected</span>';
        }
    }

    if (platformDetection) {
        if (pageInfo.platform && pageInfo.platform !== 'unknown') {
            platformDetection.classList.remove('hidden');
        } else {
            platformDetection.classList.add('hidden');
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

function renderCategories(): void {
    const categoriesList = document.getElementById('categories-list');
    if (!categoriesList) return;

    if (popupCategoriesData.length === 0) {
        categoriesList.innerHTML = '<div class="category-item">No categories available</div>';
        return;
    }

    categoriesList.innerHTML = popupCategoriesData.map(category => `
        <div class="category-item">
            <span class="category-name">${category.name || 'Unnamed Category'}</span>
            <span class="category-count">${category.count || '0'}</span>
        </div>
    `).join('');
}

function updateStats(): void {
    const activeCampaigns = document.getElementById('active-campaigns');
    const categoriesCount = document.getElementById('categories-count');

    if (activeCampaigns) {
        activeCampaigns.textContent = popupUserData?.activeCampaigns?.toString() || '0';
    }

    if (categoriesCount) {
        categoriesCount.textContent = popupCategoriesData.length.toString();
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
        await chrome.tabs.create({
            url: `${POPUP_FRONTEND_URL}/register?source=extension`,
            active: true
        });

        window.close();
    } catch (error) {
        console.error('Failed to open registration:', error);
        showError('Failed to open registration page');
    }
}

async function refreshData(): Promise<void> {
    console.log('Refreshing categories...');
    try {
        await loadCategoriesWithAuth();
        console.log('Categories refreshed successfully');
    } catch (error) {
        console.error('Failed to refresh categories:', error);
        showError('Failed to refresh categories');
    }
}

async function getCurrentPageInfo(): Promise<PopupPageInfo> {
    return new Promise((resolve, reject) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0] && tabs[0].id) {
                chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_PAGE_INFO' }, (response) => {
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
    const sections = ['loading', 'registration-required', 'dashboard', 'error-state'];
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
    const userEmail = document.getElementById('user-email');
    const userFullName = document.getElementById('user-full-name');
    const userDetails = popupUserData?.userDetails;
    
    if (userFullName) {
        if (userDetails) {
            const displayName = userDetails.full_name || 
                             userDetails.email.split('@')[0] || 
                             'User';
            userFullName.textContent = displayName;
        } else {
            userFullName.textContent = 'User';
        }
    }

    if (userEmail) {
        userEmail.textContent = userDetails?.email || 'No email found';
    }
}

async function clearStoredData(): Promise<void> {
    return new Promise((resolve) => {
        chrome.storage.local.clear(() => {
            console.log('Extension storage cleared');
            resolve();
        });
    });
}

async function clearFrontendTokens(): Promise<void> {
    try {
        const tabs = await chrome.tabs.query({ url: 'http://localhost:3000/*' });
        
        for (const tab of tabs) {
            if (tab.id) {
                try {
                    await chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        func: () => {
                            localStorage.removeItem('accessToken');
                            localStorage.removeItem('authToken');
                            localStorage.removeItem('token');
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
        window.location.reload();
    }
    
    sendResponse({ success: true });
});