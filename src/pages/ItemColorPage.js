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
  Paper
} from '@mui/material';
import {
  Add,
  Delete,
  Edit,
  Palette as PaletteIcon,
  ArrowBack
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';

function ItemColorPage() {
  const navigate = useNavigate();
  const [colors, setColors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingColor, setEditingColor] = useState(null);
  const [colorName, setColorName] = useState('');
  const [colorBase, setColorBase] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Predefined color bases with hex values for visual representation
  const colorBases = [
    { name: 'White', hex: '#FFFFFF' },
    { name: 'Other', hex: '#9C27B0' }
  ];

  const getColorHex = (baseName) => {
    const base = colorBases.find(b => b.name === baseName);
    return base ? base.hex : '#9C27B0';
  };

  // Simplify getSortedColors to only sort by created_at
  const getSortedColors = () => {
    const sortedColors = [...colors];
    return sortedColors.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  };

  // Fetch colors from Supabase
  const fetchColors = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('item_colors')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setColors(data || []);
    } catch (error) {
      setError('Error fetching colors: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchColors();
  }, []);

  const handleAddColor = () => {
    setEditingColor(null);
    setColorName('');
    setColorBase('');
    setDescription('');
    setOpenDialog(true);
  };

  const handleEditColor = (color) => {
    setEditingColor(color);
    setColorName(color.color_name);
    setColorBase(color.color_base || '');
    setDescription(color.description || '');
    setOpenDialog(true);
  };

  const handleSaveColor = async () => {
    if (!colorName.trim() || !colorBase.trim()) return;

    try {
      setError(null);
      
      if (editingColor) {
        // Update existing color
        const { error } = await supabase
          .from('item_colors')
          .update({
            color_name: colorName.trim(),
            color_base: colorBase.trim(),
            description: description.trim(),
            updated_at: new Date().toISOString()
          })
          .eq('id', editingColor.id);
        
        if (error) throw error;
        setSuccess('Color updated successfully!');
      } else {
        // Add new color
        const { error } = await supabase
          .from('item_colors')
          .insert([
            {
              color_name: colorName.trim(),
              color_base: colorBase.trim(),
              description: description.trim()
            }
          ]);
        
        if (error) throw error;
        setSuccess('Color added successfully!');
      }

      setOpenDialog(false);
      setColorName('');
      setColorBase('');
      setDescription('');
      setEditingColor(null);
      fetchColors(); // Refresh the list
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      setError('Error saving color: ' + error.message);
    }
  };

  const handleDeleteColor = async (color) => {
    if (!window.confirm(`Are you sure you want to delete "${color.color_name}"?`)) {
      return;
    }

    try {
      setError(null);
      const { error } = await supabase
        .from('item_colors')
        .delete()
        .eq('id', color.id);
      
      if (error) throw error;
      
      setSuccess('Color deleted successfully!');
      fetchColors(); // Refresh the list
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      setError('Error deleting color: ' + error.message);
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
        <PaletteIcon sx={{ mr: 2, color: 'primary.main', fontSize: 32 }} />
        <Typography variant="h3" component="h1" sx={{ fontWeight: 600 }}>
          Item Colors
        </Typography>
      </Box>
      
      <Typography variant="h6" color="text.secondary" paragraph sx={{ mb: 4 }}>
        Manage color options for your items. Add, edit, or remove colors as needed.
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

      {/* Controls - Remove sort dropdown, keep only Add button */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mb: 3 }}>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleAddColor}
          sx={{ borderRadius: 2 }}
        >
          Add Color
        </Button>
      </Box>

      {/* Colors Table - Remove Color column */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
                <TableCell sx={{ fontWeight: 600 }}>Color Name</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Color Base</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {getSortedColors().map((color) => (
                <TableRow 
                  key={color.id}
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
                    {color.color_name}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={color.color_base}
                      size="small"
                      sx={{
                        backgroundColor: getColorHex(color.color_base),
                        color: ['White', 'Beige', 'Clear'].includes(color.color_base) ? 'black' : 'white',
                        fontWeight: 500
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ maxWidth: 200 }}>
                    {color.description || 'No description'}
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => handleEditColor(color)}
                      sx={{ mr: 1 }}
                    >
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteColor(color)}
                      color="error"
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {colors.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body1" color="text.secondary">
                      🎨 No colors found. Add your first color to get started!
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
          {editingColor ? 'Edit Color' : 'Add New Color'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Color Name"
            fullWidth
            variant="outlined"
            value={colorName}
            onChange={(e) => setColorName(e.target.value)}
            sx={{ mb: 2 }}
            required
          />
          <FormControl fullWidth variant="outlined" sx={{ mb: 2 }} required>
            <InputLabel>Color Base</InputLabel>
            <Select
              value={colorBase}
              onChange={(e) => setColorBase(e.target.value)}
              label="Color Base"
            >
              {colorBases.map((base) => (
                <MenuItem key={base.name} value={base.name}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar
                      sx={{
                        width: 20,
                        height: 20,
                        backgroundColor: base.hex,
                        border: '1px solid rgba(0,0,0,0.2)',
                        mr: 1
                      }}
                    >
                      {base.name === 'Clear' ? '◯' : ''}
                    </Avatar>
                    {base.name}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            margin="dense"
            label="Description (Optional)"
            fullWidth
            variant="outlined"
            multiline
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add any additional details about this color..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleSaveColor}
            variant="contained"
            disabled={!colorName.trim() || !colorBase.trim()}
          >
            {editingColor ? 'Update' : 'Add'} Color
          </Button>
        </DialogActions>
      </Dialog>

      {/* Floating Action Button for mobile */}
      <Fab
        color="primary"
        aria-label="add color"
        onClick={handleAddColor}
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

export default ItemColorPage;