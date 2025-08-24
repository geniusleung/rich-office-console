import React from 'react';
import {
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Avatar,
  Chip,
  useTheme
} from '@mui/material';
import {
  LocalShipping as DeliveryIcon,
  Schedule,
  Route,
  Inventory
} from '@mui/icons-material';

function DeliveryCalendarPage() {
  const theme = useTheme();

  const features = [
    {
      title: 'Delivery Scheduling',
      description: 'Plan and organize delivery schedules',
      icon: <Schedule />,
      color: theme.palette.primary.main,
      bgColor: 'rgba(30, 64, 175, 0.1)'
    },
    {
      title: 'Route Optimization',
      description: 'Optimize delivery routes and logistics',
      icon: <Route />,
      color: theme.palette.secondary.main,
      bgColor: 'rgba(5, 150, 105, 0.1)'
    },
    {
      title: 'Inventory Tracking',
      description: 'Track shipments and inventory status',
      icon: <Inventory />,
      color: theme.palette.warning.main,
      bgColor: 'rgba(217, 119, 6, 0.1)'
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
            <DeliveryIcon />
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
              Delivery Calendar
            </Typography>
            <Chip 
              label="Coming Soon"
              size="small"
              sx={{
                bgcolor: 'rgba(217, 119, 6, 0.1)',
                color: theme.palette.warning.main,
                fontWeight: 600
              }}
            />
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
          Manage and track delivery schedules, logistics, and route optimization for efficient distribution management.
        </Typography>
      </Box>

      {/* Features Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {features.map((feature, index) => (
          <Grid item xs={12} md={4} key={index}>
            <Card 
              sx={{ 
                height: '100%',
                transition: 'all 0.3s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: theme.shadows[8]
                }
              }}
            >
              <CardContent sx={{ p: 3, textAlign: 'center' }}>
                <Avatar 
                  sx={{ 
                    bgcolor: feature.bgColor,
                    color: feature.color,
                    width: 64,
                    height: 64,
                    mx: 'auto',
                    mb: 2
                  }}
                >
                  {feature.icon}
                </Avatar>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    fontWeight: 600,
                    color: theme.palette.text.primary,
                    mb: 1
                  }}
                >
                  {feature.title}
                </Typography>
                <Typography 
                  variant="body2" 
                  color="text.secondary"
                  sx={{ lineHeight: 1.6 }}
                >
                  {feature.description}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Main Content Card */}
      <Card>
        <CardContent sx={{ p: 4, textAlign: 'center' }}>
          <Avatar 
            sx={{ 
              bgcolor: 'rgba(30, 64, 175, 0.1)',
              color: theme.palette.primary.main,
              width: 80,
              height: 80,
              mx: 'auto',
              mb: 3
            }}
          >
            <DeliveryIcon sx={{ fontSize: 40 }} />
          </Avatar>
          
          <Typography 
            variant="h4" 
            sx={{ 
              fontWeight: 700,
              color: theme.palette.text.primary,
              mb: 2
            }}
          >
            Delivery Calendar
          </Typography>
          
          <Typography 
            variant="h6" 
            color="text.secondary" 
            sx={{ 
              mb: 3,
              maxWidth: '500px',
              mx: 'auto',
              lineHeight: 1.6
            }}
          >
            Advanced delivery scheduling and logistics management features are currently under development.
          </Typography>
          
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Chip 
              label="Delivery Scheduling"
              variant="outlined"
              sx={{ borderColor: theme.palette.primary.main, color: theme.palette.primary.main }}
            />
            <Chip 
              label="Route Optimization"
              variant="outlined"
              sx={{ borderColor: theme.palette.secondary.main, color: theme.palette.secondary.main }}
            />
            <Chip 
              label="Inventory Tracking"
              variant="outlined"
              sx={{ borderColor: theme.palette.warning.main, color: theme.palette.warning.main }}
            />
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

export default DeliveryCalendarPage;