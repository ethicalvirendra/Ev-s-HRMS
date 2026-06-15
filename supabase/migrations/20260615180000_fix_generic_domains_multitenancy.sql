-- Redefine handle_new_user trigger function to fix public/generic email domains in multi-tenancy.
-- Prevents users signing up with gmail.com, yahoo.com, outlook.com, etc., from joining the same organization.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  default_role public.app_role := 'employee';
  org_id uuid;
  company_name text;
  company_slug text;
  email_domain text;
BEGIN
  -- Extract domain from email
  email_domain := split_part(NEW.email, '@', 2);

  -- Determine role based on developer bypass emails
  IF NEW.email = 'dev-admin@nexus.local' THEN
    default_role := 'admin';
  ELSIF NEW.email = 'dev-manager@nexus.local' THEN
    default_role := 'manager';
  ELSIF NEW.email = 'dev-employee@nexus.local' THEN
    default_role := 'employee';
  END IF;

  -- 1) Try to match organization by domain (only if not a public/generic provider)
  IF email_domain NOT IN ('gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'aol.com', 'icloud.com', 'mail.com', 'zoho.com', 'protonmail.com', 'proton.me', 'gmx.com', 'yandex.com', 'live.com', 'msn.com') THEN
    SELECT id INTO org_id FROM public.organizations WHERE domain = email_domain LIMIT 1;
  END IF;

  -- 2) If developer or domain not found, use default organization or create a new one
  IF org_id IS NULL THEN
    IF email_domain = 'nexus.local' THEN
      SELECT id INTO org_id FROM public.organizations WHERE slug = 'default' LIMIT 1;
    ELSE
      -- Create a new organization for this new signup
      company_name := COALESCE(
        NEW.raw_user_meta_data->>'company_name',
        initcap(split_part(NEW.email, '@', 1)) || ' Org'
      );
      
      -- Ensure company_name is not empty
      IF company_name IS NULL OR trim(company_name) = '' THEN
        company_name := initcap(split_part(email_domain, '.', 1)) || ' Org';
      END IF;

      company_slug := lower(regexp_replace(company_name, '[^a-zA-Z0-9]+', '-', 'g'));
      company_slug := trim(both '-' from company_slug);
      
      -- Ensure slug is unique
      IF EXISTS (SELECT 1 FROM public.organizations WHERE slug = company_slug) THEN
        company_slug := company_slug || '-' || substr(gen_random_uuid()::text, 1, 8);
      END IF;

      -- If the email domain is a generic provider, we do not associate the organization with it
      INSERT INTO public.organizations (name, slug, domain)
      VALUES (
        company_name,
        company_slug,
        CASE WHEN email_domain IN ('gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'aol.com', 'icloud.com', 'mail.com', 'zoho.com', 'protonmail.com', 'proton.me', 'gmx.com', 'yandex.com', 'live.com', 'msn.com') THEN NULL ELSE email_domain END
      )
      RETURNING id INTO org_id;

      -- First user in a new organization is an admin
      default_role := 'admin';
    END IF;
  END IF;

  -- Insert profile
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Insert user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, default_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Insert employee record linked to organization
  INSERT INTO public.employees (user_id, employee_code, full_name, email, organization_id, status)
  VALUES (
    NEW.id,
    'EMP-' || upper(substr(gen_random_uuid()::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)),
    NEW.email,
    org_id,
    'active'
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END $$;
