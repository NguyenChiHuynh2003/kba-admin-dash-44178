-- Add stock_quantity column to asset_master_data
ALTER TABLE public.asset_master_data 
ADD COLUMN IF NOT EXISTS stock_quantity numeric NOT NULL DEFAULT 0;

-- Add allocated_quantity to track how many are currently allocated
ALTER TABLE public.asset_master_data 
ADD COLUMN IF NOT EXISTS allocated_quantity numeric NOT NULL DEFAULT 0;

-- Add quantity field to asset_allocations to track how many units are allocated
ALTER TABLE public.asset_allocations 
ADD COLUMN IF NOT EXISTS quantity numeric NOT NULL DEFAULT 1;