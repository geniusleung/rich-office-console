-- Invoice Processing Database Setup Script
-- This script creates all tables and functions needed for the invoice processing system

-- =====================================================
-- 1. Create the updated_at trigger function first
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- =====================================================
-- 2. Create invoices table (main table)
-- =====================================================
CREATE TABLE IF NOT EXISTS invoices (
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

-- =====================================================
-- 3. Create order_items table (child table)
-- =====================================================
CREATE TABLE IF NOT EXISTS order_items (
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

-- =====================================================
-- 4. Create special_order_items table (tracking table)
-- =====================================================
CREATE TABLE IF NOT EXISTS special_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  order_item_id UUID REFERENCES order_items(id) ON DELETE CASCADE,
  
  -- Item Information
  item_name VARCHAR(255),
  quantity INTEGER,
  glass_option VARCHAR(255),
  order_type VARCHAR(20) CHECK (order_type IN ('item', 'glass')),
  
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

-- =====================================================
-- 5. Create indexes for performance
-- =====================================================

-- Invoices table indexes
CREATE INDEX IF NOT EXISTS idx_invoices_order_no ON invoices(order_no);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_name ON invoices(customer_name);
CREATE INDEX IF NOT EXISTS idx_invoices_order_date ON invoices(order_date);
CREATE INDEX IF NOT EXISTS idx_invoices_delivery_date ON invoices(delivery_date);
CREATE INDEX IF NOT EXISTS idx_invoices_has_special_order ON invoices(has_special_order);
CREATE INDEX IF NOT EXISTS idx_invoices_delivery_method ON invoices(delivery_method);
CREATE INDEX IF NOT EXISTS idx_invoices_paid_status ON invoices(paid_status);

-- Order items table indexes
CREATE INDEX IF NOT EXISTS idx_order_items_invoice_id ON order_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_order_items_item_name ON order_items(item_name);
CREATE INDEX IF NOT EXISTS idx_order_items_color ON order_items(color);
CREATE INDEX IF NOT EXISTS idx_order_items_frame ON order_items(frame);
CREATE INDEX IF NOT EXISTS idx_order_items_requires_special_order ON order_items(requires_special_order);

-- Special order items table indexes
CREATE INDEX IF NOT EXISTS idx_special_orders_invoice_id ON special_order_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_special_orders_order_item_id ON special_order_items(order_item_id);
CREATE INDEX IF NOT EXISTS idx_special_orders_status ON special_order_items(order_status);
CREATE INDEX IF NOT EXISTS idx_special_orders_type ON special_order_items(order_type);
CREATE INDEX IF NOT EXISTS idx_special_orders_supplier ON special_order_items(supplier);
CREATE INDEX IF NOT EXISTS idx_special_orders_order_date ON special_order_items(order_date);
CREATE INDEX IF NOT EXISTS idx_special_orders_expected_delivery ON special_order_items(expected_delivery);

-- =====================================================
-- 6. Enable Row Level Security
-- =====================================================
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE special_order_items ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 7. Create RLS policies for authenticated users
-- =====================================================
DROP POLICY IF EXISTS "Enable all operations for authenticated users on invoices" ON invoices;
CREATE POLICY "Enable all operations for authenticated users on invoices" ON invoices
  FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all operations for authenticated users on order_items" ON order_items;
CREATE POLICY "Enable all operations for authenticated users on order_items" ON order_items
  FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all operations for authenticated users on special_order_items" ON special_order_items;
CREATE POLICY "Enable all operations for authenticated users on special_order_items" ON special_order_items
  FOR ALL USING (auth.role() = 'authenticated');

-- =====================================================
-- 8. Create updated_at triggers
-- =====================================================
DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_order_items_updated_at ON order_items;
CREATE TRIGGER update_order_items_updated_at BEFORE UPDATE ON order_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_special_order_items_updated_at ON special_order_items;
CREATE TRIGGER update_special_order_items_updated_at BEFORE UPDATE ON special_order_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 9. Create helpful database functions
-- =====================================================

-- Function to get invoice summary with item counts
CREATE OR REPLACE FUNCTION get_invoice_summary(invoice_uuid UUID)
RETURNS TABLE (
  invoice_id UUID,
  order_no VARCHAR,
  customer_name VARCHAR,
  total_items BIGINT,
  total_quantity BIGINT,
  special_orders_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.order_no,
    i.customer_name,
    COUNT(oi.id) as total_items,
    COALESCE(SUM(oi.quantity), 0) as total_quantity,
    COUNT(so.id) as special_orders_count
  FROM invoices i
  LEFT JOIN order_items oi ON i.id = oi.invoice_id
  LEFT JOIN special_order_items so ON i.id = so.invoice_id
  WHERE i.id = invoice_uuid
  GROUP BY i.id, i.order_no, i.customer_name;
END;
$$ LANGUAGE plpgsql;

-- Function to update invoice totals
CREATE OR REPLACE FUNCTION update_invoice_totals(invoice_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE invoices 
  SET 
    total_quantity = (
      SELECT COALESCE(SUM(quantity), 0) 
      FROM order_items 
      WHERE invoice_id = invoice_uuid
    ),
    has_special_order = (
      SELECT COUNT(*) > 0 
      FROM special_order_items 
      WHERE invoice_id = invoice_uuid
    )
  WHERE id = invoice_uuid;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 10. Success message
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE 'Invoice processing database setup completed successfully!';
  RAISE NOTICE 'Tables created: invoices, order_items, special_order_items';
  RAISE NOTICE 'Indexes, triggers, and RLS policies have been applied';
END $$;