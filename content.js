// File: content.js
// Content script for Echo Outreach Agent Extension - Complete Profile Detection & Icon Injection

class EchoContentScript {
    constructor() {
        this.currentPlatform = null;
        this.profileData = null;
        this.floatingIcon = null;
        this.isProfilePage = false;
        
        this.init();
    }

    init() {
        console.log('Echo Content Script initialized on:', window.location.href);
        
        // Detect current platform and check if it's a profile page
        this.detectPlatformAndProfile();
        
        // Set up observers for dynamic content loading (SPA navigation)
        this.setupObservers();
        
        // Set up message listeners
        this.setupMessageListeners();
        
        // Initial check with delay to ensure page is loaded
        setTimeout(() => {
            this.checkAndInjectIcon();
        }, 2000);
    }

    detectPlatformAndProfile() {
        const url = window.location.href;
        const hostname = window.location.hostname;
        
        console.log('Detecting platform for:', hostname);
        
        // Instagram detection
        if (hostname.includes('instagram.com')) {
            this.currentPlatform = 'instagram';
            this.isProfilePage = this.isInstagramProfile(url);
        }
        // TikTok detection
        else if (hostname.includes('tiktok.com')) {
            this.currentPlatform = 'tiktok';
            this.isProfilePage = this.isTikTokProfile(url);
        }
        // YouTube detection
        else if (hostname.includes('youtube.com')) {
            this.currentPlatform = 'youtube';
            this.isProfilePage = this.isYouTubeProfile(url);
        }
        // Twitter/X detection
        else if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
            this.currentPlatform = 'twitter';
            this.isProfilePage = this.isTwitterProfile(url);
        }
        // LinkedIn detection
        else if (hostname.includes('linkedin.com')) {
            this.currentPlatform = 'linkedin';
            this.isProfilePage = this.isLinkedInProfile(url);
        }
        
        console.log('Platform detected:', this.currentPlatform);
        console.log('Is profile page:', this.isProfilePage);
    }

    // Instagram profile detection
    isInstagramProfile(url) {
        try {
            const profilePattern = /instagram\.com\/([^\/\?]+)\/?(?:\?.*)?$/;
            const match = url.match(profilePattern);
            
            if (match && match[1]) {
                const username = match[1];
                const excludedPages = ['explore', 'reels', 'stories', 'direct', 'accounts', 'settings', 'p'];
                return !excludedPages.includes(username);
            }
            return false;
        } catch (error) {
            console.error('Error detecting Instagram profile:', error);
            return false;
        }
    }

    // TikTok profile detection
    isTikTokProfile(url) {
        try {
            return /tiktok\.com\/@[^\/\?]+\/?(?:\?.*)?$/.test(url);
        } catch (error) {
            console.error('Error detecting TikTok profile:', error);
            return false;
        }
    }

    // YouTube profile detection
    isYouTubeProfile(url) {
        try {
            return /youtube\.com\/(c\/|@|channel\/)[^\/\?]+\/?(?:\?.*)?$/.test(url);
        } catch (error) {
            console.error('Error detecting YouTube profile:', error);
            return false;
        }
    }

    // Twitter/X profile detection
    isTwitterProfile(url) {
        try {
            const profilePattern = /(twitter|x)\.com\/([^\/\?]+)\/?(?:\?.*)?$/;
            const match = url.match(profilePattern);
            
            if (match && match[2]) {
                const username = match[2];
                const excludedPages = ['home', 'explore', 'notifications', 'messages', 'bookmarks', 'lists', 'profile', 'settings', 'compose', 'i'];
                return !excludedPages.includes(username);
            }
            return false;
        } catch (error) {
            console.error('Error detecting Twitter profile:', error);
            return false;
        }
    }

    // LinkedIn profile detection
    isLinkedInProfile(url) {
        try {
            return /linkedin\.com\/in\/[^\/\?]+\/?(?:\?.*)?$/.test(url);
        } catch (error) {
            console.error('Error detecting LinkedIn profile:', error);
            return false;
        }
    }

    setupObservers() {
        try {
            // Observer for URL changes (SPA navigation)
            let lastUrl = location.href;
            new MutationObserver(() => {
                const currentUrl = location.href;
                if (currentUrl !== lastUrl) {
                    lastUrl = currentUrl;
                    console.log('URL changed to:', currentUrl);
                    
                    // Re-detect platform and profile
                    this.detectPlatformAndProfile();
                    
                    // Remove existing icon
                    this.removeFloatingIcon();
                    
                    // Check and inject icon for new page
                    setTimeout(() => this.checkAndInjectIcon(), 2000);
                }
            }).observe(document, { subtree: true, childList: true });

            // Observer for DOM changes (dynamic content loading)
            new MutationObserver(() => {
                if (this.isProfilePage && !this.floatingIcon) {
                    setTimeout(() => this.checkAndInjectIcon(), 1000);
                }
            }).observe(document.body, { subtree: true, childList: true });
        } catch (error) {
            console.error('Error setting up observers:', error);
        }
    }

    checkAndInjectIcon() {
        try {
            if (this.isProfilePage && this.currentPlatform) {
                console.log('Profile page detected, injecting icon...');
                this.extractProfileData();
                this.injectFloatingIcon();
            } else {
                console.log('Not a profile page, removing icon if exists');
                this.removeFloatingIcon();
            }
        } catch (error) {
            console.error('Error checking and injecting icon:', error);
        }
    }

    extractProfileData() {
        try {
            const data = {
                platform: this.currentPlatform,
                url: window.location.href,
                timestamp: Date.now()
            };

            // Platform-specific data extraction
            switch (this.currentPlatform) {
                case 'instagram':
                    data.username = this.extractInstagramUsername();
                    data.profileName = this.extractInstagramProfileName();
                    data.followerCount = this.extractInstagramFollowers();
                    break;
                case 'tiktok':
                    data.username = this.extractTikTokUsername();
                    data.profileName = this.extractTikTokProfileName();
                    break;
                case 'youtube':
                    data.channelName = this.extractYouTubeChannelName();
                    data.subscriberCount = this.extractYouTubeSubscribers();
                    break;
                case 'twitter':
                    data.username = this.extractTwitterUsername();
                    data.profileName = this.extractTwitterProfileName();
                    break;
                case 'linkedin':
                    data.profileName = this.extractLinkedInProfileName();
                    break;
            }

            this.profileData = data;
            console.log('Profile data extracted:', data);
        } catch (error) {
            console.error('Error extracting profile data:', error);
        }
    }

    // Instagram data extraction methods
    extractInstagramUsername() {
        try {
            const match = window.location.pathname.match(/\/([^\/]+)/);
            return match ? match[1] : null;
        } catch (error) {
            console.error('Error extracting Instagram username:', error);
            return null;
        }
    }

    extractInstagramProfileName() {
        try {
            const selectors = [
                'header h2',
                'header h1',
                '[data-testid="user-name"]',
                'main header section h1',
                'main header section h2',
                'h1'
            ];
            
            for (const selector of selectors) {
                const element = document.querySelector(selector);
                if (element && element.textContent && element.textContent.trim()) {
                    return element.textContent.trim();
                }
            }
            return null;
        } catch (error) {
            console.error('Error extracting Instagram profile name:', error);
            return null;
        }
    }

    extractInstagramFollowers() {
        try {
            const elements = document.querySelectorAll('a[href*="followers"] span, main header section ul li span');
            for (const element of elements) {
                const text = element.textContent;
                if (text && (text.includes('follower') || /^\d+[km]?$/i.test(text.trim()))) {
                    return text.trim();
                }
            }
            return null;
        } catch (error) {
            console.error('Error extracting Instagram followers:', error);
            return null;
        }
    }

    // TikTok data extraction methods
    extractTikTokUsername() {
        try {
            const match = window.location.pathname.match(/@([^\/]+)/);
            return match ? match[1] : null;
        } catch (error) {
            console.error('Error extracting TikTok username:', error);
            return null;
        }
    }

    extractTikTokProfileName() {
        try {
            const nameSelectors = [
                '[data-e2e="user-title"]',
                'h1[data-e2e="user-title"]',
                '.share-title',
                'h1'
            ];
            
            for (const selector of nameSelectors) {
                const element = document.querySelector(selector);
                if (element && element.textContent && element.textContent.trim()) {
                    return element.textContent.trim();
                }
            }
            return null;
        } catch (error) {
            console.error('Error extracting TikTok profile name:', error);
            return null;
        }
    }

    // YouTube data extraction methods
    extractYouTubeChannelName() {
        try {
            const nameSelectors = [
                '#channel-name #text',
                'yt-formatted-string#text.style-scope.ytd-channel-name',
                '#channel-header #channel-name #text',
                'h1'
            ];
            
            for (const selector of nameSelectors) {
                const element = document.querySelector(selector);
                if (element && element.textContent && element.textContent.trim()) {
                    return element.textContent.trim();
                }
            }
            return null;
        } catch (error) {
            console.error('Error extracting YouTube channel name:', error);
            return null;
        }
    }

    extractYouTubeSubscribers() {
        try {
            const subSelectors = [
                '#subscriber-count',
                'yt-formatted-string#subscriber-count'
            ];
            
            for (const selector of subSelectors) {
                const element = document.querySelector(selector);
                if (element && element.textContent && element.textContent.trim()) {
                    return element.textContent.trim();
                }
            }
            return null;
        } catch (error) {
            console.error('Error extracting YouTube subscribers:', error);
            return null;
        }
    }

    // Twitter data extraction methods
    extractTwitterUsername() {
        try {
            const match = window.location.pathname.match(/\/([^\/]+)/);
            return match ? match[1] : null;
        } catch (error) {
            console.error('Error extracting Twitter username:', error);
            return null;
        }
    }

    extractTwitterProfileName() {
        try {
            const nameSelectors = [
                '[data-testid="UserName"] span span',
                '[data-testid="UserDescription"] span',
                'h1[role="heading"] span span',
                'h1'
            ];
            
            for (const selector of nameSelectors) {
                const element = document.querySelector(selector);
                if (element && element.textContent && element.textContent.trim()) {
                    return element.textContent.trim();
                }
            }
            return null;
        } catch (error) {
            console.error('Error extracting Twitter profile name:', error);
            return null;
        }
    }

    // LinkedIn data extraction methods
    extractLinkedInProfileName() {
        try {
            const nameSelectors = [
                '.text-heading-xlarge',
                '.pv-text-details__left-panel h1',
                '.ph5 h1',
                'h1'
            ];
            
            for (const selector of nameSelectors) {
                const element = document.querySelector(selector);
                if (element && element.textContent && element.textContent.trim()) {
                    return element.textContent.trim();
                }
            }
            return null;
        } catch (error) {
            console.error('Error extracting LinkedIn profile name:', error);
            return null;
        }
    }

    injectFloatingIcon() {
        try {
            // Remove existing icon first
            this.removeFloatingIcon();

            // Create floating icon positioned like in the example (top right area)
            this.floatingIcon = document.createElement('div');
            this.floatingIcon.id = 'echo-floating-icon';
            
            // Get icon URL - fallback to a simple colored div if icon fails
            let iconHTML = '';
            try {
                const iconURL = chrome.runtime.getURL('icons/echooo-favicon-48x48.png');
                iconHTML = `<img src="${iconURL}" alt="Echo" style="width: 20px; height: 20px; border-radius: 4px;">`;
            } catch (error) {
                console.log('Could not load icon, using fallback');
                iconHTML = `<div style="width: 20px; height: 20px; background: white; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #667eea; font-size: 12px;">E</div>`;
            }
            
            this.floatingIcon.innerHTML = iconHTML;

            // Position like the example - top right area of profile section
            this.floatingIcon.style.cssText = `
                position: absolute !important;
                top: 20px !important;
                right: 20px !important;
                z-index: 999999 !important;
                width: 32px !important;
                height: 32px !important;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
                border-radius: 50% !important;
                box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3) !important;
                cursor: pointer !important;
                transition: all 0.3s ease !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
                border: 2px solid white !important;
            `;

            // Add hover effect
            if (!document.getElementById('echo-floating-styles')) {
                const style = document.createElement('style');
                style.id = 'echo-floating-styles';
                style.textContent = `
                    #echo-floating-icon:hover {
                        transform: scale(1.1) !important;
                        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.5) !important;
                    }
                `;
                document.head.appendChild(style);
            }

            // Add click event
            this.floatingIcon.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.handleIconClick();
            });

            // Find the right container to inject the icon
            this.injectIconIntoPage();
            
            console.log('✅ Echo floating icon injected successfully');
        } catch (error) {
            console.error('Error injecting floating icon:', error);
        }
    }

    injectIconIntoPage() {
        try {
            let targetContainer = null;

            // Platform-specific injection targeting the bio area specifically
            switch (this.currentPlatform) {
                case 'instagram':
                    // Strategy: Find the bio area specifically (between username and stats)
                    console.log('Looking for Instagram bio area...');
                    
                    // Method 1: Find the container that has the username and bio
                    const usernameElement = document.querySelector('main header section h1, main header section h2');
                    if (usernameElement) {
                        console.log('Found username element:', usernameElement);
                        
                        // Look for the parent container that contains both username and bio
                        let bioContainer = usernameElement.closest('div');
                        
                        // Try to find a div that comes after the username but before stats
                        const statsElement = document.querySelector('main header section ul');
                        if (statsElement) {
                            // Find all divs between username and stats
                            let currentElement = usernameElement.parentElement;
                            while (currentElement && currentElement !== statsElement.parentElement) {
                                if (currentElement.tagName === 'DIV' && currentElement !== usernameElement.parentElement) {
                                    bioContainer = currentElement;
                                    break;
                                }
                                currentElement = currentElement.nextElementSibling;
                            }
                        }
                        
                        targetContainer = bioContainer;
                    }
                    
                    // Method 2: Look for bio text or description area
                    if (!targetContainer) {
                        targetContainer = 
                            // Bio text span/div
                            document.querySelector('main header section span:not([role="button"])') ||
                            // Any text content between header elements
                            document.querySelector('main header section div:has(span):not(:has(button))') ||
                            // Container with text content but no buttons
                            Array.from(document.querySelectorAll('main header section > div')).find(div => {
                                return div.textContent.trim().length > 0 && !div.querySelector('button') && !div.querySelector('ul');
                            });
                    }
                    
                    // Method 3: Create bio area if doesn't exist
                    if (!targetContainer) {
                        const headerSection = document.querySelector('main header section');
                        const statsElement = document.querySelector('main header section ul');
                        
                        if (headerSection && statsElement) {
                            // Create a bio container
                            targetContainer = document.createElement('div');
                            targetContainer.className = 'echo-bio-area';
                            targetContainer.style.cssText = `
                                margin: 12px 0 !important;
                                padding: 0 !important;
                                display: flex !important;
                                align-items: center !important;
                                gap: 8px !important;
                            `;
                            
                            // Insert before stats
                            statsElement.parentElement.insertBefore(targetContainer, statsElement);
                            console.log('Created bio area container');
                        }
                    }
                    
                    if (targetContainer) {
                        console.log('Bio container found/created:', targetContainer);
                        
                        // Style the icon for bio area
                        this.floatingIcon.style.cssText = `
                            position: relative !important;
                            display: inline-flex !important;
                            align-items: center !important;
                            justify-content: center !important;
                            width: 20px !important;
                            height: 20px !important;
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
                            border-radius: 50% !important;
                            cursor: pointer !important;
                            transition: all 0.2s ease !important;
                            margin: 0 4px !important;
                            border: 1px solid rgba(255, 255, 255, 0.3) !important;
                            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2) !important;
                            top: auto !important;
                            right: auto !important;
                            transform: none !important;
                            z-index: 1000 !important;
                        `;
                        
                        // Add icon to bio area
                        targetContainer.appendChild(this.floatingIcon);
                        console.log('✅ Icon successfully injected into Instagram bio area');
                        return;
                    }
                    break;
                
                case 'tiktok':
                    targetContainer = document.querySelector('[data-e2e="user-bio"]') ||
                                    document.querySelector('[data-e2e="user-info"]');
                    break;
                
                case 'youtube':
                    targetContainer = document.querySelector('#channel-header-container #channel-name').parentElement;
                    break;
                
                case 'twitter':
                    targetContainer = document.querySelector('[data-testid="UserDescription"]');
                    break;
                
                case 'linkedin':
                    targetContainer = document.querySelector('.pv-text-details__left-panel');
                    break;
            }

            // Fallback for other platforms
            if (targetContainer && this.currentPlatform !== 'instagram') {
                this.floatingIcon.style.cssText = `
                    position: relative !important;
                    display: inline-block !important;
                    width: 20px !important;
                    height: 20px !important;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
                    border-radius: 50% !important;
                    cursor: pointer !important;
                    margin: 0 4px !important;
                `;
                
                targetContainer.appendChild(this.floatingIcon);
                console.log('Icon injected into', this.currentPlatform, 'bio area');
            } else if (!targetContainer) {
                // Emergency fallback - don't inject if we can't find proper bio area
                console.warn('Could not find bio area for icon injection');
                return;
            }
        } catch (error) {
            console.error('Error injecting icon into bio area:', error);
        }
    }

    removeFloatingIcon() {
        try {
            if (this.floatingIcon) {
                this.floatingIcon.remove();
                this.floatingIcon = null;
                console.log('🗑️ Floating icon removed');
            }
        } catch (error) {
            console.error('Error removing floating icon:', error);
        }
    }

    handleIconClick() {
        try {
            console.log('🎯 Echo floating icon clicked!');
            console.log('Profile data:', this.profileData);
            
            // Send message to background script
            chrome.runtime.sendMessage({
                type: 'FLOATING_ICON_CLICKED',
                data: {
                    profileData: this.profileData,
                    action: 'analyze_profile'
                }
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.log('Error sending message:', chrome.runtime.lastError);
                } else {
                    console.log('Message sent successfully:', response);
                }
            });

            // Show inline analysis
            this.showInlineAnalysis();
        } catch (error) {
            console.error('Error handling icon click:', error);
        }
    }

    showInlineAnalysis() {
        try {
            // Remove existing popup
            const existingPopup = document.getElementById('echo-analysis-popup');
            if (existingPopup) {
                existingPopup.remove();
            }

            // Get user information for header
            const userName = this.profileData?.profileName || this.profileData?.channelName || this.profileData?.username || 'Unknown User';
            const userHandle = this.profileData?.username ? `@${this.profileData.username}` : '';

            // Create slide-in popup similar to the example
            const analysisPopup = document.createElement('div');
            analysisPopup.id = 'echo-analysis-popup';
            analysisPopup.innerHTML = `
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
                                <span class="echo-platform-badge">${this.currentPlatform}</span>
                            </div>
                        </div>
                        <button class="echo-close-btn">×</button>
                    </div>

                    <!-- Content area -->
                    <div class="echo-popup-content">
                        <!-- Stats section -->
                        <div class="echo-stats-section">
                            <div class="echo-stat-item">
                                <span class="echo-stat-label">Platform</span>
                                <span class="echo-stat-value">${this.currentPlatform.charAt(0).toUpperCase() + this.currentPlatform.slice(1)}</span>
                            </div>
                            ${this.profileData?.followerCount ? `
                                <div class="echo-stat-item">
                                    <span class="echo-stat-label">Followers</span>
                                    <span class="echo-stat-value">${this.profileData.followerCount}</span>
                                </div>
                            ` : ''}
                            ${this.profileData?.subscriberCount ? `
                                <div class="echo-stat-item">
                                    <span class="echo-stat-label">Subscribers</span>
                                    <span class="echo-stat-value">${this.profileData.subscriberCount}</span>
                                </div>
                            ` : ''}
                        </div>

                        <!-- Analysis section -->
                        <div class="echo-analysis-section">
                            <h4>🔍 Quick Analysis</h4>
                            <div class="echo-analysis-items">
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
                            </div>
                        </div>

                        <!-- Action buttons -->
                        <div class="echo-actions-section">
                            <button class="echo-btn echo-btn-primary echo-analyze">
                                <span class="echo-btn-icon">🔍</span>
                                Full Analysis
                            </button>
                            <button class="echo-btn echo-btn-secondary echo-save">
                                <span class="echo-btn-icon">💾</span>
                                Add to Campaign
                            </button>
                        </div>
                    </div>
                </div>
            `;

            // Position popup for slide-in animation (right to left)
            analysisPopup.style.cssText = `
                position: fixed !important;
                top: 0 !important;
                right: -400px !important;
                width: 350px !important;
                height: 100vh !important;
                z-index: 1000000 !important;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
                transition: right 0.3s ease-out !important;
            `;

            // Add popup styles
            if (!document.getElementById('echo-slide-popup-styles')) {
                const popupStyle = document.createElement('style');
                popupStyle.id = 'echo-slide-popup-styles';
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
            const closeBtn = analysisPopup.querySelector('.echo-close-btn');
            closeBtn.addEventListener('click', () => {
                // Slide out animation
                analysisPopup.style.right = '-400px';
                setTimeout(() => analysisPopup.remove(), 300);
            });

            const analyzeBtn = analysisPopup.querySelector('.echo-analyze');
            analyzeBtn.addEventListener('click', () => {
                chrome.runtime.sendMessage({
                    type: 'OPEN_FULL_ANALYSIS',
                    data: this.profileData
                });
                analysisPopup.style.right = '-400px';
                setTimeout(() => analysisPopup.remove(), 300);
            });

            const saveBtn = analysisPopup.querySelector('.echo-save');
            saveBtn.addEventListener('click', () => {
                chrome.runtime.sendMessage({
                    type: 'SAVE_TO_CAMPAIGN',
                    data: this.profileData
                });
                analysisPopup.style.right = '-400px';
                setTimeout(() => analysisPopup.remove(), 300);
            });

            // Add to page
            document.body.appendChild(analysisPopup);

            // Trigger slide-in animation
            setTimeout(() => {
                analysisPopup.style.right = '0px';
            }, 10);

            console.log('✅ Slide-in analysis popup shown');
        } catch (error) {
            console.error('Error showing inline analysis:', error);
        }
    }

    setupMessageListeners() {
        try {
            chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
                console.log('Content script received message:', message);

                switch (message.type) {
                    case 'GET_PROFILE_DATA':
                        sendResponse({ 
                            success: true, 
                            data: {
                                isProfilePage: this.isProfilePage,
                                platform: this.currentPlatform,
                                profileData: this.profileData
                            }
                        });
                        break;

                    case 'INJECT_ICON':
                        this.checkAndInjectIcon();
                        sendResponse({ success: true });
                        break;

                    case 'REMOVE_ICON':
                        this.removeFloatingIcon();
                        sendResponse({ success: true });
                        break;

                    default:
                        sendResponse({ success: false, error: 'Unknown message type' });
                }

                return true;
            });
        } catch (error) {
            console.error('Error setting up message listeners:', error);
        }
    }
}

// Initialize content script when DOM is ready
try {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            new EchoContentScript();
        });
    } else {
        new EchoContentScript();
    }
} catch (error) {
    console.error('Error initializing Echo Content Script:', error);
}