import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Container,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  CircularProgress,
  Alert,
  FormControlLabel,
  Chip,
  TextField,
  Snackbar
} from '@mui/material';
import { supabase } from '../utils/supabaseClient';
import * as XLSX from 'xlsx';

function DataConverterPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [error, setError] = useState(null);
  
  // New state for order items dialog
  const [orderItemsDialogOpen, setOrderItemsDialogOpen] = useState(false);
  const [orderItems, setOrderItems] = useState([]);
  const [orderItemsLoading, setOrderItemsLoading] = useState(false);
  
  // Add state variables for order item selection
  const [selectedOrderItems, setSelectedOrderItems] = useState([]);
  const [selectAllOrderItems, setSelectAllOrderItems] = useState(false);
  
  // Add state for filename input dialog
  const [filenameDialogOpen, setFilenameDialogOpen] = useState(false);
  const [filename, setFilename] = useState('');
  const [exportLoading, setExportLoading] = useState(false);
  
  // Add state for success message
  const [successMessage, setSuccessMessage] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  // New this helper function for batch assignment status
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

  // Helper function to format dates
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      // Handle YYYY-MM-DD format to avoid timezone issues
      if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = dateString.split('-');
        const date = new Date(year, month - 1, day);
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      }
      // For other date formats
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  // New function to fetch order items for selected invoices
  const fetchOrderItems = async () => {
    if (selectedInvoices.length === 0) return;
    
    setOrderItemsLoading(true);
    // Reset order item selections when fetching new data
    setSelectedOrderItems([]);
    setSelectAllOrderItems(false);
    try {
      const { data, error } = await supabase
        .from('order_items')
        .select(`
          *,
          invoices!inner(
            customer_name,
            order_no
          )
        `)
        .in('invoice_id', selectedInvoices)
        .or('batch_assigned.is.null,batch_assigned.eq.,batch_assigned.eq.N/A')
        .order('invoices(order_no)', { ascending: true });

      if (error) {
        throw error;
      }

      setOrderItems(data || []);
    } catch (error) {
      console.error('Error fetching order items:', error);
      setError('Failed to fetch order items');
    } finally {
      setOrderItemsLoading(false);
    }
  };

  // Handle Start Process button click
  const handleStartProcess = async () => {
    await fetchOrderItems();
    setOrderItemsDialogOpen(true);
    setDialogOpen(false); // Close invoice selection dialog
  };

  // Fetch invoices with order_items and filter for non-complete batches
  const fetchInvoices = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          id, 
          order_no, 
          customer_name, 
          due_date, 
          delivery_method, 
          total_quantity,
          order_items (
            id,
            batch_assigned
          )
        `)
        .order('due_date', { ascending: true })
        .order('order_no', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch invoices: ${error.message}`);
      }

      // Filter invoices to show only "None Batched" or "Partial Batched"
      const filteredInvoices = (data || []).filter(invoice => {
        const batchStatus = getBatchAssignmentStatus(invoice.order_items);
        return !batchStatus.allAssigned; // Show only non-complete batches
      });

      setInvoices(filteredInvoices);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle Start button click
  const handleStartClick = () => {
    setDialogOpen(true);
    setSelectedInvoices([]);
    setSelectAll(false);
    fetchInvoices();
  };

  // Handle dialog close
  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedInvoices([]);
    setSelectAll(false);
  };

  // Handle individual invoice selection
  const handleInvoiceSelect = (invoiceId) => {
    setSelectedInvoices(prev => {
      if (prev.includes(invoiceId)) {
        const newSelection = prev.filter(id => id !== invoiceId);
        setSelectAll(newSelection.length === invoices.length && invoices.length > 0);
        return newSelection;
      } else {
        const newSelection = [...prev, invoiceId];
        setSelectAll(newSelection.length === invoices.length);
        return newSelection;
      }
    });
  };

  // Handle checkbox click specifically
  const handleCheckboxClick = (invoiceId, event) => {
    event.stopPropagation(); // Prevent row click
    handleInvoiceSelect(invoiceId);
  };

  // Handle select all toggle
  const handleSelectAllToggle = () => {
    if (selectAll) {
      setSelectedInvoices([]);
      setSelectAll(false);
    } else {
      setSelectedInvoices(invoices.map(invoice => invoice.id));
      setSelectAll(true);
    }
  };

  // Update selectAll state when selectedInvoices changes
  useEffect(() => {
    if (invoices.length > 0) {
      setSelectAll(selectedInvoices.length === invoices.length);
    }
  }, [selectedInvoices, invoices]);

  // Handle individual order item selection
  const handleOrderItemSelect = (event, itemId) => {
    event.stopPropagation();
    setSelectedOrderItems(prev => {
      const newSelection = prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId];
      
      // Update select all state based on new selection
      setSelectAllOrderItems(newSelection.length === orderItems.length && orderItems.length > 0);
      return newSelection;
    });
  };

  // Handle select all order items toggle
  const handleSelectAllOrderItems = (event) => {
    const checked = event.target.checked;
    setSelectAllOrderItems(checked);
    
    if (checked) {
      // Select all order items
      setSelectedOrderItems(orderItems.map(item => item.id));
    } else {
      // Deselect all order items
      setSelectedOrderItems([]);
    }
  };

  // Handle snackbar close
  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
    setSuccessMessage('');
  };

  // Add Excel export function
  const exportToExcel = (filename) => {
    try {
      setExportLoading(true);
      
      // Get selected order items data
      const selectedItems = orderItems.filter(item => selectedOrderItems.includes(item.id));
      
      // Transform data according to mapping
      const excelData = selectedItems.map(item => ({
        'Customer': `${item.invoices?.customer_name || ''} ${item.invoices?.order_no || ''}`.trim(),
        'ID': '',
        'Style': item.item_name || '',
        'W': item.width || '',
        'H': item.height || '',
        'FH': item.additional_dimension || '',
        'Frame': item.frame || '',
        'Glass': item.glass_option || '',
        'Argon': item.argon === 'YES' ? 'Argon' : '',
        'Grid': item.grid_style || '',
        'Color': item.color || ''
      }));
      
      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Batch Items');
      
      // Generate filename with .xlsx extension if not provided
      const finalFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
      
      // Save file
      XLSX.writeFile(wb, finalFilename);
      
      // Show success message
      setSuccessMessage(`File \"${finalFilename}\" has been downloaded successfully!`);
      setSnackbarOpen(true);
      
      // Close dialogs
      setFilenameDialogOpen(false);
      setFilename('');
      
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      setError('Failed to export Excel file');
    } finally {
      setExportLoading(false);
    }
  };

  // Handle Convert Selected button click
  const handleConvertSelected = () => {
    setFilenameDialogOpen(true);
  };

  // Handle filename dialog submit
  const handleFilenameSubmit = () => {
    if (filename.trim()) {
      exportToExcel(filename.trim());
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography 
          variant="h4" 
          component="h1" 
          sx={{ 
            fontWeight: 700,
            color: 'text.primary',
            mb: 1
          }}
        >
          Data Converter
        </Typography>
        <Typography 
          variant="body1" 
          sx={{ 
            color: 'text.secondary',
            fontSize: '1.1rem'
          }}
        >
          Convert and transform invoice data for processing
        </Typography>
      </Box>

      <Paper 
        elevation={1} 
        sx={{ 
          p: 4,
          borderRadius: 2,
          textAlign: 'center',
          minHeight: '400px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Box>
          <Typography 
            variant="h6" 
            sx={{ 
              color: 'text.primary',
              mb: 3,
              fontWeight: 600
            }}
          >
            Invoice Data Converter
          </Typography>
          <Typography 
            variant="body1" 
            sx={{ 
              color: 'text.secondary',
              mb: 4,
              maxWidth: '500px'
            }}
          >
            Select invoices from your database to convert and process their data. 
            Click the Start button below to begin the selection process.
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={handleStartClick}
            sx={{
              px: 4,
              py: 1.5,
              fontSize: '1.1rem',
              fontWeight: 600
            }}
          >
            Start Process
          </Button>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {/* Invoice Selection Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleDialogClose}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { minHeight: '70vh' }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
            Select Invoices for Data Conversion
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Choose invoices with unassigned or partially assigned batch items
          </Typography>
        </DialogTitle>
        
        <DialogContent sx={{ px: 3 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 500 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, width: 50 }}>
                      <Checkbox
                        checked={selectAll}
                        indeterminate={selectedInvoices.length > 0 && selectedInvoices.length < invoices.length}
                        onChange={handleSelectAllToggle}
                        disabled={invoices.length === 0}
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Order No.</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Customer</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Due Date</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Delivery Method</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Total Qty</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Batch Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                        <Typography variant="body1" color="text.secondary">
                          No invoices with unassigned batch items found.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    invoices.map((invoice) => {
                      const isSelected = selectedInvoices.includes(invoice.id);
                      const batchStatus = getBatchAssignmentStatus(invoice.order_items);
                      
                      return (
                        <TableRow 
                          key={invoice.id} 
                          hover
                          selected={isSelected}
                          sx={{
                            backgroundColor: isSelected ? 'action.selected' : 'inherit',
                            '&:hover': {
                              backgroundColor: isSelected ? 'action.selected' : 'action.hover'
                            }
                          }}
                        >
                          <TableCell>
                            <Checkbox
                              checked={isSelected}
                              onChange={(event) => handleCheckboxClick(invoice.id, event)}
                            />
                          </TableCell>
                          <TableCell sx={{ fontWeight: 500 }}>{invoice.order_no}</TableCell>
                          <TableCell>{invoice.customer_name}</TableCell>
                          <TableCell>{formatDate(invoice.due_date)}</TableCell>
                          <TableCell>
                            <Chip 
                              label={invoice.delivery_method || 'N/A'}
                              size="small"
                              color={invoice.delivery_method === 'Pickup' ? 'primary' : 'secondary'}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={invoice.total_quantity || 0}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={batchStatus.allAssigned ? 'Complete' : 
                                     batchStatus.assignedCount > 0 ? 
                                     `Partial (${batchStatus.assignedCount}/${batchStatus.totalCount})` : 
                                     'None Batched'}
                              size="small"
                              color={batchStatus.allAssigned ? 'success' : 
                                     batchStatus.assignedCount > 0 ? 'warning' : 'error'}
                              variant="outlined"
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleDialogClose} variant="outlined">
            Cancel
          </Button>
          <Button 
            variant="contained" 
            disabled={selectedInvoices.length === 0}
            onClick={handleStartProcess}
          >
            Start Process ({selectedInvoices.length} selected)
          </Button>
        </DialogActions>
      </Dialog>

      {/* Order Items Dialog */}
      <Dialog
        open={orderItemsDialogOpen}
        onClose={() => {
          setOrderItemsDialogOpen(false);
          // Reset selections when dialog closes
          setSelectedOrderItems([]);
          setSelectAllOrderItems(false);
        }}
        maxWidth="xl"
        fullWidth
        PaperProps={{
          sx: { minHeight: '80vh' }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
            Select Order Items for Conversion
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Choose specific order items to include in the Excel export
          </Typography>
        </DialogTitle>
        
        <DialogContent sx={{ px: 3 }}>
          {orderItemsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 600 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, width: 50 }}>
                      <Checkbox
                        checked={selectAllOrderItems}
                        indeterminate={selectedOrderItems.length > 0 && selectedOrderItems.length < orderItems.length}
                        onChange={handleSelectAllOrderItems}
                        disabled={orderItems.length === 0}
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Customer</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Order No.</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Item</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Qty</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>W</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>H</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>P/V</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Argon</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Frame</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Glass Option</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Grid Style</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Color</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {orderItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={13} align="center" sx={{ py: 4 }}>
                        <Typography variant="body1" color="text.secondary">
                          No order items found.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    orderItems.map((item, index) => {
                      const isSelected = selectedOrderItems.includes(item.id);
                      return (
                        <TableRow 
                          key={item.id} 
                          hover
                          selected={isSelected}
                          sx={{
                            backgroundColor: isSelected ? 'action.selected' : 'inherit',
                            '&:hover': {
                              backgroundColor: isSelected ? 'action.selected' : 'action.hover'
                            }
                          }}
                        >
                          <TableCell>
                            <Checkbox
                              checked={isSelected}
                              onChange={(event) => handleOrderItemSelect(event, item.id)}
                            />
                          </TableCell>
                          <TableCell>{item.invoices?.customer_name || 'N/A'}</TableCell>
                          <TableCell sx={{ fontWeight: 500 }}>{item.invoices?.order_no || 'N/A'}</TableCell>
                          <TableCell>{item.item_name || 'N/A'}</TableCell>
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
                          <TableCell>{item.argon || 'N/A'}</TableCell>
                          <TableCell>{item.frame || 'N/A'}</TableCell>
                          <TableCell>{item.glass_option || 'N/A'}</TableCell>
                          <TableCell>{item.grid_style || 'N/A'}</TableCell>
                          <TableCell>{item.color || 'N/A'}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => {
            setOrderItemsDialogOpen(false);
            // Reset selections when dialog closes
            setSelectedOrderItems([]);
            setSelectAllOrderItems(false);
          }} variant="outlined">
            Close
          </Button>
          <Button 
            variant="contained" 
            disabled={selectedOrderItems.length === 0 || exportLoading}
            onClick={handleConvertSelected}
            startIcon={exportLoading ? <CircularProgress size={20} /> : null}
          >
            {exportLoading ? 'Converting...' : `Convert Selected (${selectedOrderItems.length})`}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Filename Input Dialog */}
      <Dialog
        open={filenameDialogOpen}
        onClose={() => {
          setFilenameDialogOpen(false);
          setFilename('');
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Enter Filename
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Filename"
            type="text"
            fullWidth
            variant="outlined"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            placeholder="Enter filename (e.g., batch_items)"
            helperText=".xlsx extension will be added automatically"
            onKeyPress={(e) => {
              if (e.key === 'Enter' && filename.trim()) {
                handleFilenameSubmit();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setFilenameDialogOpen(false);
            setFilename('');
          }}>
            Cancel
          </Button>
          <Button 
            onClick={handleFilenameSubmit}
            variant="contained"
            disabled={!filename.trim() || exportLoading}
          >
            Export
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Success Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleSnackbarClose} severity="success" sx={{ width: '100%' }}>
          {successMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
}

export default DataConverterPage;