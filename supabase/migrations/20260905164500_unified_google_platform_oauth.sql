-- CloudSales unified Google platform OAuth registry.
-- One Google Cloud project + one OAuth Web Client is shared across Google capabilities.

update public.provider_catalog
set display_name = 'Google',
    category = 'other',
    availability = 'beta',
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'brand_key','cloudsales',
      'google_cloud_project_id','cloudsales-507715',
      'google_cloud_project_number','1039655793672',
      'provider_type','unified_google_platform',
      'unified_oauth',true,
      'oauth_authorize_url','https://accounts.google.com/o/oauth2/v2/auth',
      'oauth_token_url','https://oauth2.googleapis.com/token',
      'redirect_uri','https://fkahaqprzgcimgyathqx.supabase.co/functions/v1/oauth-callback-relay',
      'integration_status','oauth_client_required',
      'capability_domains',jsonb_build_array(
        'drive','gmail','calendar','contacts','tasks','youtube','business_profile',
        'google_ads','analytics','search_console','tag_manager','merchant','photos'
      )
    ),
    updated_at = now()
where provider_key = 'google_workspace';

update public.provider_catalog
set metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'google_cloud_project_id','cloudsales-507715',
      'shared_oauth_client_provider','google_workspace',
      'shared_oauth_client',true,
      'redirect_uri','https://fkahaqprzgcimgyathqx.supabase.co/functions/v1/oauth-callback-relay'
    ),
    updated_at = now()
where provider_key in ('youtube','google_business_profile','google_ads');
