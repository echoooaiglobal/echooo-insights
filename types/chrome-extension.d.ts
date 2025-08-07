// Global window extension
// types\chrome-extension.d.ts
declare global {
    interface Window {
        echoExtensionContent: boolean;
    }
}

declare namespace chrome {
  namespace runtime {
    interface MessageSender {
      tab?: chrome.tabs.Tab;
      frameId?: number;
      id?: string;
      url?: string;
      tlsChannelId?: string;
      origin?: string;
    }

    interface Port {
      name: string;
      disconnect(): void;
      onDisconnect: chrome.events.Event<(port: Port) => void>;
      onMessage: chrome.events.Event<(message: any, port: Port) => void>;
      postMessage(message: any): void;
      sender?: MessageSender;
    }

    interface InstalledDetails {
      reason: string;
      previousVersion?: string;
      id?: string;
    }

    interface PlatformInfo {
      os: string;
      arch: string;
      nacl_arch: string;
    }
  }

  namespace storage {
    interface StorageArea {
      get(keys?: string | string[] | Record<string, any> | null): Promise<Record<string, any>>;
      set(items: Record<string, any>): Promise<void>;
      remove(keys: string | string[]): Promise<void>;
      clear(): Promise<void>;
      getBytesInUse?(keys?: string | string[]): Promise<number>;
    }

    interface StorageChange {
      oldValue?: any;
      newValue?: any;
    }

    interface StorageChangedEvent extends chrome.events.Event<(changes: Record<string, StorageChange>, areaName: string) => void> {}
  }

  namespace tabs {
    interface Tab {
      id?: number;
      index: number;
      windowId: number;
      highlighted: boolean;
      active: boolean;
      pinned: boolean;
      audible?: boolean;
      discarded: boolean;
      autoDiscardable: boolean;
      mutedInfo?: MutedInfo;
      url?: string;
      pendingUrl?: string;
      title?: string;
      favIconUrl?: string;
      status?: string;
      incognito: boolean;
      width?: number;
      height?: number;
      sessionId?: string;
      groupId: number;
      openerTabId?: number;
    }

    interface MutedInfo {
      muted: boolean;
      reason?: string;
      extensionId?: string;
    }

    interface TabChangeInfo {
      status?: string;
      url?: string;
      audible?: boolean;
      discarded?: boolean;
      favIconUrl?: string;
      mutedInfo?: MutedInfo;
      pinned?: boolean;
      title?: string;
    }

    interface CreateProperties {
      windowId?: number;
      index?: number;
      url?: string;
      active?: boolean;
      pinned?: boolean;
      openerTabId?: number;
    }

    interface UpdateProperties {
      url?: string;
      active?: boolean;
      highlighted?: boolean;
      pinned?: boolean;
      muted?: boolean;
      openerTabId?: number;
    }

    interface QueryInfo {
      active?: boolean;
      audible?: boolean;
      autoDiscardable?: boolean;
      currentWindow?: boolean;
      discarded?: boolean;
      groupId?: number;
      highlighted?: boolean;
      index?: number;
      lastFocusedWindow?: boolean;
      muted?: boolean;
      pinned?: boolean;
      status?: string;
      title?: string;
      url?: string | string[];
      windowId?: number;
      windowType?: string;
    }
  }

  namespace action {
    interface TabDetails {
      tabId?: number;
    }

    interface BadgeColorDetails extends TabDetails {
      color: string | [number, number, number, number];
    }

    interface BadgeTextDetails extends TabDetails {
      text: string;
    }

    interface TitleDetails extends TabDetails {
      title: string;
    }

    interface PopupDetails extends TabDetails {
      popup: string;
    }
  }

  namespace notifications {
    interface NotificationOptions {
      type: string;
      iconUrl?: string;
      title?: string;
      message?: string;
      contextMessage?: string;
      priority?: number;
      eventTime?: number;
      buttons?: NotificationButton[];
      imageUrl?: string;
      items?: NotificationItem[];
      progress?: number;
      isClickable?: boolean;
    }

    interface NotificationButton {
      title: string;
      iconUrl?: string;
    }

    interface NotificationItem {
      title: string;
      message: string;
    }
  }

  namespace scripting {
    interface InjectionTarget {
      tabId: number;
      frameIds?: number[];
      documentIds?: string[];
      allFrames?: boolean;
    }

    interface ScriptInjection {
      target: InjectionTarget;
      files?: string[];
      func?: Function;
      args?: any[];
      world?: string;
    }

    interface CSSInjection {
      target: InjectionTarget;
      files?: string[];
      css?: string;
    }

    interface InjectionResult {
      frameId: number;
      result?: any;
      error?: any;
    }
  }

  namespace events {
    interface Event<T extends Function> {
      addListener(callback: T): void;
      removeListener(callback: T): void;
      hasListener(callback: T): boolean;
    }
  }

  namespace webNavigation {
    interface WebNavigationFramedCallbackDetails {
      tabId: number;
      url: string;
      processId: number;
      frameId: number;
      timeStamp: number;
    }

    interface WebNavigationCallbackDetails extends WebNavigationFramedCallbackDetails {
      parentFrameId: number;
    }
  }

  namespace permissions {
    interface Permissions {
      permissions?: string[];
      origins?: string[];
    }
  }
}

// Global Chrome API declarations
declare const chrome: any;

// Extension-specific interfaces
interface ExtensionMessage {
  type: string;
  data?: any;
  tabId?: number;
  frameId?: number;
}

interface ExtensionResponse {
  success: boolean;
  data?: any;
  error?: string;
}

// Platform detection types
type SocialPlatform = 'instagram' | 'twitter' | 'linkedin' | 'tiktok' | 'youtube' | 'facebook' | 'echo_frontend' | 'unknown';

// Profile data interfaces
interface BaseProfileData {
  platform?: SocialPlatform;
  url?: string;
  timestamp?: number;
}

interface InstagramProfileData extends BaseProfileData {
  username?: string;
  bio?: string;
  followers?: string;
  following?: string;
  posts?: string;
  verified?: boolean;
}

interface TwitterProfileData extends BaseProfileData {
  username?: string;
  displayName?: string;
  bio?: string;
  followers?: string;
  following?: string;
  verified?: boolean;
}

interface LinkedInProfileData extends BaseProfileData {
  name?: string;
  title?: string;
  location?: string;
  connections?: string;
}

interface TikTokProfileData extends BaseProfileData {
  username?: string;
  bio?: string;
  followers?: string;
  following?: string;
  likes?: string;
}

interface YouTubeProfileData extends BaseProfileData {
  channelName?: string;
  subscribers?: string;
  description?: string;
  videos?: string;
}

interface FacebookProfileData extends BaseProfileData {
  name?: string;
  about?: string;
  followers?: string;
  likes?: string;
}

// Union type for all profile data
type ProfileData = InstagramProfileData | TwitterProfileData | LinkedInProfileData | 
                  TikTokProfileData | YouTubeProfileData | FacebookProfileData;

// Auth-related interfaces
interface AuthTokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  tokenType?: string;
}

interface UserData {
  id: number;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  subscription_tier?: string;
}

interface StoredAuthData extends AuthTokenData {
  userEmail: string;
  userDetails?: UserData;
  lastSync?: number;
  lastValidation?: number;
}

// API response interfaces
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  items?: T[];
  message?: string;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

interface CategoryData {
  id: number;
  name: string;
  description?: string;
  count: number;
  created_at: string;
  updated_at: string;
}

interface CampaignData {
  id: number;
  name: string;
  description?: string;
  status: 'active' | 'paused' | 'completed' | 'draft';
  created_at: string;
  updated_at: string;
  profiles_count: number;
}

// DOM-related interfaces
interface ExtensionElement extends HTMLElement {
  dataset: DOMStringMap & {
    action?: string;
    platform?: string;
    profileId?: string;
  };
}

// Error handling interfaces
interface ExtensionError extends Error {
  code?: string;
  details?: any;
  timestamp?: number;
}

// Utility types
type MessageHandler<T = any> = (message: ExtensionMessage, sender: chrome.runtime.MessageSender, sendResponse: (response?: ExtensionResponse) => void) => boolean | void;

type AsyncMessageHandler<T = any> = (message: ExtensionMessage, sender: chrome.runtime.MessageSender) => Promise<ExtensionResponse>;

// Storage utility types
type StorageKeys = keyof StoredAuthData | 'categories' | 'campaigns' | 'profileCache' | 'settings';

// Content script injection types
interface ContentScriptContext {
  platform: SocialPlatform;
  url: string;
  tabId: number;
  frameId: number;
}

// Background script context
interface BackgroundContext {
  apiBaseUrl: string;
  frontendUrl: string;
  isProduction: boolean;
  version: string;
}

// Export for module usage if needed
export {
  ExtensionMessage,
  ExtensionResponse,
  ProfileData,
  StoredAuthData,
  ApiResponse,
  CategoryData,
  CampaignData,
  MessageHandler,
  AsyncMessageHandler,
  SocialPlatform,
  ContentScriptContext,
  BackgroundContext
};