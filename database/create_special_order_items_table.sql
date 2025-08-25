-- Create special_order_items table for tracking special orders
CREATE TABLE special_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  order_item_id UUID REFERENCES order_items(id) ON DELETE CASCADE,
  
  -- Item Information
  item_name VARCHAR(255),
  quantity INTEGER,
  glass_option VARCHAR(255),
  order_type VARCHAR(20) CHECK (order_type IN ('item', 'glass')), -- 'item' or 'glass'
  
  -- Order Status
  order_status VARCHAR(50) DEFAULT 'pending' CHECK (order_status IN ('pending', 'ordered', 'received', 'cancelled')),
  order_date DATE,
  expected_delivery DATE,
  actual_delivery DATE,
  supplier VARCHAR(255),
  supplier_order_number VARCHAR(100),
  cost DECIMAL(10,2),
  notes TEXT,
  
  -- Audit Fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_special_orders_invoice_id ON special_order_items(invoice_id);
CREATE INDEX idx_special_orders_order_item_id ON special_order_items(order_item_id);
CREATE INDEX idx_special_orders_status ON special_order_items(order_status);
CREATE INDEX idx_special_orders_type ON special_order_items(order_type);
CREATE INDEX idx_special_orders_supplier ON special_order_items(supplier);
CREATE INDEX idx_special_orders_order_date ON special_order_items(order_date);
CREATE INDEX idx_special_orders_expected_delivery ON special_order_items(expected_delivery);

-- Enable Row Level Security
ALTER TABLE special_order_items ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Enable all operations for authenticated users" ON special_order_items
  FOR ALL USING (auth.role() = 'authenticated');

-- Create updated_at trigger
CREATE TRIGGER update_special_order_items_updated_at BEFORE UPDATE ON special_order_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();