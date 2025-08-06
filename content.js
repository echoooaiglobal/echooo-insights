// Content script for Echo Outreach Agent Extension
class EchoExtensionContent {
    constructor() {
        this.isInitialized = false;
        this.socialPlatforms = {
            'instagram.com': 'Instagram',
            'twitter.com': 'Twitter',
            'x.com': 'Twitter/X',
            'linkedin.com': 'LinkedIn',
            'tiktok.com': 'TikTok',
            'youtube.com': 'YouTube',
            'facebook.com': 'Facebook'
        };
        
        this.init();
    }

    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    setup() {
        console.log('Echo Extension Content Script loaded on:', window.location.href);
        
        // Detect current platform
        this.currentPlatform = this.detectPlatform();
        
        if (this.currentPlatform) {
            console.log(`Detected platform: ${this.currentPlatform}`);
            this.initializePlatformFeatures();
        }

        // Listen for extension messages
        this.setupMessageListeners();
        
        // Monitor for registration completion on frontend
        this.monitorRegistrationFlow();
        
        this.isInitialized = true;
    }

    detectPlatform() {
        const hostname = window.location.hostname.toLowerCase();
        
        for (const [domain, platform] of Object.entries(this.socialPlatforms)) {
            if (hostname.includes(domain)) {
                return platform;
            }
        }
        
        return null;
    }

    initializePlatformFeatures() {
        // Platform-specific initialization
        switch (this.currentPlatform) {
            case 'Instagram':
                this.initInstagramFeatures();
                break;
            case 'Twitter':
            case 'Twitter/X':
                this.initTwitterFeatures();
                break;
            case 'LinkedIn':
                this.initLinkedInFeatures();
                break;
            case 'TikTok':
                this.initTikTokFeatures();
                break;
            case 'YouTube':
                this.initYouTubeFeatures();
                break;
            case 'Facebook':
                this.initFacebookFeatures();
                break;
        }
    }

    initInstagramFeatures() {
        console.log('Initializing Instagram features...');
        
        // Wait for page to load completely
        setTimeout(() => {
            this.detectInstagramProfile();
            this.addInstagramHelpers();
        }, 2000);
    }

    detectInstagramProfile() {
        try {
            // Try to detect if we're on a profile page
            const profileHeader = document.querySelector('header section');
            const usernameElement = document.querySelector('h2, h1');
            
            if (profileHeader && usernameElement) {
                const username = usernameElement.textContent?.trim();
                const followersElement = document.querySelector('a[href*="followers"] span');
                const followingElement = document.querySelector('a[href*="following"] span');
                
                const profileData = {
                    platform: 'Instagram',
                    username: username,
                    url: window.location.href,
                    followers: followersElement?.textContent || 'Unknown',
                    following: followingElement?.textContent || 'Unknown'
                };

                console.log('Instagram profile detected:', profileData);
                this.sendProfileData(profileData);
            }
        } catch (error) {
            console.error('Error detecting Instagram profile:', error);
        }
    }

    addInstagramHelpers() {
        // Add floating action button for quick actions
        this.addFloatingActionButton();
    }

    initTwitterFeatures() {
        console.log('Initializing Twitter/X features...');
        
        setTimeout(() => {
            this.detectTwitterProfile();
            this.addTwitterHelpers();
        }, 2000);
    }

    detectTwitterProfile() {
        try {
            // Twitter/X profile detection
            const profileUsername = document.querySelector('[data-testid="UserName"]');
            const followersLink = document.querySelector('a[href*="/followers"]');
            
            if (profileUsername) {
                const username = profileUsername.textContent?.trim();
                const profileData = {
                    platform: 'Twitter/X',
                    username: username,
                    url: window.location.href,
                    followers: followersLink?.textContent || 'Unknown'
                };

                console.log('Twitter profile detected:', profileData);
                this.sendProfileData(profileData);
            }
        } catch (error) {
            console.error('Error detecting Twitter profile:', error);
        }
    }

    addTwitterHelpers() {
        this.addFloatingActionButton();
    }

    initLinkedInFeatures() {
        console.log('Initializing LinkedIn features...');
        
        setTimeout(() => {
            this.detectLinkedInProfile();
            this.addLinkedInHelpers();
        }, 2000);
    }

    detectLinkedInProfile() {
        try {
            const nameElement = document.querySelector('h1.text-heading-xlarge');
            const titleElement = document.querySelector('.text-body-medium.break-words');
            
            if (nameElement) {
                const profileData = {
                    platform: 'LinkedIn',
                    name: nameElement.textContent?.trim(),
                    title: titleElement?.textContent?.trim() || 'Unknown',
                    url: window.location.href
                };

                console.log('LinkedIn profile detected:', profileData);
                this.sendProfileData(profileData);
            }
        } catch (error) {
            console.error('Error detecting LinkedIn profile:', error);
        }
    }

    addLinkedInHelpers() {
        this.addFloatingActionButton();
    }

    initTikTokFeatures() {
        console.log('Initializing TikTok features...');
        
        setTimeout(() => {
            this.detectTikTokProfile();
            this.addTikTokHelpers();
        }, 2000);
    }

    detectTikTokProfile() {
        try {
            const usernameElement = document.querySelector('[data-e2e="user-title"]');
            const followersElement = document.querySelector('[data-e2e="followers-count"]');
            
            if (usernameElement) {
                const profileData = {
                    platform: 'TikTok',
                    username: usernameElement.textContent?.trim(),
                    url: window.location.href,
                    followers: followersElement?.textContent || 'Unknown'
                };

                console.log('TikTok profile detected:', profileData);
                this.sendProfileData(profileData);
            }
        } catch (error) {
            console.error('Error detecting TikTok profile:', error);
        }
    }

    addTikTokHelpers() {
        this.addFloatingActionButton();
    }

    initYouTubeFeatures() {
        console.log('Initializing YouTube features...');
        
        setTimeout(() => {
            this.detectYouTubeChannel();
            this.addYouTubeHelpers();
        }, 2000);
    }

    detectYouTubeChannel() {
        try {
            const channelName = document.querySelector('#text.ytd-channel-name');
            const subscriberCount = document.querySelector('#subscriber-count');
            
            if (channelName) {
                const profileData = {
                    platform: 'YouTube',
                    channelName: channelName.textContent?.trim(),
                    url: window.location.href,
                    subscribers: subscriberCount?.textContent || 'Unknown'
                };

                console.log('YouTube channel detected:', profileData);
                this.sendProfileData(profileData);
            }
        } catch (error) {
            console.error('Error detecting YouTube channel:', error);
        }
    }

    addYouTubeHelpers() {
        this.addFloatingActionButton();
    }

    initFacebookFeatures() {
        console.log('Initializing Facebook features...');
        
        setTimeout(() => {
            this.detectFacebookProfile();
            this.addFacebookHelpers();
        }, 2000);
    }

    detectFacebookProfile() {
        try {
            // Facebook profile detection is tricky due to dynamic loading
            const profileName = document.querySelector('h1[dir="auto"]');
            
            if (profileName) {
                const profileData = {
                    platform: 'Facebook',
                    name: profileName.textContent?.trim(),
                    url: window.location.href
                };

                console.log('Facebook profile detected:', profileData);
                this.sendProfileData(profileData);
            }
        } catch (error) {
            console.error('Error detecting Facebook profile:', error);
        }
    }

    addFacebookHelpers() {
        this.addFloatingActionButton();
    }

    addFloatingActionButton() {
        // Remove existing button if any
        const existingButton = document.getElementById('echo-extension-fab');
        if (existingButton) {
            existingButton.remove();
        }

        // Create floating action button
        const fab = document.createElement('div');
        fab.id = 'echo-extension-fab';
        fab.innerHTML = `
            <div class="echo-fab-content">
                <img src="${chrome.runtime.getURL('icons/icon32.png')}" alt="Echo" />
                <span>Echo</span>
            </div>
        `;

        // Add styles
        fab.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 60px;
            height: 60px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
            z-index: 10000;
            transition: all 0.3s ease;
            border: 2px solid white;
        `;

        fab.querySelector('.echo-fab-content').style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            color: white;
            font-size: 10px;
            font-weight: 500;
        `;

        fab.querySelector('img').style.cssText = `
            width: 24px;
            height: 24px;
            margin-bottom: 2px;
        `;

        // Add hover effects
        fab.addEventListener('mouseenter', () => {
            fab.style.transform = 'scale(1.1)';
            fab.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.5)';
        });

        fab.addEventListener('mouseleave', () => {
            fab.style.transform = 'scale(1)';
            fab.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
        });

        // Add click handler
        fab.addEventListener('click', () => {
            this.showQuickActionMenu();
        });

        document.body.appendChild(fab);
    }

    showQuickActionMenu() {
        // Create quick action menu
        const menu = document.createElement('div');
        menu.id = 'echo-quick-menu';
        menu.innerHTML = `
            <div class="echo-menu-content">
                <div class="echo-menu-header">
                    <h3>Echo Outreach</h3>
                    <button id="echo-menu-close">×</button>
                </div>
                <div class="echo-menu-body">
                    <button class="echo-menu-action" data-action="analyze">
                        📊 Analyze Profile
                    </button>
                    <button class="echo-menu-action" data-action="save">
                        💾 Save Profile
                    </button>
                    <button class="echo-menu-action" data-action="dashboard">
                        🎯 Open Dashboard
                    </button>
                </div>
            </div>
        `;

        // Add styles
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
        `;

        menu.querySelector('.echo-menu-content').style.cssText = `
            background: white;
            border-radius: 12px;
            padding: 20px;
            min-width: 300px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
        `;

        menu.querySelector('.echo-menu-header').style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
            padding-bottom: 12px;
            border-bottom: 1px solid #eee;
        `;

        menu.querySelector('#echo-menu-close').style.cssText = `
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #666;
        `;

        menu.querySelectorAll('.echo-menu-action').forEach(button => {
            button.style.cssText = `
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

            button.addEventListener('mouseenter', () => {
                button.style.background = '#667eea';
                button.style.color = 'white';
            });

            button.addEventListener('mouseleave', () => {
                button.style.background = '#f8f9fa';
                button.style.color = 'black';
            });
        });

        // Add event listeners
        menu.addEventListener('click', (e) => {
            if (e.target === menu || e.target.id === 'echo-menu-close') {
                menu.remove();
            }
        });

        menu.querySelectorAll('.echo-menu-action').forEach(button => {
            button.addEventListener('click', () => {
                const action = button.dataset.action;
                this.handleQuickAction(action);
                menu.remove();
            });
        });

        document.body.appendChild(menu);
    }

    handleQuickAction(action) {
        switch (action) {
            case 'analyze':
                this.analyzeCurrentProfile();
                break;
            case 'save':
                this.saveToEchoCampaign();
                break;
            case 'dashboard':
                this.openEchoDashboard();
                break;
        }
    }

    analyzeCurrentProfile() {
        console.log('Analyzing current profile...');
        // Send message to popup/background to show analysis
        chrome.runtime.sendMessage({
            type: 'ANALYZE_PROFILE',
            data: {
                url: window.location.href,
                platform: this.currentPlatform
            }
        });
    }

    saveToEchoCampaign() {
        console.log('Saving profile to Echo...');
        // Send message to background to save profile
        chrome.runtime.sendMessage({
            type: 'SAVE_PROFILE',
            data: {
                url: window.location.href,
                platform: this.currentPlatform
            }
        });
    }

    openEchoDashboard() {
        chrome.runtime.sendMessage({
            type: 'OPEN_DASHBOARD'
        });
    }

    sendProfileData(profileData) {
        // Send profile data to background script
        chrome.runtime.sendMessage({
            type: 'PROFILE_DETECTED',
            data: profileData
        });
    }

    setupMessageListeners() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            console.log('Content script received message:', message);

            switch (message.type) {
                case 'GET_PAGE_INFO':
                    const pageInfo = {
                        url: window.location.href,
                        title: document.title,
                        platform: this.currentPlatform
                    };
                    sendResponse({ success: true, data: pageInfo });
                    break;

                case 'INJECT_FEATURE':
                    this.injectFeature(message.feature);
                    sendResponse({ success: true });
                    break;

                default:
                    sendResponse({ success: false, error: 'Unknown message type' });
            }

            return true; // Keep message channel open
        });
    }

    monitorRegistrationFlow() {
        // Monitor if user is on registration/dashboard pages
        const currentUrl = window.location.href;
        
        if (currentUrl.includes('localhost:3000')) {
            console.log('User is on Echo frontend:', currentUrl);
            
            // Check for successful registration/login
            if (currentUrl.includes('/dashboard') || currentUrl.includes('/campaigns')) {
                // Try to extract auth data from URL or page
                this.extractAuthDataFromPage();
            }
            
            // Monitor for auth token in localStorage (if your frontend uses it)
            this.monitorFrontendAuth();
        }
    }

    extractAuthDataFromPage() {
        try {
            // Method 1: Check URL parameters
            const urlParams = new URLSearchParams(window.location.search);
            const token = urlParams.get('token');
            const email = urlParams.get('email');
            
            if (token && email) {
                this.sendAuthDataToExtension({ token, email });
                return;
            }

            // Method 2: Check if data is in page (like meta tags or script tags)
            setTimeout(() => {
                // Try to get auth data from localStorage (if frontend stores it there)
                const storedToken = localStorage.getItem('accessToken') || 
                                 localStorage.getItem('authToken') || 
                                 localStorage.getItem('token');
                const storedEmail = localStorage.getItem('userEmail') || 
                                  localStorage.getItem('email');

                if (storedToken && storedEmail) {
                    this.sendAuthDataToExtension({ 
                        token: storedToken, 
                        email: storedEmail 
                    });
                }
            }, 2000);

        } catch (error) {
            console.error('Error extracting auth data:', error);
        }
    }

    monitorFrontendAuth() {
        // Monitor localStorage changes for JWT tokens
        const originalSetItem = localStorage.setItem;
        localStorage.setItem = function(key, value) {
            originalSetItem.apply(this, arguments);
            
            // Check for JWT token keys
            const jwtKeys = ['accessToken', 'authToken', 'token', 'jwt', 'access_token'];
            const emailKeys = ['userEmail', 'email', 'user_email'];
            
            if (jwtKeys.includes(key)) {
                console.log('JWT token detected in localStorage:', key);
                const email = emailKeys.find(emailKey => localStorage.getItem(emailKey));
                
                // Send auth data to extension
                chrome.runtime.sendMessage({
                    type: 'AUTH_DATA_DETECTED',
                    data: { 
                        token: value, 
                        email: email ? localStorage.getItem(email) : null,
                        source: 'localStorage_monitor'
                    }
                });
            }
            
            if (emailKeys.includes(key)) {
                console.log('User email detected in localStorage:', key);
                const token = jwtKeys.find(tokenKey => localStorage.getItem(tokenKey));
                
                if (token) {
                    chrome.runtime.sendMessage({
                        type: 'AUTH_DATA_DETECTED',
                        data: { 
                            token: localStorage.getItem(token), 
                            email: value,
                            source: 'localStorage_monitor'
                        }
                    });
                }
            }
        };

        // Check for existing tokens on page load
        this.checkExistingTokens();

        // Monitor for DOM changes that might indicate successful login
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    // Check for dashboard elements that indicate successful auth
                    const dashboardElements = document.querySelectorAll(
                        '[class*="dashboard"], [id*="dashboard"], [class*="profile"], [id*="profile"]'
                    );
                    
                    if (dashboardElements.length > 0) {
                        this.checkExistingTokens();
                    }
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    checkExistingTokens() {
        const jwtKeys = ['accessToken', 'authToken', 'token', 'jwt', 'access_token'];
        const emailKeys = ['userEmail', 'email', 'user_email'];
        
        let foundToken = null;
        let foundEmail = null;
        
        // Check for existing JWT tokens
        for (const key of jwtKeys) {
            const token = localStorage.getItem(key);
            if (token) {
                foundToken = token;
                console.log('Existing JWT token found:', key);
                break;
            }
        }
        
        // Check for existing email
        for (const key of emailKeys) {
            const email = localStorage.getItem(key);
            if (email) {
                foundEmail = email;
                console.log('Existing user email found:', key);
                break;
            }
        }
        
        // If both found, send to extension
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

    checkForUserData() {
        // Try to find user email or other identifying info on the page
        setTimeout(() => {
            const emailElements = document.querySelectorAll('[type="email"], [class*="email"], [id*="email"]');
            const userMenuElements = document.querySelectorAll('[class*="user-menu"], [class*="profile"], [class*="account"]');
            
            let foundEmail = null;
            
            // Check email input fields
            emailElements.forEach(element => {
                if (element.value && element.value.includes('@')) {
                    foundEmail = element.value;
                }
            });

            // Check text content for email patterns
            if (!foundEmail) {
                const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
                const pageText = document.body.textContent;
                const emailMatches = pageText.match(emailRegex);
                if (emailMatches && emailMatches.length > 0) {
                    foundEmail = emailMatches[0];
                }
            }

            if (foundEmail) {
                // Try to get token from various storage locations
                const token = localStorage.getItem('accessToken') || 
                            localStorage.getItem('authToken') || 
                            localStorage.getItem('token') ||
                            sessionStorage.getItem('accessToken') ||
                            sessionStorage.getItem('authToken') ||
                            sessionStorage.getItem('token');

                if (token) {
                    this.sendAuthDataToExtension({ token, email: foundEmail });
                }
            }
        }, 1500);
    }

    sendAuthDataToExtension(authData) {
        console.log('Sending auth data to extension:', { email: authData.email, hasToken: !!authData.token });
        
        chrome.runtime.sendMessage({
            type: 'SAVE_AUTH_DATA',
            data: {
                accessToken: authData.token,
                userEmail: authData.email,
                source: 'frontend_detection'
            }
        }, (response) => {
            if (response && response.success) {
                console.log('Auth data saved to extension successfully');
                
                // Show success notification
                this.showSuccessNotification('Registration completed! Extension is now connected.');
            }
        });
    }

    injectFeature(feature) {
        switch (feature) {
            case 'floating_button':
                this.addFloatingActionButton();
                break;
            case 'profile_analyzer':
                this.initializePlatformFeatures();
                break;
            default:
                console.log('Unknown feature requested:', feature);
        }
    }

    showSuccessNotification(message) {
        // Create a temporary success notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #10B981;
            color: white;
            padding: 16px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
            z-index: 10002;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            font-weight: 500;
            max-width: 300px;
            animation: slideIn 0.3s ease-out;
        `;

        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <span>✅</span>
                <span>${message}</span>
            </div>
        `;

        // Add animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(notification);

        // Remove after 5 seconds
        setTimeout(() => {
            notification.style.animation = 'slideIn 0.3s ease-out reverse';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
                if (style.parentNode) {
                    style.remove();
                }
            }, 300);
        }, 5000);
    }

    // Utility method to get profile data based on current platform
    getCurrentProfileData() {
        const baseData = {
            url: window.location.href,
            platform: this.currentPlatform,
            timestamp: new Date().toISOString()
        };

        switch (this.currentPlatform) {
            case 'Instagram':
                return { ...baseData, ...this.getInstagramData() };
            case 'Twitter':
            case 'Twitter/X':
                return { ...baseData, ...this.getTwitterData() };
            case 'LinkedIn':
                return { ...baseData, ...this.getLinkedInData() };
            case 'TikTok':
                return { ...baseData, ...this.getTikTokData() };
            case 'YouTube':
                return { ...baseData, ...this.getYouTubeData() };
            case 'Facebook':
                return { ...baseData, ...this.getFacebookData() };
            default:
                return baseData;
        }
    }

    getInstagramData() {
        try {
            const username = document.querySelector('h2, h1')?.textContent?.trim();
            const bio = document.querySelector('div span[dir="auto"]')?.textContent?.trim();
            const followersElement = document.querySelector('a[href*="followers"] span');
            const followingElement = document.querySelector('a[href*="following"] span');
            const postsElement = document.querySelector('div span[title]');

            return {
                username,
                bio,
                followers: followersElement?.textContent || 'Unknown',
                following: followingElement?.textContent || 'Unknown',
                posts: postsElement?.getAttribute('title') || 'Unknown'
            };
        } catch (error) {
            console.error('Error getting Instagram data:', error);
            return {};
        }
    }

    getTwitterData() {
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

    getLinkedInData() {
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

    getTikTokData() {
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

    getYouTubeData() {
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

    getFacebookData() {
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
}

// Initialize content script
if (!window.echoExtensionContent) {
    window.echoExtensionContent = new EchoExtensionContent();
}

// Handle dynamic page changes (for SPAs)
let lastUrl = location.href;
new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
        lastUrl = url;
        console.log('Page URL changed to:', url);
        
        // Reinitialize for new page
        if (window.echoExtensionContent) {
            setTimeout(() => {
                window.echoExtensionContent.setup();
            }, 1000);
        }
    }
}).observe(document, { subtree: true, childList: true });