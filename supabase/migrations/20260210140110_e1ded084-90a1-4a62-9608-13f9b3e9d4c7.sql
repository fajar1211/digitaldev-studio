ALTER TABLE public.packages
ADD COLUMN IF NOT EXISTS is_vip boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.packages.is_vip IS 'Marks a package as VIP to highlight it on public packages page.';