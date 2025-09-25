-- Rename password_hash column to password for clarity
ALTER TABLE public.app_config RENAME COLUMN password_hash TO password;