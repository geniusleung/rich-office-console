import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip
} from '@mui/material';
import { Edit as EditIcon } from '@mui/icons-material';

const InvoiceDetailDialog = ({
  open,
  onClose,
  selectedInvoice,
  loading,
  showEditButton = false,
  onEdit = null,
  getBatchAssignmentStatus = null
}) => {
  // Helper function to format dates
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
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

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
    >
      <DialogTitle>
        Invoice Details {selectedInvoice?.order_no && `- ${selectedInvoice.order_no}`}
      </DialogTitle>
      <DialogContent>
        {loading ? (
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
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1, borderTop: '1px solid rgba(0,0,0,0.05)', pt: 2 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>Special Order Status</Typography>
                      <Chip 
                        label={selectedInvoice.has_special_order ? 'Required' : 'Not Required'}
                        size="small"
                        color={selectedInvoice.has_special_order ? 'warning' : 'success'}
                        sx={{ fontWeight: 600 }}
                      />
                    </Box>
                    {selectedInvoice.has_special_order && (
                      <Box sx={{ mt: 2, p: 2, backgroundColor: 'warning.light', borderRadius: 2, border: '1px solid', borderColor: 'warning.main' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'warning.dark', mb: 1 }}>
                          ⚠️ Special Order Details:
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          {selectedInvoice.item_order_needed && (
                            <Typography variant="body2" color="warning.dark">
                              • Items require special ordering
                            </Typography>
                          )}
                          {selectedInvoice.glass_order_needed && (
                            <Typography variant="body2" color="warning.dark">
                              • Glass options require special ordering
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    )}
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
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip 
                        label={`${selectedInvoice.order_items?.reduce((total, item) => total + (parseInt(item.quantity) || 0), 0) || 0} qty`}
                        color="warning"
                        variant="outlined"
                        size="small"
                      />
                      {getBatchAssignmentStatus && (() => {
                        const batchStatus = getBatchAssignmentStatus(selectedInvoice.order_items);
                        return (
                          <Chip
                            label={batchStatus.allAssigned 
                              ? `✅ All Batched (${batchStatus.assignedCount}/${batchStatus.totalCount})`
                              : batchStatus.assignedCount > 0
                                ? `⚠️ Partial Batched (${batchStatus.assignedCount}/${batchStatus.totalCount})`
                                : `❌ None Batched (0/${batchStatus.totalCount})`
                            }
                            color={batchStatus.allAssigned ? "success" : batchStatus.assignedCount > 0 ? "warning" : "error"}
                            variant={batchStatus.allAssigned ? "filled" : "outlined"}
                            size="small"
                            sx={{ fontWeight: 600 }}
                          />
                        );
                      })()}
                    </Box>
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
                            <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Batch Assigned</TableCell>
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
                              <TableCell>{item.batch_assigned || 'N/A'}</TableCell>
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
        <Button onClick={onClose}>Close</Button>
        {showEditButton && onEdit && (
          <Button
            variant="contained"
            startIcon={<EditIcon />}
            onClick={onEdit}
            sx={{
              backgroundColor: 'warning.main',
              '&:hover': {
                backgroundColor: 'warning.dark'
              }
            }}
          >
            Edit Invoice
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default InvoiceDetailDialog;