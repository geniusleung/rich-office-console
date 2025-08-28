import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Typography, 
  Box, 
  Paper, 
  Button, 
  Grid, 
  Card,
  CardContent,
  Alert,
  LinearProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  Autocomplete,
  CircularProgress
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import { 
  CloudUpload,
  TableChart,
  Delete,
  Visibility, 
  Edit,
  Close,
  Warning
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import { supabase } from '../utils/supabaseClient';
import { 
  saveInvoice, 
  expandItemsByQuantity, 
  collapseUnitRecords,
  checkExistingOrderNumbers,
  parseExcelDate,
  formatDateForDB
} from '../utils/invoiceService';

// Add pulse animation styles
const pulseAnimation = `
  @keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.5; }
    100% { opacity: 1; }
  }
`;

function InvoiceProcessorPage() {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processedResults, setProcessedResults] = useState([]);
  const [processingComplete, setProcessingComplete] = useState(false);
  const [errors, setErrors] = useState([]);
  const [previewDialog, setPreviewDialog] = useState({ open: false, data: null });
  const [editDialog, setEditDialog] = useState({ open: false, data: null, index: null });
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState({ open: false, index: null, data: null });
  const [processingProgress, setProcessingProgress] = useState({ current: 0, total: 0, fileName: '' });
  const [items, setItems] = useState([]);
  const [colors, setColors] = useState([]);
  const [frameStyles, setFrameStyles] = useState([]);
  const [deliveryMethods, setDeliveryMethods] = useState([]);
  const [glassOptions, setGlassOptions] = useState([]);
  const [importing, setImporting] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  
  // Memoize expensive calculations
  const hasWarnings = useMemo(() => {
    return processedResults.some(result => 
      (result.unknownItems && result.unknownItems.length > 0) ||
      (result.unknownColors && result.unknownColors.length > 0) ||
      (result.unknownFrameStyles && result.unknownFrameStyles.length > 0) ||
      (result.unknownDeliveryMethods && result.unknownDeliveryMethods.length > 0) ||
      result.missingShippingAddress ||
      result.isDuplicate
    );
  }, [processedResults]);
  
  // Extract import handler with useCallback
  const handleImportInvoices = useCallback(async () => {
    setImporting(true);
    try {
      let successCount = 0;
      let errorCount = 0;
      const errors = [];
      
      for (const result of processedResults) {
        // Check if this invoice has any warnings that should prevent import
        const hasWarnings = (
          (result.unknownItems && result.unknownItems.length > 0) ||
          (result.unknownColors && result.unknownColors.length > 0) ||
          (result.unknownFrameStyles && result.unknownFrameStyles.length > 0) ||
          (result.unknownDeliveryMethods && result.unknownDeliveryMethods.length > 0) ||
          result.missingShippingAddress ||
          result.isDuplicate
        );
        
        if (hasWarnings) {
          errorCount++;
          if (result.isDuplicate) {
            errors.push(`Invoice #${result.orderNo}: Duplicate order number already exists in database`);
          } else {
            errors.push(`Invoice #${result.orderNo}: Contains unknown items/colors/frame styles/delivery methods`);
          }
          continue;
        }
        
        try {
          const saveResult = await saveInvoice(result);
          if (saveResult.success) {
            successCount++;
          } else {
            errorCount++;
            errors.push(`Invoice #${result.orderNo}: ${saveResult.error}`);
          }
        } catch (error) {
          errorCount++;
          errors.push(`Invoice #${result.orderNo}: ${error.message}`);
        }
      }
      
      if (successCount > 0) {
        alert(`Successfully imported ${successCount} invoice(s) to database.${errorCount > 0 ? ` ${errorCount} invoice(s) failed to import.` : ''}`);
      } else {
        alert(`Failed to import invoices. Please resolve all warnings before importing.`);
      }
      
      if (errors.length > 0) {
        console.error('Import errors:', errors);
      }
    } catch (error) {
      console.error('Import operation failed:', error);
      alert(`Import failed: ${error.message}`);
    } finally {
      setImporting(false);
    }
  }, [processedResults]);
  
  // Optimized database fetching with Promise.all
  const fetchAllData = useCallback(async () => {
    setDataLoading(true);
    try {
      const [itemsData, colorsData, frameStylesData, deliveryMethodsData, glassOptionsData] = await Promise.all([
        supabase.from('items').select('*'),
        supabase.from('item_colors').select('*'),
        supabase.from('frame_styles').select('*'),
        supabase.from('delivery_methods').select('*'),
        supabase.from('glass_options').select('*')
      ]);
      
      if (itemsData.error) throw itemsData.error;
      if (colorsData.error) throw colorsData.error;
      if (frameStylesData.error) throw frameStylesData.error;
      if (deliveryMethodsData.error) throw deliveryMethodsData.error;
      if (glassOptionsData.error) throw glassOptionsData.error;
      
      setItems(itemsData.data || []);
      setColors(colorsData.data || []);
      setFrameStyles(frameStylesData.data || []);
      setDeliveryMethods(deliveryMethodsData.data || []);
      setGlassOptions(glassOptionsData.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setDataLoading(false);
    }
  }, []);
  
  // Fetch items, colors, frame styles, delivery methods, and glass options from database on component mount
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);
  
  // Memoized autocomplete options for better performance
  const itemOptions = useMemo(() => 
    [...new Set(items.map(dbItem => dbItem.name))].filter(name => name && name.trim()),
    [items]
  );

  const colorOptions = useMemo(() => 
    colors.map(color => color.color_name).filter(name => name && name.trim()),
    [colors]
  );

  const frameOptions = useMemo(() => 
    frameStyles.map(frame => frame.style_name).filter(name => name && name.trim()),
    [frameStyles]
  );

  const deliveryOptions = useMemo(() => 
    deliveryMethods.map(method => method.name).filter(name => name && name.trim()),
    [deliveryMethods]
  );

  // Optimized change handlers for edit dialog
  const handleItemChange = useCallback((itemIndex, field, value) => {
    setEditDialog(prev => ({
      ...prev,
      data: {
        ...prev.data,
        items: prev.data.items.map((item, index) => 
          index === itemIndex ? { ...item, [field]: value } : item
        )
      }
    }));
  }, []);

  // Memoized database lookups for validation
  const getItemValidation = useCallback((itemName) => {
    return items.find(dbItem => 
      dbItem.name.toLowerCase() === (itemName || '').toLowerCase()
    );
  }, [items]);

  const getColorValidation = useCallback((colorName) => {
    return colors.find(color => 
      color.color_name.toLowerCase() === (colorName || '').toLowerCase()
    );
  }, [colors]);

  const getFrameValidation = useCallback((frameName) => {
    return frameStyles.find(frame => 
      frame.style_name.toLowerCase() === (frameName || '').toLowerCase()
    );
  }, [frameStyles]);
  

  
  // Function to categorize items and count WDGSP
  const categorizeItems = (invoiceItems, deliveryMethod = '') => {
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
      // Empty or missing delivery method
      const emptyMethodLabel = 'Empty/Missing';
      if (!unknownDeliveryMethods.includes(emptyMethodLabel)) {
        unknownDeliveryMethods.push(emptyMethodLabel);
      }
    } else {
      // Non-empty delivery method - check if it exists in database
      const dbDeliveryMethod = deliveryMethods.find(dbMethod => 
        dbMethod.name.toLowerCase() === deliveryMethod.toLowerCase()
      );
      if (!dbDeliveryMethod && !unknownDeliveryMethods.includes(deliveryMethod)) {
        unknownDeliveryMethods.push(deliveryMethod);
      }
    }
    
    // Process each item and mark special order requirements
    const processedItems = invoiceItems.map(item => {
      let requiresSpecialOrder = false;
      
      // Check item name
      const dbItem = items.find(dbItem => 
        dbItem.name.toLowerCase() === item.name.toLowerCase()
      );
      
      if (dbItem && dbItem.item_type !== 'Other') {
        const quantity = parseInt(item.quantity) || 1;
        counts[dbItem.item_type] = (counts[dbItem.item_type] || 0) + quantity;
        
        // Check if this item requires a special order
        if (dbItem.order_needed) {
          itemOrderNeeded = true;
          requiresSpecialOrder = true;
          specialOrderItems.push({
            name: item.name,
            quantity: item.quantity,
            type: 'item'
          });
        }
      } else if (!dbItem) {
        unknownItems.push(item.name);
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
      
      // Check glass option for order requirement
      if (item.glassOption && item.glassOption.trim()) {
        const glassOptionText = item.glassOption.toLowerCase();
        const matchingGlassOption = glassOptions.find(dbGlass => 
          glassOptionText.includes(dbGlass.glass_type.toLowerCase()) && dbGlass.order_needed
        );
        
        if (matchingGlassOption) {
          glassOrderNeeded = true;
          requiresSpecialOrder = true;
          specialOrderItems.push({
            name: item.name,
            quantity: item.quantity,
            glassOption: item.glassOption,
            type: 'glass'
          });
        }
      }
      
      // Return the item with the requiresSpecialOrder field set
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
      processedItems // Return the processed items with requiresSpecialOrder field
    };
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    const excelFiles = files.filter(file => 
      file.type === 'application/vnd.ms-excel.sheet.macroEnabled.12' || 
      file.name.toLowerCase().endsWith('.xlsm') ||
      file.name.toLowerCase().endsWith('.xlsx')
    );
    
    if (excelFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...excelFiles]);
    } else if (files.length > 0) {
      setErrors(prev => [...prev, 'Only Excel files (.xlsm, .xlsx) are supported']);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const excelFiles = files.filter(file => 
      file.type === 'application/vnd.ms-excel.sheet.macroEnabled.12' || 
      file.name.toLowerCase().endsWith('.xlsm') ||
      file.name.toLowerCase().endsWith('.xlsx')
    );
    
    if (excelFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...excelFiles]);
    }
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleBeginProcess = async () => {
    if (selectedFiles.length === 0) {
      return;
    }
    
    setProcessing(true);
    setProcessingComplete(false);
    setProcessedResults([]);
    setErrors([]);
    setProcessingProgress({ current: 0, total: selectedFiles.length, fileName: '' });
    
    try {
      const allResults = [];
      
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        setProcessingProgress({ current: i + 1, total: selectedFiles.length, fileName: file.name });
        
        try {
          const invoices = await parseExcelData(file);
          allResults.push(...invoices);
        } catch (error) {
          setErrors(prev => [...prev, error.message]);
          allResults.push({
            fileName: file.name,
            status: 'error',
            error: error.message
          });
        }
      }
      
      // Check for duplicate order numbers
      if (allResults.length > 0) {
        const orderNumbers = allResults.map(result => result.orderNo).filter(Boolean);
        const duplicateCheck = await checkExistingOrderNumbers(orderNumbers);
        
        if (duplicateCheck.success) {
          const existingOrderNumbers = new Set(duplicateCheck.data.map(item => item.order_no));
          
          // Add isDuplicate flag to each result
          allResults.forEach(result => {
            result.isDuplicate = existingOrderNumbers.has(result.orderNo);
          });
        } else {
          console.error('Failed to check for duplicates:', duplicateCheck.error);
          // Continue without duplicate detection if check fails
          allResults.forEach(result => {
            result.isDuplicate = false;
          });
        }
      }
      
      setProcessedResults(allResults);
      setProcessingComplete(true);
      
    } catch (error) {
      setErrors(prev => [...prev, 'Processing failed: ' + error.message]);
    } finally {
      setProcessing(false);
      setProcessingProgress({ current: 0, total: 0, fileName: '' });
    }
  };

  const parseExcelData = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          
          const workbook = XLSX.read(data, { 
            type: 'array',
            cellDates: true,
            cellNF: false,
            cellText: false,
            raw: false,
            codepage: 65001
          });
          
          let worksheet;
          let sheetName;
          
          for (const name of workbook.SheetNames) {
            const testSheet = workbook.Sheets[name];
            const testData = XLSX.utils.sheet_to_json(testSheet, { header: 1, raw: false });
            
            const nonEmptyRows = testData.filter(row => row && row.length > 5);
            if (nonEmptyRows.length > 1) {
              worksheet = testSheet;
              sheetName = name;
              break;
            }
          }
          
          if (!worksheet) {
            sheetName = workbook.SheetNames[0];
            worksheet = workbook.Sheets[sheetName];
          }
          
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1, 
            raw: false,
            defval: '',
            blankrows: false
          });
          
          const filteredData = jsonData.filter(row => {
            return row && row.some(cell => cell !== null && cell !== undefined && cell.toString().trim() !== '');
          });
          
          if (!filteredData || filteredData.length < 2) {
            throw new Error('Excel file must contain at least a header row and one data row');
          }
          
          const headers = filteredData[0];
          const rows = filteredData.slice(1);
          
          if (!headers || headers.length === 0) {
            throw new Error('No headers found in the Excel file. Please ensure the first row contains column headers.');
          }
          
          const columnMap = {
            type: headers.findIndex(h => h && h.toString().toLowerCase().includes('type')),
            num: headers.findIndex(h => h && (h.toString().toLowerCase().includes('num') || h.toString().toLowerCase().includes('#') || h.toString().toLowerCase().includes('invoice'))),
            poNumber: headers.findIndex(h => h && (h.toString().toLowerCase().includes('p.o.') || h.toString().toLowerCase().includes('po') || h.toString().toLowerCase().includes('p. o.') || h.toString().toLowerCase().includes('po #'))),
            name: headers.findIndex(h => h && h.toString().toLowerCase().includes('name') && !h.toString().toLowerCase().includes('file')),
            date: headers.findIndex(h => h && (h.toString().toLowerCase().includes('date') || h.toString().toLowerCase().includes('order date') || h.toString().toLowerCase().includes('created'))),
            dueDate: headers.findIndex(h => h && h.toString().toLowerCase().includes('due')),
            item: headers.findIndex(h => h && h.toString().toLowerCase().includes('item')),
            qty: headers.findIndex(h => h && (h.toString().toLowerCase().includes('qty') || h.toString().toLowerCase().includes('quantity'))),
            width: headers.findIndex(h => h && h.toString().toLowerCase().trim() === 'w'),
            height: headers.findIndex(h => h && h.toString().toLowerCase().trim() === 'h'),
            additionalDimension: headers.findIndex(h => h && (h.toString().toLowerCase().includes('p/v') || h.toString().toLowerCase().includes('p\\v'))),
            color: headers.findIndex(h => h && h.toString().toLowerCase().includes('color')),
            argon: headers.findIndex(h => h && h.toString().toLowerCase().includes('argon')),
            glassOption: headers.findIndex(h => h && h.toString().toLowerCase().includes('glass')),
            gridStyle: headers.findIndex(h => h && (h.toString().toLowerCase().includes('grid') || h.toString().toLowerCase().includes('gride'))),
            frame: headers.findIndex(h => h && h.toString().toLowerCase().includes('frame')),
            via: headers.findIndex(h => h && h.toString().toLowerCase().includes('via')),
            paid: headers.findIndex(h => h && h.toString().toLowerCase().includes('paid'))
          };
          
          const essentialColumns = ['type', 'num', 'name'];
          const foundEssential = essentialColumns.some(col => columnMap[col] >= 0);
          
          if (!foundEssential) {
            throw new Error('Could not find essential columns (type, number, name) in the Excel file');
          }
          
          const invoiceGroups = {};
          
          rows.forEach((row, rowIndex) => {
            if (!row || row.length === 0) return;
            
            const rowType = columnMap.type >= 0 ? row[columnMap.type] : '';
            if (columnMap.type >= 0 && (!rowType || rowType.toString().toLowerCase() !== 'invoice')) {
              return;
            }
            
            const invoiceNum = columnMap.num >= 0 ? row[columnMap.num] : `Row_${rowIndex + 2}`;
            
            if (!invoiceGroups[invoiceNum]) {
              invoiceGroups[invoiceNum] = {
                type: columnMap.type >= 0 ? (row[columnMap.type] || '').toString() : '',
                orderDate: columnMap.date >= 0 ? parseExcelDate(row[columnMap.date]) : '',
                orderNo: invoiceNum.toString(),
                poNumber: columnMap.poNumber >= 0 ? (row[columnMap.poNumber] || '').toString() : '',
                customerInfo: {
                  name: columnMap.name >= 0 ? (row[columnMap.name] || '').toString() : '',
                  phone: '',
                  address: ''
                },
                dueDate: columnMap.dueDate >= 0 ? parseExcelDate(row[columnMap.dueDate]) : '',
                deliveryDate: columnMap.dueDate >= 0 ? parseExcelDate(row[columnMap.dueDate]) : '',
                deliveryMethod: columnMap.via >= 0 ? (row[columnMap.via] || '').toString() : '',
                paidStatus: columnMap.paid >= 0 ? (row[columnMap.paid] || '').toString() : '',
                shippingAddress: '',
                shipTo: {
                  name: columnMap.name >= 0 ? (row[columnMap.name] || '').toString() : '',
                  phone: '',
                  address: ''
                },
                items: [],
                extractionConfidence: 'high',
                status: 'success'
              };
            }
            
            const item = {
              name: columnMap.item >= 0 ? (row[columnMap.item] || '').toString() : '',
              quantity: columnMap.qty >= 0 ? (row[columnMap.qty] || '').toString() : '',
              width: columnMap.width >= 0 ? (row[columnMap.width] || '').toString() : '',
              height: columnMap.height >= 0 ? (row[columnMap.height] || '').toString() : '',
              additionalDimension: columnMap.additionalDimension >= 0 ? (row[columnMap.additionalDimension] || '').toString() : '',
              color: columnMap.color >= 0 ? (row[columnMap.color] || '').toString() : '',
              argon: columnMap.argon >= 0 ? (row[columnMap.argon] || '').toString() : '',
              glassOption: columnMap.glassOption >= 0 ? (row[columnMap.glassOption] || '').toString() : '',
              gridStyle: columnMap.gridStyle >= 0 ? (row[columnMap.gridStyle] || '').toString() : '',
              frame: columnMap.frame >= 0 ? (row[columnMap.frame] || '').toString() : ''
            };
            
            if (item.name || item.quantity) {
              invoiceGroups[invoiceNum].items.push(item);
            }
          });
          
          const processedInvoices = Object.values(invoiceGroups).map(invoice => {
            const { wdgspString, unknownItems, unknownColors, unknownFrameStyles, unknownDeliveryMethods, glassOrderNeeded, itemOrderNeeded, hasSpecialOrder, specialOrderItems, processedItems } = categorizeItems(invoice.items || [], invoice.deliveryMethod);
            
            // Calculate total quantity for all items in this invoice
            const totalQuantity = (processedItems || []).reduce((sum, item) => {
              return sum + (parseInt(item.quantity) || 0);
            }, 0);
            
            // Check if delivery method requires shipping address
            const isDeliveryMethod = invoice.deliveryMethod && invoice.deliveryMethod.toLowerCase() === 'delivery';
            const missingShippingAddress = isDeliveryMethod && (!invoice.shippingAddress || invoice.shippingAddress.trim() === '');
            
            return {
              ...invoice,
              items: processedItems, // Use the processed items with requiresSpecialOrder field
              wdgspString,
              unknownItems,
              unknownColors,
              unknownFrameStyles,
              unknownDeliveryMethods,
              glassOrderNeeded,
              itemOrderNeeded,
              hasSpecialOrder,
              specialOrderItems,
              totalQuantity,
              missingShippingAddress
            };
          });
          resolve(processedInvoices);
          
        } catch (error) {
          reject(new Error(`Failed to parse Excel file: ${error.message}`));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read Excel file'));
      };
      
      reader.readAsArrayBuffer(file);
    });
  };

  const handlePreview = (data) => {
    setPreviewDialog({ open: true, data });
  };

  const handleDeleteClick = (index, data) => {
    setDeleteConfirmDialog({ open: true, index, data });
  };

  const handleDeleteConfirm = () => {
    const { index } = deleteConfirmDialog;
    const updatedResults = processedResults.filter((_, i) => i !== index);
    setProcessedResults(updatedResults);
    setDeleteConfirmDialog({ open: false, index: null, data: null });
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmDialog({ open: false, index: null, data: null });
  };


  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const clearAll = () => {
    setSelectedFiles([]);
    setProcessedResults([]);
    setProcessingComplete(false);
    setErrors([]);
    // Reset the file input element
    const fileInput = document.getElementById('file-input');
    if (fileInput) {
      fileInput.value = '';
    }
  };



  // Show loading state while fetching initial data
  if (dataLoading) {
    return (
      <Box sx={{ 
        maxWidth: '1200px', 
        mx: 'auto', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '60vh',
        gap: 3
      }}>
        <CircularProgress size={60} thickness={4} />
        <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 500 }}>
          Loading invoice processor...
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Fetching items, colors, frame styles, and delivery methods
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: '1200px', mx: 'auto' }}>
      <style>{pulseAnimation}</style>
      {/* Header Section */}
      <Box sx={{ mb: 4 }}>
        <Typography 
          variant="h3" 
          component="h1" 
          sx={{
            fontWeight: 800,
            color: 'text.primary',
            mb: 1,
            fontSize: { xs: '1.75rem', sm: '2.25rem', md: '2.5rem' }
          }}
        >
          Invoice Processor
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
          Transform your Excel invoice data into organized, actionable insights with our intelligent processing system.
        </Typography>
        <Chip 
          icon={<TableChart />}
          label="Excel Data Processing"
          variant="outlined"
          sx={{ 
            borderRadius: 2,
            fontWeight: 600
          }}
        />
      </Box>
      
      {/* Error Messages */}
      {errors.length > 0 && (
        <Box sx={{ mb: 3 }}>
          {errors.map((error, index) => (
            <Alert 
              key={index} 
              severity="warning" 
              sx={{ mb: 1 }}
              onClose={() => setErrors(prev => prev.filter((_, i) => i !== index))}
            >
              {error}
            </Alert>
          ))}
        </Box>
      )}
      
      {/* File Upload Area */}
      <Card 
        sx={{
          mb: 4,
          border: dragActive ? '2px dashed' : '1px solid',
          borderColor: dragActive ? 'primary.main' : 'divider',
          backgroundColor: dragActive ? 'action.hover' : 'background.paper',
          cursor: 'pointer',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            borderColor: 'primary.main',
            backgroundColor: 'action.hover'
          }
        }}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-input').click()}
      >
        <CardContent sx={{ p: 4, textAlign: 'center' }}>
          <CloudUpload 
            sx={{ 
              fontSize: 48, 
              color: 'primary.main', 
              mb: 2 
            }} 
          />
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
            Upload Excel Files
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Drop files here or click to browse • Supports .xlsm and .xlsx formats
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
            <Chip label=".xlsm" size="small" variant="outlined" />
            <Chip label=".xlsx" size="small" variant="outlined" />
          </Box>
        </CardContent>
      </Card>
      <input
        id="file-input"
        type="file"
        multiple
        accept=".xlsm,.xlsx"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

      {/* Selected Files Preview */}
      {selectedFiles.length > 0 && (
        <Card sx={{ mb: 4 }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <TableChart sx={{ color: 'primary.main', mr: 1 }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Selected Files
              </Typography>
              <Chip 
                label={selectedFiles.length} 
                color="primary" 
                size="small" 
                sx={{ ml: 2 }}
              />
            </Box>
          <Grid container spacing={3}>
            {selectedFiles.map((file, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Card sx={{ 
                  position: 'relative',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 8px 25px rgba(0,0,0,0.15)'
                  }
                }}>
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                      <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 32,
                        height: 32,
                        borderRadius: 1,
                        backgroundColor: 'success.light',
                        color: 'success.main',
                        mr: 2,
                        flexShrink: 0
                      }}>
                        <TableChart fontSize="small" />
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="subtitle2" noWrap sx={{ fontWeight: 600, mb: 0.5 }}>
                          {file.name}
                        </Typography>
                        <Chip 
                          label={formatFileSize(file.size)} 
                          size="small" 
                          variant="outlined"
                          color="primary"
                        />
                      </Box>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(index);
                        }}
                        sx={{ 
                          ml: 1,
                          '&:hover': {
                            backgroundColor: 'error.light',
                            color: 'error.contrastText'
                          }
                        }}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </CardContent>
        </Card>
      )}

      {/* Enhanced Processing Status */}
      {processing && (
        <Card sx={{ mb: 4 }}>
          <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 48,
              height: 48,
              borderRadius: 2,
              backgroundColor: 'primary.main',
              color: 'white',
              mr: 2
            }}>
              <CloudUpload />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                Processing Excel Data...
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {processingProgress.fileName} ({processingProgress.current} of {processingProgress.total})
              </Typography>
            </Box>
          </Box>
          <Box sx={{ mb: 2 }}>
            <LinearProgress 
              variant="determinate" 
              value={(processingProgress.current / processingProgress.total) * 100}
              sx={{
                height: 8,
                borderRadius: 4,
                backgroundColor: 'rgba(255,255,255,0.3)',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 4,
                  background: 'linear-gradient(90deg, #1976d2, #42a5f5)'
                }
              }}
            />
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            📊 Reading Excel data and parsing invoice information...
          </Typography>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Summary Statistics */}
      {processingComplete && processedResults.length > 0 && (
        <Card sx={{ mb: 4 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
              📈 Processing Summary
            </Typography>
            <Grid container spacing={3}>
               <Grid item xs={12} sm={6} md={3}>
                 <Card sx={{ 
                   background: 'linear-gradient(135deg, #4caf50 0%, #81c784 100%)',
                   color: 'white',
                   boxShadow: '0 4px 20px rgba(76, 175, 80, 0.3)',
                   height: '140px',
                   display: 'flex',
                   alignItems: 'center'
                 }}>
                   <CardContent sx={{ p: 3, textAlign: 'center', width: '100%' }}>
                   <Typography variant="h3" fontWeight="bold" sx={{ mb: 1 }}>
                     {processedResults.filter(r => r.status === 'success').length}
                   </Typography>
                   <Typography variant="body1" sx={{ opacity: 0.9 }}>
                     ✅ Processed Invoices
                   </Typography>
                   </CardContent>
                 </Card>
               </Grid>
               <Grid item xs={12} sm={6} md={3}>
                 <Card sx={{ 
                   background: 'linear-gradient(135deg, #f44336 0%, #ef5350 100%)',
                   color: 'white',
                   boxShadow: '0 4px 20px rgba(244, 67, 54, 0.3)',
                   height: '140px',
                   display: 'flex',
                   alignItems: 'center'
                 }}>
                   <CardContent sx={{ p: 3, textAlign: 'center', width: '100%' }}>
                   <Typography variant="h3" fontWeight="bold" sx={{ mb: 1 }}>
                      {processedResults.filter(r => 
                        (r.unknownItems && r.unknownItems.length > 0) ||
                        (r.unknownColors && r.unknownColors.length > 0) ||
                        (r.unknownFrameStyles && r.unknownFrameStyles.length > 0) ||
                        (r.unknownDeliveryMethods && r.unknownDeliveryMethods.length > 0) ||
                        r.missingShippingAddress
                      ).length}
                    </Typography>
                    <Typography variant="body1" sx={{ opacity: 0.9 }}>
                      ⚠️ Need Attention
                    </Typography>
                   </CardContent>
                 </Card>
               </Grid>
               <Grid item xs={12} sm={6} md={3}>
                 <Card sx={{ 
                   background: 'linear-gradient(135deg, #2196f3 0%, #64b5f6 100%)',
                   color: 'white',
                   boxShadow: '0 4px 20px rgba(33, 150, 243, 0.3)',
                   height: '140px',
                   display: 'flex',
                   alignItems: 'center'
                 }}>
                   <CardContent sx={{ p: 3, textAlign: 'center', width: '100%' }}>
                   <Typography variant="h3" fontWeight="bold" sx={{ mb: 1 }}>
                     {processedResults.reduce((sum, r) => {
                       if (r.items && Array.isArray(r.items)) {
                         return sum + r.items.reduce((itemSum, item) => {
                           return itemSum + (parseInt(item.quantity) || 0);
                         }, 0);
                       }
                       return sum;
                     }, 0)}
                   </Typography>
                   <Typography variant="body1" sx={{ opacity: 0.9 }}>
                     📦 Item Quantities
                   </Typography>
                   </CardContent>
                 </Card>
               </Grid>
               <Grid item xs={12} sm={6} md={3}>
                 <Card sx={{ 
                   background: 'linear-gradient(135deg, #ff9800 0%, #ffb74d 100%)',
                   color: 'white',
                   boxShadow: '0 4px 20px rgba(255, 152, 0, 0.3)',
                   height: '140px',
                   display: 'flex',
                   alignItems: 'center'
                 }}>
                   <CardContent sx={{ p: 3, textAlign: 'center', width: '100%' }}>
                   <Typography variant="h3" fontWeight="bold" sx={{ mb: 1 }}>
                      {processedResults.filter(r => 
                        r.deliveryMethod && r.deliveryMethod.toLowerCase() === 'delivery'
                      ).length}
                    </Typography>
                    <Typography variant="body1" sx={{ opacity: 0.9 }}>
                      🚚 Total Deliveries
                    </Typography>
                   </CardContent>
                 </Card>
               </Grid>
             </Grid>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Processing Results */}
      {processingComplete && processedResults.length > 0 && (
        <Card sx={{ mb: 4 }}>
          <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Box sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 48,
                height: 48,
                borderRadius: 2,
                backgroundColor: 'success.main',
                color: 'white',
                mr: 2
              }}>
                <TableChart />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Processing Results
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {processedResults.filter(r => r.status !== 'error').length} successful out of {processedResults.length} total
                </Typography>
              </Box>
            </Box>
          </Box>
          
          <TableContainer sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: 'primary.main' }}>
                  <TableCell sx={{ color: 'white', fontWeight: 600 }}>Order No.</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 600 }}>Customer</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 600 }}>Delivery Method</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 600 }}>WDGSP</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 600 }}>Item Qty</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 600 }}>Special Order</TableCell>
                  <TableCell align="center" sx={{ color: 'white', fontWeight: 600 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {processedResults.map((result, index) => {
                  const hasUnknownItems = (result.unknownItems && result.unknownItems.length > 0) ||
                                          (result.unknownColors && result.unknownColors.length > 0) ||
                                          (result.unknownFrameStyles && result.unknownFrameStyles.length > 0) ||
                                          (result.unknownDeliveryMethods && result.unknownDeliveryMethods.length > 0) ||
                                          result.missingShippingAddress ||
                                          result.isDuplicate;
                  return (
                    <TableRow 
                    key={`${result.orderNo || 'unknown'}-${index}`} 
                    hover 
                    sx={{ 
                      backgroundColor: '#ffffff', // Clean white background for all rows
                      '&:hover': {
                        backgroundColor: 'rgba(0, 0, 0, 0.04)', // Light gray on hover
                        transform: 'scale(1.01)',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                        zIndex: 1
                      },
                      transition: 'all 0.2s ease'
                    }}
                    >
                      <TableCell sx={{ fontWeight: 500 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {hasUnknownItems && (
                            <Tooltip title={
                               <Box>
                                 {result.isDuplicate && (
                                   <Box sx={{ mb: 1 }}>
                                     <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'error.main' }}>Duplicate Order Number:</Typography>
                                     <Typography variant="body2">Order #{result.orderNo} already exists in database</Typography>
                                   </Box>
                                 )}
                                 {result.unknownItems?.length > 0 && (
                                   <Box sx={{ mb: 1 }}>
                                     <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'warning.main' }}>Unknown Items:</Typography>
                                     <Typography variant="body2">{result.unknownItems.join(', ')}</Typography>
                                   </Box>
                                 )}
                                 {result.unknownColors?.length > 0 && (
                                   <Box sx={{ mb: 1 }}>
                                     <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'warning.main' }}>Unknown Colors:</Typography>
                                     <Typography variant="body2">{result.unknownColors.join(', ')}</Typography>
                                   </Box>
                                 )}
                                 {result.unknownFrameStyles?.length > 0 && (
                                   <Box sx={{ mb: 1 }}>
                                     <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'warning.main' }}>Unknown Frame Styles:</Typography>
                                     <Typography variant="body2">{result.unknownFrameStyles.join(', ')}</Typography>
                                   </Box>
                                 )}
                                 {result.unknownDeliveryMethods?.length > 0 && (
                                   <Box sx={{ mb: 1 }}>
                                     <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'warning.main' }}>Unknown Delivery Methods:</Typography>
                                     <Typography variant="body2">{result.unknownDeliveryMethods.join(', ')}</Typography>
                                   </Box>
                                 )}
                                 {result.missingShippingAddress && (
                                   <Box>
                                     <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'warning.main' }}>Missing Shipping Address:</Typography>
                                     <Typography variant="body2">Delivery method requires shipping address</Typography>
                                   </Box>
                                 )}
                               </Box>
                             }>
                              <Warning 
                                fontSize="small" 
                                sx={{ 
                                  color: result.isDuplicate ? 'error.main' : 'warning.main',
                                  animation: 'pulse 2s infinite'
                                }} 
                              />
                            </Tooltip>
                          )}
                          {result.orderNo || 'N/A'}
                        </Box>
                      </TableCell>
                      <TableCell>{result.customerInfo?.name || 'N/A'}</TableCell>
                      <TableCell>
                        <Chip 
                          label={result.deliveryMethod || 'N/A'}
                          size="small"
                          color={result.deliveryMethod?.toLowerCase() === 'delivery' ? 'primary' : 'secondary'}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={result.wdgspString || '0/0/0/0/0'}
                          size="small"
                          color="info"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={`${result.totalQuantity || 0}`}
                          size="small"
                          color="default"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        {result.hasSpecialOrder ? (
                          <Chip 
                            label="Yes"
                            size="small"
                            color="error"
                            variant="filled"
                            sx={{ fontWeight: 600 }}
                          />
                        ) : (
                          <Chip 
                            label="No"
                            size="small"
                            color="success"
                            variant="outlined"
                          />
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                          {result.status !== 'error' && (
                            <Tooltip title="Preview Details">
                              <IconButton 
                                size="small" 
                                onClick={() => handlePreview(result)}
                                sx={{
                                  backgroundColor: 'primary.light',
                                  color: 'primary.main',
                                  '&:hover': {
                                    backgroundColor: 'primary.main',
                                    color: 'white'
                                  }
                                }}
                              >
                                <Visibility fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="Delete Row">
                            <IconButton 
                              size="small" 
                              onClick={() => handleDeleteClick(index, result)}
                              sx={{
                                backgroundColor: 'error.light',
                                color: 'error.main',
                                '&:hover': {
                                  backgroundColor: 'error.main',
                                  color: 'white'
                                }
                              }}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          
          {/* Unknown Items Warning */}
          {processedResults.some(result => result.unknownItems && result.unknownItems.length > 0) && (
            <Box sx={{ mt: 3, mb: 2 }}>
              <Alert severity="warning" sx={{ borderRadius: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  ⚠️ Unknown Items Found
                </Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  The following invoices contain items that don't match your item database. Please review and update:
                </Typography>
                {processedResults
                  .filter(result => result.unknownItems && result.unknownItems.length > 0)
                  .map((result, index) => (
                    <Box key={index} sx={{ mb: 2, p: 2, backgroundColor: 'rgba(255,193,7,0.1)', borderRadius: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                        Invoice #{result.orderNo} - {result.customerInfo?.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Unknown items: {result.unknownItems.join(', ')}
                      </Typography>

                    </Box>
                  ))
                }
              </Alert>
            </Box>
          )}
          
          {/* Unknown Colors Warning */}
          {processedResults.some(result => result.unknownColors && result.unknownColors.length > 0) && (
            <Box sx={{ mt: 3, mb: 2 }}>
              <Alert severity="warning" sx={{ borderRadius: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  🎨 Unknown Colors Found
                </Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  The following invoices contain colors that don't match your color database. Please review and update:
                </Typography>
                {processedResults
                  .filter(result => result.unknownColors && result.unknownColors.length > 0)
                  .map((result, index) => (
                    <Box key={index} sx={{ mb: 2, p: 2, backgroundColor: 'rgba(255,193,7,0.1)', borderRadius: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                        Invoice #{result.orderNo} - {result.customerInfo?.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Unknown colors: {result.unknownColors.join(', ')}
                      </Typography>

                    </Box>
                  ))
                }
              </Alert>
            </Box>
          )}
          
          {/* Unknown Frame Styles Warning */}
          {processedResults.some(result => result.unknownFrameStyles && result.unknownFrameStyles.length > 0) && (
            <Box sx={{ mt: 3, mb: 2 }}>
              <Alert severity="warning" sx={{ borderRadius: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  🖼️ Unknown Frame Styles Found
                </Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  The following invoices contain frame styles that don't match your frame style database. Please review and update:
                </Typography>
                {processedResults
                  .filter(result => result.unknownFrameStyles && result.unknownFrameStyles.length > 0)
                  .map((result, index) => (
                    <Box key={index} sx={{ mb: 2, p: 2, backgroundColor: 'rgba(255,193,7,0.1)', borderRadius: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                        Invoice #{result.orderNo} - {result.customerInfo?.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Unknown frame styles: {result.unknownFrameStyles.join(', ')}
                      </Typography>

                    </Box>
                  ))
                }
              </Alert>
            </Box>
          )}
          
          {/* Unknown Delivery Methods Warning */}
          {processedResults.some(result => result.unknownDeliveryMethods && result.unknownDeliveryMethods.length > 0) && (
            <Box sx={{ mt: 3, mb: 2 }}>
              <Alert severity="warning" sx={{ borderRadius: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  🚚 Unknown Delivery Methods Found
                </Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  The following invoices contain delivery methods that don't match your delivery method database. Please review and update:
                </Typography>
                {processedResults
                  .filter(result => result.unknownDeliveryMethods && result.unknownDeliveryMethods.length > 0)
                  .map((result, index) => (
                    <Box key={index} sx={{ mb: 2, p: 2, backgroundColor: 'rgba(255,193,7,0.1)', borderRadius: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                        Invoice #{result.orderNo} - {result.customerInfo?.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Unknown delivery methods: {result.unknownDeliveryMethods.join(', ')}
                      </Typography>

                    </Box>
                  ))
                }
              </Alert>
            </Box>
          )}
          
          {/* Missing Shipping Address Warning */}
          {processedResults.some(result => result.missingShippingAddress) && (
            <Box sx={{ mt: 3, mb: 2 }}>
              <Alert severity="warning" sx={{ borderRadius: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  📍 Missing Shipping Address
                </Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  The following delivery invoices require shipping addresses. Please add shipping addresses before importing:
                </Typography>
                {processedResults
                  .filter(result => result.missingShippingAddress)
                  .map((result, index) => (
                    <Box key={index} sx={{ mb: 2, p: 2, backgroundColor: 'rgba(255,193,7,0.1)', borderRadius: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                        Invoice #{result.orderNo} - {result.customerInfo?.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Delivery method: {result.deliveryMethod} - Shipping address required
                      </Typography>

                    </Box>
                  ))
                }
              </Alert>
            </Box>
          )}
          
          {/* Duplicate Order Numbers Warning */}
          {processedResults.some(result => result.isDuplicate) && (
            <Box sx={{ mt: 3, mb: 2 }}>
              <Alert severity="error" sx={{ borderRadius: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  🔄 Duplicate Order Numbers Found
                </Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  The following invoices have order numbers that already exist in the database. These will be blocked from import:
                </Typography>
                {processedResults
                  .filter(result => result.isDuplicate)
                  .map((result, index) => (
                    <Box key={index} sx={{ mb: 2, p: 2, backgroundColor: 'rgba(244,67,54,0.1)', borderRadius: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                        Invoice #{result.orderNo} - {result.customerInfo?.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        This order number already exists in your database
                      </Typography>
                    </Box>
                  ))
                }
              </Alert>
            </Box>
          )}
          


          </CardContent>
        </Card>
      )}

      {/* Enhanced Action Buttons */}
      <Box sx={{ 
        display: 'flex', 
        gap: 3, 
        mb: 4,
        flexWrap: 'wrap',
        justifyContent: 'center'
      }}>
        <Button
          variant="contained"
          size="large"
          startIcon={<CloudUpload />}
          onClick={handleBeginProcess}
          disabled={selectedFiles.length === 0 || processing}
          sx={{
            px: 6,
            py: 2,
            fontSize: '1.1rem',
            fontWeight: 600,
            borderRadius: 3,
            background: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)',
            boxShadow: '0 4px 20px rgba(25, 118, 210, 0.3)',
            '&:hover': {
              background: 'linear-gradient(45deg, #1565c0 30%, #1976d2 90%)',
              transform: 'translateY(-2px)',
              boxShadow: '0 6px 25px rgba(25, 118, 210, 0.4)'
            },
            '&:disabled': {
              background: 'rgba(0, 0, 0, 0.12)'
            }
          }}
        >
          {processing ? 'Processing Data...' : 'Process Excel Data'}
        </Button>
        
        {(selectedFiles.length > 0 || processedResults.length > 0) && (
          <Button
            variant="outlined"
            size="large"
            onClick={clearAll}
            disabled={processing}
            sx={{ 
              px: 6, 
              py: 2,
              borderRadius: 3,
              borderWidth: 2,
              '&:hover': {
                borderWidth: 2,
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
              }
            }}
          >
            Clear All
          </Button>
        )}
        
        {processingComplete && processedResults.length > 0 && (
          <Button
            variant="contained"
            size="large"
            startIcon={<CloudUpload />}
            onClick={handleImportInvoices}
            disabled={processing || importing || hasWarnings}
            sx={{
              px: 6,
              py: 2,
              fontSize: '1.1rem',
              fontWeight: 600,
              borderRadius: 3,
              background: hasWarnings ? 'rgba(0, 0, 0, 0.12)' : 'linear-gradient(45deg, #4caf50 30%, #81c784 90%)',
              boxShadow: hasWarnings ? 'none' : '0 4px 20px rgba(76, 175, 80, 0.3)',
              '&:hover': {
                background: hasWarnings ? 'rgba(0, 0, 0, 0.12)' : 'linear-gradient(45deg, #388e3c 30%, #4caf50 90%)',
                transform: hasWarnings ? 'none' : 'translateY(-2px)',
                boxShadow: hasWarnings ? 'none' : '0 6px 25px rgba(76, 175, 80, 0.4)'
              },
              '&:disabled': {
                background: 'rgba(0, 0, 0, 0.12)'
              }
            }}
          >
            {importing ? 'Importing...' : 'Import to Database'}
          </Button>
        )}
      </Box>

      {/* Enhanced Preview Dialog */}
      <Dialog 
        open={previewDialog.open} 
        onClose={() => setPreviewDialog({ open: false, data: null })}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
          }
        }}
      >
        <DialogTitle sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          position: 'relative',
          py: 3
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
              borderRadius: 2,
              backgroundColor: 'rgba(255,255,255,0.2)',
              backdropFilter: 'blur(10px)'
            }}>
              <Visibility sx={{ color: 'white' }} />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
                Invoice Preview & Edit
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Order #{previewDialog.data?.orderNo || 'N/A'} • Review details and edit if needed
              </Typography>
            </Box>
          </Box>
          <IconButton
            onClick={() => setPreviewDialog({ open: false, data: null })}
            sx={{ 
              position: 'absolute', 
              right: 16, 
              top: 16,
              color: 'white',
              backgroundColor: 'rgba(255,255,255,0.1)',
              '&:hover': {
                backgroundColor: 'rgba(255,255,255,0.2)'
              }
            }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {previewDialog.data && (
            <Box sx={{ p: 4 }}>
              <Grid container spacing={4}>
                {/* Order Information Card */}
                <Grid item xs={12} md={6}>
                  <Card sx={{ 
                    height: '100%',
                    borderRadius: 3,
                    border: '1px solid rgba(0,0,0,0.08)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                    transition: 'transform 0.2s ease',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 8px 25px rgba(0,0,0,0.1)'
                    }
                  }}>
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                        <Box sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 36,
                          height: 36,
                          borderRadius: 2,
                          backgroundColor: 'primary.main',
                          color: 'white',
                          mr: 2
                        }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>📋</Typography>
                        </Box>
                        <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
                          Order Information
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>Order No.</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{previewDialog.data.orderNo || 'Not found'}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>Order Date</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{previewDialog.data.orderDate || 'Not found'}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>Due Date</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{previewDialog.data.dueDate || 'Not found'}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>Delivery Date</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{previewDialog.data.deliveryDate || 'Not found'}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>PO Number</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{previewDialog.data.poNumber || 'Not found'}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>Delivery Method</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {(() => {
                              const isUnknownDeliveryMethod = previewDialog.data.deliveryMethod && 
                                !deliveryMethods.some(dm => dm.name.toLowerCase() === previewDialog.data.deliveryMethod.toLowerCase());
                              const isEmptyDeliveryMethod = !previewDialog.data.deliveryMethod || previewDialog.data.deliveryMethod.trim() === '';
                              
                              return (
                                <>
                                  <Chip 
                                    label={previewDialog.data.deliveryMethod || 'Not found'}
                                    size="small"
                                    color={isUnknownDeliveryMethod || isEmptyDeliveryMethod ? 'warning' : 
                                           previewDialog.data.deliveryMethod?.toLowerCase() === 'delivery' ? 'primary' : 'secondary'}
                                    sx={{ fontWeight: 500 }}
                                  />
                                  {(isUnknownDeliveryMethod || isEmptyDeliveryMethod) && (
                                    <Tooltip title={isEmptyDeliveryMethod ? 
                                      'Delivery method is empty or missing' : 
                                      `"${previewDialog.data.deliveryMethod}" not found in database`
                                    }>
                                      <Warning 
                                        fontSize="small" 
                                        sx={{ 
                                          color: 'warning.main',
                                          animation: 'pulse 2s infinite'
                                        }} 
                                      />
                                    </Tooltip>
                                  )}
                                </>
                              );
                            })()} 
                          </Box>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>Paid Status</Typography>
                          <Chip 
                            label={previewDialog.data.paidStatus || 'Not found'}
                            size="small"
                            color={previewDialog.data.paidStatus?.toLowerCase() === 'paid' ? 'success' : 'warning'}
                            sx={{ fontWeight: 500 }}
                          />
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1 }}>
                          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>Glass Order</Typography>
                          {previewDialog.data.hasSpecialOrder ? (
                            <Chip 
                              label="🔍 Order Needed"
                              size="small"
                              color="error"
                              variant="filled"
                              sx={{ fontWeight: 600 }}
                            />
                          ) : (
                            <Chip 
                              label="No Order Required"
                              size="small"
                              color="success"
                              variant="outlined"
                              sx={{ fontWeight: 500 }}
                            />
                          )}
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Customer Information Card */}
                <Grid item xs={12} md={6}>
                  <Card sx={{ 
                    height: '100%',
                    borderRadius: 3,
                    border: '1px solid rgba(0,0,0,0.08)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                    transition: 'transform 0.2s ease',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 8px 25px rgba(0,0,0,0.1)'
                    }
                  }}>
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                        <Box sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 36,
                          height: 36,
                          borderRadius: 2,
                          backgroundColor: 'success.main',
                          color: 'white',
                          mr: 2
                        }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>👤</Typography>
                        </Box>
                        <Typography variant="h6" sx={{ fontWeight: 600, color: 'success.main' }}>
                          Customer Information
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 2, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>Customer Name</Typography>
                          <Typography variant="body1" sx={{ fontWeight: 600, textAlign: 'right' }}>
                            {previewDialog.data.customerInfo?.name || 'Not found'}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', py: 2, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>Shipping Address</Typography>
                          <Typography variant="body1" sx={{ fontWeight: 600, textAlign: 'right', maxWidth: '60%', whiteSpace: 'pre-line' }}>
                            {previewDialog.data.shippingAddress || 'Not specified'}
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Items Section */}
                <Grid item xs={12}>
                  <Card sx={{ 
                    borderRadius: 3,
                    border: '1px solid rgba(0,0,0,0.08)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                  }}>
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Box sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 36,
                            height: 36,
                            borderRadius: 2,
                            backgroundColor: 'warning.main',
                            color: 'white',
                            mr: 2
                          }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>📦</Typography>
                          </Box>
                          <Typography variant="h6" sx={{ fontWeight: 600, color: 'warning.main' }}>
                            Order Items
                          </Typography>
                        </Box>
                        <Chip 
                          label={`${previewDialog.data.items?.reduce((total, item) => total + (parseInt(item.quantity) || 0), 0)} qty`}
                          color="warning"
                          variant="outlined"
                          size="small"
                        />
                      </Box>
                      {previewDialog.data.items && previewDialog.data.items.length > 0 ? (
                        <TableContainer 
                          component={Paper} 
                          variant="outlined"
                          sx={{ 
                            borderRadius: 2,
                            border: '1px solid rgba(0,0,0,0.08)',
                            boxShadow: 'none'
                          }}
                        >
                          <Table size="small" sx={{ minWidth: 1400 }}>
                            <TableHead>
                              <TableRow sx={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
                                <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Item</TableCell>
                                <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Qty</TableCell>
                                <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>W</TableCell>
                                <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>H</TableCell>
                                <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>P/V</TableCell>
                                <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Color</TableCell>
                                <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Argon</TableCell>
                                <TableCell sx={{ fontWeight: 600, color: 'text.primary', width: '40px', textAlign: 'center', padding: '8px 4px' }}>🔍</TableCell>
                                <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Glass Option</TableCell>
                                <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Grid Style</TableCell>
                                <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Frame</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {previewDialog.data.items.map((item, index) => (
                                <TableRow 
                                  key={`preview-item-${item.name || 'unnamed'}-${index}`}
                                  sx={{
                                    '&:nth-of-type(odd)': {
                                      backgroundColor: 'rgba(0,0,0,0.01)'
                                    },
                                    '&:hover': {
                                      backgroundColor: 'rgba(25, 118, 210, 0.04)'
                                    }
                                  }}
                                >
                                  <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                        {item.name || 'N/A'}
                                      </Typography>
                                      {(() => {
                                        const dbItem = items.find(dbItem => 
                                          dbItem.name.toLowerCase() === (item.name || '').toLowerCase()
                                        );
                                        return !dbItem && item.name ? (
                                          <Tooltip title={`Item "${item.name}" not found in database`}>
                                            <Warning 
                                              fontSize="small" 
                                              sx={{ 
                                                color: 'warning.main',
                                                animation: 'pulse 2s infinite'
                                              }} 
                                            />
                                          </Tooltip>
                                        ) : null;
                                      })()} 
                                    </Box>
                                  </TableCell>
                                  <TableCell>
                                    <Chip 
                                      label={item.quantity || 'N/A'}
                                      size="small"
                                      color="primary"
                                      variant="outlined"
                                    />
                                  </TableCell>
                                  <TableCell sx={{ fontFamily: 'monospace' }}>{item.width || 'N/A'}</TableCell>
                                  <TableCell sx={{ fontFamily: 'monospace' }}>{item.height || 'N/A'}</TableCell>
                                  <TableCell sx={{ fontFamily: 'monospace' }}>{item.additionalDimension || 'N/A'}</TableCell>
                                  <TableCell>{item.color || 'N/A'}</TableCell>
                                  <TableCell>{item.argon || 'N/A'}</TableCell>
                                  <TableCell sx={{ width: '40px', textAlign: 'center', padding: '8px 4px' }}>
                                    {(() => {
                                      if (item.glassOption && item.glassOption.trim()) {
                                        const matchingGlassOption = glassOptions.find(dbGlass => 
                                          item.glassOption.toLowerCase().includes(dbGlass.glass_type.toLowerCase()) && dbGlass.order_needed
                                        );
                                        if (matchingGlassOption) {
                                          return '🔵';
                                        }
                                      }
                                      return '';
                                    })()
                                    }
                                  </TableCell>
                                  <TableCell>{item.glassOption || 'N/A'}</TableCell>
                                  <TableCell>{item.gridStyle || 'N/A'}</TableCell>
                                  <TableCell>{item.frame || 'N/A'}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      ) : (
                        <Box sx={{ 
                          textAlign: 'center', 
                          py: 4,
                          backgroundColor: 'rgba(0,0,0,0.02)',
                          borderRadius: 2,
                          border: '1px dashed rgba(0,0,0,0.1)'
                        }}>
                          <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
                            📭 No items found for this order
                          </Typography>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, backgroundColor: 'rgba(0,0,0,0.02)', justifyContent: 'space-between' }}>
          <Button
            onClick={() => setPreviewDialog({ open: false, data: null })}
            sx={{ 
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 500
            }}
          >
            Close
          </Button>
          <Button
            variant="contained"
            startIcon={<Edit />}
            onClick={() => {
              // Get the index from processedResults
              const index = processedResults.findIndex(invoice => 
                invoice.orderNo === previewDialog.data?.orderNo
              );
              // Close preview dialog and open edit dialog
              setPreviewDialog({ open: false, data: null });
              setEditDialog({ open: true, data: previewDialog.data, index });
            }}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              backgroundColor: 'warning.main',
              '&:hover': {
                backgroundColor: 'warning.dark'
              }
            }}
          >
            Edit Invoice
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmDialog.open}
        onClose={handleDeleteCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 600 }}>
          Confirm Delete
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Are you sure you want to delete this invoice record?
          </Typography>
          {deleteConfirmDialog.data && (
            <Box sx={{ p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                <strong>Order No:</strong> {deleteConfirmDialog.data.orderNo || 'N/A'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Customer:</strong> {deleteConfirmDialog.data.customerInfo?.name || 'N/A'}
              </Typography>
            </Box>
          )}
          <Typography variant="body2" color="error" sx={{ mt: 2 }}>
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button 
            onClick={handleDeleteCancel}
            variant="outlined"
            sx={{ borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteConfirm}
            variant="contained"
            color="error"
            sx={{ borderRadius: 2 }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Enhanced Edit Dialog with Item Editing */}
      <Dialog 
        open={editDialog.open} 
        onClose={() => setEditDialog({ open: false, data: null, index: null })}
        maxWidth={false}
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
            width: '90vw',
            maxWidth: '1200px',
            height: '90vh',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column'
          }
        }}
      >
        <DialogTitle sx={{
          background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
          color: 'white',
          position: 'relative',
          py: 3
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
              borderRadius: 2,
              backgroundColor: 'rgba(255,255,255,0.2)',
              backdropFilter: 'blur(10px)'
            }}>
              <Edit sx={{ color: 'white' }} />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
                Edit Invoice Data
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Order #{editDialog.data?.orderNo || 'N/A'}
              </Typography>
            </Box>
          </Box>
          <IconButton
            onClick={() => setEditDialog({ open: false, data: null, index: null })}
            sx={{ 
              position: 'absolute', 
              right: 16, 
              top: 16,
              color: 'white',
              backgroundColor: 'rgba(255,255,255,0.1)',
              '&:hover': {
                backgroundColor: 'rgba(255,255,255,0.2)'
              }
            }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0, flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {editDialog.data && (
            <Box sx={{ p: 5, flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
              {/* Invoice Information Section */}
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 4, color: 'primary.main' }}>
                📋 Invoice Information
              </Typography>
              <Grid container spacing={3} sx={{ mb: 4 }}>
                {/* First row - Customer Name only */}
                <Grid item xs={12} sx={{ mb: 2 }}>
                  <TextField
                    fullWidth
                    size="medium"
                    label="Customer Name"
                    value={editDialog.data.customerInfo?.name || ''}
                    onChange={(e) => setEditDialog(prev => ({
                      ...prev,
                      data: { 
                        ...prev.data, 
                        customerInfo: { 
                          ...prev.data.customerInfo, 
                          name: e.target.value 
                        }
                      }
                    }))}
                  />
                </Grid>
                
                {/* Force line break before other fields */}
                <Grid item xs={12} sx={{ height: 0, mb: 0 }}></Grid>
                
                {/* Second row onwards - All other fields with consistent sizing */}
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="medium"
                    label="Order Number"
                    value={editDialog.data.orderNo || ''}
                    onChange={(e) => setEditDialog(prev => ({
                      ...prev,
                      data: { ...prev.data, orderNo: e.target.value }
                    }))}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="medium"
                    label="PO Number"
                    value={editDialog.data.poNumber || ''}
                    onChange={(e) => setEditDialog(prev => ({
                      ...prev,
                      data: { ...prev.data, poNumber: e.target.value }
                    }))}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DatePicker
                      label="Order Date"
                      value={editDialog.data.orderDate ? dayjs(editDialog.data.orderDate) : null}
                      onChange={(newValue) => setEditDialog(prev => ({
                        ...prev,
                        data: { ...prev.data, orderDate: newValue ? newValue.format('YYYY-MM-DD') : '' }
                      }))}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          size: 'medium'
                        }
                      }}
                    />
                  </LocalizationProvider>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DatePicker
                      label="Due Date"
                      value={editDialog.data.dueDate ? dayjs(editDialog.data.dueDate) : null}
                      onChange={(newValue) => setEditDialog(prev => ({
                        ...prev,
                        data: { ...prev.data, dueDate: newValue ? newValue.format('YYYY-MM-DD') : '' }
                      }))}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          size: 'medium'
                        }
                      }}
                    />
                  </LocalizationProvider>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DatePicker
                      label="Delivery Date"
                      value={editDialog.data.deliveryDate ? dayjs(editDialog.data.deliveryDate) : null}
                      onChange={(newValue) => setEditDialog(prev => ({
                        ...prev,
                        data: { ...prev.data, deliveryDate: newValue ? newValue.format('YYYY-MM-DD') : '' }
                      }))}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          size: 'medium'
                        }
                      }}
                    />
                  </LocalizationProvider>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="medium"
                    label="Paid Status"
                    value={editDialog.data.paidStatus || ''}
                    onChange={(e) => setEditDialog(prev => ({
                      ...prev,
                      data: { ...prev.data, paidStatus: e.target.value }
                    }))}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="medium"
                    label="Via (Delivery Method)"
                    value={editDialog.data.deliveryMethod || ''}
                    onChange={(e) => setEditDialog(prev => ({
                      ...prev,
                      data: { ...prev.data, deliveryMethod: e.target.value }
                    }))}
                  />
                </Grid>
                
                {/* Shipping Address - placed at the end */}
                <Grid item xs={12} sx={{ mt: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    <TextField
                      fullWidth
                      size="medium"
                      label="Shipping Address"
                      multiline
                      rows={3}
                      value={editDialog.data.shippingAddress || ''}
                      onChange={(e) => setEditDialog(prev => ({
                        ...prev,
                        data: { 
                          ...prev.data, 
                          shippingAddress: e.target.value 
                        }
                      }))}
                      placeholder="Enter complete shipping address..."
                    />
                    {(() => {
                      const isDeliveryMethod = editDialog.data.deliveryMethod && editDialog.data.deliveryMethod.toLowerCase() === 'delivery';
                      const missingShippingAddress = isDeliveryMethod && (!editDialog.data.shippingAddress || editDialog.data.shippingAddress.trim() === '');
                      return missingShippingAddress ? (
                        <Tooltip title="Delivery method requires shipping address">
                          <Warning 
                            fontSize="small" 
                            sx={{ 
                              color: 'warning.main',
                              animation: 'pulse 2s infinite',
                              mt: 1
                            }} 
                          />
                        </Tooltip>
                      ) : null;
                    })()}
                  </Box>
                </Grid>
              </Grid>

              {/* Order Items Section */}
              <Divider sx={{ my: 3 }} />
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'warning.main' }}>
                  📦 Order Items
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    const newItem = {
                      name: '',
                      quantity: 1,
                      width: '',
                      height: '',
                      additionalDimension: '',
                      color: '',
                      argon: '',
                      glassOption: '',
                      gridStyle: '',
                      frame: ''
                    };
                    setEditDialog(prev => ({
                      ...prev,
                      data: {
                        ...prev.data,
                        items: [...(prev.data.items || []), newItem]
                      }
                    }));
                  }}
                  sx={{ borderRadius: 2 }}
                >
                  + Add Item
                </Button>
              </Box>
              
              {editDialog.data.items && editDialog.data.items.length > 0 ? (
                <TableContainer 
                  component={Card} 
                  variant="outlined"
                  sx={{ 
                    borderRadius: 2,
                    border: '1px solid rgba(0,0,0,0.08)',
                    boxShadow: 'none',
                    mb: 2,
                    overflow: 'auto',
                    flex: 1,
                    minHeight: '300px',
                    maxHeight: 'calc(100vh - 400px)'
                  }}
                >
                  <Table size="small" sx={{ minWidth: 1400 }}>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Item</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Qty</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>W</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>H</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>P/V</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Color</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Argon</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Glass Option</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Grid Style</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Frame</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {editDialog.data.items.map((item, itemIndex) => (
                        <TableRow key={`edit-item-${item.name || 'unnamed'}-${itemIndex}`}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Autocomplete
                                size="small"
                                options={itemOptions}
                                value={item.name || ''}
                                onChange={(event, newValue) => handleItemChange(itemIndex, 'name', newValue || '')}
                                freeSolo
                                autoComplete
                                autoHighlight
                                includeInputInList
                                filterSelectedOptions
                                disableClearable
                                getOptionLabel={(option) => option || ''}
                                isOptionEqualToValue={(option, value) => option === value}
                                renderInput={(params) => (
                                  <TextField
                                    {...params}
                                    placeholder="Select or type item name"
                                    size="small"
                                  />
                                )}
                                sx={{ minWidth: 200 }}
                              />
                              {(() => {
                                const dbItem = getItemValidation(item.name);
                                const shouldShowWarning = !dbItem && item.name;
  
                                return shouldShowWarning ? (
                                  <Tooltip title={`Item "${item.name}" not found in database`}>
                                    <Warning 
                                      fontSize="small" 
                                      sx={{ 
                                        color: 'warning.main',
                                        animation: 'pulse 2s infinite'
                                      }} 
                                    />
                                  </Tooltip>
                                ) : null;
                              })()} 
                            </Box>
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              type="number"
                              value={item.quantity || ''}
                              onChange={(e) => {
                                handleItemChange(itemIndex, 'quantity', parseInt(e.target.value) || 0);
                              }}
                              placeholder="Qty"
                               sx={{ width: 80 }}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              value={item.width || ''}
                              onChange={(e) => {
                                handleItemChange(itemIndex, 'width', e.target.value);
                              }}
                              placeholder="Width"
                              sx={{ width: 100 }}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              value={item.height || ''}
                              onChange={(e) => {
                                handleItemChange(itemIndex, 'height', e.target.value);
                              }}
                              placeholder="Height"
                              sx={{ width: 80 }}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              value={item.additionalDimension || ''}
                              onChange={(e) => {
                                handleItemChange(itemIndex, 'additionalDimension', e.target.value);
                              }}
                              placeholder="P/V"
                              sx={{ width: 80 }}
                            />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Autocomplete
                                size="small"
                                freeSolo
                                autoComplete
                                autoHighlight
                                includeInputInList
                                filterSelectedOptions
                                disableClearable
                                options={colorOptions}
                                value={item.color || ''}
                                onChange={(event, newValue) => handleItemChange(itemIndex, 'color', newValue || '')}
                                getOptionLabel={(option) => option || ''}
                                isOptionEqualToValue={(option, value) => option === value}
                                renderInput={(params) => (
                                  <TextField
                                    {...params}
                                    placeholder="Color"
                                    sx={{ width: 100 }}
                                  />
                                )}
                                sx={{ width: 80 }}
                              />
                              {(() => {
                                const dbColor = getColorValidation(item.color);
                                return !dbColor && item.color ? (
                                  <Tooltip title={`Color "${item.color}" not found in database`}>
                                    <Warning 
                                      fontSize="small" 
                                      sx={{ 
                                        color: 'warning.main',
                                        animation: 'pulse 2s infinite'
                                      }} 
                                    />
                                  </Tooltip>
                                ) : null;
                              })()} 
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Select
                              size="small"
                              value={item.argon === 'yes' || item.argon === 'YES' ? 'YES' : 'NONE'}
                              onChange={(e) => {
                                handleItemChange(itemIndex, 'argon', e.target.value === 'YES' ? 'yes' : '');
                              }}
                              sx={{ width: 80 }}
                            >
                              <MenuItem value="YES">YES</MenuItem>
                              <MenuItem value="NONE">NONE</MenuItem>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              value={item.glassOption || ''}
                              onChange={(e) => {
                                handleItemChange(itemIndex, 'glassOption', e.target.value);
                              }}
                              placeholder="Glass option"
                              sx={{ width: 150 }}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              value={item.gridStyle || ''}
                              onChange={(e) => {
                                handleItemChange(itemIndex, 'gridStyle', e.target.value);
                              }}
                              placeholder="Grid style"
                              sx={{ width: 120 }}
                            />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Autocomplete
                                size="small"
                                freeSolo
                                autoComplete
                                autoHighlight
                                includeInputInList
                                filterSelectedOptions
                                disableClearable
                                options={frameOptions}
                                value={item.frame || ''}
                                onChange={(event, newValue) => handleItemChange(itemIndex, 'frame', newValue || '')}
                                getOptionLabel={(option) => option || ''}
                                isOptionEqualToValue={(option, value) => option === value}
                                renderInput={(params) => (
                                  <TextField
                                    {...params}
                                    placeholder="Frame"
                                    sx={{ width: 120 }}
                                  />
                                )}
                                sx={{ width: 120 }}
                              />
                              {(() => {
                                const dbFrameStyle = getFrameValidation(item.frame);
                                return !dbFrameStyle && item.frame ? (
                                  <Tooltip title={`Frame style "${item.frame}" not found in database`}>
                                    <Warning 
                                      fontSize="small" 
                                      sx={{ 
                                        color: 'warning.main',
                                        animation: 'pulse 2s infinite'
                                      }} 
                                    />
                                  </Tooltip>
                                ) : null;
                              })()} 
                            </Box>
                          </TableCell>
                          <TableCell>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => {
                                const updatedItems = editDialog.data.items.filter((_, index) => index !== itemIndex);
                                setEditDialog(prev => ({
                                  ...prev,
                                  data: { ...prev.data, items: updatedItems }
                                }));
                              }}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Box sx={{ 
                  textAlign: 'center', 
                  py: 4,
                  backgroundColor: 'rgba(0,0,0,0.02)',
                  borderRadius: 2,
                  border: '1px dashed rgba(0,0,0,0.1)',
                  mb: 2
                }}>
                  <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
                    📭 No items found for this order
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      const newItem = {
                        name: '',
                        quantity: 1,
                        size: '',
                        glassOption: '',
                        gridStyle: '',
                        frame: ''
                      };
                      setEditDialog(prev => ({
                        ...prev,
                        data: {
                          ...prev.data,
                          items: [newItem]
                        }
                      }));
                    }}
                    sx={{ mt: 2, borderRadius: 2 }}
                  >
                    + Add First Item
                  </Button>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, backgroundColor: 'rgba(0,0,0,0.02)' }}>
          <Button 
            onClick={() => setEditDialog({ open: false, data: null, index: null })}
            sx={{ borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button 
            onClick={() => {
              // Recalculate totalQuantity and warning indicators when saving
              const { wdgspString, unknownItems, unknownColors, unknownFrameStyles, unknownDeliveryMethods, glassOrderNeeded, itemOrderNeeded, hasSpecialOrder, specialOrderItems } = categorizeItems(editDialog.data.items || [], editDialog.data.deliveryMethod);
              
              // Check if shipping address is missing for delivery method
              const isDeliveryMethod = editDialog.data.deliveryMethod && editDialog.data.deliveryMethod.toLowerCase() === 'delivery';
              const missingShippingAddress = isDeliveryMethod && (!editDialog.data.shippingAddress || editDialog.data.shippingAddress.trim() === '');
              
              const updatedData = {
                ...editDialog.data,
                totalQuantity: editDialog.data.items?.reduce((total, item) => total + (parseInt(item.quantity) || 0), 0) || 0,
                wdgspString,
                unknownItems,
                unknownColors,
                unknownFrameStyles,
                unknownDeliveryMethods,
                glassOrderNeeded,
                itemOrderNeeded,
                hasSpecialOrder,
                specialOrderItems,
                missingShippingAddress
              };
              
              const updatedResults = [...processedResults];
              updatedResults[editDialog.index] = updatedData;
              
              setProcessedResults(updatedResults);
              setEditDialog({ open: false, data: null, index: null });
            }}
            variant="contained"
            sx={{ borderRadius: 2 }}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>


    </Box>
  );
}

export default InvoiceProcessorPage;