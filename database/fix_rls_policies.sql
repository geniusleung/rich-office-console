-- Fix RLS policies to allow anonymous access for invoice processing application
-- This script updates the Row Level Security policies to allow public access
-- since the application doesn't implement user authentication

-- Drop existing policies
DROP POLICY IF EXISTS "Enable all operations for authenticated users on invoices" ON invoices;
DROP POLICY IF EXISTS "Enable all operations for authenticated users on order_items" ON order_items;
DROP POLICY IF EXISTS "Enable all operations for authenticated users on special_order_items" ON special_order_items;

-- Create new policies that allow anonymous access
CREATE POLICY "Enable all operations for anonymous users on invoices" ON invoices
  FOR ALL USING (true);

CREATE POLICY "Enable all operations for anonymous users on order_items" ON order_items
  FOR ALL USING (true);

CREATE POLICY "Enable all operations for anonymous users on special_order_items" ON special_order_items
  FOR ALL USING (true);

-- Verify policies are created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('invoices', 'order_items', 'special_order_items');

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'RLS policies updated successfully!';
  RAISE NOTICE 'All tables now allow anonymous access for invoice processing';
END $$;