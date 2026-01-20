-- Add approvals resource permissions for relevant roles

-- Super Admin - full access
INSERT INTO public.permissions (role, resource, can_create, can_read, can_update, can_delete)
VALUES ('super_admin', 'approvals', true, true, true, true)
ON CONFLICT DO NOTHING;

-- Admin - full access
INSERT INTO public.permissions (role, resource, can_create, can_read, can_update, can_delete)
VALUES ('admin', 'approvals', true, true, true, true)
ON CONFLICT DO NOTHING;

-- Education Officer - can approve at subcounty level (update for approve, delete for reject)
INSERT INTO public.permissions (role, resource, can_create, can_read, can_update, can_delete)
VALUES ('education_officer', 'approvals', false, true, true, true)
ON CONFLICT DO NOTHING;

-- Governor - can do final approval (update for approve, delete for reject)
INSERT INTO public.permissions (role, resource, can_create, can_read, can_update, can_delete)
VALUES ('governor', 'approvals', false, true, true, true)
ON CONFLICT DO NOTHING;

-- Center Admin - read only (can view but not approve)
INSERT INTO public.permissions (role, resource, can_create, can_read, can_update, can_delete)
VALUES ('center_admin', 'approvals', false, true, false, false)
ON CONFLICT DO NOTHING;

-- Data Entry - read only
INSERT INTO public.permissions (role, resource, can_create, can_read, can_update, can_delete)
VALUES ('data_entry', 'approvals', false, true, false, false)
ON CONFLICT DO NOTHING;

-- Viewer - read only
INSERT INTO public.permissions (role, resource, can_create, can_read, can_update, can_delete)
VALUES ('viewer', 'approvals', false, true, false, false)
ON CONFLICT DO NOTHING;

-- Teacher - read only
INSERT INTO public.permissions (role, resource, can_create, can_read, can_update, can_delete)
VALUES ('teacher', 'approvals', false, true, false, false)
ON CONFLICT DO NOTHING;