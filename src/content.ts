// src/content.ts - Enhanced content script for profile detection and data extraction
interface ProfileData {
    username?: string;
    fullName?: string;
    bio?: string;
    followers?: string;
    following?: string;
    posts?: string;
    profilePicture?: string;
    isVerified?: boolean;
    isPrivate?: boolean;
    platform?: string;
    url?: string;
}

interface ContentMessageData {
    type: string;
    data?: any;
    url?: string;
    platform?: string;
    profileData?: ProfileData;
}

interface ContentAuthData {
    accessToken?: string;
    userEmail?: string;
}

// Global state
let isInitialized = false;
let currentProfileData: ProfileData | null = null;
let lastUrlCheck = '';
let profileCheckInterval: number | null = null;

// Main initialization function
function initializeContentScript(): void {
    if (isInitialized) return;
    
    console.log('Content: Echo Extension content script initialized on:', window.location.href);
    
    // Set up content script
    setupContentScript();
    
    // Check current page
    checkCurrentPage();
    
    // Set up periodic profile checking
    startProfileMonitoring();
    
    // Set up message listeners
    setupMessageListeners();
    
    isInitialized = true;
}

function setupContentScript(): void {
    // Add content script marker to window
    (window as any).echoExtensionContent = true;
    
    // Add custom styles if needed
    addCustomStyles();
}

function setupMessageListeners(): void {
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message: ContentMessageData, sender, sendResponse) => {
        console.log('Content: Received message:', message.type);
        
        switch (message.type) {
            case 'EXTRACT_PROFILE_DATA':
                handleExtractProfileData(sendResponse);
                break;
                
            case 'INSTAGRAM_PROFILE_DETECTED':
                handleProfileDetected(message.data);
                sendResponse({ success: true });
                break;
                
            case 'CHECK_CURRENT_PROFILE':
                const profileData = extractCurrentProfileData();
                sendResponse({ success: true, data: profileData });
                break;
                
            case 'CLEAR_AUTH_DATA':
                handleClearAuthData();
                sendResponse({ success: true });
                break;
                
            case 'AUTH_STATUS_CHANGED':
                handleAuthStatusChanged(message.data);
                sendResponse({ success: true });
                break;
                
            default:
                sendResponse({ success: false, error: 'Unknown message type' });
                break;
        }
        
        return true; // Keep message channel open for async responses
    });
}

// Page checking and monitoring
function checkCurrentPage(): void {
    const currentUrl = window.location.href;
    
    if (currentUrl === lastUrlCheck) return;
    lastUrlCheck = currentUrl;
    
    console.log('Content: Checking page:', currentUrl);
    
    // Detect platform and profile
    const profileData = extractCurrentProfileData();
    
    if (profileData && profileData.username) {
        currentProfileData = profileData;
        
        // Notify background script about profile detection
        chrome.runtime.sendMessage({
            type: 'PROFILE_DETECTED',
            data: profileData,
            url: currentUrl
        }).catch(err => {
            console.log('Content: Could not send profile detection message:', err);
        });
        
        console.log('Content: Profile detected:', profileData.username);
    } else {
        currentProfileData = null;
    }
}

function startProfileMonitoring(): void {
    // Clear existing interval
    if (profileCheckInterval) {
        clearInterval(profileCheckInterval);
    }
    
    // Check for profile changes every 3 seconds
    profileCheckInterval = window.setInterval(() => {
        checkCurrentPage();
    }, 3000);
}

// Profile data extraction
function extractCurrentProfileData(): ProfileData | null {
    const url = window.location.href;
    
    // Instagram profile detection
    if (url.includes('instagram.com')) {
        return extractInstagramProfileData();
    }
    
    // Add more platforms as needed
    // if (url.includes('tiktok.com')) {
    //     return extractTikTokProfileData();
    // }
    
    return null;
}

function extractInstagramProfileData(): ProfileData | null {
    try {
        // Check if we're on a profile page
        const profileRegex = /^https?:\/\/(www\.)?instagram\.com\/([^\/\?]+)\/?/;
        const match = window.location.href.match(profileRegex);
        
        if (!match) return null;
        
        const username = match[2];
        
        // Skip non-profile pages
        const skipPages = ['explore', 'reels', 'stories', 'direct', 'accounts', 'p'];
        if (skipPages.some(page => username === page)) return null;
        
        // Extract profile data from DOM
        const profileData: ProfileData = {
            username: username,
            platform: 'instagram',
            url: window.location.href
        };
        
        // Try to extract profile information
        try {
            // Full name
            const fullNameElement = document.querySelector('header section h2') || 
                                  document.querySelector('[data-testid="user-avatar"] + div h2') ||
                                  document.querySelector('h1');
            if (fullNameElement) {
                profileData.fullName = fullNameElement.textContent?.trim();
            }
            
            // Bio
            const bioElement = document.querySelector('header section div:last-child div') ||
                              document.querySelector('[data-testid="user-avatar"] + div + div div');
            if (bioElement && bioElement.textContent && !bioElement.querySelector('a[href*="following"]')) {
                profileData.bio = bioElement.textContent.trim();
            }
            
            // Stats (followers, following, posts)
            const statsElements = document.querySelectorAll('header section ul li');
            if (statsElements.length >= 3) {
                // Posts count
                const postsElement = statsElements[0].querySelector('div > span') || 
                                   statsElements[0].querySelector('span');
                if (postsElement) {
                    profileData.posts = postsElement.textContent?.trim();
                }
                
                // Followers count
                const followersElement = statsElements[1].querySelector('div > span') || 
                                       statsElements[1].querySelector('span') ||
                                       statsElements[1].querySelector('a span');
                if (followersElement) {
                    profileData.followers = followersElement.textContent?.trim();
                }
                
                // Following count
                const followingElement = statsElements[2].querySelector('div > span') || 
                                       statsElements[2].querySelector('span') ||
                                       statsElements[2].querySelector('a span');
                if (followingElement) {
                    profileData.following = followingElement.textContent?.trim();
                }
            }
            
            // Profile picture
            const profilePicElement = document.querySelector('header img') ||
                                    document.querySelector('[data-testid="user-avatar"] img') ||
                                    document.querySelector('canvas + img');
            if (profilePicElement) {
                profileData.profilePicture = (profilePicElement as HTMLImageElement).src;
            }
            
            // Verification status
            const verifiedElement = document.querySelector('[data-testid="verifiedBadge"]') ||
                                  document.querySelector('svg[aria-label*="Verified"]') ||
                                  document.querySelector('header section h2 svg');
            profileData.isVerified = !!verifiedElement;
            
            // Private account status
            const privateElement = document.querySelector('[data-testid="privateAccountIcon"]') ||
                                 document.querySelector('svg[aria-label*="private"]');
            profileData.isPrivate = !!privateElement;
            
        } catch (extractionError) {
            console.log('Content: Error extracting detailed profile data:', extractionError);
        }
        
        console.log('Content: Extracted Instagram profile data:', profileData);
        return profileData;
        
    } catch (error) {
        console.error('Content: Error extracting Instagram profile data:', error);
        return null;
    }
}

// Message handlers
function handleExtractProfileData(sendResponse: (response?: any) => void): void {
    try {
        const profileData = extractCurrentProfileData();
        sendResponse({ success: true, data: profileData });
    } catch (error) {
        console.error('Content: Error extracting profile data:', error);
        sendResponse({ success: false, error: 'Failed to extract profile data' });
    }
}

function handleProfileDetected(profileInfo: any): void {
    console.log('Content: Background notified about profile detection:', profileInfo);
    
    // Could add visual indicators or additional processing here
    addProfileDetectionIndicator(profileInfo);
}

function handleClearAuthData(): void {
    console.log('Content: Clearing frontend localStorage auth data');
    
    try {
        // Clear common auth tokens from localStorage
        const keysToRemove = [
            'accessToken',
            'authToken',
            'token',
            'userEmail',
            'email',
            'user_email',
            'user',
            'authData',
            'echooo_auth'
        ];
        
        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
        });
        
        console.log('Content: Successfully cleared auth data from storage');
    } catch (error) {
        console.log('Content: Error clearing auth data:', error);
    }
}

function handleAuthStatusChanged(authInfo: any): void {
    console.log('Content: Auth status changed:', authInfo);
    
    // Update UI indicators if needed
    updateAuthIndicators(authInfo.hasAuth);
}

// UI Enhancement Functions
function addCustomStyles(): void {
    if (document.getElementById('echo-extension-styles')) return;
    
    const styleSheet = document.createElement('style');
    styleSheet.id = 'echo-extension-styles';
    styleSheet.textContent = `
        .echo-profile-indicator {
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 8px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            opacity: 0;
            transform: translateY(-10px);
            transition: all 0.3s ease;
            pointer-events: none;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        .echo-profile-indicator.visible {
            opacity: 1;
            transform: translateY(0);
        }
        
        .echo-profile-indicator.success {
            background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
        }
        
        .echo-auth-indicator {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 6px 10px;
            border-radius: 15px;
            font-size: 11px;
            z-index: 9999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        .echo-auth-indicator.authenticated {
            background: rgba(72, 187, 120, 0.9);
        }
        
        @keyframes echo-pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
        }
        
        .echo-pulse {
            animation: echo-pulse 2s infinite;
        }
    `;
    
    document.head.appendChild(styleSheet);
}

function addProfileDetectionIndicator(profileInfo: any): void {
    // Remove existing indicator
    const existing = document.getElementById('echo-profile-indicator');
    if (existing) {
        existing.remove();
    }
    
    // Create new indicator
    const indicator = document.createElement('div');
    indicator.id = 'echo-profile-indicator';
    indicator.className = 'echo-profile-indicator';
    indicator.textContent = `📊 Profile Detected: @${profileInfo.username}`;
    
    document.body.appendChild(indicator);
    
    // Show indicator
    setTimeout(() => {
        indicator.classList.add('visible');
    }, 100);
    
    // Hide indicator after 3 seconds
    setTimeout(() => {
        indicator.classList.remove('visible');
        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.parentNode.removeChild(indicator);
            }
        }, 300);
    }, 3000);
}

function updateAuthIndicators(hasAuth: boolean): void {
    let indicator = document.getElementById('echo-auth-indicator');
    
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'echo-auth-indicator';
        indicator.className = 'echo-auth-indicator';
        document.body.appendChild(indicator);
    }
    
    if (hasAuth) {
        indicator.className = 'echo-auth-indicator authenticated';
        indicator.textContent = '✓ Echo Connected';
    } else {
        indicator.className = 'echo-auth-indicator';
        indicator.textContent = '○ Echo Disconnected';
    }
}

// URL change detection for SPAs
function setupUrlChangeDetection(): void {
    let currentUrl = window.location.href;
    
    // Override pushState and replaceState
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function(...args) {
        originalPushState.apply(history, args);
        handleUrlChange();
    };
    
    history.replaceState = function(...args) {
        originalReplaceState.apply(history, args);
        handleUrlChange();
    };
    
    // Listen for popstate
    window.addEventListener('popstate', handleUrlChange);
    
    function handleUrlChange(): void {
        if (window.location.href !== currentUrl) {
            currentUrl = window.location.href;
            console.log('Content: URL changed to:', currentUrl);
            
            // Small delay to let the page update
            setTimeout(checkCurrentPage, 500);
        }
    }
}

// Cleanup function
function cleanup(): void {
    if (profileCheckInterval) {
        clearInterval(profileCheckInterval);
        profileCheckInterval = null;
    }
    
    // Remove indicators
    const indicators = document.querySelectorAll('[id^="echo-"]');
    indicators.forEach(indicator => {
        if (indicator.parentNode) {
            indicator.parentNode.removeChild(indicator);
        }
    });
    
    isInitialized = false;
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeContentScript);
} else {
    initializeContentScript();
}

// Setup URL change detection for SPAs
setupUrlChangeDetection();

// Cleanup on page unload
window.addEventListener('beforeunload', cleanup);

console.log('Content: Echo Extension content script loaded');