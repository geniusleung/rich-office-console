import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
// Remove collapseUnitRecords import
import { getInvoicesByDueDate, getInvoicesForDate, getInvoices, getInvoiceById, updateInvoice, updateOrderItems } from '../utils/invoiceService';
import { supabase } from '../utils/supabaseClient';
import InvoiceDetailDialog from '../components/InvoiceDetailDialog';
import InvoiceEditDialog from '../components/InvoiceEditDialog';

function ProductionCalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [invoiceData, setInvoiceData] = useState({});
  const [wdgsData, setWdgsData] = useState({}); // Add new state for WDGS totals
  const [deliveryData, setDeliveryData] = useState({}); // Add new state for delivery method data
  const [specialData, setSpecialData] = useState({}); // Add new state for special order and batch data
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [dateInvoices, setDateInvoices] = useState([]);
  const [dialogLoading, setDialogLoading] = useState(false);
  
  // Invoice detail dialog states
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  
  // Edit dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editInvoiceData, setEditInvoiceData] = useState(null);
  
  // Add missing data states for InvoiceEditDialog
  const [deliveryMethods, setDeliveryMethods] = useState([]);
  const [items, setItems] = useState([]);
  const [colors, setColors] = useState([]);
  const [frameStyles, setFrameStyles] = useState([]);
  const [glassOptions, setGlassOptions] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  
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
      // Handle YYYY-MM-DD format to avoid timezone issues
      if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = dateString.split('-');
        const date = new Date(year, month - 1, day);
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
      }
      // For other date formats
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  // Add this helper function for batch assignment status
  const getBatchAssignmentStatus = (orderItems) => {
    if (!orderItems || orderItems.length === 0) {
      return { allAssigned: false, assignedCount: 0, totalCount: 0 };
    }
    
    const assignedCount = orderItems.filter(item => 
      item.batch_assigned && item.batch_assigned !== 'N/A' && item.batch_assigned.trim() !== ''
    ).length;
    
    return {
      allAssigned: assignedCount === orderItems.length,
      assignedCount,
      totalCount: orderItems.length
    };
  };

  // Fetch delivery methods from database
  const fetchDeliveryMethods = async () => {
    try {
      const { data, error } = await supabase
        .from('delivery_methods')
        .select('*')
        .order('name');
      
      if (error) {
        console.error('Error fetching delivery methods:', error);
      } else {
        setDeliveryMethods(data || []);
      }
    } catch (error) {
      console.error('Error fetching delivery methods:', error);
    }
  };

  // Add data fetching functions
  const fetchAllData = useCallback(async () => {
    setDataLoading(true);
    try {
      const [itemsData, colorsData, frameStylesData, glassOptionsData] = await Promise.all([
        supabase.from('items').select('*'),
        supabase.from('item_colors').select('*'),
        supabase.from('frame_styles').select('*'),
        supabase.from('glass_options').select('*')
      ]);
      
      if (itemsData.error) throw itemsData.error;
      if (colorsData.error) throw colorsData.error;
      if (frameStylesData.error) throw frameStylesData.error;
      if (glassOptionsData.error) throw glassOptionsData.error;
      
      setItems(itemsData.data || []);
      setColors(colorsData.data || []);
      setFrameStyles(frameStylesData.data || []);
      setGlassOptions(glassOptionsData.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setDataLoading(false);
    }
  }, []);

  // Add categorizeItems function (around line 88, after other state declarations)
  const categorizeItems = useCallback((invoiceItems, deliveryMethod = '') => {
    const counts = { Window: 0, Door: 0, Glass: 0, Screen: 0, Part: 0 };
    const unknownItems = [];
    const unknownColors = [];
    const unknownFrameStyles = [];
    const unknownDeliveryMethods = [];
    let glassOrderNeeded = false;
    let itemOrderNeeded = false;
    const specialOrderItems = [];
    
    // Check delivery method
    if (!deliveryMethod || !deliveryMethod.trim()) {
      const emptyMethodLabel = 'Empty/Missing';
      if (!unknownDeliveryMethods.includes(emptyMethodLabel)) {
        unknownDeliveryMethods.push(emptyMethodLabel);
      }
    } else {
      const dbDeliveryMethod = deliveryMethods.find(dbMethod => 
        dbMethod.name.toLowerCase() === deliveryMethod.toLowerCase()
      );
      if (!dbDeliveryMethod && !unknownDeliveryMethods.includes(deliveryMethod)) {
        unknownDeliveryMethods.push(deliveryMethod);
      }
    }
    
    // Process each item
    const processedItems = invoiceItems.map(item => {
      let requiresSpecialOrder = false;
      
      // Check item name
      const dbItem = items.find(dbItem => 
        dbItem.name.toLowerCase() === (item.item_name || item.name || '').toLowerCase()
      );
      
      if (dbItem && dbItem.item_type !== 'Other') {
        const quantity = parseInt(item.quantity) || 1;
        counts[dbItem.item_type] = (counts[dbItem.item_type] || 0) + quantity;
        
        if (dbItem.order_needed) {
          itemOrderNeeded = true;
          requiresSpecialOrder = true;
          specialOrderItems.push({
            name: item.item_name || item.name,
            quantity: item.quantity,
            type: 'item'
          });
        }
      } else if (!dbItem && (item.item_name || item.name)) {
        unknownItems.push(item.item_name || item.name);
      }
      
      // Check color
      if (item.color && item.color.trim()) {
        const dbColor = colors.find(dbColor => 
          dbColor.color_name.toLowerCase() === item.color.toLowerCase()
        );
        if (!dbColor && !unknownColors.includes(item.color)) {
          unknownColors.push(item.color);
        }
      }
      
      // Check frame style
      if (item.frame && item.frame.trim()) {
        const dbFrameStyle = frameStyles.find(dbFrame => 
          dbFrame.style_name.toLowerCase() === item.frame.toLowerCase()
        );
        if (!dbFrameStyle && !unknownFrameStyles.includes(item.frame)) {
          unknownFrameStyles.push(item.frame);
        }
      }
      
      // Check glass option
      if ((item.glass_option || item.glassOption) && (item.glass_option || item.glassOption).trim()) {
        const glassOptionText = (item.glass_option || item.glassOption).toLowerCase();
        const matchingGlassOption = glassOptions.find(dbGlass => 
          glassOptionText.includes(dbGlass.glass_type.toLowerCase()) && dbGlass.order_needed
        );
        
        if (matchingGlassOption) {
          glassOrderNeeded = true;
          requiresSpecialOrder = true;
          specialOrderItems.push({
            name: item.item_name || item.name,
            quantity: item.quantity,
            glassOption: item.glass_option || item.glassOption,
            type: 'glass'
          });
        }
      }
      
      return {
        ...item,
        requiresSpecialOrder
      };
    });
    
    const hasSpecialOrder = glassOrderNeeded || itemOrderNeeded;
    
    return {
      wdgspString: `${counts.Window}/${counts.Door}/${counts.Glass}/${counts.Screen}/${counts.Part}`,
      unknownItems,
      unknownColors,
      unknownFrameStyles,
      unknownDeliveryMethods,
      glassOrderNeeded,
      itemOrderNeeded,
      hasSpecialOrder,
      specialOrderItems,
      processedItems
    };
  }, [items, colors, frameStyles, glassOptions, deliveryMethods]);

  // Add memoized options (around line 160, after categorizeItems function)
  const itemOptions = useMemo(() => 
    [...new Set(items.map(dbItem => dbItem.name))].filter(name => name && name.trim()),
    [items]
  );

  const colorOptions = useMemo(() => 
    [...new Set(colors.map(color => color.color_name))].filter(name => name && name.trim()),
    [colors]
  );

  const frameOptions = useMemo(() => 
    [...new Set(frameStyles.map(frame => frame.style_name))].filter(name => name && name.trim()),
    [frameStyles]
  );

  // Add function to parse WDGS string and return totals
  const parseWdgsString = (wdgspString) => {
    if (!wdgspString || wdgspString === 'N/A') {
      return { W: 0, D: 0, G: 0, S: 0, P: 0, total: 0 };
    }
    
    const parts = wdgspString.split('/');
    if (parts.length !== 5) {
      return { W: 0, D: 0, G: 0, S: 0, P: 0, total: 0 };
    }
    
    const W = parseInt(parts[0]) || 0;
    const D = parseInt(parts[1]) || 0;
    const G = parseInt(parts[2]) || 0;
    const S = parseInt(parts[3]) || 0;
    const P = parseInt(parts[4]) || 0;
    
    return {
      W, D, G, S, P,
      total: W + D + G + S + P
    };
  };

  // Add function to get WDGS totals by due date
  const getWdgsTotalsByDueDate = async (year, month) => {
    try {
      // Create start and end dates for the month
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0); // Last day of the month
      
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('invoices')
        .select('due_date, wdgsp_string')
        .gte('due_date', startDateStr)
        .lte('due_date', endDateStr)
        .not('due_date', 'is', null)
        .not('wdgsp_string', 'is', null);

      if (error) {
        console.error('Error fetching WDGS data by due date:', error);
        throw error;
      }

      // Group and sum WDGS by due date
      const groupedWdgs = {};
      data.forEach(invoice => {
        const dueDate = invoice.due_date;
        if (dueDate && invoice.wdgsp_string) {
          if (!groupedWdgs[dueDate]) {
            groupedWdgs[dueDate] = { W: 0, D: 0, G: 0, S: 0, P: 0, total: 0 };
          }
          
          const parsed = parseWdgsString(invoice.wdgsp_string);
          groupedWdgs[dueDate].W += parsed.W;
          groupedWdgs[dueDate].D += parsed.D;
          groupedWdgs[dueDate].G += parsed.G;
          groupedWdgs[dueDate].S += parsed.S;
          groupedWdgs[dueDate].P += parsed.P;
          groupedWdgs[dueDate].total += parsed.total;
        }
      });

      return groupedWdgs;
    } catch (error) {
      console.error('Error in getWdgsTotalsByDueDate:', error);
      throw error;
    }
  };

  // Add function to get delivery method filtered data by due date
  const getDeliveryMethodDataByDueDate = async (year, month) => {
    try {
      // Create start and end dates for the month
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0); // Last day of the month
      
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('invoices')
        .select('due_date, delivery_method, wdgsp_string')
        .gte('due_date', startDateStr)
        .lte('due_date', endDateStr)
        .not('due_date', 'is', null)
        .not('delivery_method', 'is', null);

      if (error) {
        console.error('Error fetching delivery method data by due date:', error);
        throw error;
      }

      // Group and sum delivery method data by due date
      const groupedDeliveryData = {};
      data.forEach(invoice => {
        const dueDate = invoice.due_date;
        if (dueDate && invoice.delivery_method) {
          // Check if delivery method contains "delivery" (case insensitive)
          const isDeliveryMethod = invoice.delivery_method.toLowerCase().includes('delivery');
          
          if (isDeliveryMethod) {
            if (!groupedDeliveryData[dueDate]) {
              groupedDeliveryData[dueDate] = { count: 0, W: 0, D: 0, G: 0, S: 0, P: 0, total: 0 };
            }
            
            groupedDeliveryData[dueDate].count += 1;
            
            if (invoice.wdgsp_string) {
              const parsed = parseWdgsString(invoice.wdgsp_string);
              groupedDeliveryData[dueDate].W += parsed.W;
              groupedDeliveryData[dueDate].D += parsed.D;
              groupedDeliveryData[dueDate].G += parsed.G;
              groupedDeliveryData[dueDate].S += parsed.S;
              groupedDeliveryData[dueDate].P += parsed.P;
              groupedDeliveryData[dueDate].total += parsed.total;
            }
          }
        }
      });

      return groupedDeliveryData;
    } catch (error) {
      console.error('Error in getDeliveryMethodDataByDueDate:', error);
      throw error;
    }
  };

  // Add function to get special order and unassigned batch data by due date
  const getSpecialOrderAndBatchDataByDueDate = async (year, month) => {
    try {
      // Create start and end dates for the month
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0); // Last day of the month
      
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('invoices')
        .select(`
          due_date,
          delivery_method,
          order_items (
            id,
            item_name,
            quantity,
            glass_option,
            batch_assigned
          )
        `)
        .gte('due_date', startDateStr)
        .lte('due_date', endDateStr)
        .not('due_date', 'is', null);

      if (error) {
        console.error('Error fetching special order and batch data:', error);
        throw error;
      }

      // Group and calculate special order and unassigned batch data by due date
      const groupedSpecialData = {};
      
      data.forEach(invoice => {
        const dueDate = invoice.due_date;
        if (dueDate && invoice.order_items) {
          if (!groupedSpecialData[dueDate]) {
            groupedSpecialData[dueDate] = { specialOrderQty: 0, unassignedBatchQty: 0 };
          }
          
          // Use the existing categorizeItems function to identify special orders
          const { processedItems } = categorizeItems(invoice.order_items, invoice.delivery_method || '');
          
          processedItems.forEach(item => {
            const quantity = parseInt(item.quantity) || 1;
            
            // Count special order quantities
            if (item.requiresSpecialOrder) {
              groupedSpecialData[dueDate].specialOrderQty += quantity;
            }
            
            // Count unassigned batch quantities
            if (!item.batch_assigned || item.batch_assigned === 'N/A' || item.batch_assigned.trim() === '') {
              groupedSpecialData[dueDate].unassignedBatchQty += quantity;
            }
          });
        }
      });

      return groupedSpecialData;
    } catch (error) {
      console.error('Error in getSpecialOrderAndBatchDataByDueDate:', error);
      throw error;
    }
  };

  // Fetch invoice data when month or year changes
  useEffect(() => {
    const fetchInvoiceData = async () => {
      setLoading(true);
      try {
        const [invoiceCountData, wdgsData, deliveryMethodData, specialOrderData] = await Promise.all([
          getInvoicesByDueDate(selectedYear, selectedMonth + 1),
          getWdgsTotalsByDueDate(selectedYear, selectedMonth + 1),
          getDeliveryMethodDataByDueDate(selectedYear, selectedMonth + 1),
          getSpecialOrderAndBatchDataByDueDate(selectedYear, selectedMonth + 1)
        ]);
        setInvoiceData(invoiceCountData);
        setWdgsData(wdgsData);
        setDeliveryData(deliveryMethodData);
        setSpecialData(specialOrderData);
      } catch (error) {
        console.error('Error fetching invoice data:', error);
        setInvoiceData({});
        setWdgsData({});
        setDeliveryData({});
        setSpecialData({});
      } finally {
        setLoading(false);
      }
    };

    fetchInvoiceData();
  }, [selectedYear, selectedMonth]);

  // Fetch data on component mount
  useEffect(() => {
    fetchAllData();
    fetchDeliveryMethods();
  }, [fetchAllData]);

  // Get invoice count for a specific date
  const getInvoiceCount = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return invoiceData[dateStr] || 0;
  };
  
  // Add this new function
  const getWdgsTotals = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return wdgsData[dateStr] || { W: 0, D: 0, G: 0, S: 0, P: 0, total: 0 };
  };

  // Add helper function to get delivery method data for a specific date
  const getDeliveryData = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return deliveryData[dateStr] || { count: 0, W: 0, D: 0, G: 0, S: 0, P: 0, total: 0 };
  };

  // Add helper function to get special order and batch data for a specific date
  const getSpecialData = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return specialData[dateStr] || { specialOrderQty: 0, unassignedBatchQty: 0 };
  };

  // Handle date click
  const handleDateClick = async (date) => {
    const invoiceCount = getInvoiceCount(date);
    if (invoiceCount > 0 && isCurrentMonth(date)) {
      setSelectedDate(date);
      setDialogOpen(true);
      setDialogLoading(true);
      
      try {
        // Use getInvoicesForDate instead of getInvoices to get ALL invoices for the specific date
        const result = await getInvoicesForDate(date);
        
        if (result.success) {
          setDateInvoices(result.data);
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

  // Remove these duplicate functions:
  // const categorizeItems = (items, deliveryMethod) => {
  //   const processedItems = items.map(item => ({
  //     ...item,
  //     requiresSpecialOrder: false
  //   }));
  //   return { processedItems };
  // };

  // const getBatchAssignmentStatus = (items) => {
  //   if (!items || items.length === 0) {
  //     return { assignedCount: 0, totalCount: 0, allAssigned: false };
  //   }
  //   const assignedCount = items.filter(item => item.batch_assigned && item.batch_assigned !== 'N/A').length;
  //   const totalCount = items.length;
  //   return {
  //     assignedCount,
  //     totalCount,
  //     allAssigned: assignedCount === totalCount
  //   };
  // };

  const handleViewDetails = async (invoiceId) => {
    setDetailLoading(true);
    setDetailDialogOpen(true);

    try {
      const result = await getInvoiceById(invoiceId);
      if (result.success) {
        const invoiceData = result.data;
        // Process the individual unit records directly (no collapsing)
        const { processedItems } = categorizeItems(invoiceData.order_items || [], invoiceData.delivery_method);
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

  // Add the onSave function before the return statement (around line 550)
  const onSave = async (updatedInvoice, updatedItems) => {
    try {
      // Filter out invalid columns for invoice update
      const validInvoiceColumns = [
        'customer_name', 'customer_phone', 'customer_email', 'customer_address',
        'order_no', 'order_date', 'delivery_date', 'delivery_method',
        'shipping_address', 'notes', 'total_quantity', 'wdgsp_string',
        'has_special_order', 'glass_order_needed', 'item_order_needed',
        'paid_status', 'special_order_completed', 'due_date', 'po_number'
      ];
      
      const filteredInvoice = Object.keys(updatedInvoice)
        .filter(key => validInvoiceColumns.includes(key))
        .reduce((obj, key) => {
          obj[key] = updatedInvoice[key];
          return obj;
        }, {});
      
      // Update invoice
      await updateInvoice(updatedInvoice.id, filteredInvoice);
      
      // Update order items
      if (updatedItems && updatedItems.length > 0) {
        await updateOrderItems(updatedInvoice.id, updatedItems);
      }
      
      // Refresh both invoice count and WDGS data
      const [invoiceCountData, wdgsDataResult, deliveryMethodData, specialOrderData] = await Promise.all([
        getInvoicesByDueDate(selectedYear, selectedMonth + 1),
        getWdgsTotalsByDueDate(selectedYear, selectedMonth + 1),
        getDeliveryMethodDataByDueDate(selectedYear, selectedMonth + 1),
        getSpecialOrderAndBatchDataByDueDate(selectedYear, selectedMonth + 1)
      ]);
      setInvoiceData(invoiceCountData);
      setWdgsData(wdgsDataResult);
      setDeliveryData(deliveryMethodData);
      setSpecialData(specialOrderData);
      
      // Refresh the date dialog data if it's open
      if (dialogOpen && selectedDate) {
        const dateStr = selectedDate.toISOString().split('T')[0];
        const result = await getInvoices({
          limit: 100,
          offset: 0
        });
        
        if (result.success) {
          const filteredInvoices = result.data.filter(invoice => {
            const invoiceDueDate = invoice.due_date ? invoice.due_date.split('T')[0] : null;
            return invoiceDueDate === dateStr;
          });
          setDateInvoices(filteredInvoices);
        }
      }
      
      // Refresh the invoice detail data
      await handleViewDetails(editInvoiceData.id);
      
      setEditDialogOpen(false);
      setEditInvoiceData(null);
    } catch (error) {
      console.error('Error updating invoice:', error);
    }
  };
  
  // Add the missing return statement and JSX content
  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Calendar header and controls */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" component="h1">
            Production Calendar
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Year</InputLabel>
              <Select
                value={selectedYear}
                label="Year"
                onChange={(e) => setSelectedYear(e.target.value)}
              >
                {years.map((year) => (
                  <MenuItem key={year} value={year}>
                    {year}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Month</InputLabel>
              <Select
                value={selectedMonth}
                label="Month"
                onChange={(e) => setSelectedMonth(e.target.value)}
              >
                {monthNames.map((month, index) => (
                  <MenuItem key={index} value={index}>
                    {month}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <IconButton onClick={() => {
            if (selectedMonth === 0) {
              setSelectedMonth(11);
              setSelectedYear(selectedYear - 1);
            } else {
              setSelectedMonth(selectedMonth - 1);
            }
          }}>
            <ChevronLeft />
          </IconButton>
          
          <Typography variant="h5" component="h2">
            {monthNames[selectedMonth]} {selectedYear}
          </Typography>
          
          <IconButton onClick={() => {
            if (selectedMonth === 11) {
              setSelectedMonth(0);
              setSelectedYear(selectedYear + 1);
            } else {
              setSelectedMonth(selectedMonth + 1);
            }
          }}>
            <ChevronRight />
          </IconButton>
        </Box>
  
        {/* Calendar grid */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ width: '100%' }}>
            {/* Days of week header */}
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(7, 1fr)', 
              gap: 1,
              mb: 1
            }}>
              {daysOfWeek.map((day) => (
                <Typography 
                  key={day} 
                  variant="subtitle2" 
                  sx={{ 
                    textAlign: 'center', 
                    fontWeight: 'bold',
                    p: 1,
                    backgroundColor: 'grey.100',
                    borderRadius: 1
                  }}
                >
                  {day}
                </Typography>
              ))}
            </Box>
            
            {/* Calendar weeks */}
            {getCalendarData().map((week, weekIndex) => (
              <Box 
                key={weekIndex}
                sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(7, 1fr)', 
                  gap: 1,
                  mb: 1
                }}
              >
                {week.map((date, dayIndex) => {
                  const invoiceCount = getInvoiceCount(date);
                  const wdgsTotals = getWdgsTotals(date);
                  const deliveryMethodData = getDeliveryData(date);
                  const specialOrderData = getSpecialData(date);
                  
                  // Add debugging for dates with invoices
                  if (invoiceCount > 0 && isCurrentMonth(date)) {
                    console.log(`Date: ${date.toISOString().split('T')[0]}`);
                    console.log('Invoice Count:', invoiceCount);
                    console.log('WDGS Totals:', wdgsTotals);
                    console.log('Delivery Method Data:', deliveryMethodData);
                    console.log('Special Order Data:', specialOrderData);
                    console.log('---');
                  }
                  
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
                        height: 120,
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
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0, alignItems: 'center', flex: 1, justifyContent: 'center', textAlign: 'center' }}>
                          {/* Row 1: Total invoices and W/D */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, height: '33%', justifyContent: 'center', width: '100%' }}>
                            <Typography variant="caption" sx={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'primary.main' }}>
                              Total {invoiceCount}
                            </Typography>
                            {(wdgsTotals.W > 0 || wdgsTotals.D > 0) && (
                              <Typography variant="caption" sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
                                | {wdgsTotals.W}W {wdgsTotals.D}D
                              </Typography>
                            )}
                          </Box>
                          
                          {/* Row 2: Delivery method invoices and W/D */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, height: '33%', justifyContent: 'center', width: '100%' }}>
                            {deliveryMethodData.count > 0 ? (
                              <>
                                <Typography variant="caption" sx={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'success.main' }}>
                                  Delivery {deliveryMethodData.count}
                                </Typography>
                                {(deliveryMethodData.W > 0 || deliveryMethodData.D > 0) && (
                                  <Typography variant="caption" sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
                                    | {deliveryMethodData.W}W {deliveryMethodData.D}D
                                  </Typography>
                                )}
                              </>
                            ) : (
                              <Typography variant="caption" sx={{ fontSize: '0.85rem', color: 'text.disabled' }}>
                                Delivery 0
                              </Typography>
                            )}
                          </Box>
                          
                          {/* Row 3: Special order and unassigned batch quantities */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, height: '33%', justifyContent: 'center', width: '100%' }}>
                            <Typography variant="caption" sx={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'warning.main' }}>
                              Special {specialOrderData.specialOrderQty || 0}
                            </Typography>
                            <Typography variant="caption" sx={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'error.main' }}>
                              | Unassigned {specialOrderData.unassignedBatchQty || 0}
                            </Typography>
                          </Box>
                        </Box>
                      )}
                    </Box>
                  );
                })}
              </Box>
            ))}
          </Box>
        )}
      </Paper>
  
      {/* Date Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              Invoices for {selectedDate && formatDate(selectedDate.toISOString().split('T')[0])}
            </Typography>
            <IconButton onClick={handleCloseDialog}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {dialogLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
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
                    <TableCell>WDGSP</TableCell>
                    <TableCell>Special Order</TableCell>
                    <TableCell>Batch Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dateInvoices.length > 0 ? (
                    dateInvoices.map((invoice) => {
                      const batchStatus = getBatchAssignmentStatus(invoice.order_items || []);
                      return (
                        <TableRow key={invoice.id}>
                          <TableCell>{invoice.order_no}</TableCell>
                          <TableCell>{invoice.customer_name}</TableCell>
                          <TableCell>{formatDate(invoice.due_date)}</TableCell>
                          <TableCell>{invoice.delivery_method}</TableCell>
                          <TableCell>{invoice.total_quantity}</TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                              {invoice.wdgsp_string || 'N/A'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {invoice.has_special_order ? (
                              <Chip 
                                label="Yes" 
                                color={invoice.special_order_completed === 'completed' ? 'success' : 'warning'} 
                                size="small" 
                              />
                            ) : (
                              <Chip label="No" color="default" size="small" />
                            )}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={batchStatus.allAssigned ? 'Complete' : batchStatus.assignedCount > 0 ? 'Partial' : 'None'}
                              color={batchStatus.allAssigned ? 'success' : batchStatus.assignedCount > 0 ? 'warning' : 'error'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Tooltip title="View Details">
                              <IconButton
                                size="small"
                                onClick={() => handleViewDetails(invoice.id)}
                              >
                                <VisibilityIcon />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} align="center">
                        No invoices found for this date
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
  
      {/* Invoice Detail Dialog */}
      <InvoiceDetailDialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        selectedInvoice={selectedInvoice}
        loading={detailLoading}
        showEditButton={true}
        onEdit={() => {
          setEditInvoiceData(selectedInvoice);
          setEditDialogOpen(true);
          setDetailDialogOpen(false);
        }}
        getBatchAssignmentStatus={getBatchAssignmentStatus}
      />
  
      {/* Invoice Edit Dialog */}
      <InvoiceEditDialog
        open={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          setEditInvoiceData(null);
        }}
        invoiceData={editInvoiceData}
        onSave={onSave}
        onInvoiceDataChange={(updatedData) => setEditInvoiceData(updatedData)}
        deliveryMethods={deliveryMethods}
        itemOptions={itemOptions}
        colorOptions={colorOptions}
        frameOptions={frameOptions}
        categorizeItems={categorizeItems}
        loading={dataLoading}
      />
    </Container>
  );
}

export default ProductionCalendarPage;