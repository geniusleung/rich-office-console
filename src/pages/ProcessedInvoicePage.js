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
import { getInvoices, getInvoiceById, deleteInvoice, updateInvoice, updateOrderItems } from '../utils/invoiceService';
import { supabase } from '../utils/supabaseClient';

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
  const fetchAllData = useCallback(async () => {
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

  const getItemValidation = useCallback((itemName) => {
    return items.find(dbItem => 
      dbItem.name.toLowerCase() === (itemName || '').toLowerCase()
    );
  }, [items]);

  const getColorValidation = useCallback((colorName) => {
    return colors.find(color => 
      color.color_name.toLowerCase() === (colorName || '').toLowerCase()
    );
  }, [colors]);

  const getFrameValidation = useCallback((frameName) => {
    return frameStyles.find(frame => 
      frame.style_name.toLowerCase() === (frameName || '').toLowerCase()
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
        setSelectedInvoice(result.data);
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
                  <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                    <Typography variant="body1" color="text.secondary">
                      No invoices found. Try adjusting your search criteria or import some invoices first.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((invoice) => (
                  <TableRow key={invoice.id} hover>
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
                        <Chip label="Yes" color="warning" size="small" />
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
                ))
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

      {/* Invoice Detail Dialog */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Invoice Details {selectedInvoice?.order_no && `- ${selectedInvoice.order_no}`}
        </DialogTitle>
        <DialogContent>
          {detailLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : selectedInvoice ? (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              {/* Order Information Card */}
              <Grid item xs={12} md={6}>
                <Card sx={{ 
                  height: '100%',
                  borderRadius: 3,
                  border: '1px solid rgba(0,0,0,0.08)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                  transition: 'transform 0.2s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 25px rgba(0,0,0,0.1)'
                  }
                }}>
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                      <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 36,
                        height: 36,
                        borderRadius: 2,
                        backgroundColor: 'primary.main',
                        color: 'white',
                        mr: 2
                      }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>📋</Typography>
                      </Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
                        Order Information
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>Order No.</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedInvoice.order_no || 'N/A'}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>Order Date</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatDate(selectedInvoice.order_date)}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>Due Date</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatDate(selectedInvoice.due_date)}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>Delivery Date</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatDate(selectedInvoice.delivery_date)}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>PO Number</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedInvoice.po_number || 'N/A'}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>Delivery Method</Typography>
                        <Chip 
                          label={selectedInvoice.delivery_method || 'N/A'}
                          size="small"
                          color={selectedInvoice.delivery_method?.toLowerCase() === 'delivery' ? 'primary' : 'secondary'}
                          sx={{ fontWeight: 500 }}
                        />
                      </Box>

                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>Paid Status</Typography>
                        <Chip 
                          label={selectedInvoice.paid_status || 'N/A'}
                          size="small"
                          color={
                            (selectedInvoice.paid_status || '').toLowerCase() === 'paid' ? 'success' :
                            (selectedInvoice.paid_status || '').toLowerCase() === 'unpaid' ? 'error' :
                            'default'
                          }
                          sx={{ fontWeight: 500 }}
                        />
                      </Box>

                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>WDGSP Count</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace', backgroundColor: 'rgba(0,0,0,0.05)', px: 1, py: 0.5, borderRadius: 1 }}>
                          {selectedInvoice.wdgsp_string || 'N/A'}
                        </Typography>
                      </Box>

                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Customer Information Card */}
              <Grid item xs={12} md={6}>
                <Card sx={{ 
                  height: '100%',
                  borderRadius: 3,
                  border: '1px solid rgba(0,0,0,0.08)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                  transition: 'transform 0.2s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 25px rgba(0,0,0,0.1)'
                  }
                }}>
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                      <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 36,
                        height: 36,
                        borderRadius: 2,
                        backgroundColor: 'success.main',
                        color: 'white',
                        mr: 2
                      }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>👤</Typography>
                      </Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, color: 'success.main' }}>
                        Customer Information
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 2 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>Customer Name</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600, textAlign: 'right' }}>
                          {selectedInvoice.customer_name || 'N/A'}
                        </Typography>
                      </Box>
                      {selectedInvoice.delivery_method?.toLowerCase() === 'delivery' && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1, borderTop: '1px solid rgba(0,0,0,0.05)', pt: 2 }}>
                          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>Shipping Address</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right', maxWidth: '60%', wordBreak: 'break-word', color: selectedInvoice.shipping_address ? 'text.primary' : 'error.main' }}>
                            {selectedInvoice.shipping_address || 'Missing - Required for Delivery'}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              {/* Items Section */}
              <Grid item xs={12}>
                <Card sx={{ 
                  borderRadius: 3,
                  border: '1px solid rgba(0,0,0,0.08)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                }}>
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 36,
                          height: 36,
                          borderRadius: 2,
                          backgroundColor: 'warning.main',
                          color: 'white',
                          mr: 2
                        }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>📦</Typography>
                        </Box>
                        <Typography variant="h6" sx={{ fontWeight: 600, color: 'warning.main' }}>
                          Order Items
                        </Typography>
                      </Box>
                      <Chip 
                        label={`${selectedInvoice.order_items?.reduce((total, item) => total + (parseInt(item.quantity) || 0), 0) || 0} qty`}
                        color="warning"
                        variant="outlined"
                        size="small"
                      />
                    </Box>
                    {selectedInvoice.order_items && selectedInvoice.order_items.length > 0 ? (
                      <TableContainer 
                        component={Paper} 
                        variant="outlined"
                        sx={{ 
                          borderRadius: 2,
                          border: '1px solid rgba(0,0,0,0.08)',
                          boxShadow: 'none'
                        }}
                      >
                        <Table size="small" sx={{ minWidth: 1400 }}>
                          <TableHead>
                            <TableRow sx={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
                              <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Item</TableCell>
                              <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Qty</TableCell>
                              <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>W</TableCell>
                              <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>H</TableCell>
                              <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>P/V</TableCell>
                              <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Color</TableCell>
                              <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Argon</TableCell>
                              <TableCell sx={{ fontWeight: 600, color: 'text.primary', width: '40px', textAlign: 'center', padding: '8px 4px' }}>🔍</TableCell>
                              <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Glass Option</TableCell>
                              <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Grid Style</TableCell>
                              <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Frame</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {selectedInvoice.order_items.map((item, index) => (
                              <TableRow 
                                key={`item-${item.item_name || 'unnamed'}-${index}`}
                                sx={{
                                  '&:nth-of-type(odd)': {
                                    backgroundColor: 'rgba(0,0,0,0.01)'
                                  },
                                  '&:hover': {
                                    backgroundColor: 'rgba(25, 118, 210, 0.04)'
                                  }
                                }}
                              >
                                <TableCell>
                                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                    {item.item_name || 'N/A'}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Chip 
                                    label={item.quantity || 'N/A'}
                                    size="small"
                                    color="primary"
                                    variant="outlined"
                                  />
                                </TableCell>
                                <TableCell sx={{ fontFamily: 'monospace' }}>{item.width || 'N/A'}</TableCell>
                                <TableCell sx={{ fontFamily: 'monospace' }}>{item.height || 'N/A'}</TableCell>
                                <TableCell sx={{ fontFamily: 'monospace' }}>{item.additional_dimension || 'N/A'}</TableCell>
                                <TableCell>{item.color || 'N/A'}</TableCell>
                                <TableCell>{item.argon || 'N/A'}</TableCell>
                                <TableCell sx={{ width: '40px', textAlign: 'center', padding: '8px 4px' }}>  
                                  {item.requiresSpecialOrder ? (
                                    <Tooltip title="Special Order Required">
                                      <span>🔵</span>
                                    </Tooltip>
                                  ) : (
                                    <Tooltip title="No Special Order">
                                      <span>⚪</span>
                                    </Tooltip>
                                  )}
                                </TableCell>
                                <TableCell>{item.glass_option || 'N/A'}</TableCell>
                                <TableCell>{item.grid_style || 'N/A'}</TableCell>
                                <TableCell>{item.frame || 'N/A'}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    ) : (
                      <Box sx={{ 
                        textAlign: 'center', 
                        py: 4,
                        backgroundColor: 'rgba(0,0,0,0.02)',
                        borderRadius: 2,
                        border: '1px dashed rgba(0,0,0,0.1)'
                      }}>
                        <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
                          📭 No items found for this order
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          ) : (
            <Typography>No invoice details available.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>Close</Button>
          <Button
            variant="contained"
            startIcon={<EditIcon />}
            onClick={() => {
              setEditInvoiceData(selectedInvoice);
              setEditDialogOpen(true);
              setDetailDialogOpen(false);
            }}
            sx={{
              backgroundColor: 'warning.main',
              '&:hover': {
                backgroundColor: 'warning.dark'
              }
            }}
          >
            Edit Invoice
          </Button>
        </DialogActions>
      </Dialog>

        {/* Edit Dialog */}
        <Dialog 
          open={editDialogOpen} 
          onClose={() => setEditDialogOpen(false)}
          maxWidth={false}
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
              width: '90vw',
              maxWidth: '1200px',
              height: '90vh',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column'
            }
          }}
        >
          <DialogTitle sx={{
            background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
            color: 'white',
            position: 'relative',
            py: 3
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 40,
                height: 40,
                borderRadius: 2,
                backgroundColor: 'rgba(255,255,255,0.2)',
                backdropFilter: 'blur(10px)'
              }}>
                <EditIcon sx={{ color: 'white' }} />
              </Box>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
                  Edit Invoice Data
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Order #{editInvoiceData?.order_no || 'N/A'}
                </Typography>
              </Box>
            </Box>
            <IconButton
              onClick={() => setEditDialogOpen(false)}
              sx={{ 
                position: 'absolute', 
                right: 16, 
                top: 16,
                color: 'white',
                backgroundColor: 'rgba(255,255,255,0.1)',
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.2)'
                }
              }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ p: 4, flex: 1, overflow: 'auto' }}>
            {editInvoiceData && (
              <Box>
                {/* Invoice Information Header */}
                <Box sx={{ 
                  mb: 4, 
                  p: 3, 
                  backgroundColor: 'rgba(25, 118, 210, 0.04)',
                  borderRadius: 2,
                  border: '1px solid rgba(25, 118, 210, 0.12)'
                }}>
                  <Typography variant="h6" sx={{ 
                    fontWeight: 600, 
                    mb: 1, 
                    color: 'primary.main',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}>
                    📋 Invoice Information
                  </Typography>
                </Box>

                {/* Customer & Order Details */}
                <Box sx={{ mb: 4 }}>
                  <Typography variant="subtitle1" sx={{ 
                    fontWeight: 600, 
                    mb: 2, 
                    color: 'text.primary',
                    borderBottom: '2px solid',
                    borderColor: 'primary.main',
                    pb: 1,
                    display: 'inline-block'
                  }}>
                    👤 Customer & Order Details
                  </Typography>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Customer Name"
                        value={editInvoiceData.customer_name || ''}
                        onChange={(e) => setEditInvoiceData(prev => ({
                          ...prev,
                          customer_name: e.target.value
                        }))}
                        variant="outlined"
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                            backgroundColor: 'rgba(255, 255, 255, 0.8)'
                          }
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Order Number"
                        value={editInvoiceData.order_no || ''}
                        onChange={(e) => setEditInvoiceData(prev => ({
                          ...prev,
                          order_no: e.target.value
                        }))}
                        variant="outlined"
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                            backgroundColor: 'rgba(255, 255, 255, 0.8)'
                          }
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="PO Number"
                        value={editInvoiceData.po_number || ''}
                        onChange={(e) => setEditInvoiceData(prev => ({
                          ...prev,
                          po_number: e.target.value
                        }))}
                        variant="outlined"
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                            backgroundColor: 'rgba(255, 255, 255, 0.8)'
                          }
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Quantity"
                        type="number"
                        value={editInvoiceData.total_quantity || ''}
                        InputProps={{
                          readOnly: true,
                          style: {
                            backgroundColor: 'rgba(0, 0, 0, 0.04)',
                            color: 'rgba(0, 0, 0, 0.6)',
                            borderRadius: 8
                          }
                        }}
                        placeholder="Auto-calculated"
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2
                          }
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Box sx={{ 
                        display: 'flex',
                        alignItems: 'center',
                        height: '56px',
                        pl: 2
                      }}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={editInvoiceData.paid_status === 'paid' || editInvoiceData.paid_status === true}
                              onChange={(e) => setEditInvoiceData(prev => ({
                                ...prev,
                                paid_status: e.target.checked ? 'paid' : 'unpaid'
                              }))}
                              color="success"
                              size="medium"
                            />
                          }
                          label={
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                Payment Status
                              </Typography>
                              <Typography 
                                variant="caption" 
                                sx={{ 
                                  color: editInvoiceData.paid_status === 'paid' || editInvoiceData.paid_status === true ? 'success.main' : 'warning.main',
                                  fontWeight: 500
                                }}
                              >
                                {editInvoiceData.paid_status === 'paid' || editInvoiceData.paid_status === true ? '✅ Paid' : '⏳ Unpaid'}
                              </Typography>
                            </Box>
                          }
                        />
                      </Box>
                    </Grid>
                  </Grid>
                </Box>

                {/* Dates Section */}
                <Box sx={{ mb: 4 }}>
                  <Typography variant="subtitle1" sx={{ 
                    fontWeight: 600, 
                    mb: 2, 
                    color: 'text.primary',
                    borderBottom: '2px solid',
                    borderColor: 'warning.main',
                    pb: 1,
                    display: 'inline-block'
                  }}>
                    📅 Dates
                  </Typography>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="Order Date"
                        type="date"
                        value={editInvoiceData.order_date ? editInvoiceData.order_date.split('T')[0] : ''}
                        onChange={(e) => setEditInvoiceData(prev => ({
                          ...prev,
                          order_date: e.target.value
                        }))}
                        InputLabelProps={{
                          shrink: true,
                        }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                            backgroundColor: 'rgba(255, 255, 255, 0.8)'
                          }
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="Due Date"
                        type="date"
                        value={editInvoiceData.due_date ? editInvoiceData.due_date.split('T')[0] : ''}
                        onChange={(e) => setEditInvoiceData(prev => ({
                          ...prev,
                          due_date: e.target.value
                        }))}
                        InputLabelProps={{
                          shrink: true,
                        }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                            backgroundColor: 'rgba(255, 255, 255, 0.8)'
                          }
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="Delivery Date"
                        type="date"
                        value={editInvoiceData.delivery_date ? editInvoiceData.delivery_date.split('T')[0] : ''}
                        onChange={(e) => setEditInvoiceData(prev => ({
                          ...prev,
                          delivery_date: e.target.value
                        }))}
                        InputLabelProps={{
                          shrink: true,
                        }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                            backgroundColor: 'rgba(255, 255, 255, 0.8)'
                          }
                        }}
                      />
                    </Grid>
                  </Grid>
                </Box>

                {/* Delivery & Shipping Section - Side by Side */}
                <Box sx={{ mb: 4 }}>
                  <Typography variant="subtitle1" sx={{ 
                    fontWeight: 600, 
                    mb: 2, 
                    color: 'text.primary',
                    borderBottom: '2px solid',
                    borderColor: 'success.main',
                    pb: 1,
                    display: 'inline-block'
                  }}>
                    🚚 Delivery & Shipping
                  </Typography>
                  <Grid container spacing={3}>
                    {/* Delivery Method */}
                    <Grid item xs={12} md={4}>
                      <Box sx={{
                        p: 3,
                        backgroundColor: 'rgba(76, 175, 80, 0.04)',
                        borderRadius: 2,
                        border: '1px solid rgba(76, 175, 80, 0.12)',
                        height: '100%'
                      }}>
                        <Typography variant="subtitle2" sx={{ 
                          fontWeight: 600, 
                          mb: 2, 
                          color: 'success.main'
                        }}>
                          📦 Delivery Method
                        </Typography>
                        <FormControl fullWidth>
                          <Select
                            value={editInvoiceData.delivery_method || ''}
                            onChange={(e) => setEditInvoiceData(prev => ({
                              ...prev,
                              delivery_method: e.target.value
                            }))}
                            variant="outlined"
                            displayEmpty
                            sx={{
                              borderRadius: 2,
                              backgroundColor: 'rgba(255, 255, 255, 0.8)'
                            }}
                          >
                            <MenuItem value="">Select delivery method</MenuItem>
                            {deliveryMethods.map((method) => (
                              <MenuItem key={method.id} value={method.name}>
                                {method.name}
                                {method.description && ` - ${method.description}`}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Box>
                    </Grid>
                    
                    {/* Shipping Address */}
                    <Grid item xs={12} md={8}>
                      <Box sx={{
                        p: 3,
                        backgroundColor: 'rgba(33, 150, 243, 0.04)',
                        borderRadius: 2,
                        border: '2px solid rgba(33, 150, 243, 0.2)',
                        height: '100%'
                      }}>
                        <Typography variant="subtitle2" sx={{ 
                          fontWeight: 600, 
                          mb: 2, 
                          color: 'info.main'
                        }}>
                          📍 Shipping Address
                        </Typography>
                        <TextField
                          fullWidth
                          value={editInvoiceData.shipping_address || ''}
                          onChange={(e) => setEditInvoiceData(prev => ({
                            ...prev,
                            shipping_address: e.target.value
                          }))}
                          placeholder="Enter complete shipping address"
                          multiline
                          rows={4}
                          variant="outlined"
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 2,
                              backgroundColor: 'rgba(255, 255, 255, 0.8)',
                              '& fieldset': {
                                borderWidth: '2px',
                                borderColor: 'rgba(33, 150, 243, 0.3)'
                              },
                              '&:hover fieldset': {
                                borderColor: 'rgba(33, 150, 243, 0.5)'
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: 'info.main',
                                borderWidth: '2px'
                              }
                            }
                          }}
                        />
                      </Box>
                    </Grid>
                  </Grid>
                </Box>

                {/* Order Items Section */}
                <Divider sx={{ my: 4 }} />
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: 'warning.main' }}>
                    📦 Order Items
                  </Typography>
                  <Button
                    startIcon={<AddIcon />}
                    onClick={() => {
                      const newItem = {
                        item_name: '',
                        quantity: 1,
                        width: '',
                        height: '',
                        additional_dimension: '',
                        color: '',
                        frame: '',
                        glass_option: '',
                        grid_style: '',
                        argon: ''
                      };
                      
                      const updatedItems = [...(editInvoiceData.order_items || []), newItem];
                      
                      // Recalculate total quantity
                      const totalQuantity = updatedItems.reduce((total, item) => total + (parseInt(item.quantity) || 0), 0);
                      
                      // Recalculate WDGSP string and other totals
                      const { wdgspString, hasSpecialOrder, glassOrderNeeded, itemOrderNeeded, processedItems } = categorizeItems(updatedItems, editInvoiceData.delivery_method);
                      
                      setEditInvoiceData(prev => ({
                        ...prev,
                        order_items: processedItems,
                        total_quantity: totalQuantity,
                        wdgsp_string: wdgspString,
                        has_special_order: hasSpecialOrder,
                        glass_order_needed: glassOrderNeeded,
                        item_order_needed: itemOrderNeeded
                      }));
                    }}
                    variant="outlined"
                    size="small"
                    sx={{ borderRadius: 2, textTransform: 'none' }}
                  >
                    Add Item
                  </Button>
                </Box>

                {editInvoiceData.order_items && editInvoiceData.order_items.length > 0 ? (
                  <TableContainer component={Paper} sx={{ mb: 3, borderRadius: 2 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ backgroundColor: 'rgba(0,0,0,0.04)' }}>
                          <TableCell sx={{ fontWeight: 600 }}>Item Name</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Qty</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Width</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Height</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>P/V</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Color</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Argon</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Glass Option</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Grid Style</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Frame</TableCell>
                          <TableCell sx={{ fontWeight: 600, textAlign: 'center' }}>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {editInvoiceData.order_items.map((item, itemIndex) => (
                          <TableRow key={`edit-item-${item.item_name || 'unnamed'}-${itemIndex}`}>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Autocomplete
                                  size="small"
                                  options={itemOptions}
                                  value={item.item_name || ''}
                                  onChange={(event, newValue) => {
                                    const updatedItems = [...editInvoiceData.order_items];
                                    updatedItems[itemIndex] = { ...updatedItems[itemIndex], item_name: newValue || '' };
                                    
                                    // Recalculate total quantity and WDGSP string
                                    const totalQuantity = updatedItems.reduce((total, item) => total + (parseInt(item.quantity) || 0), 0);
                                    const { wdgspString, hasSpecialOrder, glassOrderNeeded, itemOrderNeeded, processedItems } = categorizeItems(updatedItems, editInvoiceData.delivery_method);
                                    
                                    setEditInvoiceData(prev => ({
                                      ...prev,
                                      order_items: processedItems,
                                      total_quantity: totalQuantity,
                                      wdgsp_string: wdgspString,
                                      has_special_order: hasSpecialOrder,
                                      glass_order_needed: glassOrderNeeded,
                                      item_order_needed: itemOrderNeeded
                                    }));
                                  }}
                                  freeSolo
                                  autoComplete
                                  autoHighlight
                                  includeInputInList
                                  filterSelectedOptions
                                  disableClearable
                                  getOptionLabel={(option) => option || ''}
                                  isOptionEqualToValue={(option, value) => option === value}
                                  renderInput={(params) => (
                                    <TextField
                                      {...params}
                                      placeholder="Select or type item name"
                                      size="small"
                                    />
                                  )}
                                  sx={{ minWidth: 150 }}
                                />
                                {(() => {
                                  const dbItem = getItemValidation(item.item_name);
                                  const shouldShowWarning = !dbItem && item.item_name;
                                  
                                  return shouldShowWarning ? (
                                    <Tooltip title={`Item "${item.item_name}" not found in database`}>
                                      <Warning 
                                        fontSize="small" 
                                        sx={{ 
                                          color: 'warning.main',
                                          animation: 'pulse 2s infinite'
                                        }} 
                                      />
                                    </Tooltip>
                                  ) : null;
                                })()}
                              </Box>
                            </TableCell>
                            <TableCell>
                               <TextField
                                 size="small"
                                 type="number"
                                 value={item.quantity || ''}
                                 onChange={(e) => {
                                   const updatedItems = [...editInvoiceData.order_items];
                                   updatedItems[itemIndex] = { ...updatedItems[itemIndex], quantity: parseInt(e.target.value) || 0 };
                                   
                                   // Recalculate total quantity
                                   const totalQuantity = updatedItems.reduce((total, item) => total + (parseInt(item.quantity) || 0), 0);
                                   
                                   // Recalculate WDGSP string
                                   const { wdgspString, hasSpecialOrder, glassOrderNeeded, itemOrderNeeded, processedItems } = categorizeItems(updatedItems, editInvoiceData.delivery_method);
                                   
                                   setEditInvoiceData(prev => ({
                                     ...prev,
                                     order_items: processedItems,
                                     total_quantity: totalQuantity,
                                     wdgsp_string: wdgspString,
                                     has_special_order: hasSpecialOrder,
                                     glass_order_needed: glassOrderNeeded,
                                     item_order_needed: itemOrderNeeded
                                   }));
                                 }}
                                 placeholder="Quantity"
                                 sx={{ 
                                   width: 80,
                                   '& .MuiInputBase-input': {
                                     textAlign: 'center'
                                   }
                                 }}
                                 inputProps={{ min: 0 }}
                               />
                             </TableCell>
                            <TableCell>
                              <TextField
                                size="small"
                                value={item.width || ''}
                                onChange={(e) => {
                                  const updatedItems = [...editInvoiceData.order_items];
                                  updatedItems[itemIndex] = { ...updatedItems[itemIndex], width: e.target.value };
                                  setEditInvoiceData(prev => ({
                                    ...prev,
                                    order_items: updatedItems
                                  }));
                                }}
                                placeholder="Width"
                                sx={{ width: 100 }}
                              />
                            </TableCell>
                            <TableCell>
                              <TextField
                                size="small"
                                value={item.height || ''}
                                onChange={(e) => {
                                  const updatedItems = [...editInvoiceData.order_items];
                                  updatedItems[itemIndex] = { ...updatedItems[itemIndex], height: e.target.value };
                                  setEditInvoiceData(prev => ({
                                    ...prev,
                                    order_items: updatedItems
                                  }));
                                }}
                                placeholder="Height"
                                sx={{ width: 80 }}
                              />
                            </TableCell>
                            <TableCell>
                              <TextField
                                size="small"
                                value={item.additional_dimension || ''}
                                onChange={(e) => {
                                  const updatedItems = [...editInvoiceData.order_items];
                                  updatedItems[itemIndex] = { ...updatedItems[itemIndex], additional_dimension: e.target.value };
                                  setEditInvoiceData(prev => ({
                                    ...prev,
                                    order_items: updatedItems
                                  }));
                                }}
                                placeholder="P/V"
                                sx={{ width: 80 }}
                              />
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Autocomplete
                                  size="small"
                                  freeSolo
                                  autoComplete
                                  autoHighlight
                                  includeInputInList
                                  filterSelectedOptions
                                  disableClearable
                                  options={colorOptions}
                                  value={item.color || ''}
                                  onChange={(event, newValue) => {
                                    const updatedItems = [...editInvoiceData.order_items];
                                    updatedItems[itemIndex] = { ...updatedItems[itemIndex], color: newValue || '' };
                                    
                                    // Recalculate total quantity and WDGSP string
                                    const totalQuantity = updatedItems.reduce((total, item) => total + (parseInt(item.quantity) || 0), 0);
                                    const { wdgspString, hasSpecialOrder, glassOrderNeeded, itemOrderNeeded, processedItems } = categorizeItems(updatedItems, editInvoiceData.delivery_method);
                                    
                                    setEditInvoiceData(prev => ({
                                      ...prev,
                                      order_items: processedItems,
                                      total_quantity: totalQuantity,
                                      wdgsp_string: wdgspString,
                                      has_special_order: hasSpecialOrder,
                                      glass_order_needed: glassOrderNeeded,
                                      item_order_needed: itemOrderNeeded
                                    }));
                                  }}
                                  getOptionLabel={(option) => option || ''}
                                  isOptionEqualToValue={(option, value) => option === value}
                                  renderInput={(params) => (
                                    <TextField
                                      {...params}
                                      placeholder="Color"
                                      sx={{ width: 120 }}
                                    />
                                  )}
                                  sx={{ width: 120 }}
                                />
                                {(() => {
                                  const dbColor = getColorValidation(item.color);
                                  return !dbColor && item.color ? (
                                    <Tooltip title={`Color "${item.color}" not found in database`}>
                                      <Warning 
                                        fontSize="small" 
                                        sx={{ 
                                          color: 'warning.main',
                                          animation: 'pulse 2s infinite'
                                        }} 
                                      />
                                    </Tooltip>
                                  ) : null;
                                })()}
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Select
                                size="small"
                                value={item.argon === 'yes' ? 'YES' : 'NONE'}
                                onChange={(e) => {
                                  const updatedItems = [...editInvoiceData.order_items];
                                  updatedItems[itemIndex] = { ...updatedItems[itemIndex], argon: e.target.value === 'YES' ? 'yes' : '' };
                                  setEditInvoiceData(prev => ({
                                    ...prev,
                                    order_items: updatedItems
                                  }));
                                }}
                                sx={{ width: 80 }}
                              >
                                <MenuItem value="YES">YES</MenuItem>
                                <MenuItem value="NONE">NONE</MenuItem>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <TextField
                                size="small"
                                value={item.glass_option || ''}
                                onChange={(e) => {
                                  const updatedItems = [...editInvoiceData.order_items];
                                  updatedItems[itemIndex] = { ...updatedItems[itemIndex], glass_option: e.target.value };
                                  setEditInvoiceData(prev => ({
                                    ...prev,
                                    order_items: updatedItems
                                  }));
                                }}
                                placeholder="Glass option"
                                sx={{ width: 150 }}
                              />
                            </TableCell>
                            <TableCell>
                              <TextField
                                size="small"
                                value={item.grid_style || ''}
                                onChange={(e) => {
                                  const updatedItems = [...editInvoiceData.order_items];
                                  updatedItems[itemIndex] = { ...updatedItems[itemIndex], grid_style: e.target.value };
                                  setEditInvoiceData(prev => ({
                                    ...prev,
                                    order_items: updatedItems
                                  }));
                                }}
                                placeholder="Grid style"
                                sx={{ width: 120 }}
                              />
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Autocomplete
                                  size="small"
                                  freeSolo
                                  autoComplete
                                  autoHighlight
                                  includeInputInList
                                  filterSelectedOptions
                                  disableClearable
                                  options={frameOptions}
                                  value={item.frame || ''}
                                  onChange={(event, newValue) => {
                                  const updatedItems = [...editInvoiceData.order_items];
                                  updatedItems[itemIndex] = { ...updatedItems[itemIndex], frame: newValue || '' };
                                  
                                  // Recalculate total quantity and WDGSP string
                                  const totalQuantity = updatedItems.reduce((total, item) => total + (parseInt(item.quantity) || 0), 0);
                                  const { wdgspString, hasSpecialOrder, glassOrderNeeded, itemOrderNeeded, processedItems } = categorizeItems(updatedItems, editInvoiceData.delivery_method);
                                  
                                  setEditInvoiceData(prev => ({
                                    ...prev,
                                    order_items: processedItems, // Use processedItems with requiresSpecialOrder field
                                    total_quantity: totalQuantity,
                                    wdgsp_string: wdgspString,
                                    has_special_order: hasSpecialOrder,
                                    glass_order_needed: glassOrderNeeded,
                                    item_order_needed: itemOrderNeeded
                                  }));
                                }}
                                  getOptionLabel={(option) => option || ''}
                                  isOptionEqualToValue={(option, value) => option === value}
                                  renderInput={(params) => (
                                    <TextField
                                      {...params}
                                      placeholder="Frame"
                                      sx={{ width: 120 }}
                                    />
                                  )}
                                  sx={{ width: 120 }}
                                />
                                {(() => {
                                  const dbFrameStyle = getFrameValidation(item.frame);
                                  return !dbFrameStyle && item.frame ? (
                                    <Tooltip title={`Frame style "${item.frame}" not found in database`}>
                                      <Warning 
                                        fontSize="small" 
                                        sx={{ 
                                          color: 'warning.main',
                                          animation: 'pulse 2s infinite'
                                        }} 
                                      />
                                    </Tooltip>
                                  ) : null;
                                })()}
                              </Box>
                            </TableCell>
                            <TableCell sx={{ textAlign: 'center' }}>
                              <IconButton
                                size="small"
                                onClick={() => {
                                  const updatedItems = editInvoiceData.order_items.filter((_, index) => index !== itemIndex);
                                  
                                  // Recalculate total quantity
                                  const totalQuantity = updatedItems.reduce((total, item) => total + (parseInt(item.quantity) || 0), 0);
                                  
                                  // Recalculate WDGSP string and other totals
                                  const { wdgspString, hasSpecialOrder, glassOrderNeeded, itemOrderNeeded, processedItems } = categorizeItems(updatedItems, editInvoiceData.delivery_method);
                                  
                                  setEditInvoiceData(prev => ({
                                    ...prev,
                                    order_items: processedItems,
                                    total_quantity: totalQuantity,
                                    wdgsp_string: wdgspString,
                                    has_special_order: hasSpecialOrder,
                                    glass_order_needed: glassOrderNeeded,
                                    item_order_needed: itemOrderNeeded
                                  }));
                                }}
                                sx={{ color: 'error.main' }}
                              >
                                <RemoveIcon />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Box sx={{ 
                    textAlign: 'center', 
                    py: 4,
                    backgroundColor: 'rgba(0,0,0,0.02)',
                    borderRadius: 2,
                    border: '1px dashed rgba(0,0,0,0.1)',
                    mb: 3
                  }}>
                    <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
                      📭 No items found. Click "Add Item" to add order items.
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 3, borderTop: '1px solid rgba(0,0,0,0.12)' }}>
            <Button 
              onClick={() => setEditDialogOpen(false)}
              sx={{ 
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 500
              }}
            >
              Cancel
            </Button>
            <Button
               variant="contained"
               onClick={async () => {
                 try {
                   // Define the valid invoice table columns based on the schema
                   const validInvoiceColumns = [
                     'id', 'order_no', 'po_number', 'order_date', 'due_date', 
                     'delivery_date', 'delivery_method', 'paid_status', 'shipping_address',
                     'customer_name', 'customer_phone', 'customer_address',
                     'total_quantity', 'wdgsp_string', 'has_special_order', 
                     'glass_order_needed', 'item_order_needed', 'extraction_confidence', 
                     'processing_status'
                   ];
                   
                   // Filter editInvoiceData to only include valid invoice columns
                   const invoiceDataOnly = Object.keys(editInvoiceData)
                     .filter(key => validInvoiceColumns.includes(key))
                     .reduce((obj, key) => {
                       obj[key] = editInvoiceData[key];
                       return obj;
                     }, {});
                   
                   // Update the main invoice data (only valid columns)
                   const result = await updateInvoice(editInvoiceData.id, invoiceDataOnly);
                   
                   if (result.success) {
                     // Update the order items separately if they exist
                     if (editInvoiceData.order_items && editInvoiceData.order_items.length > 0) {
                       await updateOrderItems(editInvoiceData.id, editInvoiceData.order_items);
                     }
                     
                     // Close dialog first to prevent state conflicts
                     setEditDialogOpen(false);
                     
                     // Add a small delay to ensure database transaction is committed
                     await new Promise(resolve => setTimeout(resolve, 100));
                     
                     // Force refresh the invoice list
                     await fetchInvoices();
                     
                     // Update the selected invoice if detail dialog was open
                     if (selectedInvoice && selectedInvoice.id === editInvoiceData.id) {
                       const updatedInvoiceResult = await getInvoiceById(editInvoiceData.id);
                       if (updatedInvoiceResult.success) {
                         const updatedInvoice = updatedInvoiceResult.data;
                         // Process the order items to add requires_special_order field
                         const { processedItems } = categorizeItems(updatedInvoice.order_items || [], updatedInvoice.delivery_method);
                         updatedInvoice.order_items = processedItems;
                         setSelectedInvoice(updatedInvoice);
                       }
                     }
                   } else {
                     setError(result.message || 'Failed to update invoice');
                   }
                 } catch (err) {
                   setError('Failed to update invoice and items');
                   console.error('Error updating invoice:', err);
                 }
               }}
               sx={{
                 borderRadius: 2,
                 textTransform: 'none',
                 fontWeight: 600
               }}
             >
               Save Changes
             </Button>
          </DialogActions>
        </Dialog>

    </Container>
  );
}

export default ProcessedInvoicePage;