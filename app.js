const express = require('express');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const { scrapeProductInfo } = require('./lib/scraper');

const app = express();
const PORT = process.env.PORT || 3000;

// Define routes first, before serving static files
// This prevents static file middleware from handling dynamic routes

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// API endpoint for product search
app.get('/api/products', async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    const results = await scrapeProductInfo(query);
    res.json(results);
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ error: error.message || 'An error occurred' });
  }
});

// Generate and serve the ZIP file for download
app.get('/download', (req, res) => {
  // Create temp directory if it doesn't exist
  const tempDir = path.join(__dirname, 'temp');
  if (!fs.existsSync(tempDir)) {
    try {
      fs.mkdirSync(tempDir, { recursive: true });
    } catch (err) {
      console.error('Error creating temp directory:', err);
      return res.status(500).send('Error creating temporary directory for download');
    }
  }

  const zipFileName = 'ethical-web-scraper-demo.zip';
  const zipFilePath = path.join(tempDir, zipFileName);
  
  // Remove existing zip file if it exists
  if (fs.existsSync(zipFilePath)) {
    try {
      fs.unlinkSync(zipFilePath);
    } catch (err) {
      console.error('Error removing existing zip file:', err);
    }
  }
  
  const output = fs.createWriteStream(zipFilePath);
  const archive = archiver('zip', { zlib: { level: 9 } });
  
  // Listen for all archive data to be written
  output.on('close', function() {
    console.log(`Zip created successfully: ${archive.pointer()} total bytes`);
    
    // Send the file
    res.download(zipFilePath, zipFileName, (err) => {
      if (err) {
        console.error('Error sending zip file:', err);
        // Only attempt to delete if sending failed
        if (!res.headersSent) {
          return res.status(500).send('Error sending download file');
        }
      }
      
      // Clean up temp file after a delay to ensure download completes
      setTimeout(() => {
        try {
          if (fs.existsSync(zipFilePath)) {
            fs.unlinkSync(zipFilePath);
          }
        } catch (e) {
          console.error('Error cleaning up zip file:', e);
        }
      }, 5000);
    });
  });
  
  // Handle archive warnings
  archive.on('warning', function(err) {
    if (err.code === 'ENOENT') {
      console.warn('Archive warning:', err);
    } else {
      console.error('Archive error:', err);
      output.end();
      return res.status(500).send('Error preparing download file');
    }
  });
  
  // Handle archive errors
  archive.on('error', function(err) {
    console.error('Error creating zip:', err);
    output.end();
    return res.status(500).send('Error creating download file');
  });
  
  // Pipe archive data to the file
  archive.pipe(output);
  
  // Files to include in the zip
  const filesToZip = [
    { source: 'app.js', dest: 'app.js' },
    { source: 'package.json', dest: 'package.json' },
    { source: 'README.md', dest: 'README.md' },
    { source: 'lib/scraper.js', dest: 'lib/scraper.js' },
    { source: 'lib/cache.js', dest: 'lib/cache.js' },
    { source: 'lib/user-agents.js', dest: 'lib/user-agents.js' },
    { source: 'public/index.html', dest: 'public/index.html' },
    { source: 'public/style.css', dest: 'public/style.css' },
    { source: 'public/script.js', dest: 'public/script.js' }
  ];
  
  // Check if files exist before adding them to the archive
  filesToZip.forEach(file => {
    const filePath = path.join(__dirname, file.source);
    if (fs.existsSync(filePath)) {
      archive.file(filePath, { name: file.dest });
    } else {
      console.warn(`Warning: File not found: ${filePath}`);
      // Add a placeholder for missing files
      archive.append(`This file was missing in the original project: ${file.source}`, { name: file.dest });
    }
  });
  
  // Finalize the archive
  archive.finalize();
});

// Serve static files AFTER defining all dynamic routes
app.use(express.static('public'));

// Fallback route for public/index.html in case user directly navigates to /public
app.get('/public', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Download demo available at http://localhost:${PORT}/download`);
});