import React from 'react';
import { Typography, Box } from '@mui/material';

function AboutPage() {
  return (
    <Box>
      <Typography variant="h3" component="h1" gutterBottom>
        About Us
      </Typography>
      <Typography variant="h6" color="text.secondary" paragraph>
        Learn more about Rich Office Console and our mission.
      </Typography>
      <Typography variant="body1">
        This page is ready for your company information and story.
      </Typography>
    </Box>
  );
}

export default AboutPage;