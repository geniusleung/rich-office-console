import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  TextField,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Fab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Avatar,
  Card,
  CardContent,
  FormControlLabel,
  Switch
} from '@mui/material';
import {
  Add,
  Delete,
  Edit,
  List as ListIcon,
  ArrowBack,
  Category,
  Sort
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';

function ItemListPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemName, setItemName] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [itemType, setItemType] = useState('');
  const [orderNeeded, setOrderNeeded] = useState(false);
  const [autoBatch, setAutoBatch] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [sortBy, setSortBy] = useState('created_at'); // New state for sorting

  // Predefined item types with colors
  const itemTypes = [
    { name: 'Window', color: '#2196F3' },
    { name: 'Door', color: '#4CAF50' },
    { name: 'Screen', color: '#FF9800' },
    { name: 'Glass', color: '#00BCD4' },
    { name: 'Part', color: '#9C27B0' },
    { name: 'Other', color: '#607D8B' }
  ];

  const getTypeColor = (typeName) => {
    const type = itemTypes.find(t => t.name === typeName);
    return type ? type.color : '#607D8B';
  };

  // Sort items based on selected criteria
  const getSortedItems = () => {
    const sortedItems = [...items];
    
    switch (sortBy) {
      case 'name':
        return sortedItems.sort((a, b) => a.name.localeCompare(b.name));
      case 'type':
        return sortedItems.sort((a, b) => {
          const typeA = a.item_type || 'ZZZ'; // Put items without type at the end
          const typeB = b.item_type || 'ZZZ';
          return typeA.localeCompare(typeB);
        });
      case 'created_at':
      default:
        return sortedItems.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
  };

  // Fetch items from Supabase
  const fetchItems = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      setError('Error fetching items: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleAddItem = () => {
    setEditingItem(null);
    setItemName('');
    setItemDescription('');
    setItemType('');
    setOrderNeeded(false);
    setAutoBatch(false);
    setOpenDialog(true);
  };

  const handleEditItem = (item) => {
    setEditingItem(item);
    setItemName(item.name);
    setItemDescription(item.description || '');
    setItemType(item.item_type || '');
    setOrderNeeded(item.order_needed || false);
    setAutoBatch(item.auto_batch || false);
    setOpenDialog(true);
  };

  const handleSaveItem = async () => {
    if (!itemName.trim() || !itemType.trim()) return;
  
    try {
      setError(null);
      
      if (editingItem) {
        // Update existing item
        const { error } = await supabase
          .from('items')
          .update({
            name: itemName.trim(),
            description: itemDescription.trim(),
            item_type: itemType.trim(),
            order_needed: orderNeeded,
            auto_batch: autoBatch,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingItem.id);
        
        if (error) throw error;
        setSuccess('Item updated successfully!');
      } else {
        // Add new item
        const { error } = await supabase
          .from('items')
          .insert([
            {
              name: itemName.trim(),
              description: itemDescription.trim(),
              item_type: itemType.trim(),
              order_needed: orderNeeded,
              auto_batch: autoBatch
            }
          ]);
        
        if (error) throw error;
        setSuccess('Item added successfully!');
      }
  
      setOpenDialog(false);
      setItemName('');
      setItemDescription('');
      setItemType('');
      setOrderNeeded(false);
      setAutoBatch(false);
      setEditingItem(null);
      fetchItems(); // Refresh the list
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      setError('Error saving item: ' + error.message);
    }
  };

  const handleDeleteItem = async (item) => {
    if (!window.confirm(`Are you sure you want to delete "${item.name}"?`)) {
      return;
    }

    try {
      setError(null);
      const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', item.id);
      
      if (error) throw error;
      
      setSuccess('Item deleted successfully!');
      fetchItems(); // Refresh the list
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      setError('Error deleting item: ' + error.message);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f5f5f5', pb: 4 }}>      
      {/* Header */}
      <Box sx={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        py: 4,
        mb: 4
      }}>
        <Box sx={{ maxWidth: 1200, mx: 'auto', px: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <IconButton 
              onClick={() => navigate('/settings')} 
              sx={{ mr: 2, color: 'white', backgroundColor: 'rgba(255,255,255,0.1)' }}
            >
              <ArrowBack />
            </IconButton>
            <Box>
              <Typography variant="h3" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
                Item Management
              </Typography>
              <Typography variant="h6" sx={{ opacity: 0.9 }}>
                Organize and manage your inventory with ease
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      <Box sx={{ maxWidth: 1200, mx: 'auto', px: 3 }}>
        {/* Alerts */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        {/* Stats, Sort, and Add Button */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
              <ListIcon />
            </Avatar>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 600 }}>
                Your Items
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {items.length} {items.length === 1 ? 'item' : 'items'} in your inventory
              </Typography>
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Sort Dropdown */}
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel id="sort-label">Sort by</InputLabel>
              <Select
                labelId="sort-label"
                value={sortBy}
                label="Sort by"
                onChange={(e) => setSortBy(e.target.value)}
                startAdornment={<Sort sx={{ mr: 1, color: 'text.secondary' }} />}
              >
                <MenuItem value="created_at">Date Created</MenuItem>
                <MenuItem value="name">Name</MenuItem>
                <MenuItem value="type">Type</MenuItem>
              </Select>
            </FormControl>
            
            <Button
              variant="contained"
              size="large"
              startIcon={<Add />}
              onClick={handleAddItem}
              disabled={loading}
              sx={{
                borderRadius: 3,
                px: 4,
                py: 1.5,
                background: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
                boxShadow: '0 3px 5px 2px rgba(255, 105, 135, .3)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #FE6B8B 60%, #FF8E53 100%)',
                }
              }}
            >
              Add New Item
            </Button>
          </Box>
        </Box>

        {/* Content */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress size={60} />
          </Box>
        ) : items.length === 0 ? (
          <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
            <CardContent sx={{ textAlign: 'center', py: 8 }}>
              <Avatar sx={{ bgcolor: 'grey.100', width: 80, height: 80, mx: 'auto', mb: 3 }}>
                <ListIcon sx={{ fontSize: 40, color: 'grey.400' }} />
              </Avatar>
              <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
                No Items Yet
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Start building your inventory by adding your first item
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={handleAddItem}
                sx={{ borderRadius: 3 }}
              >
                Add Your First Item
              </Button>
            </CardContent>
          </Card>
        ) : (
          <TableContainer component={Card} sx={{ borderRadius: 3, boxShadow: 3 }}>
            <Table sx={{ minWidth: 650 }}>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f8f9fa' }}>
                  <TableCell sx={{ fontWeight: 700, fontSize: '1rem', py: 2 }}>Item Name</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '1rem', py: 2 }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '1rem', py: 2 }}>Order Needed</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '1rem', py: 2 }}>Auto Batch</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '1rem', py: 2 }}>Description</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, fontSize: '1rem', py: 2 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {getSortedItems().map((item) => (
                  <TableRow
                    key={item.id}
                    sx={{
                      '&:hover': {
                        backgroundColor: 'grey.50'
                      },
                      '&:last-child td, &:last-child th': { border: 0 }
                    }}
                  >
                    <TableCell sx={{ py: 2 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {item.name}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 2 }}>
                      <Chip
                        icon={<Category />}
                        label={item.item_type || 'No type'}
                        sx={{
                          backgroundColor: getTypeColor(item.item_type),
                          color: 'white',
                          fontWeight: 500,
                          '& .MuiChip-icon': {
                            color: 'white'
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ py: 2 }}>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontWeight: 500,
                          color: item.order_needed ? 'warning.main' : 'success.main'
                        }}
                      >
                        {item.order_needed ? 'Yes' : 'No'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 2 }}>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontWeight: 500,
                          color: item.auto_batch ? 'info.main' : 'text.secondary'
                        }}
                      >
                        {item.auto_batch ? 'Yes' : 'No'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 2, maxWidth: 300 }}>
                      <Typography variant="body2" color="text.secondary">
                        {item.description || 'No description provided'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center" sx={{ py: 2 }}>
                      <IconButton
                        onClick={() => handleEditItem(item)}
                        sx={{
                          color: 'primary.main',
                          mr: 1,
                          '&:hover': {
                            backgroundColor: 'primary.50'
                          }
                        }}
                      >
                        <Edit />
                      </IconButton>
                      <IconButton
                        onClick={() => handleDeleteItem(item)}
                        sx={{
                          color: 'error.main',
                          '&:hover': {
                            backgroundColor: 'error.50'
                          }
                        }}
                      >
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      {/* Floating Action Button for Mobile */}
      <Fab
        color="primary"
        aria-label="add"
        onClick={handleAddItem}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          display: { xs: 'flex', sm: 'none' },
          background: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
          '&:hover': {
            background: 'linear-gradient(45deg, #FE6B8B 60%, #FF8E53 100%)',
          }
        }}
      >
        <Add />
      </Fab>

      {/* Add/Edit Item Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={() => setOpenDialog(false)}
        maxWidth="sm"
        fullWidth
        disablePortal={false}
        hideBackdrop={false}
        disableEnforceFocus={false}
        disableAutoFocus={false}
        disableRestoreFocus={false}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {editingItem ? 'Edit Item' : 'Add New Item'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {editingItem ? 'Update item information' : 'Fill in the details for your new item'}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            autoFocus
            margin="dense"
            label="Item Name"
            fullWidth
            variant="outlined"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            sx={{ mb: 3 }}
            required
          />
          <FormControl fullWidth variant="outlined" sx={{ mb: 3 }} required>
            <InputLabel id="item-type-label">Item Type</InputLabel>
            <Select
              labelId="item-type-label"
              value={itemType}
              onChange={(e) => setItemType(e.target.value)}
              label="Item Type"
            >
              {itemTypes.map((type) => (
                <MenuItem key={type.name} value={type.name}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        backgroundColor: type.color,
                        mr: 2
                      }}
                    />
                    {type.name}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControlLabel
            control={
              <Switch
                checked={orderNeeded}
                onChange={(e) => setOrderNeeded(e.target.checked)}
                color="primary"
              />
            }
            label="Order Needed"
            sx={{ mb: 3, display: 'flex', justifyContent: 'space-between' }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={autoBatch}
                onChange={(e) => setAutoBatch(e.target.checked)}
                color="primary"
              />
            }
            label="Auto Batch"
            sx={{ mb: 3, display: 'flex', justifyContent: 'space-between' }}
          />
          <TextField
            margin="dense"
            label="Description (Optional)"
            fullWidth
            variant="outlined"
            multiline
            rows={4}
            value={itemDescription}
            onChange={(e) => setItemDescription(e.target.value)}
            placeholder="Add a detailed description of your item..."
          />
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button 
            onClick={() => setOpenDialog(false)}
            sx={{ borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSaveItem} 
            variant="contained" 
            disabled={!itemName.trim() || !itemType.trim()}
            sx={{ 
              borderRadius: 2,
              px: 3,
              background: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
              '&:hover': {
                background: 'linear-gradient(45deg, #FE6B8B 60%, #FF8E53 100%)',
              }
            }}
          >
            {editingItem ? 'Update Item' : 'Add Item'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default ItemListPage;