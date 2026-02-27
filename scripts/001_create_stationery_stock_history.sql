-- Added stationery_stock_history table and updated stationery_inventory with total_stock column if missing
CREATE TABLE IF NOT EXISTS stationery_stock_history (
    id SERIAL PRIMARY KEY,
    item_id INTEGER REFERENCES stationery_inventory(id) ON DELETE CASCADE,
    quantity_added INTEGER NOT NULL,
    added_by_name TEXT NOT NULL,
    added_by_username TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ensure stationery_inventory has both available and total tracks
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stationery_inventory' AND column_name='total_stock') THEN
        ALTER TABLE stationery_inventory ADD COLUMN total_stock INTEGER DEFAULT 0;
        -- Sync total_stock with available_quantity initially
        UPDATE stationery_inventory SET total_stock = available_quantity;
    END IF;
END $$;
