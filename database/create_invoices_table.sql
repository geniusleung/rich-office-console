-- Create invoices table for storing main order information
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no VARCHAR(100) NOT NULL UNIQUE,
  po_number VARCHAR(100),
  order_date DATE,
  due_date DATE,
  delivery_date DATE,
  delivery_method VARCHAR(50),
  paid_status VARCHAR(20),
  shipping_address TEXT,
  
  -- Customer Information (denormalized for simplicity)
  customer_name VARCHAR(255),
  customer_phone VARCHAR(50),
  customer_address TEXT,
  
  -- Calculated Fields
  total_quantity INTEGER DEFAULT 0,
  wdgsp_string VARCHAR(50), -- Window/Door/Glass/Screen/Part counts
  
  -- Special Order Flags
  has_special_order BOOLEAN DEFAULT FALSE,
  glass_order_needed BOOLEAN DEFAULT FALSE,
  item_order_needed BOOLEAN DEFAULT FALSE,
  
  -- Processing Metadata
  extraction_confidence VARCHAR(20) DEFAULT 'high',
  processing_status VARCHAR(20) DEFAULT 'success',
  
  -- Audit Fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_invoices_order_no ON invoices(order_no);
CREATE INDEX idx_invoices_customer_name ON invoices(customer_name);
CREATE INDEX idx_invoices_order_date ON invoices(order_date);
CREATE INDEX idx_invoices_delivery_date ON invoices(delivery_date);
CREATE INDEX idx_invoices_has_special_order ON invoices(has_special_order);

-- Enable Row Level Security
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Enable all operations for authenticated users" ON invoices
  FOR ALL USING (auth.role() = 'authenticated');

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();