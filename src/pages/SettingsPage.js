import React from 'react';
import {
  Typography,
  Box,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import {
  List as ListIcon,
  Palette as PaletteIcon,
  CropFree as CropFreeIcon,
  Window as GlassIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

function SettingsPage() {
  const navigate = useNavigate();

  const handleItemListClick = () => {
    navigate('/item-list');
  };

  const handleItemColorClick = () => {
    navigate('/item-colors');
  };

  const handleFrameStyleClick = () => {
    navigate('/frame-styles');
  };

  const handleGlassOptionsClick = () => {
    navigate('/glass-options');
  };

  return (
    <Box>
      <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
        Settings
      </Typography>
      <Typography variant="h6" color="text.secondary" paragraph sx={{ mb: 4 }}>
        Manage your application settings and access features.
      </Typography>

      <Grid container spacing={3}>
        {/* Item List Card - Clickable */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card 
            onClick={handleItemListClick}
            sx={{ 
              cursor: 'pointer',
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: 4
              }
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <ListIcon sx={{ mr: 1, color: 'primary.main', fontSize: 28 }} />
                <Typography variant="h6">Item List</Typography>
              </Box>
              
              <Typography variant="body2" color="text.secondary">
                Manage your items, add new ones, and organize your inventory.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Item Color Card - Clickable */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card 
            onClick={handleItemColorClick}
            sx={{ 
              cursor: 'pointer',
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: 4
              }
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <PaletteIcon sx={{ mr: 1, color: 'secondary.main', fontSize: 28 }} />
                <Typography variant="h6">Item Colors</Typography>
              </Box>
              
              <Typography variant="body2" color="text.secondary">
                Manage color options for your items, including color names and bases.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Frame Style Card - Clickable */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card 
            onClick={handleFrameStyleClick}
            sx={{ 
              cursor: 'pointer',
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: 4
              }
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <CropFreeIcon sx={{ mr: 1, color: 'success.main', fontSize: 28 }} />
                <Typography variant="h6">Frame Styles</Typography>
              </Box>
              
              <Typography variant="body2" color="text.secondary">
                Manage frame style options for your items, including style names and descriptions.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Glass Options Card - Clickable */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card 
            onClick={handleGlassOptionsClick}
            sx={{ 
              cursor: 'pointer',
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: 4
              }
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <GlassIcon sx={{ mr: 1, color: 'info.main', fontSize: 28 }} />
                <Typography variant="h6">Glass Options</Typography>
              </Box>
              
              <Typography variant="body2" color="text.secondary">
                Manage glass type options for your items, including special order requirements.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default SettingsPage;