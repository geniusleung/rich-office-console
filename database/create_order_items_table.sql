-- Create order_items table for storing individual item details
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  
  -- Item Details
  item_name VARCHAR(255),
  quantity INTEGER DEFAULT 0,
  
  -- Dimensions
  width VARCHAR(50),
  height VARCHAR(50),
  additional_dimension VARCHAR(50), -- P/V field
  
  -- Specifications
  color VARCHAR(100),
  frame VARCHAR(100),
  glass_option VARCHAR(255),
  grid_style VARCHAR(100),
  argon VARCHAR(50),
  
  -- Validation Flags
  is_unknown_item BOOLEAN DEFAULT FALSE,
  is_unknown_color BOOLEAN DEFAULT FALSE,
  is_unknown_frame BOOLEAN DEFAULT FALSE,
  requires_special_order BOOLEAN DEFAULT FALSE,
  
  -- Audit Fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_order_items_invoice_id ON order_items(invoice_id);
CREATE INDEX idx_order_items_item_name ON order_items(item_name);
CREATE INDEX idx_order_items_color ON order_items(color);
CREATE INDEX idx_order_items_frame ON order_items(frame);
CREATE INDEX idx_order_items_requires_special_order ON order_items(requires_special_order);

-- Enable Row Level Security
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Enable all operations for authenticated users" ON order_items
  FOR ALL USING (auth.role() = 'authenticated');

-- Create updated_at trigger
CREATE TRIGGER update_order_items_updated_at BEFORE UPDATE ON order_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();