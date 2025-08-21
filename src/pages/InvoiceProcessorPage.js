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
  Chip
} from '@mui/material';
import { CloudUpload, PictureAsPdf, Delete } from '@mui/icons-material';

function InvoiceProcessorPage() {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);

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
    const pdfFiles = files.filter(file => file.type === 'application/pdf');
    
    if (pdfFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...pdfFiles]);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const pdfFiles = files.filter(file => file.type === 'application/pdf');
    
    if (pdfFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...pdfFiles]);
    }
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleBeginProcess = async () => {
    if (selectedFiles.length === 0) return;
    
    setUploading(true);
    
    // Simulate processing time
    setTimeout(() => {
      setUploading(false);
      // Here you would typically send files to your backend
      console.log('Processing files:', selectedFiles);
    }, 2000);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Box>
      <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
        Invoice Processor
      </Typography>
      <Typography variant="h6" color="text.secondary" paragraph sx={{ mb: 4 }}>
        Upload PDF invoices to begin automated processing and data extraction.
      </Typography>
      
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
            Drop PDF files here or click to browse
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Supported format: PDF files only
          </Typography>
          <input
            id="file-input"
            type="file"
            multiple
            accept=".pdf"
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
                      <PictureAsPdf sx={{ color: 'error.main', mr: 1 }} />
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
      {uploading && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Processing Files...
          </Typography>
          <LinearProgress sx={{ mb: 2 }} />
          <Typography variant="body2" color="text.secondary">
            Please wait while we process your invoice files.
          </Typography>
        </Paper>
      )}

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
        <Button
          variant="contained"
          size="large"
          startIcon={<CloudUpload />}
          onClick={handleBeginProcess}
          disabled={selectedFiles.length === 0 || uploading}
          sx={{
            px: 4,
            py: 1.5,
            fontSize: '1.1rem',
            fontWeight: 600
          }}
        >
          {uploading ? 'Processing...' : 'Begin Process'}
        </Button>
        
        {selectedFiles.length > 0 && (
          <Button
            variant="outlined"
            size="large"
            onClick={() => setSelectedFiles([])}
            disabled={uploading}
            sx={{ px: 4, py: 1.5 }}
          >
            Clear All
          </Button>
        )}
      </Box>

      {/* Instructions */}
      <Paper sx={{ p: 3, mt: 4, backgroundColor: 'rgba(25, 118, 210, 0.04)' }}>
        <Typography variant="h6" gutterBottom>
          Instructions
        </Typography>
        <Typography variant="body2" component="div">
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            <li>Upload PDF invoice files using the drag-and-drop area above</li>
            <li>Preview your selected files before processing</li>
            <li>Click "Begin Process" to start automated data extraction</li>
            <li>Multiple files can be processed simultaneously</li>
          </ul>
        </Typography>
      </Paper>
    </Box>
  );
}

export default InvoiceProcessorPage;