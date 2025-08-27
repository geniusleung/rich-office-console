import React, { useState, useEffect } from 'react';
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
  InputLabel,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Card,
  CardContent,
  Tooltip
} from '@mui/material';
import {
  ChevronLeft,
  ChevronRight,
  Close as CloseIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import { getInvoicesByDueDate, getInvoicesForDate, getInvoices, getInvoiceById, collapseUnitRecords } from '../utils/invoiceService';
import InvoiceDetailDialog from '../components/InvoiceDetailDialog';

function ProductionCalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [invoiceData, setInvoiceData] = useState({});
  const [loading, setLoading] = useState(false);
  
  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [dateInvoices, setDateInvoices] = useState([]);
  const [dialogLoading, setDialogLoading] = useState(false);
  
  // Invoice detail dialog states
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  
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

  // Helper function to format dates
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  // Fetch invoice data when month or year changes
  useEffect(() => {
    const fetchInvoiceData = async () => {
      setLoading(true);
      try {
        const data = await getInvoicesByDueDate(selectedYear, selectedMonth + 1);
        setInvoiceData(data);
      } catch (error) {
        console.error('Error fetching invoice data:', error);
        setInvoiceData({});
      } finally {
        setLoading(false);
      }
    };

    fetchInvoiceData();
  }, [selectedYear, selectedMonth]);

  // Get invoice count for a specific date
  const getInvoiceCount = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return invoiceData[dateStr] || 0;
  };

  // Handle date click
  const handleDateClick = async (date) => {
    const invoiceCount = getInvoiceCount(date);
    if (invoiceCount > 0 && isCurrentMonth(date)) {
      setSelectedDate(date);
      setDialogOpen(true);
      setDialogLoading(true);
      
      try {
        const dateStr = date.toISOString().split('T')[0];
        
        // Use the same getInvoices function as ProcessedInvoicePage
        const result = await getInvoices({
          limit: 100, // Get more records to ensure we get all for the date
          offset: 0
        });
        
        if (result.success) {
          // Filter invoices by due_date on the client side
          const filteredInvoices = result.data.filter(invoice => {
            const invoiceDueDate = invoice.due_date ? invoice.due_date.split('T')[0] : null;
            return invoiceDueDate === dateStr;
          });
          
          setDateInvoices(filteredInvoices);
        } else {
          console.error('Failed to fetch invoices:', result.message);
          setDateInvoices([]);
        }
      } catch (error) {
        console.error('Error fetching invoices for date:', error);
        setDateInvoices([]);
      } finally {
        setDialogLoading(false);
      }
    }
  };

  // Remove these lines (131-134):
  // const formatDate = (dateString) => {
  //   if (!dateString) return 'N/A';
  //   return new Date(dateString).toLocaleDateString();
  // };

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

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedDate(null);
    setDateInvoices([]);
  };

  // Add these three helper functions here:
  const categorizeItems = (items, deliveryMethod) => {
    const processedItems = items.map(item => ({
      ...item,
      requiresSpecialOrder: false // This would need proper logic based on your business rules
    }));
    return { processedItems };
  };

  const getBatchAssignmentStatus = (items) => {
    if (!items || items.length === 0) {
      return { assignedCount: 0, totalCount: 0, allAssigned: false };
    }
    const assignedCount = items.filter(item => item.batch_assigned && item.batch_assigned !== 'N/A').length;
    const totalCount = items.length;
    return {
      assignedCount,
      totalCount,
      allAssigned: assignedCount === totalCount
    };
  };

  const handleViewDetails = async (invoiceId) => {
    setDetailLoading(true);
    setDetailDialogOpen(true);

    try {
      const result = await getInvoiceById(invoiceId);
      if (result.success) {
        const invoiceData = result.data;
        // Collapse individual unit records for display
        const collapsedItems = collapseUnitRecords(invoiceData.order_items || []);
        // Process the collapsed items to add requiresSpecialOrder field
        const { processedItems } = categorizeItems(collapsedItems, invoiceData.delivery_method);
        // Update the invoice data with processed items
        invoiceData.order_items = processedItems;
        setSelectedInvoice(invoiceData);
      } else {
        console.error('Failed to fetch invoice details:', result.message);
      }
    } catch (err) {
      console.error('Error fetching invoice details:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const calendarData = getCalendarData();

  return (
    <Container maxWidth="xl" sx={{ mt: 1, mb: 1, height: 'calc(100vh - 10px)' }}>
      <Box sx={{ mb: 1 }}>
        <Typography variant="h4" component="h1">
          Production Plan Calendar
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
                  backgroundColor: '#FFD700',
                  color: '#000000',
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
                {week.map((date, dayIndex) => {
                  const invoiceCount = getInvoiceCount(date);
                  return (
                    <Box
                      key={dayIndex}
                      onClick={() => handleDateClick(date)}
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
                        cursor: invoiceCount > 0 && isCurrentMonth(date) ? 'pointer' : 'default',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        height: '100%',
                        minHeight: 80,
                        '&:hover': invoiceCount > 0 && isCurrentMonth(date) ? {
                          backgroundColor: 'action.hover'
                        } : {}
                      }}
                    >
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontWeight: isToday(date) ? 'bold' : 'normal',
                          fontSize: '0.875rem'
                        }}
                      >
                        {date.getDate()}
                      </Typography>
                      
                      {invoiceCount > 0 && isCurrentMonth(date) && (
                        <Chip
                          label={invoiceCount}
                          size="small"
                          color="primary"
                          sx={{
                            height: 20,
                            fontSize: '0.75rem',
                            alignSelf: 'flex-end'
                          }}
                        />
                      )}
                    </Box>
                  );
                })}
              </Box>
            ))}
          </Box>
        </Box>
      </Paper>

      {/* Date Invoices Dialog - THIS WAS MISSING! */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              Invoices for {selectedDate && selectedDate.toLocaleDateString()}
            </Typography>
            <IconButton onClick={handleCloseDialog}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {dialogLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Order No.</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell>Due Date</TableCell>
                    <TableCell>Delivery Method</TableCell>
                    <TableCell>Total Quantity</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dateInvoices.length > 0 ? (
                    dateInvoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell>{invoice.order_no || 'N/A'}</TableCell>
                        <TableCell>{invoice.customer_name || 'N/A'}</TableCell>
                        <TableCell>{formatDate(invoice.due_date)}</TableCell>
                        <TableCell>{invoice.delivery_method || 'N/A'}</TableCell>
                        <TableCell>{invoice.total_quantity || 0}</TableCell>
                        <TableCell>
                          <Tooltip title="View Details">
                            <IconButton
                              onClick={() => handleViewDetails(invoice.id)}
                              color="primary"
                              size="small"
                            >
                              <VisibilityIcon />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography color="text.secondary">
                          No invoices found for this date
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Replace the entire Invoice Detail Dialog (lines 488-827) with: */}
      <InvoiceDetailDialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        invoice={selectedInvoice}
        loading={detailLoading}
        showEditButton={false}
        getBatchAssignmentStatus={getBatchAssignmentStatus}
      />
    </Container>
  );
}

export default ProductionCalendarPage;