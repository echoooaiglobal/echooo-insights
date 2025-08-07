// src/popup.ts - Enhanced with user data and campaigns display
// Updated interfaces to match exact backend model fields
interface PopupUserData {
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

interface PopupCampaignData {
    id: string;                     // UUID field from Campaign model
    company_id: string;             // matches Campaign model
    name: string;                   // matches Campaign model
    description?: string;           // matches Campaign model
    brand_name?: string;            // matches Campaign model
    budget?: number;                // matches Campaign model
    currency_code?: string;         // matches Campaign model  
    start_date?: string;            // matches Campaign model
    end_date?: string;              // matches Campaign model
    created_at: string;
    updated_at: string;
    is_deleted: boolean;            // matches Campaign model
    status?: {                      // matches Campaign model relationship
        id: string;
        name: string;
    };
    category?: {                    // matches Campaign model relationship
        id: string;
        name: string;
    };
}

interface PopupApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

interface PopupMessageData {
    type: string;
    data?: any;
}

interface PopupAuthData {
    accessToken?: string;
    userEmail?: string;
    userFullName?: string;
    companyId?: string;
    companyName?: string;
}

// Configuration constants
const POPUP_API_BASE_URL = 'http://localhost:8000/api/v0';
const POPUP_FRONTEND_URL = 'http://localhost:3000';

// Global state
let currentUser: PopupUserData | null = null;
let currentCampaigns: PopupCampaignData[] = [];
let isLoading = false;

// Main initialization function
function initializePopup(): void {
    console.log('Popup: Initializing...');
    showLoadingState();
    checkAuthenticationAndLoadData();
}

// Authentication and data loading
async function checkAuthenticationAndLoadData(): Promise<void> {
    try {
        const authData = await getStoredAuthDataFromPopup();
        
        if (!authData?.accessToken) {
            console.log('Popup: No auth token found, showing registration state');
            showRegistrationRequiredState();
            return;
        }

        console.log('Popup: Auth token found, loading user data...');
        await loadUserDataAndCampaigns(authData);

    } catch (error) {
        console.error('Popup: Error during initialization:', error);
        showErrorState('Failed to initialize extension');
    }
}

// Get stored authentication data
async function getStoredAuthDataFromPopup(): Promise<PopupAuthData | null> {
    return new Promise((resolve) => {
        chrome.storage.local.get([
            'accessToken', 
            'userEmail', 
            'userFullName', 
            'companyId', 
            'companyName'
        ], (result) => {
            if (chrome.runtime.lastError) {
                console.error('Popup: Error getting stored data:', chrome.runtime.lastError);
                resolve(null);
                return;
            }

            const authData: PopupAuthData = {
                accessToken: result.accessToken,
                userEmail: result.userEmail,
                userFullName: result.userFullName,
                companyId: result.companyId,
                companyName: result.companyName
            };

            resolve(authData);
        });
    });
}

// Load user data and campaigns
async function loadUserDataAndCampaigns(authData: PopupAuthData): Promise<void> {
    try {
        console.log('Popup: Making API call to fetch user data...');
        
        // Load user profile data
        const userResponse = await makeApiCall<PopupUserData>('/auth/me', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authData.accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('Popup: API response received:', userResponse);

        if (!userResponse.success) {
            console.error('Popup: API returned error:', userResponse.error);
            throw new Error(userResponse.error || 'Failed to load user data');
        }

        if (!userResponse.data) {
            console.error('Popup: API returned no data');
            throw new Error('No user data received from API');
        }

        currentUser = userResponse.data;
        console.log('Popup: User data loaded successfully:', currentUser);
        console.log('Popup: User type:', currentUser.user_type);
        console.log('Popup: Company info:', currentUser.company);
        console.log('Popup: User roles:', currentUser.roles);

        // Update stored user info if we have new data
        if (currentUser.full_name || currentUser.company) {
            await updateStoredUserData(currentUser);
        }

        // Load campaigns if user has a company
        if (currentUser.company?.id) {
            console.log('Popup: User has company, loading campaigns for:', currentUser.company.id);
            await loadCompanyCampaigns(currentUser.company.id, authData.accessToken!);
        } else {
            console.log('Popup: User has no company association');
            console.log('Popup: User type is:', currentUser.user_type);
            console.log('Popup: Company field value:', currentUser.company);
            currentCampaigns = [];
        }

        // Show dashboard with loaded data
        showDashboardState();

    } catch (error) {
        console.error('Popup: Error loading user data:', error);
        
        // If auth error (401/403), clear stored data and show registration
        if (error instanceof Error && (error.message.includes('401') || error.message.includes('403'))) {
            console.log('Popup: Authentication error, clearing stored data');
            await clearStoredAuthData();
            showRegistrationRequiredState();
        } else {
            showErrorState(`Failed to load user data: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}

// Load company campaigns
async function loadCompanyCampaigns(companyId: string, accessToken: string): Promise<void> {
    try {
        console.log('Popup: Loading campaigns for company:', companyId);
        
        const campaignsResponse = await makeApiCall<PopupCampaignData[]>(`/campaigns/company/${companyId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('Popup: Campaigns API response:', campaignsResponse);

        if (campaignsResponse.success && campaignsResponse.data) {
            // No filtering needed - use all campaigns from backend
            // The status field is now an object with id and name
            currentCampaigns = campaignsResponse.data.filter(campaign => 
                !campaign.is_deleted // Only filter out deleted campaigns
            );
            console.log('Popup: Filtered campaigns loaded:', currentCampaigns.length, 'campaigns');
        } else {
            console.log('Popup: No campaigns found or API error:', campaignsResponse.error);
            currentCampaigns = [];
        }

    } catch (error) {
        console.error('Popup: Error loading campaigns:', error);
        currentCampaigns = [];
    }
}

// Update stored user data
async function updateStoredUserData(userData: PopupUserData): Promise<void> {
    return new Promise((resolve) => {
        const dataToStore: any = {};
        
        if (userData.full_name) {
            dataToStore.userFullName = userData.full_name;
        }
        
        if (userData.company) {
            dataToStore.companyId = userData.company.id;
            dataToStore.companyName = userData.company.name;
        }

        chrome.storage.local.set(dataToStore, () => {
            if (chrome.runtime.lastError) {
                console.error('Popup: Error updating stored user data:', chrome.runtime.lastError);
            } else {
                console.log('Popup: Updated stored user data');
            }
            resolve();
        });
    });
}

// Clear stored auth data
async function clearStoredAuthData(): Promise<void> {
    return new Promise((resolve) => {
        chrome.storage.local.remove([
            'accessToken',
            'userEmail', 
            'userFullName',
            'companyId',
            'companyName'
        ], () => {
            if (chrome.runtime.lastError) {
                console.error('Popup: Error clearing auth data:', chrome.runtime.lastError);
            }
            resolve();
        });
    });
}

// Make API call utility
async function makeApiCall<T>(endpoint: string, options: RequestInit): Promise<PopupApiResponse<T>> {
    try {
        const url = `${POPUP_API_BASE_URL}${endpoint}`;
        console.log('Popup: Making API call to:', url);
        console.log('Popup: Request options:', {
            method: options.method,
            headers: options.headers,
            // Don't log body content for security
        });
        
        const response = await fetch(url, {
            ...options,
            mode: 'cors'
        });

        console.log('Popup: Response status:', response.status, response.statusText);

        let data;
        try {
            data = await response.json();
            console.log('Popup: Response data:', data);
        } catch (parseError) {
            console.error('Popup: Error parsing JSON response:', parseError);
            return {
                success: false,
                error: 'Invalid JSON response from server'
            };
        }

        if (!response.ok) {
            const errorMessage = data?.error || data?.detail || `HTTP ${response.status}: ${response.statusText}`;
            console.error('Popup: API error response:', errorMessage);
            return {
                success: false,
                error: errorMessage
            };
        }

        return {
            success: true,
            data: data
        };

    } catch (error) {
        console.error('Popup: Network error in API call:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Network error'
        };
    }
}

// UI State Management Functions
function showLoadingState(): void {
    hideAllSections();
    const loadingSection = getElementById('loading');
    if (loadingSection) {
        loadingSection.classList.remove('hidden');
    }
    isLoading = true;
}

function showRegistrationRequiredState(): void {
    hideAllSections();
    const regSection = getElementById('registration-required');
    if (regSection) {
        regSection.classList.remove('hidden');
        setupRegistrationEventListeners();
    }
    isLoading = false;
}

function showDashboardState(): void {
    hideAllSections();
    const dashboardSection = getElementById('dashboard');
    if (dashboardSection) {
        dashboardSection.classList.remove('hidden');
        updateDashboardUI();
        setupDashboardEventListeners();
    }
    isLoading = false;
}

function showErrorState(message: string): void {
    hideAllSections();
    
    // Create or update error section
    let errorSection = getElementById('error-state');
    if (!errorSection) {
        errorSection = createElement('div', {
            id: 'error-state',
            className: 'section error-section',
            innerHTML: `
                <div class="icon-wrapper">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="15" y1="9" x2="9" y2="15"></line>
                        <line x1="9" y1="9" x2="15" y2="15"></line>
                    </svg>
                </div>
                <h3>Error</h3>
                <p id="error-message"></p>
                <button id="retry-btn" class="primary-btn">
                    <span>🔄</span> Retry
                </button>
            `
        });
        
        const container = getElementById('popup-container') || document.body;
        container.appendChild(errorSection);
        
        // Setup retry button
        const retryBtn = getElementById('retry-btn');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                initializePopup();
            });
        }
    }
    
    // Update error message
    const errorMessage = getElementById('error-message');
    if (errorMessage) {
        errorMessage.textContent = message;
    }
    
    errorSection.classList.remove('hidden');
    isLoading = false;
}

function hideAllSections(): void {
    const sections = ['loading', 'registration-required', 'dashboard', 'error-state'];
    sections.forEach(sectionId => {
        const section = getElementById(sectionId);
        if (section) {
            section.classList.add('hidden');
        }
    });
}

function updateDashboardUI(): void {
    // Update user name
    const userNameElement = getElementById('user-full-name');
    if (userNameElement && currentUser) {
        const displayName = currentUser.full_name || currentUser.email || 'User';
        userNameElement.textContent = `👋 Welcome, ${displayName}`;
    }

    // Update company name
    const companyNameElement = getElementById('company-name');
    if (companyNameElement) {
        if (currentUser?.company?.name) {
            companyNameElement.textContent = currentUser.company.name;
        } else if (currentUser?.user_type === 'company' || currentUser?.user_type === 'b2c') {
            companyNameElement.textContent = 'Company Account';
        } else if (currentUser?.user_type === 'influencer') {
            companyNameElement.textContent = 'Influencer Account';
        } else {
            companyNameElement.textContent = 'Personal Account';
        }
    }

    // Update campaigns count
    const campaignsCountElement = getElementById('campaigns-count');
    if (campaignsCountElement) {
        campaignsCountElement.textContent = currentCampaigns.length.toString();
    }

    // Update campaigns dropdown
    updateCampaignsDropdown();
}

function updateCampaignsDropdown(): void {
    const campaignSelect = getElementById('campaign-select') as HTMLSelectElement;
    if (!campaignSelect) return;

    // Clear existing options
    campaignSelect.innerHTML = '';

    // Add default option
    const defaultOption = createElement('option', {
        value: '',
        textContent: currentCampaigns.length > 0 ? 'Select Campaign' : 'No Active Campaigns'
    }) as HTMLOptionElement;
    defaultOption.disabled = true;
    defaultOption.selected = true;
    campaignSelect.appendChild(defaultOption);

    // Add campaign options
    currentCampaigns.forEach(campaign => {
        // Show campaign name and status if available
        const statusText = campaign.status?.name || 'No Status';
        const optionText = `${campaign.name} (${statusText})`;
        
        const option = createElement('option', {
            value: campaign.id,
            textContent: optionText
        }) as HTMLOptionElement;
        campaignSelect.appendChild(option);
    });

    // Enable/disable based on campaigns availability
    campaignSelect.disabled = currentCampaigns.length === 0;
}

// Event Listeners Setup
function setupRegistrationEventListeners(): void {
    const registerBtn = getElementById('register-btn');
    if (registerBtn) {
        registerBtn.addEventListener('click', handleRegistrationClick);
    }
}

function setupDashboardEventListeners(): void {
    const logoutBtn = getElementById('logout-btn');
    const refreshBtn = getElementById('refresh-campaigns');
    const openDashboardBtn = getElementById('open-dashboard');

    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    if (refreshBtn) {
        refreshBtn.addEventListener('click', handleRefreshCampaigns);
    }

    if (openDashboardBtn) {
        openDashboardBtn.addEventListener('click', handleOpenDashboardFromPopup);
    }
}

// Event Handlers
async function handleRegistrationClick(): Promise<void> {
    try {
        await chrome.tabs.create({
            url: `${POPUP_FRONTEND_URL}/register?source=extension`,
            active: true
        });
        window.close();
    } catch (error) {
        console.error('Popup: Error opening registration:', error);
    }
}

async function handleLogout(): Promise<void> {
    try {
        showLoadingState();
        await clearStoredAuthData();
        
        // Clear frontend localStorage via message to content script
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs[0] && tabs[0].id) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    type: 'CLEAR_AUTH_DATA'
                });
            }
        });

        // Reset state
        currentUser = null;
        currentCampaigns = [];
        
        showRegistrationRequiredState();
        
    } catch (error) {
        console.error('Popup: Error during logout:', error);
        showErrorState('Failed to logout');
    }
}

async function handleRefreshCampaigns(): Promise<void> {
    if (!currentUser?.company?.id || isLoading) return;

    try {
        const refreshBtn = getElementById('refresh-campaigns');
        if (refreshBtn) {
            refreshBtn.textContent = '🔄 Refreshing...';
            refreshBtn.setAttribute('disabled', 'true');
        }

        const authData = await getStoredAuthDataFromPopup();
        if (authData?.accessToken) {
            await loadCompanyCampaigns(currentUser.company.id, authData.accessToken);
            updateCampaignsDropdown();
        }

    } catch (error) {
        console.error('Popup: Error refreshing campaigns:', error);
    } finally {
        const refreshBtn = getElementById('refresh-campaigns');
        if (refreshBtn) {
            refreshBtn.textContent = '🔄 Refresh';
            refreshBtn.removeAttribute('disabled');
        }
    }
}

async function handleOpenDashboardFromPopup(): Promise<void> {
    try {
        await chrome.tabs.create({
            url: `${POPUP_FRONTEND_URL}/dashboard`,
            active: true
        });
        window.close();
    } catch (error) {
        console.error('Popup: Error opening dashboard:', error);
    }
}

// Utility Functions
function getElementById(id: string): HTMLElement | null {
    return document.getElementById(id);
}

function createElement(tagName: string, options: {
    id?: string;
    className?: string;
    textContent?: string;
    innerHTML?: string;
    [key: string]: any;
}): HTMLElement {
    const element = document.createElement(tagName);
    
    Object.keys(options).forEach(key => {
        if (key === 'className') {
            element.className = options[key];
        } else if (key === 'textContent') {
            element.textContent = options[key];
        } else if (key === 'innerHTML') {
            element.innerHTML = options[key];
        } else {
            element.setAttribute(key, options[key]);
        }
    });
    
    return element;
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializePopup();
});

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message: PopupMessageData, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
    console.log('Popup received message:', message);
    
    if (message.type === 'USER_REGISTERED' || message.type === 'USER_LOGGED_IN') {
        initializePopup();
        sendResponse({ success: true });
    } else if (message.type === 'USER_LOGGED_OUT') {
        handleLogout();
        sendResponse({ success: true });
    } else {
        sendResponse({ success: false, error: 'Unknown message type' });
    }
    
    return true;
});