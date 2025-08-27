import React, { useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Grid,
  Typography,
  TextField,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Autocomplete,
  Divider
} from '@mui/material';
import {
  Edit as EditIcon,
  Close as CloseIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Warning
} from '@mui/icons-material';

const InvoiceEditDialog = ({
  open,
  onClose,
  invoiceData,
  onSave,
  onInvoiceDataChange,
  deliveryMethods = [],
  itemOptions = [],
  colorOptions = [],
  frameOptions = [],
  categorizeItems = null,
  loading = false
}) => {
  // Helper function to format dates
  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      return dateString.split('T')[0];
    } catch (error) {
      return '';
    }
  };

  // Internal validation functions - moved from ProcessedInvoicePage
  const getItemValidation = useCallback((itemName) => {
    if (!itemOptions || itemOptions.length === 0 || !itemName) return null;
    // Handle both array of strings and array of objects
    if (typeof itemOptions[0] === 'string') {
      return itemOptions.find(item => 
        item && item.toLowerCase() === (itemName || '').toLowerCase()
      );
    } else {
      return itemOptions.find(item => 
        item && item.name && item.name.toLowerCase() === (itemName || '').toLowerCase()
      );
    }
  }, [itemOptions]);

  const getColorValidation = useCallback((colorName) => {
    if (!colorOptions || colorOptions.length === 0 || !colorName) return null;
    // Handle both array of strings and array of objects
    if (typeof colorOptions[0] === 'string') {
      return colorOptions.find(color => 
        color && color.toLowerCase() === (colorName || '').toLowerCase()
      );
    } else {
      return colorOptions.find(color => 
        color && color.color_name && color.color_name.toLowerCase() === (colorName || '').toLowerCase()
      );
    }
  }, [colorOptions]);

  const getFrameValidation = useCallback((frameName) => {
    if (!frameOptions || frameOptions.length === 0 || !frameName) return null;
    // Handle both array of strings and array of objects
    if (typeof frameOptions[0] === 'string') {
      return frameOptions.find(frame => 
        frame && frame.toLowerCase() === (frameName || '').toLowerCase()
      );
    } else {
      return frameOptions.find(frame => 
        frame && frame.style_name && frame.style_name.toLowerCase() === (frameName || '').toLowerCase()
      );
    }
  }, [frameOptions]);

  // Handle adding new item
  const handleAddItem = () => {
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
    
    const updatedItems = [...(invoiceData.order_items || []), newItem];
    
    // Recalculate totals if categorizeItems function is provided
    if (categorizeItems) {
      const totalQuantity = updatedItems.reduce((total, item) => total + (parseInt(item.quantity) || 0), 0);
      const { wdgspString, hasSpecialOrder, glassOrderNeeded, itemOrderNeeded, processedItems } = categorizeItems(updatedItems, invoiceData.delivery_method);
      
      onInvoiceDataChange({
        ...invoiceData,
        order_items: processedItems,
        total_quantity: totalQuantity,
        wdgsp_string: wdgspString,
        has_special_order: hasSpecialOrder,
        glass_order_needed: glassOrderNeeded,
        item_order_needed: itemOrderNeeded
      });
    } else {
      onInvoiceDataChange({
        ...invoiceData,
        order_items: updatedItems
      });
    }
  };

  // Handle removing item
  const handleRemoveItem = (itemIndex) => {
    const updatedItems = invoiceData.order_items.filter((_, index) => index !== itemIndex);
    
    if (categorizeItems) {
      const totalQuantity = updatedItems.reduce((total, item) => total + (parseInt(item.quantity) || 0), 0);
      const { wdgspString, hasSpecialOrder, glassOrderNeeded, itemOrderNeeded, processedItems } = categorizeItems(updatedItems, invoiceData.delivery_method);
      
      onInvoiceDataChange({
        ...invoiceData,
        order_items: processedItems,
        total_quantity: totalQuantity,
        wdgsp_string: wdgspString,
        has_special_order: hasSpecialOrder,
        glass_order_needed: glassOrderNeeded,
        item_order_needed: itemOrderNeeded
      });
    } else {
      onInvoiceDataChange({
        ...invoiceData,
        order_items: updatedItems
      });
    }
  };

  // Handle item field changes
  const handleItemChange = (itemIndex, field, value) => {
    const updatedItems = [...invoiceData.order_items];
    updatedItems[itemIndex] = { ...updatedItems[itemIndex], [field]: value };
    
    if (categorizeItems) {
      const totalQuantity = updatedItems.reduce((total, item) => total + (parseInt(item.quantity) || 0), 0);
      const { wdgspString, hasSpecialOrder, glassOrderNeeded, itemOrderNeeded, processedItems } = categorizeItems(updatedItems, invoiceData.delivery_method);
      
      onInvoiceDataChange({
        ...invoiceData,
        order_items: processedItems,
        total_quantity: totalQuantity,
        wdgsp_string: wdgspString,
        has_special_order: hasSpecialOrder,
        glass_order_needed: glassOrderNeeded,
        item_order_needed: itemOrderNeeded
      });
    } else {
      onInvoiceDataChange({
        ...invoiceData,
        order_items: updatedItems
      });
    }
  };

  if (!invoiceData) return null;

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
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
              Order #{invoiceData?.order_no || 'N/A'}
            </Typography>
          </Box>
        </Box>
        <IconButton
          onClick={onClose}
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
                  value={invoiceData.customer_name || ''}
                  onChange={(e) => onInvoiceDataChange({
                    ...invoiceData,
                    customer_name: e.target.value
                  })}
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
                  value={invoiceData.order_no || ''}
                  onChange={(e) => onInvoiceDataChange({
                    ...invoiceData,
                    order_no: e.target.value
                  })}
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
                  value={invoiceData.po_number || ''}
                  onChange={(e) => onInvoiceDataChange({
                    ...invoiceData,
                    po_number: e.target.value
                  })}
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
                  value={invoiceData.total_quantity || ''}
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
                        checked={invoiceData.paid_status === 'paid' || invoiceData.paid_status === true}
                        onChange={(e) => onInvoiceDataChange({
                          ...invoiceData,
                          paid_status: e.target.checked ? 'paid' : 'unpaid'
                        })}
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
                            color: invoiceData.paid_status === 'paid' || invoiceData.paid_status === true ? 'success.main' : 'warning.main',
                            fontWeight: 500
                          }}
                        >
                          {invoiceData.paid_status === 'paid' || invoiceData.paid_status === true ? '✅ Paid' : '⏳ Unpaid'}
                        </Typography>
                      </Box>
                    }
                  />
                </Box>
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
                        checked={invoiceData.special_order_completed === true || invoiceData.special_order_completed === 'completed'}
                        onChange={(e) => onInvoiceDataChange({
                          ...invoiceData,
                          special_order_completed: e.target.checked ? 'completed' : 'pending'
                        })}
                        color="warning"
                        size="medium"
                        disabled={!invoiceData.has_special_order}
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          Special Order Status
                        </Typography>
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            color: invoiceData.special_order_completed === true || invoiceData.special_order_completed === 'completed' ? 'success.main' : 
                                   invoiceData.has_special_order ? 'warning.main' : 'text.disabled',
                            fontWeight: 500
                          }}
                        >
                          {!invoiceData.has_special_order ? '➖ No Special Order' :
                           invoiceData.special_order_completed === true || invoiceData.special_order_completed === 'completed' ? '✅ Completed' : '⏳ Pending'}
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
                  value={formatDate(invoiceData.order_date)}
                  onChange={(e) => onInvoiceDataChange({
                    ...invoiceData,
                    order_date: e.target.value
                  })}
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
                  value={formatDate(invoiceData.due_date)}
                  onChange={(e) => onInvoiceDataChange({
                    ...invoiceData,
                    due_date: e.target.value
                  })}
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
                  value={formatDate(invoiceData.delivery_date)}
                  onChange={(e) => onInvoiceDataChange({
                    ...invoiceData,
                    delivery_date: e.target.value
                  })}
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

          {/* Delivery & Shipping Section */}
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
                      value={invoiceData.delivery_method || ''}
                      onChange={(e) => onInvoiceDataChange({
                        ...invoiceData,
                        delivery_method: e.target.value
                      })}
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
                    value={invoiceData.shipping_address || ''}
                    onChange={(e) => onInvoiceDataChange({
                      ...invoiceData,
                      shipping_address: e.target.value
                    })}
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
              onClick={handleAddItem}
              variant="outlined"
              size="small"
              sx={{ borderRadius: 2, textTransform: 'none' }}
            >
              Add Item
            </Button>
          </Box>

          {invoiceData.order_items && invoiceData.order_items.length > 0 ? (
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
                    <TableCell sx={{ fontWeight: 600 }}>Batch Assigned</TableCell>
                    <TableCell sx={{ fontWeight: 600, textAlign: 'center' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invoiceData.order_items.map((item, itemIndex) => (
                    <TableRow key={`edit-item-${item.item_name || 'unnamed'}-${itemIndex}`}>
                      {/* Item Name - existing Autocomplete implementation */}
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Autocomplete
                            size="small"
                            options={itemOptions}
                            value={item.item_name || ''}
                            onChange={(event, newValue) => {
                              const value = typeof newValue === 'string' ? newValue : (newValue?.name || newValue?.item_name || '');
                              handleItemChange(itemIndex, 'item_name', value);
                            }}
                            freeSolo
                            autoComplete
                            autoHighlight
                            includeInputInList
                            filterSelectedOptions
                            disableClearable
                            getOptionLabel={(option) => {
                              if (typeof option === 'string') return option;
                              return option?.name || option?.item_name || '';
                            }}
                            isOptionEqualToValue={(option, value) => {
                              if (typeof option === 'string') return option === value;
                              return (option?.name || option?.item_name) === value;
                            }}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                placeholder="Item Name"
                                size="small"
                              />
                            )}
                            sx={{ minWidth: 150 }}
                          />
                          {(() => {
                            const itemValidation = getItemValidation ? getItemValidation(item.item_name) : null;
                            const shouldShowWarning = !itemValidation && item.item_name;
                            
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
                      
                      {/* Quantity */}
                      <TableCell>
                        <TextField
                          size="small"
                          type="number"
                          value={item.quantity || ''}
                          InputProps={{
                            readOnly: true,
                            style: {
                              backgroundColor: 'rgba(0, 0, 0, 0.04)',
                              color: 'rgba(0, 0, 0, 0.6)'
                            }
                          }}
                          placeholder="Qty"
                          sx={{ width: 70 }}
                        />
                      </TableCell>
                      
                      {/* Width */}
                      <TableCell>
                        <TextField
                          size="small"
                          value={item.width || ''}
                          onChange={(e) => handleItemChange(itemIndex, 'width', e.target.value)}
                          placeholder="Width"
                          sx={{ width: 80 }}
                        />
                      </TableCell>
                      
                      {/* Height */}
                      <TableCell>
                        <TextField
                          size="small"
                          value={item.height || ''}
                          onChange={(e) => handleItemChange(itemIndex, 'height', e.target.value)}
                          placeholder="Height"
                          sx={{ width: 80 }}
                        />
                      </TableCell>
                      
                      {/* P/V */}
                      <TableCell>
                        <TextField
                          size="small"
                          value={item.additional_dimension || ''}
                          onChange={(e) => handleItemChange(itemIndex, 'additional_dimension', e.target.value)}
                          placeholder="P/V"
                          sx={{ width: 80 }}
                        />
                      </TableCell>
                      
                      {/* Color - Fixed: Remove duplicate TableCell */}
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Autocomplete
                            size="small"
                            options={colorOptions}
                            value={item.color || ''}
                            onChange={(event, newValue) => {
                              const value = typeof newValue === 'string' ? newValue : (newValue?.color_name || newValue?.name || '');
                              handleItemChange(itemIndex, 'color', value);
                            }}
                            freeSolo
                            autoComplete
                            autoHighlight
                            includeInputInList
                            filterSelectedOptions
                            disableClearable
                            getOptionLabel={(option) => {
                              if (typeof option === 'string') return option;
                              return option?.color_name || option?.name || '';
                            }}
                            isOptionEqualToValue={(option, value) => {
                              if (typeof option === 'string') return option === value;
                              return (option?.color_name || option?.name) === value;
                            }}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                placeholder="Color"
                                size="small"
                              />
                            )}
                            sx={{ minWidth: 100 }}
                          />
                          {(() => {
                            const colorValidation = getColorValidation ? getColorValidation(item.color) : null;
                            const shouldShowWarning = !colorValidation && item.color;
                            
                            return shouldShowWarning ? (
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
                      
                      {/* Argon - Fixed: Convert to Select dropdown */}
                      <TableCell>
                        <FormControl size="small" sx={{ minWidth: 80 }}>
                          <Select
                            value={item.argon === 'yes' ? 'YES' : 'NONE'}
                            onChange={(e) => {
                              const newValue = e.target.value === 'YES' ? 'yes' : '';
                              handleItemChange(itemIndex, 'argon', newValue);
                            }}
                            displayEmpty
                          >
                            <MenuItem value="NONE">NONE</MenuItem>
                            <MenuItem value="YES">YES</MenuItem>
                          </Select>
                        </FormControl>
                      </TableCell>
                      
                      {/* Glass Option */}
                      <TableCell>
                        <TextField
                          size="small"
                          value={item.glass_option || ''}
                          onChange={(e) => handleItemChange(itemIndex, 'glass_option', e.target.value)}
                          placeholder="Glass Option"
                          sx={{ width: 120 }}
                        />
                      </TableCell>
                      
                      {/* Grid Style */}
                      <TableCell>
                        <TextField
                          size="small"
                          value={item.grid_style || ''}
                          onChange={(e) => handleItemChange(itemIndex, 'grid_style', e.target.value)}
                          placeholder="Grid Style"
                          sx={{ width: 100 }}
                        />
                      </TableCell>
                      
                      {/* Frame - Fixed: Remove duplicate TableCell and duplicate field */}
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Autocomplete
                            size="small"
                            options={frameOptions}
                            value={item.frame || ''}
                            onChange={(event, newValue) => {
                              const value = typeof newValue === 'string' ? newValue : (newValue?.style_name || newValue?.name || '');
                              handleItemChange(itemIndex, 'frame', value);
                            }}
                            freeSolo
                            autoComplete
                            autoHighlight
                            includeInputInList
                            filterSelectedOptions
                            disableClearable
                            getOptionLabel={(option) => {
                              if (typeof option === 'string') return option;
                              return option?.style_name || option?.name || '';
                            }}
                            isOptionEqualToValue={(option, value) => {
                              if (typeof option === 'string') return option === value;
                              return (option?.style_name || option?.name) === value;
                            }}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                placeholder="Frame"
                                size="small"
                              />
                            )}
                            sx={{ minWidth: 100 }}
                          />
                          {(() => {
                            const frameValidation = getFrameValidation ? getFrameValidation(item.frame) : null;
                            const shouldShowWarning = !frameValidation && item.frame;
                            
                            return shouldShowWarning ? (
                              <Tooltip title={`Frame "${item.frame}" not found in database`}>
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
                      
                      {/* Batch Assigned - Added: Missing field */}
                      <TableCell>
                        <TextField
                          size="small"
                          value={item.batch_assigned || ''}
                          onChange={(e) => handleItemChange(itemIndex, 'batch_assigned', e.target.value)}
                          placeholder="Batch"
                          sx={{ width: 100 }}
                        />
                      </TableCell>
                      
                      {/* Actions */}
                      <TableCell sx={{ textAlign: 'center' }}>
                        <Tooltip title="Remove Item">
                          <IconButton
                            onClick={() => handleRemoveItem(itemIndex)}
                            color="error"
                            size="small"
                          >
                            <RemoveIcon />
                          </IconButton>
                        </Tooltip>
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
              color: 'text.secondary',
              backgroundColor: 'rgba(0,0,0,0.02)',
              borderRadius: 2,
              border: '1px dashed rgba(0,0,0,0.12)'
            }}>
              <Typography variant="body1">
                No order items yet. Click "Add Item" to get started.
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ p: 3, borderTop: '1px solid rgba(0,0,0,0.12)' }}>
        <Button 
          onClick={onClose}
          sx={{ 
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 500
          }}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={() => onSave(invoiceData, invoiceData.order_items)}
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600
          }}
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InvoiceEditDialog;