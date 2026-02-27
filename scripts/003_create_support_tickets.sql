-- Create support_tickets table for ticket management system
CREATE TABLE IF NOT EXISTS support_tickets (
  id SERIAL PRIMARY KEY,
  
  -- Ticket details
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  
  -- Status tracking (Open → Claimed → Closed)
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'claimed', 'closed')),
  
  -- Requester information
  created_by_id INTEGER NOT NULL,
  created_by_type VARCHAR(50) NOT NULL CHECK (created_by_type IN ('tutor', 'admin_personnel', 'peon_housekeeping')),
  created_by_name VARCHAR(255) NOT NULL,
  
  -- Technical team assignment
  claimed_by_id INTEGER,
  claimed_by_name VARCHAR(255),
  claimed_at TIMESTAMP WITH TIME ZONE,
  
  -- Resolution tracking
  closed_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_created_by ON support_tickets(created_by_id, created_by_type);
CREATE INDEX idx_support_tickets_claimed_by ON support_tickets(claimed_by_id);
CREATE INDEX idx_support_tickets_created_at ON support_tickets(created_at DESC);

-- Add comment for documentation
COMMENT ON TABLE support_tickets IS 'Support ticket management system for Tutors, Admin Personnel, and Peon/Housekeeping to raise issues to Technical Team';
COMMENT ON COLUMN support_tickets.status IS 'Ticket workflow: open → claimed → closed';
COMMENT ON COLUMN support_tickets.created_by_type IS 'Type of user who created the ticket: tutor, admin_personnel, or peon_housekeeping';
COMMENT ON COLUMN support_tickets.priority IS 'Priority level: low, medium, high, urgent';
