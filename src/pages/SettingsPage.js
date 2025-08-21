import React from 'react';
import {
  Typography,
  Box,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import {
  List as ListIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

function SettingsPage() {
  const navigate = useNavigate();

  const handleItemListClick = () => {
    navigate('/item-list');
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
        <Grid item xs={12} md={6}>
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
        
        {/* Future Settings Cards can be added here */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                More Settings
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Additional settings and features will be available here in future updates.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default SettingsPage;