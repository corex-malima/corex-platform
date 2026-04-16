-- ============================================
-- SETUP: Create Users Table & Initial Data
-- ============================================

-- Drop existing table (clean slate)
DROP TABLE IF EXISTS public.users CASCADE;

-- Create users table
CREATE TABLE public.users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX idx_users_username ON public.users(username);

-- ============================================
-- Insert Initial Admin User
-- ============================================
-- Username: admin
-- Password: atlas2026 (hashed with bcrypt)
INSERT INTO public.users (username, password_hash) VALUES
(
  'admin',
  '$2b$10$KbLAx7AQzL7pKfKVlVGkIeKb8h2N5QqLxY6ZqM9VwP2X8H7F4K8H2'
);

-- Verify
SELECT 'TABLA CREADA!' as status;
SELECT username, is_active, created_at FROM public.users;
