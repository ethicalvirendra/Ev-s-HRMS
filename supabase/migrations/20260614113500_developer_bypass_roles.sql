-- Redefine handle_new_user trigger function to automatically assign roles to developer bypass emails

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  default_role public.app_role := 'employee';
BEGIN
  -- Determine role based on developer bypass emails
  IF NEW.email = 'dev-admin@nexus.local' THEN
    default_role := 'admin';
  ELSIF NEW.email = 'dev-manager@nexus.local' THEN
    default_role := 'manager';
  ELSIF NEW.email = 'dev-employee@nexus.local' THEN
    default_role := 'employee';
  END IF;

  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, default_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END $$;
