-- Fix stationery_stock_history table to add missing columns
DO $$ 
BEGIN 
    -- Add item_name column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='stationery_stock_history' AND column_name='item_name') THEN
        ALTER TABLE stationery_stock_history ADD COLUMN item_name TEXT;
    END IF;
    
    -- Add added_by_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='stationery_stock_history' AND column_name='added_by_id') THEN
        ALTER TABLE stationery_stock_history ADD COLUMN added_by_id INTEGER;
    END IF;
    
    -- Add added_by_type column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='stationery_stock_history' AND column_name='added_by_type') THEN
        ALTER TABLE stationery_stock_history ADD COLUMN added_by_type TEXT;
    END IF;
END $$;

-- Update existing records to populate item_name from stationery_inventory
UPDATE stationery_stock_history sh
SET item_name = si.name
FROM stationery_inventory si
WHERE sh.item_id = si.id AND sh.item_name IS NULL;
