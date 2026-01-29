-- Add Midtrans payment tracking fields to orders
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS subscription_years integer,
ADD COLUMN IF NOT EXISTS promo_code text,
ADD COLUMN IF NOT EXISTS amount_usd numeric,
ADD COLUMN IF NOT EXISTS amount_idr numeric,
ADD COLUMN IF NOT EXISTS payment_provider text,
ADD COLUMN IF NOT EXISTS payment_env text,
ADD COLUMN IF NOT EXISTS midtrans_order_id text,
ADD COLUMN IF NOT EXISTS midtrans_transaction_id text,
ADD COLUMN IF NOT EXISTS midtrans_payment_type text,
ADD COLUMN IF NOT EXISTS midtrans_transaction_status text,
ADD COLUMN IF NOT EXISTS midtrans_fraud_status text,
ADD COLUMN IF NOT EXISTS midtrans_redirect_url text;

-- Helpful index for webhook lookup
CREATE INDEX IF NOT EXISTS idx_orders_midtrans_order_id ON public.orders (midtrans_order_id);

-- Optional uniqueness for Midtrans order id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_midtrans_order_id_unique'
  ) THEN
    ALTER TABLE public.orders
    ADD CONSTRAINT orders_midtrans_order_id_unique UNIQUE (midtrans_order_id);
  END IF;
END$$;