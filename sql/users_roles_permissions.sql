ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS role_code varchar NOT NULL DEFAULT 'custom';

CREATE TABLE IF NOT EXISTS public.user_screen_permissions (
  user_id int NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  resource_key varchar NOT NULL,
  can_view boolean NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT user_screen_permissions_pkey PRIMARY KEY (user_id, resource_key)
);

CREATE INDEX IF NOT EXISTS user_screen_permissions_user_id_idx
  ON public.user_screen_permissions (user_id);

UPDATE public.users
SET role_code = 'superadmin'
WHERE username = 'admin';
