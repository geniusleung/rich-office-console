import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Box, 
  Grid, 
  Card, 
  CardContent, 
  useTheme,
  Chip,
  Avatar,
  Divider
} from '@mui/material';
import { 
  AccessTime, 
  CalendarToday, 
  TrendingUp, 
  Assignment, 
  Receipt,
  LocalShipping,
  Dashboard,
  CheckCircle
} from '@mui/icons-material';

function HomePage() {
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const theme = useTheme();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const quickStats = [
    {
      title: 'Total Invoices',
      value: '--',
      change: '--',
      icon: <Receipt />,
      color: theme.palette.primary.main,
      bgColor: 'rgba(30, 64, 175, 0.1)'
    },
    {
      title: 'Processed Today',
      value: '--',
      change: '--',
      icon: <Assignment />,
      color: theme.palette.success.main,
      bgColor: 'rgba(5, 150, 105, 0.1)'
    },
    {
      title: 'Pending Deliveries',
      value: '--',
      change: '--',
      icon: <LocalShipping />,
      color: theme.palette.warning.main,
      bgColor: 'rgba(217, 119, 6, 0.1)'
    },
    {
      title: 'System Status',
      value: '--',
      change: '--',
      icon: <CheckCircle />,
      color: theme.palette.success.main,
      bgColor: 'rgba(5, 150, 105, 0.1)'
    }
  ];

  return (
    <Box sx={{ maxWidth: '1200px', mx: 'auto' }}>
      {/* Header Section */}
      <Box sx={{ mb: 4 }}>
        <Typography 
          variant="h3" 
          component="h1" 
          sx={{
            fontWeight: 800,
            color: theme.palette.text.primary,
            mb: 1,
            fontSize: { xs: '1.75rem', sm: '2.25rem', md: '2.5rem' }
          }}
        >
          Welcome to Rich Office Console
        </Typography>
        <Typography 
          variant="body1" 
          color="text.secondary" 
          sx={{ 
            fontSize: '1rem',
            lineHeight: 1.6,
            mb: 2
          }}
        >
          Developed by Elvis Leung for Rich Windows and Doors Office use only.
        </Typography>
        <Chip 
          icon={<Dashboard />}
          label="Dashboard Overview"
          variant="outlined"
          sx={{ 
            borderColor: theme.palette.primary.main,
            color: theme.palette.primary.main
          }}
        />
      </Box>

      {/* Date and Time Card */}
      <Card 
        sx={{ 
          mb: 4,
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
          color: 'white',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <CardContent sx={{ p: 4, position: 'relative', zIndex: 1 }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar 
                  sx={{ 
                    bgcolor: 'rgba(255, 255, 255, 0.2)', 
                    mr: 2,
                    width: 48,
                    height: 48
                  }}
                >
                  <CalendarToday />
                </Avatar>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                    Today's Date
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {formatDate(currentDateTime)}
                  </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
                <Avatar 
                  sx={{ 
                    bgcolor: 'rgba(255, 255, 255, 0.2)', 
                    mr: 2,
                    width: 48,
                    height: 48
                  }}
                >
                  <AccessTime />
                </Avatar>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                    Current Time
                  </Typography>
                  <Typography 
                    variant="h4" 
                    sx={{ 
                      fontWeight: 700,
                      fontFamily: 'monospace',
                      letterSpacing: '0.05em'
                    }}
                  >
                    {formatTime(currentDateTime)}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Quick Stats Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {quickStats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
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
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                  <Avatar 
                    sx={{ 
                      bgcolor: stat.bgColor,
                      color: stat.color,
                      width: 48,
                      height: 48
                    }}
                  >
                    {stat.icon}
                  </Avatar>
                  <Chip 
                    label={stat.change}
                    size="small"
                    sx={{
                      bgcolor: stat.change.startsWith('+') ? 'rgba(5, 150, 105, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      color: stat.change.startsWith('+') ? theme.palette.success.main : theme.palette.error.main,
                      fontWeight: 600
                    }}
                  />
                </Box>
                <Typography 
                  variant="h4" 
                  sx={{ 
                    fontWeight: 700,
                    color: theme.palette.text.primary,
                    mb: 1
                  }}
                >
                  {stat.value}
                </Typography>
                <Typography 
                  variant="body2" 
                  color="text.secondary"
                  sx={{ fontWeight: 500 }}
                >
                  {stat.title}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

    </Box>
  );
}

export default HomePage;