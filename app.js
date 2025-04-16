const express = require('express');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const { scrapeProductInfo } = require('./lib/scraper');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static('public'));

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
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
  const zipFileName = 'ethical-web-scraper-demo.zip';
  const output = fs.createWriteStream(path.join(__dirname, 'temp', zipFileName));
  const archive = archiver('zip', { zlib: { level: 9 } });
  
  // Pipe archive data to the file
  archive.pipe(output);
  
  // Add files to the zip
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
  
  filesToZip.forEach(file => {
    archive.file(path.join(__dirname, file.source), { name: file.dest });
  });
  
  // Finalize the archive
  archive.finalize();
  
  output.on('close', () => {
    res.download(path.join(__dirname, 'temp', zipFileName), err => {
      if (err) {
        console.error('Error sending zip file:', err);
      }
      
      // Clean up the temp file after sending
      fs.unlink(path.join(__dirname, 'temp', zipFileName), err => {
        if (err) console.error('Error deleting temp file:', err);
      });
    });
  });
  
  archive.on('error', err => {
    console.error('Error creating zip:', err);
    res.status(500).send('Error creating download file');
  });
});

// Create temp directory if it doesn't exist
if (!fs.existsSync(path.join(__dirname, 'temp'))) {
  fs.mkdirSync(path.join(__dirname, 'temp'));
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

