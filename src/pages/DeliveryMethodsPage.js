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
  Avatar,
  Card,
  CardContent
} from '@mui/material';
import {
  Add,
  Delete,
  Edit,
  LocalShipping as DeliveryIcon,
  ArrowBack
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';

function DeliveryMethodsPage() {
  const navigate = useNavigate();
  const [deliveryMethods, setDeliveryMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingMethod, setEditingMethod] = useState(null);
  const [methodName, setMethodName] = useState('');
  const [methodDescription, setMethodDescription] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Fetch delivery methods from Supabase
  const fetchDeliveryMethods = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('delivery_methods')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setDeliveryMethods(data || []);
    } catch (error) {
      console.error('Error fetching delivery methods:', error);
      setError('Failed to load delivery methods');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveryMethods();
  }, []);

  const handleOpenDialog = (method = null) => {
    setEditingMethod(method);
    setMethodName(method ? method.name : '');
    setMethodDescription(method ? method.description : '');
    setOpenDialog(true);
    setError(null);
    setSuccess(null);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingMethod(null);
    setMethodName('');
    setMethodDescription('');
    setError(null);
  };

  const handleSave = async () => {
    if (!methodName.trim()) {
      setError('Method name is required');
      return;
    }

    try {
      if (editingMethod) {
        // Update existing method
        const { error } = await supabase
          .from('delivery_methods')
          .update({
            name: methodName.trim(),
            description: methodDescription.trim(),
            updated_at: new Date().toISOString()
          })
          .eq('id', editingMethod.id);
        
        if (error) throw error;
        setSuccess('Delivery method updated successfully');
      } else {
        // Create new method
        const { error } = await supabase
          .from('delivery_methods')
          .insert({
            name: methodName.trim(),
            description: methodDescription.trim()
          });
        
        if (error) throw error;
        setSuccess('Delivery method created successfully');
      }
      
      handleCloseDialog();
      fetchDeliveryMethods();
    } catch (error) {
      console.error('Error saving delivery method:', error);
      setError('Failed to save delivery method');
    }
  };

  const handleDelete = async (methodId) => {
    if (!window.confirm('Are you sure you want to delete this delivery method?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('delivery_methods')
        .delete()
        .eq('id', methodId);
      
      if (error) throw error;
      setSuccess('Delivery method deleted successfully');
      fetchDeliveryMethods();
    } catch (error) {
      console.error('Error deleting delivery method:', error);
      setError('Failed to delete delivery method');
    }
  };

  const handleBack = () => {
    navigate('/settings');
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: '1200px', mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <IconButton onClick={handleBack} sx={{ mr: 1 }}>
            <ArrowBack />
          </IconButton>
          <Avatar 
            sx={{ 
              bgcolor: 'rgba(255, 152, 0, 0.1)',
              color: '#ff9800',
              mr: 2,
              width: 48,
              height: 48
            }}
          >
            <DeliveryIcon />
          </Avatar>
          <Box>
            <Typography 
              variant="h3" 
              component="h1" 
              sx={{ 
                fontWeight: 800,
                color: 'text.primary',
                mb: 0.5,
                fontSize: { xs: '1.75rem', sm: '2.25rem', md: '2.5rem' }
              }}
            >
              Delivery Methods
            </Typography>
          </Box>
        </Box>
        
        <Typography 
          variant="body1" 
          color="text.secondary" 
          sx={{ 
            fontSize: '1rem',
            lineHeight: 1.6,
            maxWidth: '600px'
          }}
        >
          Manage delivery methods for your orders. Add, edit, or remove delivery options with descriptions.
        </Typography>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Content */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Delivery Methods ({deliveryMethods.length})
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => handleOpenDialog()}
              sx={{ borderRadius: 2 }}
            >
              Add Method
            </Button>
          </Box>

          {deliveryMethods.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <DeliveryIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No delivery methods found
              </Typography>
              <Typography variant="body2" color="text.disabled" sx={{ mb: 3 }}>
                Start by adding your first delivery method
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => handleOpenDialog()}
              >
                Add First Method
              </Button>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Method Name</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
                    <TableCell sx={{ fontWeight: 600, width: 120 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {deliveryMethods.map((method) => (
                    <TableRow key={method.id} hover>
                      <TableCell>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {method.name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {method.description || 'No description'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <IconButton
                            size="small"
                            onClick={() => handleOpenDialog(method)}
                            sx={{ color: 'primary.main' }}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDelete(method.id)}
                            sx={{ color: 'error.main' }}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingMethod ? 'Edit Delivery Method' : 'Add New Delivery Method'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              autoFocus
              label="Method Name"
              fullWidth
              variant="outlined"
              value={methodName}
              onChange={(e) => setMethodName(e.target.value)}
              sx={{ mb: 2 }}
              placeholder="e.g., Standard Delivery, Express Shipping"
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={3}
              variant="outlined"
              value={methodDescription}
              onChange={(e) => setMethodDescription(e.target.value)}
              placeholder="Describe this delivery method..."
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={handleCloseDialog} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleSave} variant="contained">
            {editingMethod ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Floating Action Button for mobile */}
      <Fab
        color="primary"
        aria-label="add"
        onClick={() => handleOpenDialog()}
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          display: { xs: 'flex', sm: 'none' }
        }}
      >
        <Add />
      </Fab>
    </Box>
  );
}

export default DeliveryMethodsPage;