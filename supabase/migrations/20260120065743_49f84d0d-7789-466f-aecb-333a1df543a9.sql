-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT false,
  link TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
  ON public.notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
  ON public.notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications"
  ON public.notifications
  FOR DELETE
  USING (auth.uid() = user_id);

-- System can insert notifications (via service role)
CREATE POLICY "Service role can insert notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(user_id, is_read);

-- Create function to get users who need to be notified for student approvals
CREATE OR REPLACE FUNCTION public.get_approval_notification_users(approval_level TEXT)
RETURNS TABLE(user_id UUID, email TEXT, full_name TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT p.user_id, p.email, p.full_name
  FROM public.profiles p
  JOIN public.user_roles ur ON p.user_id = ur.user_id
  WHERE 
    CASE 
      WHEN approval_level = 'subcounty' THEN ur.role IN ('education_officer', 'admin', 'super_admin')
      WHEN approval_level = 'ministry' THEN ur.role IN ('admin', 'super_admin', 'governor')
      ELSE false
    END
$$;

-- Create function to create notifications for approval users
CREATE OR REPLACE FUNCTION public.create_student_approval_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user RECORD;
  _approval_level TEXT;
  _center_name TEXT;
BEGIN
  -- Get center name
  SELECT name INTO _center_name FROM public.ecde_centers WHERE id = NEW.center_id;

  -- Determine which level of approvers to notify
  IF NEW.approval_status = 'pending' AND (OLD IS NULL OR OLD.approval_status IS DISTINCT FROM 'pending') THEN
    _approval_level := 'subcounty';
    
    -- Create in-app notifications for sub-county officers
    FOR _user IN SELECT * FROM public.get_approval_notification_users('subcounty') LOOP
      INSERT INTO public.notifications (user_id, title, message, type, link, metadata)
      VALUES (
        _user.user_id,
        'New Student Registration',
        'Student ' || NEW.full_name || ' from ' || COALESCE(_center_name, 'Unknown Center') || ' needs sub-county approval.',
        'approval',
        '/approvals',
        jsonb_build_object('student_id', NEW.id, 'student_name', NEW.full_name, 'center_name', _center_name)
      );
    END LOOP;
    
  ELSIF NEW.approval_status = 'approved_subcounty' AND (OLD IS NULL OR OLD.approval_status IS DISTINCT FROM 'approved_subcounty') THEN
    _approval_level := 'ministry';
    
    -- Create in-app notifications for ministry officers
    FOR _user IN SELECT * FROM public.get_approval_notification_users('ministry') LOOP
      INSERT INTO public.notifications (user_id, title, message, type, link, metadata)
      VALUES (
        _user.user_id,
        'Student Awaiting Final Approval',
        'Student ' || NEW.full_name || ' from ' || COALESCE(_center_name, 'Unknown Center') || ' has been approved by sub-county and needs ministry approval.',
        'approval',
        '/approvals',
        jsonb_build_object('student_id', NEW.id, 'student_name', NEW.full_name, 'center_name', _center_name)
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for student approval notifications
CREATE TRIGGER student_approval_notification_trigger
  AFTER INSERT OR UPDATE OF approval_status ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION public.create_student_approval_notifications();