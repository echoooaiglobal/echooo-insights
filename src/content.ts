// Content script for Echo Outreach Agent Extension - Function-Based TypeScript version
interface ProfileData {
    username?: string;
    bio?: string;
    followers?: string;
    following?: string;
    posts?: string;
    name?: string;
    title?: string;
    location?: string;
    channelName?: string;
    subscribers?: string;
    description?: string;
}

interface ContentAuthData {
    token: string;
    email: string;
    source?: string;
}

interface ContentMessageData {
    type: string;
    data?: any;
    url?: string;
    platform?: string;
    feature?: string;
}

// Global state variables
let currentPlatform: string = '';
let isInitialized: boolean = false;
let echoButton: HTMLElement | null = null;

// Main initialization function
function initializeContentScript(): void {
    if (isInitialized) return;
    
    currentPlatform = detectPlatform();
    console.log('Echo Extension Content Script loaded on:', currentPlatform);
    
    setupMessageListeners();
    checkForExistingAuth();
    monitorRegistrationFlow();
    
    if (currentPlatform && currentPlatform !== 'unknown') {
        injectEchoFeatures();
    }
    
    isInitialized = true;
}

function detectPlatform(): string {
    const hostname = window.location.hostname.toLowerCase();
    const pathname = window.location.pathname.toLowerCase();
    
    if (hostname.includes('instagram.com')) {
        // Check if we're on a profile page
        if (pathname.includes('/') && pathname !== '/' && !pathname.includes('/explore') && 
            !pathname.includes('/reels') && !pathname.includes('/stories') && 
            !pathname.includes('/direct') && !pathname.includes('/accounts')) {
            return 'instagram';
        }
        return 'instagram-home';
    }
    if (hostname.includes('twitter.com') || hostname.includes('x.com')) return 'twitter';
    if (hostname.includes('linkedin.com')) return 'linkedin';
    if (hostname.includes('tiktok.com')) return 'tiktok';
    if (hostname.includes('youtube.com')) return 'youtube';
    if (hostname.includes('facebook.com')) return 'facebook';
    if (hostname.includes('localhost:3000')) return 'echo_frontend';

    return 'unknown';
}

function isInstagramProfile(): boolean {
    const pathname = window.location.pathname;
    
    // Check if it's a profile page (username pattern)
    const profilePattern = /^\/[a-zA-Z0-9._]+\/?$/;
    const isProfilePage = profilePattern.test(pathname);
    
    // Also check for presence of profile elements
    const hasProfileHeader = document.querySelector('header section') !== null;
    const hasProfilePicture = document.querySelector('img[alt*="profile picture"], img[alt*="Profile picture"]') !== null;
    
    return isProfilePage && (hasProfileHeader || hasProfilePicture);
}

function injectEchoFeatures(): void {
    // For Instagram, wait a bit longer for the page to load
    if (currentPlatform === 'instagram') {
        setTimeout(() => {
            if (isInstagramProfile()) {
                addEchoButton();
                setupProfileDetection();
            }
        }, 2000);
    } else {
        addEchoButton();
        setupProfileDetection();
    }
}

function addEchoButton(): void {
    // Remove existing button if present
    if (echoButton) {
        echoButton.remove();
        echoButton = null;
    }

    const button = document.createElement('button');
    button.className = 'echo-extension-button';
    button.textContent = '📊 Echo';
    button.title = 'Analyze with Echo';
    
    button.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        border-radius: 8px;
        padding: 8px 12px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transition: all 0.3s ease;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    button.addEventListener('mouseenter', () => {
        button.style.transform = 'translateY(-2px)';
        button.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.25)';
    });

    button.addEventListener('mouseleave', () => {
        button.style.transform = 'translateY(0)';
        button.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
    });

    button.addEventListener('click', () => showQuickActionMenu());

    document.body.appendChild(button);
    echoButton = button;
    
    console.log('Echo button added to', currentPlatform);
}

function setupProfileDetection(): void {
    setTimeout(() => {
        const profileData = getProfileData();
        if (profileData && Object.keys(profileData).length > 0) {
            sendProfileData(profileData);
        }
    }, 2000);
}

function getProfileData(): ProfileData {
    switch (currentPlatform) {
        case 'instagram':
            return getInstagramData();
        case 'twitter':
            return getTwitterData();
        case 'linkedin':
            return getLinkedInData();
        case 'tiktok':
            return getTikTokData();
        case 'youtube':
            return getYouTubeData();
        case 'facebook':
            return getFacebookData();
        default:
            return {};
    }
}

function getInstagramData(): ProfileData {
    try {
        // Multiple selectors for different Instagram layouts
        const usernameSelectors = [
            'header section h2',
            'h2._aa3a',
            '[data-testid="user-name"]',
            'h1'
        ];
        
        const bioSelectors = [
            'header section div span',
            '.-vDIg span',
            '[data-testid="user-bio"]'
        ];
        
        const statsSelectors = [
            'header section ul li a span',
            'header ul li span span',
            'a[href*="/followers/"] span',
            'a[href*="/following/"] span'
        ];

        let username = '';
        let bio = '';
        let followers = '';
        let following = '';
        let posts = '';

        // Try to get username
        for (const selector of usernameSelectors) {
            const element = document.querySelector(selector);
            if (element && element.textContent) {
                username = element.textContent.trim();
                break;
            }
        }

        // Try to get bio
        for (const selector of bioSelectors) {
            const element = document.querySelector(selector);
            if (element && element.textContent) {
                bio = element.textContent.trim();
                break;
            }
        }

        // Try to get stats
        const statsElements = document.querySelectorAll('header section ul li');
        if (statsElements.length >= 3) {
            posts = statsElements[0]?.textContent?.trim() || 'Unknown';
            followers = statsElements[1]?.textContent?.trim() || 'Unknown';
            following = statsElements[2]?.textContent?.trim() || 'Unknown';
        }

        console.log('Instagram profile data extracted:', { username, bio, followers, following, posts });

        return {
            username: username || 'Unknown',
            bio: bio || '',
            followers: followers || 'Unknown',
            following: following || 'Unknown',
            posts: posts || 'Unknown'
        };
    } catch (error) {
        console.error('Error getting Instagram data:', error);
        return {};
    }
}

function getTwitterData(): ProfileData {
    try {
        const username = document.querySelector('[data-testid="UserName"]')?.textContent?.trim();
        const bio = document.querySelector('[data-testid="UserDescription"]')?.textContent?.trim();
        const followersLink = document.querySelector('a[href*="/followers"]');
        const followingLink = document.querySelector('a[href*="/following"]');

        return {
            username,
            bio,
            followers: followersLink?.textContent || 'Unknown',
            following: followingLink?.textContent || 'Unknown'
        };
    } catch (error) {
        console.error('Error getting Twitter data:', error);
        return {};
    }
}

function getLinkedInData(): ProfileData {
    try {
        const name = document.querySelector('h1.text-heading-xlarge')?.textContent?.trim();
        const title = document.querySelector('.text-body-medium.break-words')?.textContent?.trim();
        const location = document.querySelector('.text-body-small.inline.t-black--light.break-words')?.textContent?.trim();

        return {
            name,
            title,
            location
        };
    } catch (error) {
        console.error('Error getting LinkedIn data:', error);
        return {};
    }
}

function getTikTokData(): ProfileData {
    try {
        const username = document.querySelector('[data-e2e="user-title"]')?.textContent?.trim();
        const bio = document.querySelector('[data-e2e="user-bio"]')?.textContent?.trim();
        const followers = document.querySelector('[data-e2e="followers-count"]')?.textContent?.trim();
        const following = document.querySelector('[data-e2e="following-count"]')?.textContent?.trim();

        return {
            username,
            bio,
            followers,
            following
        };
    } catch (error) {
        console.error('Error getting TikTok data:', error);
        return {};
    }
}

function getYouTubeData(): ProfileData {
    try {
        const channelName = document.querySelector('#text.ytd-channel-name')?.textContent?.trim();
        const subscriberCount = document.querySelector('#subscriber-count')?.textContent?.trim();
        const description = document.querySelector('#description')?.textContent?.trim();

        return {
            channelName,
            subscribers: subscriberCount,
            description
        };
    } catch (error) {
        console.error('Error getting YouTube data:', error);
        return {};
    }
}

function getFacebookData(): ProfileData {
    try {
        const name = document.querySelector('h1[dir="auto"]')?.textContent?.trim();
        
        return {
            name
        };
    } catch (error) {
        console.error('Error getting Facebook data:', error);
        return {};
    }
}

function showQuickActionMenu(): void {
    const existingMenu = document.querySelector('.echo-quick-menu');
    if (existingMenu) {
        existingMenu.remove();
        return;
    }

    const menu = document.createElement('div');
    menu.className = 'echo-quick-menu';
    menu.innerHTML = `
        <div class="echo-menu-content">
            <div class="echo-menu-header">
                <h3>Echo Actions</h3>
                <button id="echo-menu-close">×</button>
            </div>
            <button class="echo-menu-action" data-action="analyze">📊 Analyze Profile</button>
            <button class="echo-menu-action" data-action="save">💾 Save to Campaign</button>
            <button class="echo-menu-action" data-action="dashboard">🚀 Open Dashboard</button>
        </div>
    `;

    menu.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10001;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    const menuContent = menu.querySelector('.echo-menu-content') as HTMLElement;
    if (menuContent) {
        menuContent.style.cssText = `
            background: white;
            border-radius: 12px;
            padding: 20px;
            min-width: 300px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
        `;
    }

    const menuHeader = menu.querySelector('.echo-menu-header') as HTMLElement;
    if (menuHeader) {
        menuHeader.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
            padding-bottom: 12px;
            border-bottom: 1px solid #eee;
        `;
    }

    const closeButton = menu.querySelector('#echo-menu-close') as HTMLElement;
    if (closeButton) {
        closeButton.style.cssText = `
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #666;
        `;
    }

    menu.querySelectorAll('.echo-menu-action').forEach(button => {
        const buttonElement = button as HTMLElement;
        buttonElement.style.cssText = `
            display: block;
            width: 100%;
            padding: 12px;
            margin-bottom: 8px;
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            text-align: left;
            transition: all 0.2s ease;
        `;

        buttonElement.addEventListener('mouseenter', () => {
            buttonElement.style.background = '#667eea';
            buttonElement.style.color = 'white';
        });

        buttonElement.addEventListener('mouseleave', () => {
            buttonElement.style.background = '#f8f9fa';
            buttonElement.style.color = 'black';
        });
    });

    menu.addEventListener('click', (e: Event) => {
        if (e.target === menu || (e.target as HTMLElement).id === 'echo-menu-close') {
            menu.remove();
        }
    });

    menu.querySelectorAll('.echo-menu-action').forEach(button => {
        button.addEventListener('click', () => {
            const action = (button as HTMLElement).dataset.action;
            if (action) {
                handleQuickAction(action);
            }
            menu.remove();
        });
    });

    document.body.appendChild(menu);
}

function handleQuickAction(action: string): void {
    switch (action) {
        case 'analyze':
            analyzeCurrentProfile();
            break;
        case 'save':
            saveToEchoCampaign();
            break;
        case 'dashboard':
            openEchoDashboard();
            break;
    }
}

function analyzeCurrentProfile(): void {
    console.log('Analyzing current profile...');
    chrome.runtime.sendMessage({
        type: 'ANALYZE_PROFILE',
        data: {
            url: window.location.href,
            platform: currentPlatform
        }
    });
}

function saveToEchoCampaign(): void {
    console.log('Saving profile to Echo...');
    chrome.runtime.sendMessage({
        type: 'SAVE_PROFILE',
        data: {
            url: window.location.href,
            platform: currentPlatform
        }
    });
}

function openEchoDashboard(): void {
    chrome.runtime.sendMessage({
        type: 'OPEN_DASHBOARD'
    });
}

function sendProfileData(profileData: ProfileData): void {
    chrome.runtime.sendMessage({
        type: 'PROFILE_DETECTED',
        data: profileData
    });
}

function setupMessageListeners(): void {
    chrome.runtime.onMessage.addListener((message: ContentMessageData, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
        console.log('Content script received message:', message);

        switch (message.type) {
            case 'GET_PAGE_INFO':
                const pageInfo = {
                    url: window.location.href,
                    title: document.title,
                    platform: currentPlatform
                };
                sendResponse({ success: true, data: pageInfo });
                break;

            case 'INJECT_FEATURE':
                injectFeature(message.feature);
                sendResponse({ success: true });
                break;

            default:
                sendResponse({ success: false, error: 'Unknown message type' });
        }

        return true;
    });
}

function injectFeature(feature: string): void {
    console.log('Injecting feature:', feature);
}

function monitorRegistrationFlow(): void {
    const currentUrl = window.location.href;
    
    if (currentUrl.includes('localhost:3000')) {
        console.log('User is on Echo frontend:', currentUrl);
        
        if (currentUrl.includes('/dashboard') || currentUrl.includes('/campaign')) {
            checkForUserData();
        }
    }
}

function checkForExistingAuth(): void {
    const tokenKeys = ['accessToken', 'authToken', 'token', 'jwt', 'access_token'];
    const emailKeys = ['userEmail', 'email', 'user_email'];
    
    let foundToken: string | null = null;
    let foundEmail: string | null = null;
    
    for (const key of tokenKeys) {
        const token = localStorage.getItem(key) || sessionStorage.getItem(key);
        if (token && token.length > 50) {
            foundToken = token;
            console.log('Token found:', key);
            break;
        }
    }
    
    for (const key of emailKeys) {
        const email = localStorage.getItem(key) || sessionStorage.getItem(key);
        if (email && email.includes('@')) {
            foundEmail = email;
            console.log('User email found:', key);
            break;
        }
    }
    
    if (foundToken) {
        chrome.runtime.sendMessage({
            type: 'AUTH_DATA_DETECTED',
            data: { 
                token: foundToken, 
                email: foundEmail,
                source: 'existing_localStorage'
            }
        });
    }
}

function checkForUserData(): void {
    setTimeout(() => {
        const emailElements = document.querySelectorAll('[type="email"], [class*="email"], [id*="email"]');
        
        let foundEmail: string | null = null;
        
        emailElements.forEach(element => {
            const inputElement = element as HTMLInputElement;
            if (inputElement.value && inputElement.value.includes('@')) {
                foundEmail = inputElement.value;
            }
        });

        if (!foundEmail) {
            const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
            const pageText = document.body.textContent;
            const emailMatches = pageText?.match(emailRegex);
            if (emailMatches && emailMatches.length > 0) {
                foundEmail = emailMatches[0];
            }
        }

        if (foundEmail) {
            const token = localStorage.getItem('accessToken') || 
                        localStorage.getItem('authToken') || 
                        localStorage.getItem('token') ||
                        sessionStorage.getItem('accessToken') ||
                        sessionStorage.getItem('authToken') ||
                        sessionStorage.getItem('token');

            if (token) {
                sendAuthDataToExtension({ token, email: foundEmail });
            }
        }
    }, 1500);
}

function sendAuthDataToExtension(authData: { token: string; email: string }): void {
    console.log('Sending auth data to extension:', { email: authData.email, hasToken: !!authData.token });
    
    chrome.runtime.sendMessage({
        type: 'SAVE_AUTH_DATA',
        data: {
            accessToken: authData.token,
            userEmail: authData.email,
            source: 'frontend_detection'
        }
    }, (response: any) => {
        if (response && response.success) {
            console.log('Auth data saved to extension successfully');
            showSuccessNotification('Registration completed! Extension is now connected.');
        } else {
            console.error('Failed to save auth data:', response);
        }
    });
}

function showSuccessNotification(message: string): void {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        z-index: 10002;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        font-weight: 600;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// Initialize content script (Function-based initialization)
if (!window.echoExtensionContent) {
    window.echoExtensionContent = true;
    initializeContentScript();
}

// Handle dynamic page changes (for SPAs like Instagram)
let lastUrl: string = location.href;
new MutationObserver(() => {
    const url: string = location.href;
    if (url !== lastUrl) {
        lastUrl = url;
        console.log('Page URL changed to:', url);
        
        // Re-detect platform and reinject features if needed
        const newPlatform = detectPlatform();
        if (newPlatform !== currentPlatform) {
            currentPlatform = newPlatform;
            console.log('Platform changed to:', currentPlatform);
            
            // Remove existing button
            if (echoButton) {
                echoButton.remove();
                echoButton = null;
            }
            
            // Reinject features for new platform
            if (currentPlatform && currentPlatform !== 'unknown') {
                setTimeout(() => {
                    injectEchoFeatures();
                }, 1000);
            }
        } else if (currentPlatform === 'instagram') {
            // For Instagram, check if we moved to a profile page
            setTimeout(() => {
                if (isInstagramProfile() && !echoButton) {
                    injectEchoFeatures();
                } else if (!isInstagramProfile() && echoButton) {
                    echoButton.remove();
                    echoButton = null;
                }
            }, 1000);
        }
    }
}).observe(document, { subtree: true, childList: true });