-- Add n8n webhook configuration for KREOON IA to app_settings
INSERT INTO app_settings (key, value, description) VALUES
('kreoon_ia_webhook_script', '', 'Webhook n8n para generar el guión del creador en KREOON IA'),
('kreoon_ia_webhook_editor', '', 'Webhook n8n para generar pautas del editor en KREOON IA'),
('kreoon_ia_webhook_trafficker', '', 'Webhook n8n para generar pautas del trafficker en KREOON IA'),
('kreoon_ia_webhook_strategist', '', 'Webhook n8n para generar pautas del estratega en KREOON IA'),
('kreoon_ia_webhook_designer', '', 'Webhook n8n para generar pautas del diseñador en KREOON IA'),
('kreoon_ia_webhook_admin', '', 'Webhook n8n para generar pautas del admin/PM en KREOON IA')
ON CONFLICT (key) DO NOTHING;