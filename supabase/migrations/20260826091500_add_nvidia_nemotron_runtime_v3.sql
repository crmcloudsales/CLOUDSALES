insert into public.internal_settings(setting_key, secret_id, value, created_at, updated_at)
select 'nvidia_api_key_cloudsales', id, jsonb_build_object('provider','nvidia_nim','source','vault'), now(), now()
from vault.secrets
where name='NVIDIA_API_KEY_CLOUDSALES'
on conflict (setting_key) do update set secret_id=excluded.secret_id, value=excluded.value, updated_at=now();

insert into public.ai_provider_catalog(provider_key, display_name, gateway_mode, availability, modalities, capabilities, metadata, sort_order, created_at, updated_at)
values ('nvidia_nim','NVIDIA NIM','direct','direct_ready',array['text'],array['chat','reasoning','coding','tool_calling','long_context'],jsonb_build_object('endpoint','https://integrate.api.nvidia.com/v1/chat/completions','free_endpoint',true),35,now(),now())
on conflict (provider_key) do update set display_name=excluded.display_name,gateway_mode=excluded.gateway_mode,availability=excluded.availability,modalities=excluded.modalities,capabilities=excluded.capabilities,metadata=excluded.metadata,sort_order=excluded.sort_order,updated_at=now();

insert into public.ai_model_catalog(model_key, provider_key, model_id, display_name, availability, modalities, capabilities, context_tokens, cost_tier, quality_tier, speed_tier, metadata, created_at, updated_at)
values ('nvidia_nemotron3_nano_30b_a3b','nvidia_nim','nvidia/nemotron-3-nano-30b-a3b','NVIDIA Nemotron 3 Nano 30B A3B','active',array['text'],array['reasoning','coding','tool_calling','instruction_following','long_context'],262000,1,4,4,jsonb_build_object('endpoint','https://integrate.api.nvidia.com/v1/chat/completions','free_endpoint',true,'reasoning_budget_supported',true),now(),now())
on conflict (model_key) do update set provider_key=excluded.provider_key,model_id=excluded.model_id,display_name=excluded.display_name,availability=excluded.availability,modalities=excluded.modalities,capabilities=excluded.capabilities,context_tokens=excluded.context_tokens,cost_tier=excluded.cost_tier,quality_tier=excluded.quality_tier,speed_tier=excluded.speed_tier,metadata=excluded.metadata,updated_at=now();

insert into public.ai_route_models(route_key, model_key, priority, conditions, enabled, created_at, updated_at)
values ('cloudy_reasoning','nvidia_nemotron3_nano_30b_a3b',15,'{}'::jsonb,true,now(),now()),('cloudy_coding','nvidia_nemotron3_nano_30b_a3b',15,'{}'::jsonb,true,now(),now())
on conflict (route_key,model_key) do update set priority=excluded.priority,conditions=excluded.conditions,enabled=true,updated_at=now();
