import { supabase } from './supabaseClient';

/**
 * Invoice Database Service
 * Handles all database operations for invoice processing
 */

/**
 * Save a processed invoice to the database
 * @param {Object} invoiceData - The processed invoice data
 * @returns {Promise<Object>} - The saved invoice with ID
 */
export const saveInvoice = async (invoiceData) => {
  try {
    // Prepare invoice data for database
    const invoiceRecord = {
      order_no: invoiceData.orderNo,
      po_number: invoiceData.poNumber,
      order_date: invoiceData.orderDate,
      due_date: invoiceData.dueDate,
      delivery_date: invoiceData.deliveryDate,
      delivery_method: invoiceData.deliveryMethod,
      paid_status: invoiceData.paidStatus,
      shipping_address: invoiceData.shippingAddress,
      
      // Customer Information
      customer_name: invoiceData.customerInfo?.name,
      customer_phone: invoiceData.customerInfo?.phone,
      customer_address: invoiceData.customerInfo?.address,
      
      // Calculated Fields
      total_quantity: invoiceData.totalQuantity || 0,
      wdgsp_string: invoiceData.wdgspString,
      
      // Special Order Flags
      has_special_order: invoiceData.hasSpecialOrder || false,
      glass_order_needed: invoiceData.glassOrderNeeded || false,
      item_order_needed: invoiceData.itemOrderNeeded || false,
      
      // Processing Metadata
      extraction_confidence: 'high',
      processing_status: 'success'
    };

    // Insert invoice record
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert([invoiceRecord])
      .select()
      .single();

    if (invoiceError) {
      throw new Error(`Failed to save invoice: ${invoiceError.message}`);
    }

    // Save order items
    if (invoiceData.items && invoiceData.items.length > 0) {
      const orderItems = invoiceData.items.map(item => ({
        invoice_id: invoice.id,
        item_name: item.name,
        quantity: item.quantity || 0,
        width: item.width,
        height: item.height,
        additional_dimension: item.additionalDimension,
        color: item.color,
        frame: item.frame,
        glass_option: item.glassOption,
        grid_style: item.gridStyle,
        argon: item.argon,
        is_unknown_item: item.isUnknownItem || false,
        is_unknown_color: item.isUnknownColor || false,
        is_unknown_frame: item.isUnknownFrame || false,
        requires_special_order: item.requiresSpecialOrder || false
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        throw new Error(`Failed to save order items: ${itemsError.message}`);
      }
    }

    // Save special order items if any
    if (invoiceData.specialOrderItems && invoiceData.specialOrderItems.length > 0) {
      const specialOrders = invoiceData.specialOrderItems.map(item => ({
        invoice_id: invoice.id,
        item_name: item.name,
        quantity: item.quantity,
        glass_option: item.glassOption,
        order_type: item.orderType || 'item',
        order_status: 'pending'
      }));

      const { error: specialOrderError } = await supabase
        .from('special_order_items')
        .insert(specialOrders);

      if (specialOrderError) {
        throw new Error(`Failed to save special orders: ${specialOrderError.message}`);
      }
    }

    return {
      success: true,
      invoice,
      message: 'Invoice saved successfully'
    };

  } catch (error) {
    console.error('Error saving invoice:', error);
    return {
      success: false,
      error: error.message,
      message: 'Failed to save invoice'
    };
  }
};

/**
 * Get all invoices with basic information
 * @param {Object} options - Query options (limit, offset, filters)
 * @returns {Promise<Array>} - Array of invoices
 */
export const getInvoices = async (options = {}) => {
  try {
    const { limit = 50, offset = 0, orderBy = 'created_at', ascending = false } = options;
    
    let query = supabase
      .from('invoices')
      .select(`
        id,
        order_no,
        customer_name,
        order_date,
        delivery_date,
        delivery_method,
        paid_status,
        total_quantity,
        wdgsp_string,
        has_special_order,
        created_at
      `)
      .range(offset, offset + limit - 1)
      .order(orderBy, { ascending });

    // Apply filters if provided
    if (options.customerName) {
      query = query.ilike('customer_name', `%${options.customerName}%`);
    }
    if (options.orderNo) {
      query = query.ilike('order_no', `%${options.orderNo}%`);
    }
    if (options.hasSpecialOrder !== undefined) {
      query = query.eq('has_special_order', options.hasSpecialOrder);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch invoices: ${error.message}`);
    }

    return {
      success: true,
      data,
      message: 'Invoices retrieved successfully'
    };

  } catch (error) {
    console.error('Error fetching invoices:', error);
    return {
      success: false,
      error: error.message,
      message: 'Failed to fetch invoices'
    };
  }
};

/**
 * Get a single invoice with all related data
 * @param {string} invoiceId - The invoice ID
 * @returns {Promise<Object>} - Complete invoice data
 */
export const getInvoiceById = async (invoiceId) => {
  try {
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        order_items (*),
        special_order_items (*)
      `)
      .eq('id', invoiceId)
      .single();

    if (invoiceError) {
      throw new Error(`Failed to fetch invoice: ${invoiceError.message}`);
    }

    return {
      success: true,
      data: invoice,
      message: 'Invoice retrieved successfully'
    };

  } catch (error) {
    console.error('Error fetching invoice:', error);
    return {
      success: false,
      error: error.message,
      message: 'Failed to fetch invoice'
    };
  }
};

/**
 * Update an existing invoice
 * @param {string} invoiceId - The invoice ID
 * @param {Object} updateData - The data to update
 * @returns {Promise<Object>} - Updated invoice data
 */
export const updateInvoice = async (invoiceId, updateData) => {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', invoiceId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update invoice: ${error.message}`);
    }

    return {
      success: true,
      data,
      message: 'Invoice updated successfully'
    };

  } catch (error) {
    console.error('Error updating invoice:', error);
    return {
      success: false,
      error: error.message,
      message: 'Failed to update invoice'
    };
  }
};

/**
 * Delete an invoice and all related data
 * @param {string} invoiceId - The invoice ID
 * @returns {Promise<Object>} - Deletion result
 */
export const deleteInvoice = async (invoiceId) => {
  try {
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', invoiceId);

    if (error) {
      throw new Error(`Failed to delete invoice: ${error.message}`);
    }

    return {
      success: true,
      message: 'Invoice deleted successfully'
    };

  } catch (error) {
    console.error('Error deleting invoice:', error);
    return {
      success: false,
      error: error.message,
      message: 'Failed to delete invoice'
    };
  }
};

/**
 * Update order items for an invoice
 * @param {string} invoiceId - The invoice ID
 * @param {Array} items - Array of order items
 * @returns {Promise<Object>} - Update result
 */
export const updateOrderItems = async (invoiceId, items) => {
  try {
    // First, delete existing order items
    const { error: deleteError } = await supabase
      .from('order_items')
      .delete()
      .eq('invoice_id', invoiceId);

    if (deleteError) {
      throw new Error(`Failed to delete existing order items: ${deleteError.message}`);
    }

    // Then, insert new order items
    if (items && items.length > 0) {
      const orderItems = items.map(item => ({
        invoice_id: invoiceId,
        item_name: item.name || item.item_name,
        quantity: parseInt(item.quantity) || 0,
        width: item.width,
        height: item.height,
        additional_dimension: item.additionalDimension || item.additional_dimension,
        color: item.color,
        frame: item.frame || item.frame_style,
        glass_option: item.glassOption || item.glass_option,
        grid_style: item.gridStyle || item.grid_style,
        argon: item.argon,
        is_unknown_item: item.isUnknownItem || false,
        is_unknown_color: item.isUnknownColor || false,
        is_unknown_frame: item.isUnknownFrame || false,
        requires_special_order: item.requiresSpecialOrder || false
      }));

      const { error: insertError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (insertError) {
        throw new Error(`Failed to insert new order items: ${insertError.message}`);
      }
    }

    return {
      success: true,
      message: 'Order items updated successfully'
    };

  } catch (error) {
    console.error('Error updating order items:', error);
    return {
      success: false,
      error: error.message,
      message: 'Failed to update order items'
    };
  }
};

/**
 * Get invoices with special orders
 * @returns {Promise<Array>} - Array of invoices with special orders
 */
export const getSpecialOrderInvoices = async () => {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        id,
        order_no,
        customer_name,
        order_date,
        special_order_items (
          id,
          item_name,
          quantity,
          order_status,
          order_date,
          expected_delivery
        )
      `)
      .eq('has_special_order', true)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch special order invoices: ${error.message}`);
    }

    return {
      success: true,
      data,
      message: 'Special order invoices retrieved successfully'
    };

  } catch (error) {
    console.error('Error fetching special order invoices:', error);
    return {
      success: false,
      error: error.message,
      message: 'Failed to fetch special order invoices'
    };
  }
};