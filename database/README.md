# Invoice Processing Database Setup

This directory contains SQL scripts to set up the database schema for the invoice processing system in Supabase.

## Database Schema Overview

The database consists of three main tables:

### 1. `invoices` (Main Table)
Stores invoice header information including:
- Order details (order_no, po_number, dates)
- Customer information (name, phone, address)
- Delivery information (method, shipping address)
- Calculated fields (total_quantity, wdgsp_string)
- Special order flags (has_special_order, glass_order_needed, item_order_needed)
- Processing metadata and audit fields

### 2. `order_items` (Child Table)
Stores individual line items for each invoice:
- Item details (name, quantity)
- Dimensions (width, height, additional_dimension)
- Specifications (color, frame, glass_option, grid_style, argon)
- Validation flags (unknown items, special order requirements)
- Audit fields

### 3. `special_order_items` (Tracking Table)
Tracks special orders that require supplier coordination:
- Item information and order type (item/glass)
- Order status tracking (pending, ordered, received, cancelled)
- Supplier details and cost information
- Delivery tracking and notes

## Setup Instructions

### Option 1: Complete Setup (Recommended)
Execute the comprehensive setup script that creates all tables, indexes, and functions:

1. Open Supabase SQL Editor
2. Copy and paste the contents of `setup_invoice_database.sql`
3. Execute the script

### Option 2: Individual Table Setup
If you prefer to create tables individually:

1. Execute `create_invoices_table.sql`
2. Execute `create_order_items_table.sql`
3. Execute `create_special_order_items_table.sql`

## Database Features

### Security
- Row Level Security (RLS) enabled on all tables
- Policies configured for authenticated users
- UUID primary keys for security

### Performance
- Comprehensive indexing on frequently queried columns
- Foreign key relationships with CASCADE delete
- Optimized for invoice lookup and reporting queries

### Audit Trail
- `created_at` and `updated_at` timestamps on all tables
- Automatic `updated_at` triggers
- Processing metadata tracking

### Helper Functions
- `get_invoice_summary(uuid)`: Returns invoice summary with item counts
- `update_invoice_totals(uuid)`: Recalculates invoice totals
- `update_updated_at_column()`: Trigger function for timestamp updates

## Data Relationships

```
invoices (1) -----> (many) order_items
    |                      |
    |                      |
    +---> (many) special_order_items
```

## Next Steps

After setting up the database:

1. **Test the Schema**: Verify all tables are created correctly
2. **Configure Supabase Client**: Set up the Supabase client in the React application
3. **Implement Data Layer**: Create functions to save processed invoice data
4. **Add Validation**: Implement data validation before database insertion
5. **Create Queries**: Build queries for retrieving and updating invoice data

## Supabase Project Information

- **Project Name**: rich-office-console
- **Project ID**: ljaifyeqaylzxieumxtd
- **Database**: PostgreSQL with Supabase extensions

## Notes

- All tables use UUID primary keys for better security and scalability
- The schema is designed to handle the current invoice processing workflow
- Special order tracking allows for future supplier management features
- The design supports both glass and item special orders as identified in the current system