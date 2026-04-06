const express = require('express');
const cors = require('cors');
const compression = require('compression');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Data directory - points to project root data/ folder
const DATA_DIR = path.join(__dirname, '..', 'data');

// Add morgan for logging if possible, or use custom logger
const log = (msg) => console.log(`[${new Date().toISOString()}] ${msg}`);

// Helper function to read file contents
function readFileContents(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const content = fs.readFileSync(filePath, 'utf8');
    return content;
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error.message);
    return null;
  }
}

// Helper function to list directory contents
function listDirectory(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) {
      return [];
    }
    const items = fs.readdirSync(dirPath);
    return items.map(item => {
      const fullPath = path.join(dirPath, item);
      const stats = fs.statSync(fullPath);
      return {
        name: item,
        isDirectory: stats.isDirectory(),
        path: fullPath.replace(DATA_DIR, '').replace(/^[\\/]/, '').replace(/\\/g, '/')
      };
    });
  } catch (error) {
    console.error(`Error listing directory ${dirPath}:`, error.message);
    return [];
  }
}

// Helper function to recursively get all files
function getAllFiles(dirPath, baseDir = dirPath) {
  const files = [];
  try {
    const items = fs.readdirSync(dirPath);
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stats = fs.statSync(fullPath);
      if (stats.isDirectory()) {
        files.push(...getAllFiles(fullPath, baseDir));
      } else {
        const relativePath = fullPath.replace(baseDir, '').replace(/^[\\/]/, '');
        files.push(relativePath);
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error.message);
  }
  return files;
}

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Sefria API',
    version: '1.0.0',
    description: 'API for Jewish religious texts - Tanach, Mishna, Gemara, Rambam, Tur, and Prayers',
    endpoints: {
      'GET /': 'API information and documentation',
      'GET /health': 'Health check endpoint',
      'GET /api/books': 'List all available book categories',
      'GET /api/books/:category': 'List contents of a specific category',
      'GET /api/books/:category/*file': 'Get specific file content or list subdirectory',
      'GET /api/tanach': 'List Tanach sections (TORA, NAVI)',
      'GET /api/tanach/:section': 'List contents of a Tanach section',
      'GET /api/tanach/:section/*file': 'Get specific Tanach file',
      'GET /api/mishna': 'List Mishna orders (Sedarim)',
      'GET /api/mishna/*path': 'Get specific Mishna file or list subdirectory',
      'GET /api/gemara': 'List Gemara tractates',
      'GET /api/gemara/*path': 'Get specific Gemara file',
      'GET /api/rambam': 'List Rambam (Mishneh Torah) books',
      'GET /api/rambam/*path': 'Get specific Rambam file',
      'GET /api/tur': 'List Tur (Arba\'ah Turim) sections',
      'GET /api/tur/*path': 'Get specific Tur file',
      'GET /api/prayers': 'List prayer nusach categories',
      'GET /api/prayers/*path': 'Get specific prayer file',
      'GET /api/prayers/yesod': 'List Yesod prayers categories',
      'GET /api/prayers/yesod/metadata': 'Get Yesod prayers metadata',
      'GET /api/prayers/yesod/index': 'Get Yesod prayers complete index',
      'GET /api/prayers/yesod/*path': 'Get specific Yesod prayer file',
      'GET /api/search?q=query': 'Search across all texts',
      'GET /api/download-all': 'Download complete books.zip bundle for offline mode'
    }
  });
});

// Bulk Download for Offline Mode
app.get('/api/download-all', (req, res) => {
  const zipPath = path.join(DATA_DIR, 'books.zip');
  
  if (!fs.existsSync(zipPath)) {
    return res.status(404).json({ 
      error: 'Bulk file (books.zip) not found.',
      tip: 'Run the zip-assets.py script in the project root to generate the bundle.'
    });
  }

  log(`Serving bulk download: ${zipPath}`);
  res.download(zipPath, 'kol_hayom_assets.zip');
});

// List all book categories
app.get('/api/books', (req, res) => {
  const categories = listDirectory(DATA_DIR);
  res.json({
    categories: categories.filter(c => c.isDirectory).map(c => c.name)
  });
});

// List contents of a category
app.get('/api/books/:category', (req, res) => {
  const category = req.params.category;
  const categoryPath = path.join(DATA_DIR, category);
  
  if (!fs.existsSync(categoryPath)) {
    return res.status(404).json({ error: `Category '${category}' not found` });
  }
  
  const contents = listDirectory(categoryPath);
  res.json({
    category,
    contents
  });
});

// Get specific file content
app.get('/api/books/:category/*', (req, res) => {
  const category = req.params.category;
  const filePath = req.params[0];
  const fullPath = path.join(DATA_DIR, category, filePath);
  
  // Security: prevent directory traversal
  if (!fullPath.startsWith(DATA_DIR)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({ error: `File not found: ${filePath}` });
  }
  
  const stats = fs.statSync(fullPath);
  
  if (stats.isDirectory()) {
    const contents = listDirectory(fullPath);
    return res.json({
      category,
      path: filePath,
      type: 'directory',
      contents
    });
  }
  
  const content = readFileContents(fullPath);
  const ext = path.extname(fullPath).toLowerCase();
  
  res.json({
    category,
    path: filePath,
    type: 'file',
    format: ext,
    content
  });
});

// Tanach endpoints
app.get('/api/tanach', (req, res) => {
  const tanachPath = path.join(DATA_DIR, 'tanach');
  const contents = listDirectory(tanachPath);
  res.json({
    category: 'tanach',
    description: 'Hebrew Bible - 24 books divided into Torah, Nevi\'im, and Ketuvim',
    contents
  });
});

app.get('/api/tanach/:section', (req, res) => {
  const section = req.params.section;
  const sectionPath = path.join(DATA_DIR, 'tanach', section);
  
  if (!fs.existsSync(sectionPath)) {
    return res.status(404).json({ error: `Section '${section}' not found` });
  }
  
  const contents = listDirectory(sectionPath);
  res.json({
    section,
    contents
  });
});

app.get('/api/tanach/:section/*', (req, res) => {
  const section = req.params.section;
  const filePath = req.params[0];
  const fullPath = path.join(DATA_DIR, 'tanach', section, filePath);
  
  if (!fullPath.startsWith(path.join(DATA_DIR, 'tanach'))) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({ error: `File not found: ${filePath}` });
  }
  
  const stats = fs.statSync(fullPath);
  
  if (stats.isDirectory()) {
    const contents = listDirectory(fullPath);
    return res.json({
      section,
      path: filePath,
      type: 'directory',
      contents
    });
  }
  
  const content = readFileContents(fullPath);
  res.json({
    section,
    path: filePath,
    content
  });
});

// Mishna endpoints
app.get('/api/mishna', (req, res) => {
  const mishnaPath = path.join(DATA_DIR, 'mishna');
  const contents = listDirectory(mishnaPath);
  res.json({
    category: 'mishna',
    description: 'Mishna - 6 orders (Sedarim) with 63 tractates',
    contents
  });
});

app.get('/api/mishna/*', (req, res) => {
  const filePath = req.params[0];
  const fullPath = path.join(DATA_DIR, 'mishna', filePath);
  
  if (!fullPath.startsWith(path.join(DATA_DIR, 'mishna'))) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({ error: `File not found: ${filePath}` });
  }
  
  const stats = fs.statSync(fullPath);
  
  if (stats.isDirectory()) {
    const contents = listDirectory(fullPath);
    return res.json({
      path: filePath,
      type: 'directory',
      contents
    });
  }
  
  const content = readFileContents(fullPath);
  res.json({
    path: filePath,
    content
  });
});

// Gemara endpoints
app.get('/api/gemara', (req, res) => {
  const gemaraPath = path.join(DATA_DIR, 'gemara');
  const contents = listDirectory(gemaraPath);
  res.json({
    category: 'gemara',
    description: 'Babylonian Talmud - 37 tractates',
    contents
  });
});

app.get('/api/gemara/*', (req, res) => {
  const filePath = req.params[0];
  const fullPath = path.join(DATA_DIR, 'gemara', filePath);
  
  if (!fullPath.startsWith(path.join(DATA_DIR, 'gemara'))) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({ error: `File not found: ${filePath}` });
  }
  
  const stats = fs.statSync(fullPath);
  
  if (stats.isDirectory()) {
    const contents = listDirectory(fullPath);
    return res.json({
      path: filePath,
      type: 'directory',
      contents
    });
  }
  
  const content = readFileContents(fullPath);
  res.json({
    path: filePath,
    content
  });
});

// Rambam endpoints
app.get('/api/rambam', (req, res) => {
  const rambamPath = path.join(DATA_DIR, 'rambam');
  const contents = listDirectory(rambamPath);
  res.json({
    category: 'rambam',
    description: 'Mishneh Torah by Rambam - 14 books',
    contents
  });
});

app.get('/api/rambam/*', (req, res) => {
  const filePath = req.params[0];
  const fullPath = path.join(DATA_DIR, 'rambam', filePath);
  
  if (!fullPath.startsWith(path.join(DATA_DIR, 'rambam'))) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({ error: `File not found: ${filePath}` });
  }
  
  const stats = fs.statSync(fullPath);
  
  if (stats.isDirectory()) {
    const contents = listDirectory(fullPath);
    return res.json({
      path: filePath,
      type: 'directory',
      contents
    });
  }
  
  const content = readFileContents(fullPath);
  res.json({
    path: filePath,
    content
  });
});

// Tur endpoints
app.get('/api/tur', (req, res) => {
  const turPath = path.join(DATA_DIR, 'tur');
  const contents = listDirectory(turPath);
  res.json({
    category: 'tur',
    description: 'Arba\'ah Turim - 4 sections with commentaries',
    contents
  });
});

app.get('/api/tur/*', (req, res) => {
  const filePath = req.params[0];
  const fullPath = path.join(DATA_DIR, 'tur', filePath);
  
  if (!fullPath.startsWith(path.join(DATA_DIR, 'tur'))) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({ error: `File not found: ${filePath}` });
  }
  
  const stats = fs.statSync(fullPath);
  
  if (stats.isDirectory()) {
    const contents = listDirectory(fullPath);
    return res.json({
      path: filePath,
      type: 'directory',
      contents
    });
  }
  
  const content = readFileContents(fullPath);
  res.json({
    path: filePath,
    content
  });
});

// Prayers endpoints
app.get('/api/prayers', (req, res) => {
  const prayersPath = path.join(DATA_DIR, 'prayers');
  const contents = listDirectory(prayersPath);
  res.json({
    category: 'prayers',
    description: 'Prayer texts organized by nusach (Ashkenaz, Sefarad, Edot HaMizrach)',
    contents
  });
});

// Yesod prayers endpoints (must be BEFORE prayers/* wildcard)
app.get('/api/prayers/yesod', (req, res) => {
  const yesodPath = path.join(DATA_DIR, 'yesod');
  const contents = listDirectory(yesodPath);
  
  // Read metadata if exists
  const metadataPath = path.join(yesodPath, 'metadata.json');
  const metadata = readFileContents(metadataPath);
  
  res.json({
    category: 'yesod',
    description: 'Yesod nusach prayers - comprehensive collection organized by category and nusach',
    source: 'Compiled from mobile.tora.ws and traditional siddurim',
    metadata: metadata ? JSON.parse(metadata) : null,
    contents: contents.filter(c => c.name !== 'metadata.json' && c.name !== 'index.json' && c.name !== 'tora_raw.html' && c.name !== 'tora_text.txt')
  });
});

// Yesod prayers metadata endpoint
app.get('/api/prayers/yesod/metadata', (req, res) => {
  const metadataPath = path.join(DATA_DIR, 'yesod', 'metadata.json');
  const metadata = readFileContents(metadataPath);
  
  if (!metadata) {
    return res.status(404).json({ error: 'Metadata not found' });
  }
  
  res.json({
    category: 'yesod',
    metadata: JSON.parse(metadata)
  });
});

// Yesod prayers index endpoint
app.get('/api/prayers/yesod/index', (req, res) => {
  const indexPath = path.join(DATA_DIR, 'yesod', 'index.json');
  const index = readFileContents(indexPath);
  
  if (!index) {
    return res.status(404).json({ error: 'Index not found' });
  }
  
  res.json(JSON.parse(index));
});

// Yesod prayers file access endpoint
app.get('/api/prayers/yesod/*', (req, res) => {
  const filePath = req.params[0];
  const fullPath = path.join(DATA_DIR, 'yesod', filePath);

  if (!fullPath.startsWith(path.join(DATA_DIR, 'yesod'))) {
    return res.status(403).json({ error: 'Access denied' });
  }

  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({ error: `File not found: ${filePath}` });
  }

  const stats = fs.statSync(fullPath);

  if (stats.isDirectory()) {
    const contents = listDirectory(fullPath);
    return res.json({
      path: filePath,
      type: 'directory',
      contents
    });
  }

  const content = readFileContents(fullPath);
  const ext = path.extname(fullPath).toLowerCase();
  
  // If it's a JSON file, parse it
  if (ext === '.json') {
    return res.json({
      path: filePath,
      type: 'json',
      data: JSON.parse(content)
    });
  }

  res.json({
    path: filePath,
    type: 'text',
    content
  });
});

// Prayers wildcard endpoint (must be AFTER yesod routes)
app.get('/api/prayers/*', (req, res) => {
  const filePath = req.params[0];
  const fullPath = path.join(DATA_DIR, 'prayers', filePath);

  if (!fullPath.startsWith(path.join(DATA_DIR, 'prayers'))) {
    return res.status(403).json({ error: 'Access denied' });
  }

  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({ error: `File not found: ${filePath}` });
  }

  const stats = fs.statSync(fullPath);

  if (stats.isDirectory()) {
    const contents = listDirectory(fullPath);
    return res.json({
      path: filePath,
      type: 'directory',
      contents
    });
  }

  const content = readFileContents(fullPath);
  res.json({
    path: filePath,
    content
  });
});

// Search endpoint (basic text search)
app.get('/api/search', (req, res) => {
  const query = req.query.q;
  
  if (!query) {
    return res.status(400).json({ error: 'Search query required (q parameter)' });
  }
  
  const results = [];
  
  // Search through all categories
  const categories = listDirectory(DATA_DIR);
  
  for (const category of categories) {
    if (!category.isDirectory) continue;
    
    const categoryPath = path.join(DATA_DIR, category.name);
    const files = getAllFiles(categoryPath);
    
    for (const file of files) {
      const fullPath = path.join(categoryPath, file);
      const ext = path.extname(fullPath).toLowerCase();
      
      // Only search text files
      if (!['.txt', '.json', '.md'].includes(ext)) continue;
      
      const content = readFileContents(fullPath);
      if (!content) continue;
      
      if (content.toLowerCase().includes(query.toLowerCase())) {
        // Find matching lines
        const lines = content.split('\n');
        const matchingLines = lines
          .map((line, index) => ({ line: index + 1, text: line.trim() }))
          .filter(l => l.text.toLowerCase().includes(query.toLowerCase()))
          .slice(0, 5); // Limit to first 5 matches per file
        
        results.push({
          category: category.name,
          file,
          matches: matchingLines
        });
      }
    }
  }
  
  res.json({
    query,
    totalResults: results.length,
    results
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n📚 Sefria API Server`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Server running on port ${PORT}`);
  console.log(`Access API at: http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`\nPress Ctrl+C to stop\n`);
});

module.exports = app;
