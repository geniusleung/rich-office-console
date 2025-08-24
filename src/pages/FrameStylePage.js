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
  Paper
} from '@mui/material';
import {
  Add,
  Delete,
  Edit,
  CropFree as FrameIcon,
  ArrowBack
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';

function FrameStylePage() {
  const navigate = useNavigate();
  const [frameStyles, setFrameStyles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingStyle, setEditingStyle] = useState(null);
  const [styleName, setStyleName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Sort frame styles by created_at (newest first)
  const getSortedFrameStyles = () => {
    const sortedStyles = [...frameStyles];
    return sortedStyles.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  };

  // Fetch frame styles from Supabase
  const fetchFrameStyles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('frame_styles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setFrameStyles(data || []);
    } catch (error) {
      setError('Error fetching frame styles: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFrameStyles();
  }, []);

  const handleAddStyle = () => {
    setEditingStyle(null);
    setStyleName('');
    setDescription('');
    setOpenDialog(true);
  };

  const handleEditStyle = (style) => {
    setEditingStyle(style);
    setStyleName(style.style_name);
    setDescription(style.description || '');
    setOpenDialog(true);
  };

  const handleSaveStyle = async () => {
    if (!styleName.trim()) return;

    try {
      setError(null);
      
      if (editingStyle) {
        // Update existing style
        const { error } = await supabase
          .from('frame_styles')
          .update({
            style_name: styleName.trim(),
            description: description.trim(),
            updated_at: new Date().toISOString()
          })
          .eq('id', editingStyle.id);
        
        if (error) throw error;
        setSuccess('Frame style updated successfully!');
      } else {
        // Add new style
        const { error } = await supabase
          .from('frame_styles')
          .insert([
            {
              style_name: styleName.trim(),
              description: description.trim()
            }
          ]);
        
        if (error) throw error;
        setSuccess('Frame style added successfully!');
      }

      setOpenDialog(false);
      setStyleName('');
      setDescription('');
      setEditingStyle(null);
      fetchFrameStyles(); // Refresh the list
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      setError('Error saving frame style: ' + error.message);
    }
  };

  const handleDeleteStyle = async (style) => {
    if (!window.confirm(`Are you sure you want to delete "${style.style_name}"?`)) {
      return;
    }

    try {
      setError(null);
      const { error } = await supabase
        .from('frame_styles')
        .delete()
        .eq('id', style.id);
      
      if (error) throw error;
      
      setSuccess('Frame style deleted successfully!');
      fetchFrameStyles(); // Refresh the list
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      setError('Error deleting frame style: ' + error.message);
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
        <FrameIcon sx={{ mr: 2, color: 'primary.main', fontSize: 32 }} />
        <Typography variant="h3" component="h1" sx={{ fontWeight: 600 }}>
          Frame Styles
        </Typography>
      </Box>
      
      <Typography variant="h6" color="text.secondary" paragraph sx={{ mb: 4 }}>
        Manage frame style options for your items. Add, edit, or remove frame styles as needed.
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
          onClick={handleAddStyle}
          sx={{ borderRadius: 2 }}
        >
          Add Frame Style
        </Button>
      </Box>

      {/* Frame Styles Table */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
                <TableCell sx={{ fontWeight: 600 }}>Style Name</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {getSortedFrameStyles().map((style) => (
                <TableRow 
                  key={style.id}
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
                    {style.style_name}
                  </TableCell>
                  <TableCell sx={{ maxWidth: 300 }}>
                    {style.description || 'No description'}
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => handleEditStyle(style)}
                      sx={{ mr: 1 }}
                    >
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteStyle(style)}
                      color="error"
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {frameStyles.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body1" color="text.secondary">
                      🖼️ No frame styles found. Add your first frame style to get started!
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
          {editingStyle ? 'Edit Frame Style' : 'Add New Frame Style'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Style Name"
            fullWidth
            variant="outlined"
            value={styleName}
            onChange={(e) => setStyleName(e.target.value)}
            sx={{ mb: 2 }}
            required
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
            placeholder="Add any additional details about this frame style..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleSaveStyle}
            variant="contained"
            disabled={!styleName.trim()}
          >
            {editingStyle ? 'Update' : 'Add'} Frame Style
          </Button>
        </DialogActions>
      </Dialog>

      {/* Floating Action Button for mobile */}
      <Fab
        color="primary"
        aria-label="add frame style"
        onClick={handleAddStyle}
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

export default FrameStylePage;