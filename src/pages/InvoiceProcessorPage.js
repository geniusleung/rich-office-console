import React, { useState, useEffect } from 'react';
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
  TextField
} from '@mui/material';
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
  const [processingProgress, setProcessingProgress] = useState({ current: 0, total: 0, fileName: '' });
  const [items, setItems] = useState([]);
  
  // Fetch items from database on component mount
  useEffect(() => {
    fetchItems();
  }, []);
  
  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from('items')
        .select('*');
      
      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching items:', error);
    }
  };
  
  // Function to categorize items and count WDGSP
  const categorizeItems = (invoiceItems) => {
    const counts = { Window: 0, Door: 0, Glass: 0, Screen: 0, Part: 0 };
    const unknown = [];
    
    invoiceItems.forEach(item => {
      const dbItem = items.find(dbItem => 
        dbItem.name.toLowerCase() === item.name.toLowerCase()
      );
      
      if (dbItem && dbItem.item_type !== 'Other') {
        const quantity = parseInt(item.quantity) || 1;
        counts[dbItem.item_type] = (counts[dbItem.item_type] || 0) + quantity;
      } else if (!dbItem) {
        unknown.push(item.name);
      }
    });
    
    return {
      wdgspString: `${counts.Window}/${counts.Door}/${counts.Glass}/${counts.Screen}/${counts.Part}`,
      unknownItems: unknown
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
                orderDate: columnMap.date >= 0 ? (row[columnMap.date] || '').toString() : '',
                orderNo: invoiceNum.toString(),
                poNumber: columnMap.poNumber >= 0 ? (row[columnMap.poNumber] || '').toString() : '',
                customerInfo: {
                  name: columnMap.name >= 0 ? (row[columnMap.name] || '').toString() : '',
                  phone: '',
                  address: ''
                },
                dueDate: columnMap.dueDate >= 0 ? (row[columnMap.dueDate] || '').toString() : '',
                deliveryMethod: columnMap.via >= 0 ? (row[columnMap.via] || '').toString() : '',
                paidStatus: columnMap.paid >= 0 ? (row[columnMap.paid] || '').toString() : '',
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
            const { wdgspString, unknownItems } = categorizeItems(invoice.items || []);
            
            // Calculate total quantity for all items in this invoice
            const totalQuantity = (invoice.items || []).reduce((sum, item) => {
              return sum + (parseInt(item.quantity) || 0);
            }, 0);
            
            return {
              ...invoice,
              wdgspString,
              unknownItems,
              totalQuantity
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

  const handleEdit = (data, index) => {
    setEditDialog({ open: true, data: { ...data }, index });
  };

  const handleSaveEdit = () => {
    const updatedResults = [...processedResults];
    updatedResults[editDialog.index] = editDialog.data;
    setProcessedResults(updatedResults);
    setEditDialog({ open: false, data: null, index: null });
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

  // Helper function to get color based on delivery method
  const getDeliveryMethodColor = (deliveryMethod) => {
    if (!deliveryMethod) return '#ffffff'; // Default white for empty/null values
    
    const method = deliveryMethod.toLowerCase().trim();
    switch (method) {
      case 'delivery':
        return '#e3f2fd'; // Light blue for delivery
      case 'pick up':
      case 'pickup':
        return '#f3e5f5'; // Light purple for pick up
      default:
        return '#fff3e0'; // Light orange for unknown methods
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <style>{pulseAnimation}</style>
      {/* Enhanced Header */}
      <Box sx={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: 3,
        p: 4,
        mb: 4,
        color: 'white',
        textAlign: 'center'
      }}>
        <Typography variant="h3" component="h1" gutterBottom sx={{ 
          fontWeight: 700, 
          mb: 2,
          textShadow: '0 2px 4px rgba(0,0,0,0.3)'
        }}>
          📊 Invoice Processor
        </Typography>
        <Typography variant="h6" sx={{ 
          opacity: 0.9,
          fontWeight: 400,
          maxWidth: 600,
          mx: 'auto'
        }}>
          Transform your Excel invoice data into organized, actionable insights with our intelligent processing system
        </Typography>
      </Box>
      <Typography variant="h6" color="text.secondary" paragraph sx={{ mb: 4 }}>
        Upload Excel files (.xlsm, .xlsx) containing invoice data to process and extract order information.
      </Typography>
      
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
      
      {/* Enhanced File Upload Area */}
      <Paper
        elevation={dragActive ? 8 : 2}
        sx={{
          p: 5,
          mb: 4,
          border: dragActive ? '3px dashed #1976d2' : '2px dashed #e0e0e0',
          backgroundColor: dragActive ? 'rgba(25, 118, 210, 0.08)' : 'rgba(248, 250, 252, 0.8)',
          cursor: 'pointer',
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          borderRadius: 3,
          position: 'relative',
          overflow: 'hidden',
          '&:hover': {
            borderColor: '#1976d2',
            backgroundColor: 'rgba(25, 118, 210, 0.04)',
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 25px rgba(25, 118, 210, 0.15)'
          },
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, #1976d2, #42a5f5)',
            opacity: dragActive ? 1 : 0,
            transition: 'opacity 0.3s ease'
          }
        }}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-input').click()}
      >
        <Box sx={{ textAlign: 'center' }}>
          <Box sx={{
            display: 'inline-flex',
            p: 3,
            borderRadius: '50%',
            backgroundColor: 'primary.main',
            color: 'white',
            mb: 3,
            boxShadow: '0 4px 20px rgba(25, 118, 210, 0.3)'
          }}>
            <CloudUpload sx={{ fontSize: 48 }} />
          </Box>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, color: 'text.primary' }}>
            Drop Excel files here or click to browse
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            Supports .xlsm and .xlsx files with invoice data
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Chip label=".xlsm" color="primary" variant="outlined" size="small" />
            <Chip label=".xlsx" color="primary" variant="outlined" size="small" />
            <Chip label="Drag & Drop" color="secondary" variant="outlined" size="small" />
          </Box>
        </Box>
      </Paper>
      <input
        id="file-input"
        type="file"
        multiple
        accept=".xlsm,.xlsx"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

      {/* Enhanced Selected Files Preview */}
      {selectedFiles.length > 0 && (
        <Paper elevation={3} sx={{ p: 4, mb: 4, borderRadius: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
              borderRadius: 2,
              backgroundColor: 'success.main',
              color: 'white',
              mr: 2
            }}>
              <TableChart />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Selected Files ({selectedFiles.length})
            </Typography>
            <Chip 
              label={`${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''}`} 
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
        </Paper>
      )}

      {/* Enhanced Processing Status */}
      {processing && (
        <Paper elevation={4} sx={{ 
          p: 4, 
          mb: 4, 
          borderRadius: 3,
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
        }}>
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
        </Paper>
      )}

      {/* Enhanced Processing Results */}
      {processingComplete && processedResults.length > 0 && (
        <Paper elevation={4} sx={{ p: 4, mb: 4, borderRadius: 3 }}>
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
                  <TableCell sx={{ color: 'white', fontWeight: 600 }}>Order Date</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 600 }}>Delivery Method</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 600 }}>WDGSP</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 600 }}>Item Qty</TableCell>
                  <TableCell align="center" sx={{ color: 'white', fontWeight: 600 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {processedResults.map((result, index) => {
                  const hasUnknownItems = result.unknownItems && result.unknownItems.length > 0;
                  return (
                    <TableRow 
                    key={index} 
                    hover 
                    sx={{ 
                      backgroundColor: hasUnknownItems 
                        ? 'rgba(255, 193, 7, 0.1)' // Warning yellow background for unknown items
                        : getDeliveryMethodColor(result.deliveryMethod),
                      border: hasUnknownItems ? '2px solid #ff9800' : 'none', // Orange border for unknown items
                      '&:hover': {
                        backgroundColor: hasUnknownItems 
                          ? 'rgba(255, 193, 7, 0.2)' // Slightly darker yellow on hover
                          : `${getDeliveryMethodColor(result.deliveryMethod)} !important`, // Preserve delivery method color
                        transform: 'scale(1.01)',
                        boxShadow: hasUnknownItems 
                          ? '0 4px 15px rgba(255, 152, 0, 0.3)' // Orange shadow for unknown items
                          : '0 4px 15px rgba(0,0,0,0.1)',
                        zIndex: 1
                      },
                      transition: 'all 0.2s ease'
                    }}
                    >
                      <TableCell sx={{ fontWeight: 500 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {hasUnknownItems && (
                            <Tooltip title={`Unknown items: ${result.unknownItems.join(', ')}`}>
                              <Warning 
                                fontSize="small" 
                                sx={{ 
                                  color: 'warning.main',
                                  animation: 'pulse 2s infinite'
                                }} 
                              />
                            </Tooltip>
                          )}
                          {result.orderNo || 'N/A'}
                        </Box>
                      </TableCell>
                      <TableCell>{result.customerInfo?.name || 'N/A'}</TableCell>
                      <TableCell>{result.orderDate || 'N/A'}</TableCell>
                      <TableCell>
                        <Chip 
                          label={result.deliveryMethod || 'N/A'}
                          size="small"
                          color={result.deliveryMethod?.toLowerCase() === 'delivery' ? 'primary' : 'secondary'}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip 
                            label={result.wdgspString || '0/0/0/0/0'}
                            size="small"
                            color="info"
                            variant="outlined"
                          />
                          {hasUnknownItems && (
                            <Chip 
                              label="⚠️ Check Items"
                              size="small"
                              color="warning"
                              variant="filled"
                              sx={{ fontWeight: 600 }}
                            />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={`${result.totalQuantity || 0}`}
                          size="small"
                          color={hasUnknownItems ? 'warning' : 'default'}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                          {result.status !== 'error' && (
                            <>
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
                              <Tooltip title="Edit Data">
                                <IconButton 
                                  size="small" 
                                  onClick={() => handleEdit(result, index)}
                                  sx={{
                                    backgroundColor: 'warning.light',
                                    color: 'warning.main',
                                    '&:hover': {
                                      backgroundColor: 'warning.main',
                                      color: 'white'
                                    }
                                  }}
                                >
                                  <Edit fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
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
                      <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        💡 Suggestion: Add these items to your item database or verify the item names in the Excel file
                      </Typography>
                    </Box>
                  ))
                }
              </Alert>
            </Box>
          )}
          
          {/* Enhanced Summary Statistics */}
          <Divider sx={{ my: 4 }} />
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
            📈 Processing Summary
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ 
                p: 3, 
                textAlign: 'center', 
                background: 'linear-gradient(135deg, #4caf50 0%, #81c784 100%)',
                color: 'white',
                borderRadius: 3,
                boxShadow: '0 4px 20px rgba(76, 175, 80, 0.3)'
              }}>
                <Typography variant="h3" fontWeight="bold" sx={{ mb: 1 }}>
                  {processedResults.filter(r => r.status === 'success').length}
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.9 }}>
                  ✅ Successfully Processed
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ 
                p: 3, 
                textAlign: 'center', 
                background: 'linear-gradient(135deg, #f44336 0%, #ef5350 100%)',
                color: 'white',
                borderRadius: 3,
                boxShadow: '0 4px 20px rgba(244, 67, 54, 0.3)'
              }}>
                <Typography variant="h3" fontWeight="bold" sx={{ mb: 1 }}>
                  {processedResults.filter(r => r.status === 'error').length}
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.9 }}>
                  ❌ Failed
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ 
                p: 3, 
                textAlign: 'center', 
                background: 'linear-gradient(135deg, #2196f3 0%, #64b5f6 100%)',
                color: 'white',
                borderRadius: 3,
                boxShadow: '0 4px 20px rgba(33, 150, 243, 0.3)'
              }}>
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
                  📦 Total Item Quantities
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ 
                p: 3, 
                textAlign: 'center', 
                background: 'linear-gradient(135deg, #ff9800 0%, #ffb74d 100%)',
                color: 'white',
                borderRadius: 3,
                boxShadow: '0 4px 20px rgba(255, 152, 0, 0.3)'
              }}>
                <Typography variant="h3" fontWeight="bold" sx={{ mb: 1 }}>
                  {processedResults.reduce((sum, r) => sum + (r.items?.length || 0), 0)}
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.9 }}>
                  📋 Total Items
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Paper>
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
                Invoice Preview
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Order #{previewDialog.data?.orderNo || 'N/A'}
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
                          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>PO Number</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{previewDialog.data.poNumber || 'Not found'}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>Delivery Method</Typography>
                          <Chip 
                            label={previewDialog.data.deliveryMethod || 'Not found'}
                            size="small"
                            color={previewDialog.data.deliveryMethod?.toLowerCase() === 'delivery' ? 'primary' : 'secondary'}
                            sx={{ fontWeight: 500 }}
                          />
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1 }}>
                          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>Paid Status</Typography>
                          <Chip 
                            label={previewDialog.data.paidStatus || 'Not found'}
                            size="small"
                            color={previewDialog.data.paidStatus?.toLowerCase() === 'paid' ? 'success' : 'warning'}
                            sx={{ fontWeight: 500 }}
                          />
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
                          <Table size="small">
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
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {previewDialog.data.items.map((item, index) => (
                                <TableRow 
                                  key={index}
                                  sx={{
                                    '&:nth-of-type(odd)': {
                                      backgroundColor: 'rgba(0,0,0,0.01)'
                                    },
                                    '&:hover': {
                                      backgroundColor: 'rgba(25, 118, 210, 0.04)'
                                    }
                                  }}
                                >
                                  <TableCell sx={{ fontWeight: 500 }}>{item.name || 'N/A'}</TableCell>
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
      </Dialog>

      {/* Enhanced Edit Dialog with Item Editing */}
      <Dialog 
        open={editDialog.open} 
        onClose={() => setEditDialog({ open: false, data: null, index: null })}
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
        <DialogContent sx={{ p: 0 }}>
          {editDialog.data && (
            <Box sx={{ p: 4 }}>
              {/* Invoice Information Section */}
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3, color: 'primary.main' }}>
                📋 Invoice Information
              </Typography>
              <Grid container spacing={2} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Type"
                    value={editDialog.data.type || ''}
                    onChange={(e) => setEditDialog(prev => ({
                      ...prev,
                      data: { ...prev.data, type: e.target.value }
                    }))}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
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
                    label="Order Date"
                    value={editDialog.data.orderDate || ''}
                    onChange={(e) => setEditDialog(prev => ({
                      ...prev,
                      data: { ...prev.data, orderDate: e.target.value }
                    }))}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Due Date"
                    value={editDialog.data.dueDate || ''}
                    onChange={(e) => setEditDialog(prev => ({
                      ...prev,
                      data: { ...prev.data, dueDate: e.target.value }
                    }))}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="PO Number"
                    value={editDialog.data.poNumber || ''}
                    onChange={(e) => setEditDialog(prev => ({
                      ...prev,
                      data: { ...prev.data, poNumber: e.target.value }
                    }))}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
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
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Via (Delivery Method)"
                    value={editDialog.data.deliveryMethod || ''}
                    onChange={(e) => setEditDialog(prev => ({
                      ...prev,
                      data: { ...prev.data, deliveryMethod: e.target.value }
                    }))}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Paid Status"
                    value={editDialog.data.paidStatus || ''}
                    onChange={(e) => setEditDialog(prev => ({
                      ...prev,
                      data: { ...prev.data, paidStatus: e.target.value }
                    }))}
                  />
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
                      size: '',
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
                  component={Paper} 
                  variant="outlined"
                  sx={{ 
                    borderRadius: 2,
                    border: '1px solid rgba(0,0,0,0.08)',
                    boxShadow: 'none',
                    mb: 2
                  }}
                >
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Item</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Qty</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Size</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Glass Option</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Grid Style</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Frame</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {editDialog.data.items.map((item, itemIndex) => (
                        <TableRow key={itemIndex}>
                          <TableCell>
                            <TextField
                              size="small"
                              value={item.name || ''}
                              onChange={(e) => {
                                const updatedItems = [...editDialog.data.items];
                                updatedItems[itemIndex] = { ...updatedItems[itemIndex], name: e.target.value };
                                setEditDialog(prev => ({
                                  ...prev,
                                  data: { ...prev.data, items: updatedItems }
                                }));
                              }}
                              placeholder="Item name"
                              sx={{ minWidth: 120 }}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              type="number"
                              value={item.quantity || ''}
                              onChange={(e) => {
                                const updatedItems = [...editDialog.data.items];
                                updatedItems[itemIndex] = { ...updatedItems[itemIndex], quantity: parseInt(e.target.value) || 0 };
                                setEditDialog(prev => ({
                                  ...prev,
                                  data: { ...prev.data, items: updatedItems }
                                }));
                              }}
                              sx={{ width: 80 }}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              value={item.size || ''}
                              onChange={(e) => {
                                const updatedItems = [...editDialog.data.items];
                                updatedItems[itemIndex] = { ...updatedItems[itemIndex], size: e.target.value };
                                setEditDialog(prev => ({
                                  ...prev,
                                  data: { ...prev.data, items: updatedItems }
                                }));
                              }}
                              placeholder="Size"
                              sx={{ minWidth: 100 }}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              value={item.glassOption || ''}
                              onChange={(e) => {
                                const updatedItems = [...editDialog.data.items];
                                updatedItems[itemIndex] = { ...updatedItems[itemIndex], glassOption: e.target.value };
                                setEditDialog(prev => ({
                                  ...prev,
                                  data: { ...prev.data, items: updatedItems }
                                }));
                              }}
                              placeholder="Glass option"
                              sx={{ minWidth: 120 }}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              value={item.gridStyle || ''}
                              onChange={(e) => {
                                const updatedItems = [...editDialog.data.items];
                                updatedItems[itemIndex] = { ...updatedItems[itemIndex], gridStyle: e.target.value };
                                setEditDialog(prev => ({
                                  ...prev,
                                  data: { ...prev.data, items: updatedItems }
                                }));
                              }}
                              placeholder="Grid style"
                              sx={{ minWidth: 100 }}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              value={item.frame || ''}
                              onChange={(e) => {
                                const updatedItems = [...editDialog.data.items];
                                updatedItems[itemIndex] = { ...updatedItems[itemIndex], frame: e.target.value };
                                setEditDialog(prev => ({
                                  ...prev,
                                  data: { ...prev.data, items: updatedItems }
                                }));
                              }}
                              placeholder="Frame"
                              sx={{ minWidth: 100 }}
                            />
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
              // Recalculate totalQuantity when saving
              const updatedData = {
                ...editDialog.data,
                totalQuantity: editDialog.data.items?.reduce((total, item) => total + (parseInt(item.quantity) || 0), 0) || 0
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

      {/* Instructions */}
      <Paper sx={{ p: 3, mt: 4, backgroundColor: 'rgba(25, 118, 210, 0.04)' }}>
        <Typography variant="h6" gutterBottom>
          Excel File Format Requirements
        </Typography>
        <Typography variant="body2" component="div">
          <strong>Required Column Headers:</strong>
          <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
            <li><strong>Type:</strong> Invoice type</li>
            <li><strong>Date:</strong> Order date</li>
            <li><strong>Num:</strong> Invoice/order number</li>
            <li><strong>P.O. #:</strong> Purchase order number</li>
            <li><strong>Name:</strong> Customer name</li>
            <li><strong>Due date:</strong> Order ready date</li>
            <li><strong>Item:</strong> Item name</li>
            <li><strong>Qty:</strong> Item quantity</li>
            <li><strong>Via:</strong> Delivery method</li>
            <li><strong>Paid:</strong> Payment status</li>
            <li><strong>W:</strong> Item width</li>
            <li><strong>H:</strong> Item height</li>
            <li><strong>P/V:</strong> Additional dimension</li>
            <li><strong>Color:</strong> Item color</li>
            <li><strong>Argon:</strong> Argon gas requirement</li>
            <li><strong>Glass option:</strong> Glass specifications</li>
            <li><strong>Grid Style:</strong> Grid pattern</li>
            <li><strong>Frame:</strong> Frame specifications</li>
          </ul>
          <Typography variant="body2" sx={{ mt: 2, fontStyle: 'italic' }}>
            The system will automatically group rows by invoice number and process delivery method and payment status. Multiple items per invoice are supported.
          </Typography>
        </Typography>
      </Paper>
      
      {/* Enhanced Color Legend */}
      <Paper elevation={2} sx={{ 
        p: 3, 
        backgroundColor: 'rgba(248, 250, 252, 0.8)', 
        borderRadius: 3,
        border: '1px solid rgba(0,0,0,0.05)'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: 1,
            backgroundColor: 'info.main',
            color: 'white',
            mr: 2
          }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>🎨</Typography>
          </Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Delivery Method Color Legend
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ 
              width: 24, 
              height: 24, 
              backgroundColor: '#e3f2fd', 
              border: '2px solid #1976d2',
              borderRadius: 1,
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }} />
            <Typography variant="body1" sx={{ fontWeight: 500 }}>🚚 Delivery</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ 
              width: 24, 
              height: 24, 
              backgroundColor: '#f3e5f5', 
              border: '2px solid #9c27b0',
              borderRadius: 1,
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }} />
            <Typography variant="body1" sx={{ fontWeight: 500 }}>🏪 Pick Up</Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}

export default InvoiceProcessorPage;