import React, { useState } from 'react';
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
  Download, 
  Visibility, 
  CheckCircle,
  Error as ErrorIcon,
  Edit,
  Close
} from '@mui/icons-material';
import * as XLSX from 'xlsx';

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
    console.log('handleBeginProcess called, selectedFiles:', selectedFiles);
    if (selectedFiles.length === 0) {
      console.log('No files selected');
      return;
    }
    
    console.log('Starting processing...');
    setProcessing(true);
    setProcessingComplete(false);
    setProcessedResults([]);
    setErrors([]);
    setProcessingProgress({ current: 0, total: selectedFiles.length, fileName: '' });
    
    try {
      const allResults = [];
      
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        console.log(`Processing file ${i + 1}/${selectedFiles.length}:`, file.name);
        setProcessingProgress({ current: i + 1, total: selectedFiles.length, fileName: file.name });
        
        try {
          console.log('Calling parseExcelData for:', file.name);
          const invoices = await parseExcelData(file);
          console.log('parseExcelData returned:', invoices);
          allResults.push(...invoices);
        } catch (error) {
          console.error('Error processing file:', file.name, error);
          setErrors(prev => [...prev, error.message]);
          allResults.push({
            fileName: file.name,
            status: 'error',
            error: error.message
          });
        }
      }
      
      console.log('All results:', allResults);
      setProcessedResults(allResults);
      setProcessingComplete(true);
      
    } catch (error) {
      console.error('Processing failed:', error);
      setErrors(prev => [...prev, 'Processing failed: ' + error.message]);
    } finally {
      setProcessing(false);
      setProcessingProgress({ current: 0, total: 0, fileName: '' });
      console.log('Processing completed');
    }
  };

  const parseExcelData = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          console.log('Reading Excel file...');
          const data = new Uint8Array(e.target.result);
          
          // Enhanced workbook reading options for .xlsm files
          const workbook = XLSX.read(data, { 
            type: 'array',
            cellDates: true,
            cellNF: false,
            cellText: false,
            raw: false,
            codepage: 65001 // UTF-8
          });
          
          console.log('Workbook created, sheet names:', workbook.SheetNames);
          
          // Try to find the correct worksheet
          let worksheet;
          let sheetName;
          
          // First try to find a sheet with data
          for (const name of workbook.SheetNames) {
            const testSheet = workbook.Sheets[name];
            const testData = XLSX.utils.sheet_to_json(testSheet, { header: 1, raw: false });
            
            // Check if this sheet has meaningful data (non-empty rows with multiple columns)
            const nonEmptyRows = testData.filter(row => row && row.length > 5);
            if (nonEmptyRows.length > 1) {
              worksheet = testSheet;
              sheetName = name;
              console.log('Using worksheet:', sheetName);
              break;
            }
          }
          
          // Fallback to first sheet if no suitable sheet found
          if (!worksheet) {
            sheetName = workbook.SheetNames[0];
            worksheet = workbook.Sheets[sheetName];
            console.log('Fallback to first worksheet:', sheetName);
          }
          
          // Convert to JSON with better options
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1, 
            raw: false,
            defval: '',
            blankrows: false
          });
          
          console.log('JSON data length:', jsonData.length);
          console.log('Raw Excel data:', jsonData.slice(0, 3)); // Log first 3 rows for debugging
          
          // Filter out completely empty rows
          const filteredData = jsonData.filter(row => {
            return row && row.some(cell => cell !== null && cell !== undefined && cell.toString().trim() !== '');
          });
          
          console.log('Filtered data length:', filteredData.length);
          
          if (!filteredData || filteredData.length < 2) {
            throw new Error('Excel file must contain at least a header row and one data row');
          }
          
          const headers = filteredData[0];
          const rows = filteredData.slice(1);
          
          console.log('Headers found:', headers);
          console.log('Headers length:', headers.length);
          console.log('Processing', rows.length, 'data rows');
          
          // Validate headers
          if (!headers || headers.length === 0) {
            throw new Error('No headers found in the Excel file. Please ensure the first row contains column headers.');
          }
          
          // Enhanced column mapping with more flexible matching
          const columnMap = {
            type: headers.findIndex(h => h && h.toString().toLowerCase().includes('type')),
            date: headers.findIndex(h => h && h.toString().toLowerCase().includes('date') && !h.toString().toLowerCase().includes('due')),
            num: headers.findIndex(h => h && (h.toString().toLowerCase().includes('num') || h.toString().toLowerCase().includes('number') || h.toString().toLowerCase().includes('#'))),
            poNumber: headers.findIndex(h => h && (h.toString().toLowerCase().includes('p.o.') || h.toString().toLowerCase().includes('po') || h.toString().toLowerCase().includes('p. o.') || h.toString().toLowerCase().includes('po #'))),
            name: headers.findIndex(h => h && h.toString().toLowerCase().includes('name') && !h.toString().toLowerCase().includes('file')),
            dueDate: headers.findIndex(h => h && h.toString().toLowerCase().includes('due')),
            item: headers.findIndex(h => h && h.toString().toLowerCase().includes('item')),
            qty: headers.findIndex(h => h && (h.toString().toLowerCase().includes('qty') || h.toString().toLowerCase().includes('quantity'))),
            size: headers.findIndex(h => h && (h.toString().toLowerCase().includes('size') || h.toString().toLowerCase().includes('w') && h.toString().toLowerCase().includes('h') || h.toString().toLowerCase().includes("w' x h'") || h.toString().toLowerCase().includes('w\'\'') || h.toString().includes('W\'\''))),
            glassOption: headers.findIndex(h => h && h.toString().toLowerCase().includes('glass')),
            gridStyle: headers.findIndex(h => h && (h.toString().toLowerCase().includes('grid') || h.toString().toLowerCase().includes('gride'))),
            frame: headers.findIndex(h => h && h.toString().toLowerCase().includes('frame')),
            shipToCity: headers.findIndex(h => h && h.toString().toLowerCase().includes('ship') && h.toString().toLowerCase().includes('city')),
            shipToAddress1: headers.findIndex(h => h && h.toString().toLowerCase().includes('ship') && h.toString().toLowerCase().includes('address') && h.toString().includes('1')),
            shipToAddress2: headers.findIndex(h => h && h.toString().toLowerCase().includes('ship') && h.toString().toLowerCase().includes('address') && h.toString().includes('2')),
            shipToState: headers.findIndex(h => h && h.toString().toLowerCase().includes('ship') && h.toString().toLowerCase().includes('state')),
            shipZip: headers.findIndex(h => h && h.toString().toLowerCase().includes('ship') && h.toString().toLowerCase().includes('zip'))
          };
          
          console.log('Column mapping:', columnMap);
          
          // Check if we found any essential columns
          const essentialColumns = ['type', 'num', 'name'];
          const foundEssential = essentialColumns.some(col => columnMap[col] >= 0);
          
          if (!foundEssential) {
            console.warn('Warning: No essential columns found. Available headers:', headers);
            console.warn('Looking for columns containing: type, num/number, name/customer');
          }
          
          // Group rows by invoice number to handle multiple items per invoice
          const invoiceGroups = {};
          
          rows.forEach((row, rowIndex) => {
            if (!row || row.length === 0) return;
            
            // Log the full row, not just first 10 columns
            console.log(`Processing row ${rowIndex + 2}:`, row);
            
            // Only process rows where Type column is 'Invoice'
            const rowType = columnMap.type >= 0 ? row[columnMap.type] : '';
            if (columnMap.type >= 0 && (!rowType || rowType.toString().toLowerCase() !== 'invoice')) {
              console.log(`Skipping row ${rowIndex + 2} - Type: '${rowType}' (not 'invoice')`);
              return; // Skip non-invoice rows
            }
            
            const invoiceNum = columnMap.num >= 0 ? row[columnMap.num] : `Row_${rowIndex + 2}`;
            
            if (!invoiceGroups[invoiceNum]) {
              // Build ship to address components
              const shipToAddress1 = columnMap.shipToAddress1 >= 0 ? (row[columnMap.shipToAddress1] || '').toString().trim() : '';
              const shipToAddress2 = columnMap.shipToAddress2 >= 0 ? (row[columnMap.shipToAddress2] || '').toString().trim() : '';
              const shipToCity = columnMap.shipToCity >= 0 ? (row[columnMap.shipToCity] || '').toString().trim() : '';
              const shipToState = columnMap.shipToState >= 0 ? (row[columnMap.shipToState] || '').toString().trim() : '';
              const shipZip = columnMap.shipZip >= 0 ? (row[columnMap.shipZip] || '').toString().trim() : '';
              
              // Build combined address
              const shipToAddress = [shipToAddress1, shipToAddress2, shipToCity, shipToState, shipZip]
                .filter(part => part && part.trim())
                .join(' ');
              
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
                deliveryMethod: '',
                shipTo: {
                  name: columnMap.name >= 0 ? (row[columnMap.name] || '').toString() : '',
                  phone: '',
                  address: shipToAddress,
                  city: shipToCity,
                  address1: shipToAddress1,
                  address2: shipToAddress2,
                  state: shipToState,
                  zip: shipZip
                },
                items: [],
                extractionConfidence: 'high',
                status: 'success'
              };
              
              console.log(`Created invoice group for: ${invoiceNum}`, {
                type: invoiceGroups[invoiceNum].type,
                orderDate: invoiceGroups[invoiceNum].orderDate,
                poNumber: invoiceGroups[invoiceNum].poNumber,
                customerName: invoiceGroups[invoiceNum].customerInfo.name,
                shipToCity: invoiceGroups[invoiceNum].shipTo.city
              });
            }
            
            // Add item to the invoice
            const item = {
              name: columnMap.item >= 0 ? (row[columnMap.item] || '').toString() : '',
              quantity: columnMap.qty >= 0 ? (row[columnMap.qty] || '').toString() : '',
              size: columnMap.size >= 0 ? (row[columnMap.size] || '').toString() : '',
              glassOption: columnMap.glassOption >= 0 ? (row[columnMap.glassOption] || '').toString() : '',
              gridStyle: columnMap.gridStyle >= 0 ? (row[columnMap.gridStyle] || '').toString() : '',
              frame: columnMap.frame >= 0 ? (row[columnMap.frame] || '').toString() : ''
            };
            
            console.log(`Item data for row ${rowIndex + 2}:`, {
              name: item.name,
              quantity: item.quantity,
              size: item.size,
              glassOption: item.glassOption,
              gridStyle: item.gridStyle,
              frame: item.frame
            });
            
            if (item.name || item.quantity) {
              invoiceGroups[invoiceNum].items.push(item);
              console.log(`Added item to invoice ${invoiceNum}:`, item);
            } else {
              console.log(`No item data found for row ${rowIndex + 2}`);
            }
          });
          
          const processedInvoices = Object.values(invoiceGroups);
          console.log('Final processed invoices:', processedInvoices.length);
          console.log('Sample invoice structure:', processedInvoices[0]);
          resolve(processedInvoices);
          
        } catch (error) {
          console.error('Error in parseExcelData:', error);
          reject(new Error(`Failed to parse Excel file: ${error.message}`));
        }
      };
      
      reader.onerror = () => {
        console.error('FileReader error');
        reject(new Error('Failed to read Excel file'));
      };
      
      console.log('Starting to read file as ArrayBuffer');
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

  const handleExportResults = () => {
    const csvContent = [
      ['Type', 'Order No.', 'Customer Name', 'Order Date', 'Due Date', 'Delivery Method', 'PO Number', 'Ship To Address', 'Items Count'],
      ...processedResults.filter(r => r.status !== 'error').map(result => [
        result.type || '',
        result.orderNo || '',
        result.customerInfo?.name || '',
        result.orderDate || '',
        result.dueDate || '',
        result.deliveryMethod || '',
        result.poNumber || '',
        result.shipTo?.address || '',
        result.items?.length || 0
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice_processing_results_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
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
  };

  return (
    <Box>
      <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
        Invoice Processor
      </Typography>
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
      
      {/* File Upload Area */}
      <Paper
        sx={{
          p: 4,
          mb: 3,
          border: dragActive ? '2px dashed #1976d2' : '2px dashed #ccc',
          backgroundColor: dragActive ? 'rgba(25, 118, 210, 0.04)' : 'transparent',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          '&:hover': {
            borderColor: '#1976d2',
            backgroundColor: 'rgba(25, 118, 210, 0.04)'
          }
        }}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-input').click()}
      >
        <Box sx={{ textAlign: 'center' }}>
          <CloudUpload sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Drop Excel files here or click to browse
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Supports .xlsm and .xlsx files with invoice data
          </Typography>
          <input
            id="file-input"
            type="file"
            multiple
            accept=".xlsm,.xlsx"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
        </Box>
      </Paper>

      {/* Selected Files Preview */}
      {selectedFiles.length > 0 && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Selected Files ({selectedFiles.length})
          </Typography>
          <Grid container spacing={2}>
            {selectedFiles.map((file, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Card sx={{ position: 'relative' }}>
                  <CardContent sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <TableChart sx={{ color: 'success.main', mr: 1 }} />
                      <Typography variant="subtitle2" noWrap sx={{ flex: 1 }}>
                        {file.name}
                      </Typography>
                      <Button
                        size="small"
                        color="error"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(index);
                        }}
                        sx={{ minWidth: 'auto', p: 0.5 }}
                      >
                        <Delete fontSize="small" />
                      </Button>
                    </Box>
                    <Chip 
                      label={formatFileSize(file.size)} 
                      size="small" 
                      variant="outlined" 
                    />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

      {/* Processing Status */}
      {processing && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Processing Excel Data...
          </Typography>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Processing {processingProgress.fileName} ({processingProgress.current} of {processingProgress.total})
            </Typography>
            <LinearProgress 
              variant="determinate" 
              value={(processingProgress.current / processingProgress.total) * 100} 
            />
          </Box>
          <Typography variant="body2" color="text.secondary">
            Reading Excel data and parsing invoice information.
          </Typography>
        </Paper>
      )}

      {/* Processing Results */}
      {processingComplete && processedResults.length > 0 && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6">
              Processing Results ({processedResults.filter(r => r.status !== 'error').length} successful)
            </Typography>
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={handleExportResults}
              size="small"
              disabled={processedResults.filter(r => r.status !== 'error').length === 0}
            >
              Export CSV
            </Button>
          </Box>
          
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Type</TableCell>
                  <TableCell>Order No.</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Order Date</TableCell>
                  <TableCell>Items</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {processedResults.map((result, index) => (
                  <TableRow key={index} hover>
                    <TableCell>{result.type || 'N/A'}</TableCell>
                    <TableCell>{result.orderNo || 'N/A'}</TableCell>
                    <TableCell>{result.customerInfo?.name || 'N/A'}</TableCell>
                    <TableCell>{result.orderDate || 'N/A'}</TableCell>
                    <TableCell>{result.items?.length || 0}</TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        {result.status !== 'error' && (
                          <>
                            <Tooltip title="Preview Details">
                              <IconButton 
                                size="small" 
                                onClick={() => handlePreview(result)}
                              >
                                <Visibility fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Edit Data">
                              <IconButton 
                                size="small" 
                                onClick={() => handleEdit(result, index)}
                              >
                                <Edit fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          {/* Summary Statistics */}
          <Divider sx={{ my: 3 }} />
          <Grid container spacing={3}>
            <Grid item xs={12} sm={3}>
              <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: 'success.light', color: 'success.contrastText' }}>
                <Typography variant="h4" fontWeight="bold">
                  {processedResults.filter(r => r.status === 'success').length}
                </Typography>
                <Typography variant="body2">
                  Successfully Processed
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: 'error.light', color: 'error.contrastText' }}>
                <Typography variant="h4" fontWeight="bold">
                  {processedResults.filter(r => r.status === 'error').length}
                </Typography>
                <Typography variant="body2">
                  Failed
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: 'info.light', color: 'info.contrastText' }}>
                <Typography variant="h4" fontWeight="bold">
                  {processedResults.reduce((sum, r) => sum + (r.items?.length || 0), 0)}
                </Typography>
                <Typography variant="body2">
                  Total Items
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: 'warning.light', color: 'warning.contrastText' }}>
                <Typography variant="h4" fontWeight="bold">
                  {new Set(processedResults.filter(r => r.customerInfo?.name).map(r => r.customerInfo.name)).size}
                </Typography>
                <Typography variant="body2">
                  Unique Customers
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
        <Button
          variant="contained"
          size="large"
          startIcon={<CloudUpload />}
          onClick={handleBeginProcess}
          disabled={selectedFiles.length === 0 || processing}
          sx={{
            px: 4,
            py: 1.5,
            fontSize: '1.1rem',
            fontWeight: 600
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
            sx={{ px: 4, py: 1.5 }}
          >
            Clear All
          </Button>
        )}
      </Box>

      {/* Preview Dialog */}
      <Dialog 
        open={previewDialog.open} 
        onClose={() => setPreviewDialog({ open: false, data: null })}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Invoice Details - {previewDialog.data?.orderNo}
          <IconButton
            onClick={() => setPreviewDialog({ open: false, data: null })}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {previewDialog.data && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Order Information</Typography>
                <Typography><strong>Type:</strong> {previewDialog.data.type || 'Not specified'}</Typography>
                <Typography><strong>Order No.:</strong> {previewDialog.data.orderNo || 'Not found'}</Typography>
                <Typography><strong>Order Date:</strong> {previewDialog.data.orderDate || 'Not found'}</Typography>
                <Typography><strong>Due Date:</strong> {previewDialog.data.dueDate || 'Not found'}</Typography>
                <Typography><strong>PO Number:</strong> {previewDialog.data.poNumber || 'Not found'}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Customer Information</Typography>
                <Typography><strong>Name:</strong> {previewDialog.data.customerInfo?.name || 'Not found'}</Typography>
                <Typography><strong>Ship To City:</strong> {previewDialog.data.shipTo?.city || 'Not found'}</Typography>
                <Typography><strong>Ship To Address 1:</strong> {previewDialog.data.shipTo?.address1 || 'Not found'}</Typography>
                <Typography><strong>Ship To Address 2:</strong> {previewDialog.data.shipTo?.address2 || 'Not found'}</Typography>
                <Typography><strong>Ship To State:</strong> {previewDialog.data.shipTo?.state || 'Not found'}</Typography>
                <Typography><strong>Ship Zip:</strong> {previewDialog.data.shipTo?.zip || 'Not found'}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Items ({previewDialog.data.items?.length || 0})</Typography>
                {previewDialog.data.items && previewDialog.data.items.length > 0 ? (
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Item</TableCell>
                          <TableCell>Qty</TableCell>
                          <TableCell>Size</TableCell>
                          <TableCell>Glass Option</TableCell>
                          <TableCell>Grid Style</TableCell>
                          <TableCell>Frame</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {previewDialog.data.items.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>{item.name || 'N/A'}</TableCell>
                            <TableCell>{item.quantity || 'N/A'}</TableCell>
                            <TableCell>{item.size || 'N/A'}</TableCell>
                            <TableCell>{item.glassOption || 'N/A'}</TableCell>
                            <TableCell>{item.gridStyle || 'N/A'}</TableCell>
                            <TableCell>{item.frame || 'N/A'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Typography color="text.secondary">No items found</Typography>
                )}
              </Grid>
            </Grid>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog 
        open={editDialog.open} 
        onClose={() => setEditDialog({ open: false, data: null, index: null })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Edit Invoice Data</DialogTitle>
        <DialogContent>
          {editDialog.data && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
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
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Ship To Address"
                  value={editDialog.data.shipTo?.address || ''}
                  onChange={(e) => setEditDialog(prev => ({
                    ...prev,
                    data: { 
                      ...prev.data, 
                      shipTo: { 
                        ...prev.data.shipTo, 
                        address: e.target.value 
                      }
                    }
                  }))}
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog({ open: false, data: null, index: null })}>
            Cancel
          </Button>
          <Button onClick={handleSaveEdit} variant="contained">
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
            <li><strong>W'' x H'':</strong> Item dimensions</li>
            <li><strong>Glass option:</strong> Glass specifications</li>
            <li><strong>Grid Style:</strong> Grid pattern</li>
            <li><strong>Frame:</strong> Frame specifications</li>
            <li><strong>Ship To City, Ship To Address 1, Ship To Address 2, Ship To State, Ship Zip:</strong> Shipping address components</li>
          </ul>
          <Typography variant="body2" sx={{ mt: 2, fontStyle: 'italic' }}>
            The system will automatically group rows by invoice number and combine shipping address components. Multiple items per invoice are supported.
          </Typography>
        </Typography>
      </Paper>
    </Box>
  );
}

export default InvoiceProcessorPage;