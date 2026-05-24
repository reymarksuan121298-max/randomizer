-- Supabase setup for Lanao del Norte manager login.
-- Run this in the Supabase SQL editor after replacing <TEMP_PASSWORD>.
-- The user can log in with:
--   email: lanaonorte.manager@glowingfortune.com
--   password: <TEMP_PASSWORD>

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
    v_user_id UUID;
    v_company_id BIGINT;
BEGIN
    -- 1. Insert or update company
    INSERT INTO public.companies (name, code, address, contact_email)
    VALUES (
        'Lanao del Norte - Glowing Fortune',
        'LDN',
        'Lanao del Norte',
        'lanaonorte.manager@glowingfortune.com'
    )
    ON CONFLICT (code) DO UPDATE
    SET name = EXCLUDED.name,
        address = EXCLUDED.address,
        contact_email = EXCLUDED.contact_email,
        updated_at = now()
    RETURNING id INTO v_company_id;

    -- 2. Check if the auth user already exists in auth.users
    SELECT id INTO v_user_id 
    FROM auth.users 
    WHERE email = 'lanaonorte.manager@glowingfortune.com';

    IF v_user_id IS NULL THEN
        -- Insert new auth user
        v_user_id := gen_random_uuid();
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at
        )
        VALUES (
            '00000000-0000-0000-0000-000000000000',
            v_user_id,
            'authenticated',
            'authenticated',
            'lanaonorte.manager@glowingfortune.com',
            crypt('<TEMP_PASSWORD>', gen_salt('bf')),
            now(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            '{"full_name":"Lanao del Norte Manager","role":"manager","company":"Lanao del Norte - Glowing Fortune"}'::jsonb,
            now(),
            now()
        );
        
        -- Insert corresponding identity
        INSERT INTO auth.identities (
            id,
            user_id,
            identity_data,
            provider,
            provider_id,
            last_sign_in_at,
            created_at,
            updated_at
        )
        VALUES (
            v_user_id,
            v_user_id,
            jsonb_build_object('sub', v_user_id::text, 'email', 'lanaonorte.manager@glowingfortune.com'),
            'email',
            'lanaonorte.manager@glowingfortune.com',
            now(),
            now(),
            now()
        );
    ELSE
        -- Update existing auth user metadata and password
        UPDATE auth.users
        SET encrypted_password = crypt('<TEMP_PASSWORD>', gen_salt('bf')),
            raw_user_meta_data = '{"full_name":"Lanao del Norte Manager","role":"manager","company":"Lanao del Norte - Glowing Fortune"}'::jsonb,
            updated_at = now()
        WHERE id = v_user_id;

        -- Update identity if needed
        INSERT INTO auth.identities (
            id,
            user_id,
            identity_data,
            provider,
            provider_id,
            last_sign_in_at,
            created_at,
            updated_at
        )
        VALUES (
            v_user_id,
            v_user_id,
            jsonb_build_object('sub', v_user_id::text, 'email', 'lanaonorte.manager@glowingfortune.com'),
            'email',
            'lanaonorte.manager@glowingfortune.com',
            now(),
            now(),
            now()
        )
        ON CONFLICT (provider, provider_id) DO UPDATE
        SET identity_data = EXCLUDED.identity_data,
            updated_at = now();
    END IF;

    -- 3. Insert or update public.users
    INSERT INTO public.users (auth_user_id, company_id, email, password_hash, full_name, role, status)
    VALUES (
        v_user_id,
        v_company_id,
        'lanaonorte.manager@glowingfortune.com',
        'Lanao del Norte Manager',
        'manager',
        'active'
    )
    ON CONFLICT (email) DO UPDATE
    SET auth_user_id = EXCLUDED.auth_user_id,
        company_id = EXCLUDED.company_id,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        status = EXCLUDED.status,
        updated_at = now();
END;
$$;
