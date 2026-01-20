-- Remove the single 'approvals' resource and add separate level-based resources
DELETE FROM public.permissions WHERE resource = 'approvals';

-- Add Level 1 Approval (Sub-county) permissions
INSERT INTO public.permissions (role, resource, can_read, can_create, can_update, can_delete) VALUES
  ('super_admin', 'approvals_level1', true, true, true, true),
  ('admin', 'approvals_level1', true, true, true, true),
  ('education_officer', 'approvals_level1', true, false, true, true),
  ('governor', 'approvals_level1', true, false, false, false),
  ('center_admin', 'approvals_level1', true, false, false, false),
  ('data_entry', 'approvals_level1', true, false, false, false),
  ('viewer', 'approvals_level1', true, false, false, false),
  ('teacher', 'approvals_level1', true, false, false, false);

-- Add Level 2 Approval (Ministry) permissions
INSERT INTO public.permissions (role, resource, can_read, can_create, can_update, can_delete) VALUES
  ('super_admin', 'approvals_level2', true, true, true, true),
  ('admin', 'approvals_level2', true, true, true, true),
  ('education_officer', 'approvals_level2', true, false, false, false),
  ('governor', 'approvals_level2', true, false, true, true),
  ('center_admin', 'approvals_level2', true, false, false, false),
  ('data_entry', 'approvals_level2', true, false, false, false),
  ('viewer', 'approvals_level2', true, false, false, false),
  ('teacher', 'approvals_level2', true, false, false, false);