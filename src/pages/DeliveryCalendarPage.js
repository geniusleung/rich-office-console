import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Paper,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  ChevronLeft,
  ChevronRight
} from '@mui/icons-material';

function DeliveryCalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());

  // Days of the week starting from Sunday
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // Month names
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Generate years for dropdown (current year ± 10 years)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 21 }, (_, i) => currentYear - 10 + i);

  // Get calendar data for the selected month
  const getCalendarData = () => {
    const firstDay = new Date(selectedYear, selectedMonth, 1);
    const lastDay = new Date(selectedYear, selectedMonth + 1, 0);
    const startDate = new Date(firstDay);
    
    // Adjust to start from Sunday
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const calendar = [];
    const current = new Date(startDate);
    
    // Generate 6 weeks (42 days) to ensure full calendar view
    for (let week = 0; week < 6; week++) {
      const weekDays = [];
      for (let day = 0; day < 7; day++) {
        weekDays.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
      calendar.push(weekDays);
    }
    
    return calendar;
  };

  const handlePreviousMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const handleYearChange = (event) => {
    setSelectedYear(event.target.value);
  };

  const handleMonthChange = (event) => {
    setSelectedMonth(event.target.value);
  };

  const isCurrentMonth = (date) => {
    return date.getMonth() === selectedMonth;
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const calendarData = getCalendarData();

  return (
    <Container maxWidth="xl" sx={{ mt: 1, mb: 1, height: 'calc(100vh - 10px)' }}>
      <Box sx={{ mb: 1 }}>
        <Typography variant="h4" component="h1">
          Delivery Calendar
        </Typography>
      </Box>
      
      {/* Calendar Navigation */}
      <Paper sx={{ p: 2, height: 'calc(100% - 5px)', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexShrink: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton onClick={handlePreviousMonth}>
              <ChevronLeft />
            </IconButton>
            
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Month</InputLabel>
              <Select
                value={selectedMonth}
                label="Month"
                onChange={handleMonthChange}
              >
                {monthNames.map((month, index) => (
                  <MenuItem key={index} value={index}>
                    {month}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel>Year</InputLabel>
              <Select
                value={selectedYear}
                label="Year"
                onChange={handleYearChange}
              >
                {Array.from({ length: 21 }, (_, i) => currentYear - 10 + i).map((year) => (
                  <MenuItem key={year} value={year}>
                    {year}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <IconButton onClick={handleNextMonth}>
              <ChevronRight />
            </IconButton>
          </Box>
          
          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
            {monthNames[selectedMonth]} {selectedYear}
          </Typography>
        </Box>
        
        {/* Calendar Grid */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {/* Days of Week Header */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, mb: 1, flexShrink: 0 }}>
            {daysOfWeek.map((day) => (
              <Box
                key={day}
                sx={{
                  p: 1,
                  textAlign: 'center',
                  fontWeight: 'bold',
                  backgroundColor: 'primary.main',
                  color: 'primary.contrastText',
                  borderRadius: 1,
                  height: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {day}
              </Box>
            ))}
          </Box>
          
          {/* Calendar Days */}
          <Box sx={{ 
            flex: 1, 
            display: 'grid', 
            gridTemplateRows: 'repeat(6, 6fr)', 
            gap: 1,
            minHeight: 0
          }}>
            {calendarData.map((week, weekIndex) => (
              <Box 
                key={weekIndex} 
                sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(7, 1fr)', 
                  gap: 1,
                  height: '100%'
                }}
              >
                {week.map((date, dayIndex) => (
                  <Box
                    key={dayIndex}
                    sx={{
                      p: 1,
                      textAlign: 'left',
                      border: isToday(date) ? '2px solid' : '1px solid #e0e0e0',
                      borderColor: isToday(date) ? 'primary.main' : '#e0e0e0',
                      borderRadius: 1,
                      backgroundColor: isCurrentMonth(date) 
                        ? 'background.paper'
                        : 'grey.100',
                      color: isCurrentMonth(date) 
                        ? 'text.primary'
                        : 'text.disabled',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      height: '100%'
                    }}
                  >
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontWeight: isToday(date) ? 'bold' : 'normal',
                        mb: 1
                      }}
                    >
                      {date.getDate()}
                    </Typography>
                    {/* Space for future content */}
                    <Box sx={{ flex: 1 }}>
                      {/* Delivery items will go here */}
                    </Box>
                  </Box>
                ))}
              </Box>
            ))}
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}

export default DeliveryCalendarPage;