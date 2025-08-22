import React, { useState, useEffect } from 'react';
import { Typography, Box, Paper, useTheme } from '@mui/material';
import { AccessTime, CalendarToday } from '@mui/icons-material';

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

  return (
    <Box>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography 
          variant="h3" 
          component="h1" 
          gutterBottom
          sx={{
            background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: 700,
            mb: 2
          }}
        >
          Welcome to Rich Office Console
        </Typography>
        <Typography 
          variant="h6" 
          color="text.secondary" 
          sx={{ 
            maxWidth: '600px', 
            mx: 'auto',
            fontSize: '1.125rem',
            lineHeight: 1.6
          }}
        >
          Developed by Elvis Leung for Rich Windows and Doors Office use only.
        </Typography>
      </Box>
      
      <Paper 
        sx={{ 
          mt: 4, 
          p: 4, 
          textAlign: 'center',
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          border: `1px solid ${theme.palette.divider}`,
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, #2563eb 0%, #7c3aed 100%)',
          }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
          <CalendarToday sx={{ mr: 1, color: theme.palette.primary.main }} />
          <Typography 
            variant="h4" 
            sx={{
              color: theme.palette.text.primary,
              fontWeight: 600,
              fontSize: '1.5rem'
            }}
          >
            {formatDate(currentDateTime)}
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <AccessTime sx={{ mr: 1, color: theme.palette.secondary.main }} />
          <Typography 
            variant="h2" 
            sx={{
              color: theme.palette.text.primary,
              fontWeight: 700,
              fontSize: '2.5rem',
              fontFamily: 'monospace'
            }}
          >
            {formatTime(currentDateTime)}
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}

export default HomePage;