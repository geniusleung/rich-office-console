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
  FormControlLabel,
  Switch,
  Paper
} from '@mui/material';
import {
  Add,
  Delete,
  Edit,
  Window as GlassIcon,
  ArrowBack
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';

function GlassOptionsPage() {
  const navigate = useNavigate();
  const [glassOptions, setGlassOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingOption, setEditingOption] = useState(null);
  const [glassType, setGlassType] = useState('');
  const [orderNeeded, setOrderNeeded] = useState(false);
  const [description, setDescription] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Sort glass options by created_at
  const getSortedGlassOptions = () => {
    const sortedOptions = [...glassOptions];
    return sortedOptions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  };

  // Fetch glass options from Supabase
  const fetchGlassOptions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('glass_options')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setGlassOptions(data || []);
    } catch (error) {
      setError('Error fetching glass options: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGlassOptions();
  }, []);

  const handleAddOption = () => {
    setEditingOption(null);
    setGlassType('');
    setOrderNeeded(false);
    setDescription('');
    setOpenDialog(true);
  };

  const handleEditOption = (option) => {
    setEditingOption(option);
    setGlassType(option.glass_type);
    setOrderNeeded(option.order_needed);
    setDescription(option.description || '');
    setOpenDialog(true);
  };

  const handleSaveOption = async () => {
    if (!glassType.trim()) return;

    try {
      setError(null);
      
      if (editingOption) {
        // Update existing option
        const { error } = await supabase
          .from('glass_options')
          .update({
            glass_type: glassType.trim(),
            order_needed: orderNeeded,
            description: description.trim(),
            updated_at: new Date().toISOString()
          })
          .eq('id', editingOption.id);
        
        if (error) throw error;
        setSuccess('Glass option updated successfully!');
      } else {
        // Add new option
        const { error } = await supabase
          .from('glass_options')
          .insert([
            {
              glass_type: glassType.trim(),
              order_needed: orderNeeded,
              description: description.trim()
            }
          ]);
        
        if (error) throw error;
        setSuccess('Glass option added successfully!');
      }

      setOpenDialog(false);
      setGlassType('');
      setOrderNeeded(false);
      setDescription('');
      setEditingOption(null);
      fetchGlassOptions(); // Refresh the list
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      setError('Error saving glass option: ' + error.message);
    }
  };

  const handleDeleteOption = async (option) => {
    if (!window.confirm(`Are you sure you want to delete "${option.glass_type}"?`)) {
      return;
    }

    try {
      setError(null);
      const { error } = await supabase
        .from('glass_options')
        .delete()
        .eq('id', option.id);
      
      if (error) throw error;
      
      setSuccess('Glass option deleted successfully!');
      fetchGlassOptions(); // Refresh the list
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      setError('Error deleting glass option: ' + error.message);
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton 
          onClick={() => navigate('/settings')} 
          sx={{ mr: 2 }}
        >
          <ArrowBack />
        </IconButton>
        <GlassIcon sx={{ mr: 2, color: 'primary.main', fontSize: 32 }} />
        <Typography variant="h3" component="h1" sx={{ fontWeight: 600 }}>
          Glass Options
        </Typography>
      </Box>
      
      <Typography variant="h6" color="text.secondary" paragraph sx={{ mb: 4 }}>
        Manage glass type options for your items. Add, edit, or remove glass options as needed.
      </Typography>

      {/* Success/Error Messages */}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Controls - Only Add button */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mb: 3 }}>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleAddOption}
          sx={{ borderRadius: 2 }}
        >
          Add Glass Option
        </Button>
      </Box>

      {/* Glass Options Table */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
                <TableCell sx={{ fontWeight: 600 }}>Glass Type</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Order Needed</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {getSortedGlassOptions().map((option) => (
                <TableRow 
                  key={option.id}
                  sx={{
                    '&:nth-of-type(odd)': {
                      backgroundColor: 'rgba(0,0,0,0.01)'
                    },
                    '&:hover': {
                      backgroundColor: 'rgba(25, 118, 210, 0.04)'
                    }
                  }}
                >
                  <TableCell sx={{ fontWeight: 500 }}>
                    {option.glass_type}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {option.order_needed ? (
                        <Typography variant="body2" color="warning.main" sx={{ fontWeight: 500 }}>
                          Yes
                        </Typography>
                      ) : (
                        <Typography variant="body2" color="success.main" sx={{ fontWeight: 500 }}>
                          No
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ maxWidth: 300 }}>
                    {option.description || 'No description'}
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => handleEditOption(option)}
                      sx={{ mr: 1 }}
                    >
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteOption(option)}
                      color="error"
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {glassOptions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body1" color="text.secondary">
                      🪟 No glass options found. Add your first glass option to get started!
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add/Edit Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={() => setOpenDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingOption ? 'Edit Glass Option' : 'Add New Glass Option'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Glass Type"
            fullWidth
            variant="outlined"
            value={glassType}
            onChange={(e) => setGlassType(e.target.value)}
            sx={{ mb: 2 }}
            required
            placeholder="e.g., Tempered, Laminated, Clear, etc."
          />
          <FormControlLabel
            control={
              <Switch
                checked={orderNeeded}
                onChange={(e) => setOrderNeeded(e.target.checked)}
                color="primary"
              />
            }
            label="Special Order Required"
            sx={{ mb: 2, display: 'block' }}
          />
          <TextField
            margin="dense"
            label="Description (Optional)"
            fullWidth
            variant="outlined"
            multiline
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add any additional details about this glass type..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleSaveOption}
            variant="contained"
            disabled={!glassType.trim()}
          >
            {editingOption ? 'Update' : 'Add'} Glass Option
          </Button>
        </DialogActions>
      </Dialog>

      {/* Floating Action Button for mobile */}
      <Fab
        color="primary"
        aria-label="add glass option"
        onClick={handleAddOption}
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

export default GlassOptionsPage;