// src/types/api.ts - API types for Chrome extension
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

export interface UserData {
    id: number;
    email: string;
    full_name?: string;
    company?: {
        id: string;
        name: string;
        logo?: string;
        website?: string;
        description?: string;
    };
    roles?: Array<{
        id: string;
        role_type: string;
        role_name: string;
        permissions?: string[];
    }>;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    profile?: {
        avatar?: string;
        bio?: string;
        phone?: string;
        location?: string;
    };
}

export interface CampaignData {
    id: string;
    name: string;
    description?: string;
    status: 'active' | 'paused' | 'completed' | 'draft';
    created_at: string;
    updated_at: string;
    profiles_count?: number;
    company_id?: string;
    budget?: number;
    start_date?: string;
    end_date?: string;
    objectives?: string[];
    target_audience?: {
        age_range?: string;
        location?: string[];
        interests?: string[];
        gender?: string;
    };
    metrics?: {
        total_reach?: number;
        total_engagement?: number;
        total_impressions?: number;
        engagement_rate?: number;
    };
}

export interface ProfileData {
    id?: string;
    username: string;
    fullName?: string;
    bio?: string;
    followers?: string | number;
    following?: string | number;
    posts?: string | number;
    profilePicture?: string;
    isVerified?: boolean;
    isPrivate?: boolean;
    platform: string;
    url: string;
    platformAccountId?: string;
    external_id?: string;
    engagement_rate?: number;
    avg_likes?: number;
    avg_comments?: number;
    location?: string;
    category?: string;
    last_post_date?: string;
    contact_info?: {
        email?: string;
        phone?: string;
        website?: string;
    };
}

export interface CampaignListMember {
    id: string;
    campaign_id: string;
    platform_account_id: string;
    profile_data?: ProfileData;
    status?: string;
    notes?: string;
    created_at: string;
    updated_at: string;
    assigned_to?: string;
    contact_status?: 'not_contacted' | 'contacted' | 'responded' | 'declined' | 'accepted';
    collaboration_status?: 'pending' | 'confirmed' | 'completed' | 'cancelled';
}

export interface AuthData {
    accessToken: string;
    refreshToken?: string;
    userEmail: string;
    userFullName?: string;
    companyId?: string;
    companyName?: string;
    userId?: number;
    expiresAt?: number;
    tokenType?: string;
}

export interface LoginRequest {
    email: string;
    password: string;
    remember_me?: boolean;
}

export interface LoginResponse {
    access_token: string;
    refresh_token?: string;
    token_type: string;
    expires_in: number;
    user: UserData;
}

export interface RegisterRequest {
    email: string;
    password: string;
    full_name?: string;
    company_name?: string;
    user_type?: 'company' | 'influencer';
    source?: string;
}

export interface RegisterResponse {
    success: boolean;
    message: string;
    user: UserData;
    access_token: string;
    refresh_token?: string;
}

// Extension-specific message types
export interface ExtensionMessage {
    type: string;
    data?: any;
    url?: string;
    platform?: string;
    campaignId?: string;
    profileData?: ProfileData;
    authData?: AuthData;
}

export interface ExtensionResponse {
    success: boolean;
    data?: any;
    error?: string;
    message?: string;
}

// Storage types
export interface StoredData {
    accessToken?: string;
    refreshToken?: string;
    userEmail?: string;
    userFullName?: string;
    companyId?: string;
    companyName?: string;
    userId?: number;
    lastSync?: number;
    settings?: {
        autoDetection?: boolean;
        showNotifications?: boolean;
        defaultCampaign?: string;
    };
}

// API endpoint responses
export interface CampaignsListResponse {
    campaigns: CampaignData[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
}

export interface ProfileAnalyticsResponse {
    exists: boolean;
    analytics_count: number;
    data?: {
        engagement_rate: number;
        avg_likes: number;
        avg_comments: number;
        follower_growth: number;
        posting_frequency: number;
        best_posting_times: string[];
        top_hashtags: string[];
        audience_demographics: {
            age_distribution: Record<string, number>;
            gender_distribution: Record<string, number>;
            location_distribution: Record<string, number>;
        };
    };
}

export interface SaveProfileRequest {
    campaign_id: string;
    platform: string;
    username: string;
    full_name?: string;
    bio?: string;
    followers_count?: number;
    following_count?: number;
    posts_count?: number;
    profile_picture?: string;
    is_verified?: boolean;
    is_private?: boolean;
    external_url: string;
    platform_account_id?: string;
    notes?: string;
}

export interface SaveProfileResponse {
    id: string;
    campaign_id: string;
    platform_account_id: string;
    status: string;
    created_at: string;
    message: string;
}

// Error types
export interface ApiError {
    code: string;
    message: string;
    details?: Record<string, any>;
    timestamp: string;
}

export interface ValidationError {
    field: string;
    message: string;
    code: string;
}

export interface ErrorResponse {
    success: false;
    error: string;
    code?: string;
    details?: Record<string, any>;
    validation_errors?: ValidationError[];
}

// Utility types
export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ApiRequestOptions {
    method: ApiMethod;
    headers?: Record<string, string>;
    body?: any;
    timeout?: number;
}

export type Platform = 'instagram' | 'tiktok' | 'youtube' | 'twitter' | 'linkedin';

export type CampaignStatus = 'active' | 'paused' | 'completed' | 'draft';

export type UserType = 'company' | 'influencer' | 'platform';

export type ContactStatus = 'not_contacted' | 'contacted' | 'responded' | 'declined' | 'accepted';

export type CollaborationStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';