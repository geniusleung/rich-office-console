import React from 'react';
import {
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Avatar,
  useTheme
} from '@mui/material';
import {
  List as ListIcon,
  Palette as PaletteIcon,
  CropFree as CropFreeIcon,
  Window as GlassIcon,
  LocalShipping as DeliveryIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

function SettingsPage() {
  const navigate = useNavigate();
  const theme = useTheme();

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

  const handleDeliveryMethodsClick = () => {
    navigate('/delivery-methods');
  };

  const settingsItems = [
    {
      title: 'Item List',
      description: 'Manage your items, add new ones, and organize your inventory.',
      icon: <ListIcon />,
      color: theme.palette.primary.main,
      bgColor: 'rgba(30, 64, 175, 0.1)',
      onClick: handleItemListClick
    },
    {
      title: 'Item Colors',
      description: 'Manage color options for your items, including color names and bases.',
      icon: <PaletteIcon />,
      color: theme.palette.secondary.main,
      bgColor: 'rgba(5, 150, 105, 0.1)',
      onClick: handleItemColorClick
    },
    {
      title: 'Frame Styles',
      description: 'Manage frame style options for your items, including style names and descriptions.',
      icon: <CropFreeIcon />,
      color: theme.palette.success.main,
      bgColor: 'rgba(34, 197, 94, 0.1)',
      onClick: handleFrameStyleClick
    },
    {
      title: 'Glass Options',
      description: 'Manage glass type options for your items, including special order requirements.',
      icon: <GlassIcon />,
      color: theme.palette.info.main,
      bgColor: 'rgba(59, 130, 246, 0.1)',
      onClick: handleGlassOptionsClick
    },
    {
      title: 'Delivery Methods',
      description: 'Manage delivery methods for your orders, including method names and descriptions.',
      icon: <DeliveryIcon />,
      color: theme.palette.warning.main,
      bgColor: 'rgba(255, 152, 0, 0.1)',
      onClick: handleDeliveryMethodsClick
    }
  ];

  return (
    <Box sx={{ maxWidth: '1200px', mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Avatar 
            sx={{ 
              bgcolor: 'rgba(30, 64, 175, 0.1)',
              color: theme.palette.primary.main,
              mr: 2,
              width: 48,
              height: 48
            }}
          >
            <SettingsIcon />
          </Avatar>
          <Box>
            <Typography 
              variant="h3" 
              component="h1" 
              sx={{ 
                fontWeight: 800,
                color: theme.palette.text.primary,
                mb: 0.5,
                fontSize: { xs: '1.75rem', sm: '2.25rem', md: '2.5rem' }
              }}
            >
              Settings
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
          Manage your application settings and access configuration features for items, colors, frames, glass options, and delivery methods.
        </Typography>
      </Box>

      <Box sx={{ width: '100%' }}>
        <Grid container spacing={3}>
          {settingsItems.map((item, index) => (
            <Grid item xs={12} sm={6} key={index}>
              <Card 
                onClick={item.onClick}
                sx={{ 
                  cursor: 'pointer',
                  width: '280px',
                  height: '120px',
                  transition: 'all 0.3s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: theme.shadows[8]
                  }
                }}
              >
                <CardContent 
                  sx={{ 
                    p: 3, 
                    display: 'flex', 
                    alignItems: 'center',
                    height: '100%'
                  }}
                >
                  <Avatar 
                    sx={{ 
                      bgcolor: item.bgColor,
                      color: item.color,
                      mr: 2,
                      width: 48,
                      height: 48
                    }}
                  >
                    {item.icon}
                  </Avatar>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      fontWeight: 600,
                      color: theme.palette.text.primary
                    }}
                  >
                    {item.title}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
        ))}
        </Grid>
      </Box>
    </Box>
  );
}

export default SettingsPage;