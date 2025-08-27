import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  Divider,
  Autocomplete,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  Edit as EditIcon,
  Close as CloseIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Warning
} from '@mui/icons-material';
import { getInvoices, getInvoiceById, deleteInvoice, updateInvoice, updateOrderItems, collapseUnitRecords } from '../utils/invoiceService';
import { supabase } from '../utils/supabaseClient';
import InvoiceDetailDialog from '../components/InvoiceDetailDialog';
import InvoiceEditDialog from '../components/InvoiceEditDialog';

function ProcessedInvoicePage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  
  // Search states
  const [searchCustomer, setSearchCustomer] = useState('');
  const [searchOrderNo, setSearchOrderNo] = useState('');
  
  // Sort states
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  
  // Detail dialog states
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  
  // Edit dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editInvoiceData, setEditInvoiceData] = useState(null);
  
  // Delivery methods state
  const [deliveryMethods, setDeliveryMethods] = useState([]);
  
  // Add missing data states for WDGSP calculation
  const [items, setItems] = useState([]);
  const [colors, setColors] = useState([]);
  const [frameStyles, setFrameStyles] = useState([]);
  const [glassOptions, setGlassOptions] = useState([]);

  // Add this helper function for batch assignment status
  const getBatchAssignmentStatus = (orderItems) => {
    if (!orderItems || orderItems.length === 0) {
      return { allAssigned: false, assignedCount: 0, totalCount: 0 };
    }
    
    const assignedCount = orderItems.filter(item => 
      item.batch_assigned && item.batch_assigned !== 'N/A' && item.batch_assigned.trim() !== ''
    ).length;
    
    return {
      allAssigned: assignedCount === orderItems.length,
      assignedCount,
      totalCount: orderItems.length
    };
  };

  // Fetch delivery methods from database
  const fetchDeliveryMethods = async () => {
    try {
      const { data, error } = await supabase
        .from('delivery_methods')
        .select('*')
        .order('name');
      
      if (error) {
        console.error('Error fetching delivery methods:', error);
      } else {
        setDeliveryMethods(data || []);
      }
    } catch (error) {
      console.error('Error fetching delivery methods:', error);
    }
  };

  // Add data fetching functions
  // Add a loading state for data fetching
  const [dataLoading, setDataLoading] = useState(true);
  
  // Update fetchAllData to set loading state
  const fetchAllData = useCallback(async () => {
    setDataLoading(true);
    try {
      const [itemsData, colorsData, frameStylesData, glassOptionsData] = await Promise.all([
        supabase.from('items').select('*'),
        supabase.from('item_colors').select('*'),
        supabase.from('frame_styles').select('*'),
        supabase.from('glass_options').select('*')
      ]);
      
      if (itemsData.error) throw itemsData.error;
      if (colorsData.error) throw colorsData.error;
      if (frameStylesData.error) throw frameStylesData.error;
      if (glassOptionsData.error) throw glassOptionsData.error;
      
      setItems(itemsData.data || []);
      setColors(colorsData.data || []);
      setFrameStyles(frameStylesData.data || []);
      setGlassOptions(glassOptionsData.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setDataLoading(false);
    }
  }, []);

  // Add categorizeItems function
  const categorizeItems = useCallback((invoiceItems, deliveryMethod = '') => {
    const counts = { Window: 0, Door: 0, Glass: 0, Screen: 0, Part: 0 };
    const unknownItems = [];
    const unknownColors = [];
    const unknownFrameStyles = [];
    const unknownDeliveryMethods = [];
    let glassOrderNeeded = false;
    let itemOrderNeeded = false;
    const specialOrderItems = [];
    
    // Check delivery method
    if (!deliveryMethod || !deliveryMethod.trim()) {
      const emptyMethodLabel = 'Empty/Missing';
      if (!unknownDeliveryMethods.includes(emptyMethodLabel)) {
        unknownDeliveryMethods.push(emptyMethodLabel);
      }
    } else {
      const dbDeliveryMethod = deliveryMethods.find(dbMethod => 
        dbMethod.name.toLowerCase() === deliveryMethod.toLowerCase()
      );
      if (!dbDeliveryMethod && !unknownDeliveryMethods.includes(deliveryMethod)) {
        unknownDeliveryMethods.push(deliveryMethod);
      }
    }
    
    // Process each item
    const processedItems = invoiceItems.map(item => {
      let requiresSpecialOrder = false;
      
      // Check item name
      const dbItem = items.find(dbItem => 
        dbItem.name.toLowerCase() === (item.item_name || item.name || '').toLowerCase()
      );
      
      if (dbItem && dbItem.item_type !== 'Other') {
        const quantity = parseInt(item.quantity) || 1;
        counts[dbItem.item_type] = (counts[dbItem.item_type] || 0) + quantity;
        
        if (dbItem.order_needed) {
          itemOrderNeeded = true;
          requiresSpecialOrder = true;
          specialOrderItems.push({
            name: item.item_name || item.name,
            quantity: item.quantity,
            type: 'item'
          });
        }
      } else if (!dbItem && (item.item_name || item.name)) {
        unknownItems.push(item.item_name || item.name);
      }
      
      // Check color
      if (item.color && item.color.trim()) {
        const dbColor = colors.find(dbColor => 
          dbColor.color_name.toLowerCase() === item.color.toLowerCase()
        );
        if (!dbColor && !unknownColors.includes(item.color)) {
          unknownColors.push(item.color);
        }
      }
      
      // Check frame style
      if (item.frame && item.frame.trim()) {
        const dbFrameStyle = frameStyles.find(dbFrame => 
          dbFrame.style_name.toLowerCase() === item.frame.toLowerCase()
        );
        if (!dbFrameStyle && !unknownFrameStyles.includes(item.frame)) {
          unknownFrameStyles.push(item.frame);
        }
      }
      
      // Check glass option
      if ((item.glass_option || item.glassOption) && (item.glass_option || item.glassOption).trim()) {
        const glassOptionText = (item.glass_option || item.glassOption).toLowerCase();
        const matchingGlassOption = glassOptions.find(dbGlass => 
          glassOptionText.includes(dbGlass.glass_type.toLowerCase()) && dbGlass.order_needed
        );
        
        if (matchingGlassOption) {
          glassOrderNeeded = true;
          requiresSpecialOrder = true;
          specialOrderItems.push({
            name: item.item_name || item.name,
            quantity: item.quantity,
            glassOption: item.glass_option || item.glassOption,
            type: 'glass'
          });
        }
      }
      
      return {
        ...item,
        requiresSpecialOrder
      };
    });
    
    const hasSpecialOrder = glassOrderNeeded || itemOrderNeeded;
    
    return {
      wdgspString: `${counts.Window}/${counts.Door}/${counts.Glass}/${counts.Screen}/${counts.Part}`,
      unknownItems,
      unknownColors,
      unknownFrameStyles,
      unknownDeliveryMethods,
      glassOrderNeeded,
      itemOrderNeeded,
      hasSpecialOrder,
      specialOrderItems,
      processedItems
    };
  }, [items, colors, frameStyles, glassOptions, deliveryMethods]);

  // Add these memoized options
  const itemOptions = useMemo(() => 
    [...new Set(items.map(dbItem => dbItem.name))].filter(name => name && name.trim()),
    [items]
  );

  const colorOptions = useMemo(() => 
    [...new Set(colors.map(color => color.color_name))].filter(name => name && name.trim()),
    [colors]
  );

  const frameOptions = useMemo(() => 
    [...new Set(frameStyles.map(frame => frame.style_name))].filter(name => name && name.trim()),
    [frameStyles]
  );

  const getColorValidation = useCallback((colorName) => {
    if (!colors || colors.length === 0 || !colorName) return null;
    return colors.find(color => 
      color.color_name && color.color_name.toLowerCase() === colorName.toLowerCase()
    );
  }, [colors]);

  const getItemValidation = useCallback((itemName) => {
    if (!items || items.length === 0 || !itemName) return null;
    return items.find(dbItem => 
      dbItem.name && dbItem.name.toLowerCase() === (itemName || '').toLowerCase()
    );
  }, [items]);

  const getFrameValidation = useCallback((frameName) => {
    if (!frameStyles || frameStyles.length === 0 || !frameName) return null;
    return frameStyles.find(frame => 
      frame.style_name && frame.style_name.toLowerCase() === frameName.toLowerCase()
    );
  }, [frameStyles]);

  // Handle column sorting
  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  // Render sortable table header
  const renderSortableHeader = (label, column) => {
    const isActive = sortBy === column;
    const isAsc = sortOrder === 'asc';
    
    return (
      <TableCell
        sx={{
          cursor: 'pointer',
          userSelect: 'none',
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.04)'
          },
          fontWeight: isActive ? 600 : 500
        }}
        onClick={() => handleSort(column)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {label}
          {isActive && (
            isAsc ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />
          )}
        </Box>
      </TableCell>
    );
  };

  // Fetch invoices from database
  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const options = {
        limit: rowsPerPage,
        offset: page * rowsPerPage,
        orderBy: sortBy,
        ascending: sortOrder === 'asc'
      };
      
      // Add search filters if provided
      if (searchCustomer.trim()) {
        options.customerName = searchCustomer.trim();
      }
      if (searchOrderNo.trim()) {
        options.orderNo = searchOrderNo.trim();
      }
      
      const result = await getInvoices(options);
      
      if (result.success) {
        setInvoices(result.data);
        // Note: For proper pagination, we'd need a count query
        // For now, we'll estimate based on returned data
        setTotalCount(result.data.length < rowsPerPage ? page * rowsPerPage + result.data.length : (page + 1) * rowsPerPage + 1);
      } else {
        setError(result.message || 'Failed to fetch invoices');
      }
    } catch (err) {
      setError('An unexpected error occurred while fetching invoices');
      console.error('Error fetching invoices:', err);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, searchCustomer, searchOrderNo, sortBy, sortOrder]);

  // Load invoices on component mount and when filters change
  useEffect(() => {
    fetchInvoices();
    fetchDeliveryMethods();
    fetchAllData();
  }, [fetchInvoices, fetchAllData]);

  // Handle page change
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  // Handle rows per page change
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Handle view invoice details
  const handleViewDetails = async (invoiceId) => {
    setDetailLoading(true);
    setDetailDialogOpen(true);
    
    try {
      const result = await getInvoiceById(invoiceId);
      if (result.success) {
        const invoiceData = result.data;
        
        // Collapse individual unit records for display
        const collapsedItems = collapseUnitRecords(invoiceData.order_items || []);
        
        // Process the collapsed items to add requiresSpecialOrder field
        const { processedItems } = categorizeItems(
          collapsedItems, 
          invoiceData.delivery_method
        );
        
        // Update the invoice data with processed items
        invoiceData.order_items = processedItems;
        
        setSelectedInvoice(invoiceData);
      } else {
        setError(result.message || 'Failed to fetch invoice details');
      }
    } catch (err) {
      setError('Failed to load invoice details');
      console.error('Error fetching invoice details:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  // Handle delete invoice
  const handleDeleteInvoice = async (invoiceId) => {
    if (window.confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
      try {
        const result = await deleteInvoice(invoiceId);
        if (result.success) {
          // Refresh the invoice list
          fetchInvoices();
        } else {
          setError(result.message || 'Failed to delete invoice');
        }
      } catch (err) {
        setError('Failed to delete invoice');
        console.error('Error deleting invoice:', err);
      }
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    // Handle date strings properly to avoid timezone issues
    // If the date string is in YYYY-MM-DD format, parse it as local date
    if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateString.split('-');
      return new Date(year, month - 1, day).toLocaleDateString();
    }
    return new Date(dateString).toLocaleDateString();
  };



  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Processed Invoices
        </Typography>
        <Typography variant="body1" color="text.secondary">
          View and manage imported invoice data from the database
        </Typography>
      </Box>

      {/* Search Controls */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} sm={5}>
            <TextField
              fullWidth
              label="Search Customer Name"
              value={searchCustomer}
              onChange={(e) => setSearchCustomer(e.target.value)}
              variant="outlined"
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={5}>
            <TextField
              fullWidth
              label="Search Order Number"
              value={searchOrderNo}
              onChange={(e) => setSearchOrderNo(e.target.value)}
              variant="outlined"
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={2}>
            <Tooltip title="Refresh">
              <IconButton onClick={fetchInvoices} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Grid>
        </Grid>
      </Paper>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Invoice Table */}
      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: '70vh' }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, color: 'text.primary', width: '120px' }}>Batch Status</TableCell>
                {renderSortableHeader('Order No.', 'order_no')}
                {renderSortableHeader('Customer Name', 'customer_name')}
                {renderSortableHeader('Order Date', 'order_date')}
                {renderSortableHeader('Delivery Date', 'delivery_date')}
                {renderSortableHeader('Delivery Method', 'delivery_method')}
                {renderSortableHeader('Quantity', 'total_quantity')}
                {renderSortableHeader('WDGSP', 'wdgsp_string')}
                {renderSortableHeader('Special Order', 'has_special_order')}
                {renderSortableHeader('Paid Status', 'paid_status')}
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={11} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} align="center" sx={{ py: 4 }}>
                    <Typography variant="body1" color="text.secondary">
                      No invoices found. Try adjusting your search criteria or import some invoices first.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((invoice) => {
                  const batchStatus = getBatchAssignmentStatus(invoice.order_items);
                  return (
                    <TableRow key={invoice.id} hover>
                      <TableCell>
                        <Chip
                          label={batchStatus.allAssigned 
                            ? `✅ Complete (${batchStatus.assignedCount}/${batchStatus.totalCount})`
                            : batchStatus.assignedCount > 0
                              ? `⚠️ Partial (${batchStatus.assignedCount}/${batchStatus.totalCount})`
                              : `❌ None (0/${batchStatus.totalCount})`
                          }
                          color={batchStatus.allAssigned ? "success" : batchStatus.assignedCount > 0 ? "warning" : "error"}
                          variant={batchStatus.allAssigned ? "filled" : "outlined"}
                          size="small"
                          sx={{ 
                            fontWeight: 600,
                            fontSize: '0.75rem',
                            minWidth: '110px'
                          }}
                        />
                      </TableCell>
                      <TableCell>{invoice.order_no || 'N/A'}</TableCell>
                      <TableCell>{invoice.customer_name || 'N/A'}</TableCell>
                      <TableCell>{formatDate(invoice.order_date)}</TableCell>
                      <TableCell>{formatDate(invoice.delivery_date)}</TableCell>
                      <TableCell>{invoice.delivery_method || 'N/A'}</TableCell>
                      <TableCell>{invoice.total_quantity || 0}</TableCell>
                      <TableCell>
                        <Box
                          sx={{
                            fontFamily: 'monospace',
                            fontSize: '0.875rem',
                            backgroundColor: 'rgba(0, 0, 0, 0.04)',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            display: 'inline-block'
                          }}
                        >
                          {invoice.wdgsp_string || 'N/A'}
                        </Box>
                      </TableCell>
                      <TableCell>
                        {invoice.has_special_order ? (
                          <Chip 
                            label="Yes" 
                            color={invoice.special_order_completed === 'completed' ? 'success' : 'warning'} 
                            size="small" 
                          />
                        ) : (
                          <Chip label="No" color="default" size="small" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={invoice.paid_status || 'N/A'}
                          size="small"
                          color={
                            (invoice.paid_status || '').toLowerCase() === 'paid' ? 'success' :
                            (invoice.paid_status || '').toLowerCase() === 'unpaid' ? 'error' :
                            'default'
                          }
                          sx={{ fontWeight: 500 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => handleViewDetails(invoice.id)}
                          >
                            <VisibilityIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteInvoice(invoice.id)}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        {/* Pagination */}
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={totalCount}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      {/* Invoice Detail Dialog - Using Shared Component */}
      <InvoiceDetailDialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        selectedInvoice={selectedInvoice}
        loading={detailLoading}
        showEditButton={true}
        onEdit={() => {
          setEditInvoiceData(selectedInvoice);
          setEditDialogOpen(true);
          setDetailDialogOpen(false);
        }}
        getBatchAssignmentStatus={(orderItems) => {
          if (!orderItems || orderItems.length === 0) {
            return { allAssigned: false, assignedCount: 0, totalCount: 0 };
          }
          
          const assignedCount = orderItems.filter(item => 
            item.batch_assigned && item.batch_assigned !== 'N/A' && item.batch_assigned.trim() !== ''
          ).length;
          
          return {
            allAssigned: assignedCount === orderItems.length,
            assignedCount,
            totalCount: orderItems.length
          };
        }}
      />

      {/* Edit Dialog */}
      <InvoiceEditDialog
        open={editDialogOpen && !dataLoading}
        onClose={() => setEditDialogOpen(false)}
        invoiceData={editInvoiceData}
        loading={dataLoading}
        onSave={async (updatedInvoice, updatedItems) => {
          try {
            // Filter out invalid columns for invoice update
            const validInvoiceColumns = [
              'customer_name', 'customer_phone', 'customer_email', 'customer_address',
              'order_no', 'order_date', 'delivery_date', 'delivery_method',
              'shipping_address', 'notes', 'total_quantity', 'wdgsp_string',
              'has_special_order', 'glass_order_needed', 'item_order_needed',
              'paid_status', 'special_order_completed', 'due_date', 'po_number'
            ];
            
            const filteredInvoice = Object.keys(updatedInvoice)
              .filter(key => validInvoiceColumns.includes(key))
              .reduce((obj, key) => {
                obj[key] = updatedInvoice[key];
                return obj;
              }, {});
            
            // Update invoice
            await updateInvoice(updatedInvoice.id, filteredInvoice);
            
            // Update order items
            if (updatedItems && updatedItems.length > 0) {
              await updateOrderItems(updatedInvoice.id, updatedItems);
            }
            
            // Refresh the invoices list
            await fetchInvoices();
            setEditDialogOpen(false);
            setEditInvoiceData(null);
          } catch (error) {
            console.error('Error updating invoice:', error);
            setError('Failed to update invoice');
          }
        }}
        onInvoiceDataChange={(updatedData) => setEditInvoiceData(updatedData)}
        deliveryMethods={deliveryMethods}
        itemOptions={items}
        colorOptions={colors}
        frameOptions={frameStyles}
        categorizeItems={categorizeItems}
      />
    </Container>
  );
}

export default ProcessedInvoicePage;