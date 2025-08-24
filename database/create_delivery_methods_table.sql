-- Create delivery_methods table
CREATE TABLE IF NOT EXISTS delivery_methods (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_delivery_methods_name ON delivery_methods(name);
CREATE INDEX IF NOT EXISTS idx_delivery_methods_created_at ON delivery_methods(created_at);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_delivery_methods_updated_at ON delivery_methods;
CREATE TRIGGER update_delivery_methods_updated_at
    BEFORE UPDATE ON delivery_methods
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE delivery_methods ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations for authenticated users
-- Note: Adjust these policies based on your specific security requirements
CREATE POLICY "Allow all operations for authenticated users" ON delivery_methods
    FOR ALL USING (true);

-- Alternative: More restrictive policies (uncomment if needed)
-- CREATE POLICY "Allow read for authenticated users" ON delivery_methods
--     FOR SELECT USING (auth.role() = 'authenticated');
-- 
-- CREATE POLICY "Allow insert for authenticated users" ON delivery_methods
--     FOR INSERT WITH CHECK (auth.role() = 'authenticated');
-- 
-- CREATE POLICY "Allow update for authenticated users" ON delivery_methods
--     FOR UPDATE USING (auth.role() = 'authenticated');
-- 
-- CREATE POLICY "Allow delete for authenticated users" ON delivery_methods
--     FOR DELETE USING (auth.role() = 'authenticated');

-- Insert some default delivery methods (optional)
INSERT INTO delivery_methods (name, description) VALUES
    ('Standard Delivery', 'Regular delivery service within 5-7 business days'),
    ('Express Delivery', 'Fast delivery service within 1-2 business days'),
    ('Pickup', 'Customer pickup from store location'),
    ('Installation', 'Delivery with professional installation service')
ON CONFLICT (name) DO NOTHING;

-- Grant necessary permissions
GRANT ALL ON delivery_methods TO authenticated;
GRANT ALL ON delivery_methods TO service_role;

-- Verify table creation
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'delivery_methods'
ORDER BY ordinal_position;