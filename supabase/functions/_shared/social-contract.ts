export type SocialNetwork =
  | 'facebook'
  | 'instagram'
  | 'linkedin'
  | 'tiktok'
  | 'youtube'
  | 'google_business'
  | 'threads';

export type SocialCapability =
  | 'social.publish'
  | 'social.schedule'
  | 'social.read'
  | 'analytics.snapshot'
  | 'review.read'
  | 'review.reply';

export type SocialActionRisk = 'READ' | 'SAFE_WRITE' | 'EXTERNAL_COMMUNICATION';

export interface SocialMediaAsset {
  type: 'image' | 'video' | 'document' | 'link';
  url: string;
  mime_type?: string;
  alt_text?: string;
}

export interface SocialPublishRequest {
  organization_id: string;
  network: SocialNetwork;
  text: string;
  assets?: SocialMediaAsset[];
  publish_now?: boolean;
  scheduled_for?: string | null;
  provider_key?: string;
  provider_channel_id?: string;
  provider_account_id?: string;
  metadata?: Record<string, unknown>;
}

export interface SocialExecutionResult {
  ok: boolean;
  provider_key: string;
  network: SocialNetwork;
  external_post_id?: string | null;
  external_url?: string | null;
  status: 'draft' | 'queued' | 'scheduled' | 'published' | 'failed';
  raw?: unknown;
}

export interface SocialProviderAdapter {
  provider_key: string;
  supports(network: SocialNetwork, capability: SocialCapability): Promise<boolean>;
  publish(input: SocialPublishRequest): Promise<SocialExecutionResult>;
}

export const SOCIAL_ACTION_RISK: Record<SocialCapability, SocialActionRisk> = {
  'social.publish': 'EXTERNAL_COMMUNICATION',
  'social.schedule': 'EXTERNAL_COMMUNICATION',
  'social.read': 'READ',
  'analytics.snapshot': 'READ',
  'review.read': 'READ',
  'review.reply': 'EXTERNAL_COMMUNICATION',
};

// Cloudy targets this contract, never a provider-specific API directly.
// provider_capabilities + organization/channel bindings remain authoritative.
