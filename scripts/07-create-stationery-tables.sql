-- Create stationery_inventory table
CREATE TABLE IF NOT EXISTS stationery_inventory (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    total_quantity INTEGER NOT NULL DEFAULT 0,
    available_quantity INTEGER NOT NULL DEFAULT 0,
    unit VARCHAR(50) DEFAULT 'pieces',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create stationery_requests table
CREATE TABLE IF NOT EXISTS stationery_requests (
    id SERIAL PRIMARY KEY,
    requester_id INTEGER NOT NULL,
    requester_type VARCHAR(50) NOT NULL, -- 'tutor', 'personnel', 'technical'
    requester_name VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    reason TEXT,
    admin_notes TEXT,
    processed_by INTEGER, -- technical team member ID
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create stationery_request_items table for many-to-many relationship
CREATE TABLE IF NOT EXISTS stationery_request_items (
    id SERIAL PRIMARY KEY,
    request_id INTEGER REFERENCES stationery_requests(id) ON DELETE CASCADE,
    item_id INTEGER REFERENCES stationery_inventory(id),
    quantity INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_stationery_requests_requester ON stationery_requests(requester_id, requester_type);
CREATE INDEX IF NOT EXISTS idx_stationery_requests_status ON stationery_requests(status);

-- Seed initial data
INSERT INTO stationery_inventory (name, description, category, total_quantity, available_quantity, unit) VALUES
('A4 Paper Rim', 'High quality 80gsm A4 paper', 'Paper', 100, 100, 'rims'),
('Blue Ballpoint Pen', 'Standard blue ink pens', 'Writing', 500, 500, 'pieces'),
('Black Ballpoint Pen', 'Standard black ink pens', 'Writing', 500, 500, 'pieces'),
('Whiteboard Marker Set', 'Set of 4 colors (Black, Blue, Red, Green)', 'Writing', 50, 50, 'sets'),
('Stapler', 'Medium duty desktop stapler', 'Desk Supplies', 20, 20, 'pieces'),
('Staple Pins (Box)', 'Box of 1000 pins', 'Desk Supplies', 100, 100, 'boxes'),
('Sticky Notes', '3x3 inch yellow sticky notes', 'Desk Supplies', 150, 150, 'pads'),
('Paper Clips (Box)', 'Standard size paper clips', 'Desk Supplies', 80, 80, 'boxes');
