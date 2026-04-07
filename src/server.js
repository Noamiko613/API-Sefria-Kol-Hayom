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
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, '..', 'data');

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

// Helper to resolve paths even with underscores vs spaces or slight differences
function resolvePathFuzzy(base, rel) {
  let current = base;
  const parts = decodeURIComponent(rel).split('/').filter(Boolean);
  
  for (const part of parts) {
    if (fs.existsSync(path.join(current, part))) {
      current = path.join(current, part);
      continue;
    }
    const spacedPart = part.replace(/_/g, ' ');
    if (fs.existsSync(path.join(current, spacedPart))) {
      current = path.join(current, spacedPart);
      continue;
    }
    try {
      const items = fs.readdirSync(current);
      const partLower = part.toLowerCase();
      const spacedLower = spacedPart.toLowerCase();
      
      const match = items.find(i => {
        const il = i.toLowerCase();
        return il === partLower || il === spacedLower || il.includes(spacedLower) || il.includes(partLower);
      });
      if (match) {
        current = path.join(current, match);
      } else {
        return null;
      }
    } catch (_) { return null; }
  }
  return current;
}

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

// Phase 1: Unified Text Endpoint (from user prompt)
// Utility: Fuzzy find a directory in the data forest
function findDirFuzzy(root, target) {
  const entries = fs.readdirSync(root, { withFileTypes: true });
  const t = target.toLowerCase();
  for (const e of entries) {
    if (e.isDirectory()) {
      const en = e.name.toLowerCase();
      if (en === t || en.includes(t)) return path.join(root, e.name);
    }
  }
  for (const e of entries) {
    if (e.isDirectory()) {
      const sub = path.join(root, e.name);
      try {
         const files = fs.readdirSync(sub);
         if (files.some(f => f.toLowerCase().includes(t))) return sub;
      } catch(_) {}
    }
  }
  for (const e of entries) {
    if (e.isDirectory()) {
      const found = findDirFuzzy(path.join(root, e.name), target);
      if (found) return found;
    }
  }
  return null;
}

const BOOK_MAP = {
  'Genesis': 'tanach/TORA/01_BERESHIT',
  'Exodus': 'tanach/TORA/02_SHEMOT',
  'Leviticus': 'tanach/TORA/03_VAIKRA',
  'Numbers': 'tanach/TORA/04_BAMIDBAR',
  'Deuteronomy': 'tanach/TORA/05_DEVARIM',
  'Joshua': 'tanach/NAVI/06_YEHOSHUA',
  'Judges': 'tanach/NAVI/07_SHOFTIM',
  'Samuel 1': 'tanach/NAVI/08_SHEMUEL_A',
  'Samuel 2': 'tanach/NAVI/09_SHEMUEL_B',
  'Kings 1': 'tanach/NAVI/10_MELAKHIM_A',
  'Kings 2': 'tanach/NAVI/11_MELAKHIM_B',
  'Isaiah': 'tanach/NAVI/12_YESHAYAHU',
  'Jeremiah': 'tanach/NAVI/13_YIRMEYAHU',
  'Ezekiel': 'tanach/NAVI/14_YEKHEZKEL',
};

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    app: 'Kol Hayom API Service',
    health: 'healthy',
    endpoints: {
      text: '/text/:book/:chapter',
      download: '/download/:category?',
      health: '/health'
    }
  });
});

app.get('/text/:book/:chapter', (req, res) => {
  const { book, chapter } = req.params;
  const fileName = `${chapter}.json`;
  let searchDir = BOOK_MAP[book] ? path.join(DATA_DIR, BOOK_MAP[book]) : null;
  if (!searchDir) searchDir = findDirFuzzy(DATA_DIR, book);
  if (!searchDir) return res.status(404).json({ error: `Book '${book}' not found` });

  const jsonPath = path.join(searchDir, fileName);
  const txtPath = path.join(searchDir, `${chapter}.txt`);
  if (fs.existsSync(jsonPath)) return res.sendFile(jsonPath);
  if (fs.existsSync(txtPath)) {
    const content = fs.readFileSync(txtPath, 'utf8');
    return res.send(content); // raw text format expected by AssetService
  }
  
  const files = fs.readdirSync(searchDir);
  const cleanChapter = chapter.replace('.txt', '').toLowerCase();
  const match = files.find(f => f.toLowerCase().includes(cleanChapter));
  
  if (match) {
    const fullMatch = path.join(searchDir, match);
    const content = fs.readFileSync(fullMatch, 'utf8');
    res.send(content);
  } else {
    res.status(404).json({ error: `Chapter ${chapter} of ${book} not found in ${searchDir}` });
  }
});

app.get(['/download', '/download/:category'], (req, res) => {
  const category = req.params.category;
  if (!category) {
    const bulkPath = path.join(DATA_DIR, 'books.zip');
    if (fs.existsSync(bulkPath)) return res.download(bulkPath);
    return res.status(404).json({ error: 'Bulk books.zip not found' });
  }
  const catZip = path.join(DATA_DIR, `${category.toLowerCase()}.zip`);
  if (fs.existsSync(catZip)) return res.download(catZip);
  res.status(404).json({ error: `Category zip '${category}.zip' not found.` });
});

app.get('/api/download-all', (req, res) => {
  const zipPath = path.join(DATA_DIR, 'books.zip');
  if (!fs.existsSync(zipPath)) return res.status(404).json({ error: 'Bulk books.zip not found' });
  res.download(zipPath, 'kol_hayom_assets.zip');
});

// Original legacy endpoints preserved to prevent app breakage!
app.get('/api/books', (req, res) => {
  const categories = listDirectory(DATA_DIR);
  res.json({ categories: categories.filter(c => c.isDirectory).map(c => c.name) });
});

app.get('/api/books/:category/*', (req, res) => {
  const category = req.params.category;
  const filePath = req.params[0];
  const fullPath = path.join(DATA_DIR, category, filePath);
  if (!fullPath.startsWith(DATA_DIR)) return res.status(403).json({ error: 'Access denied' });
  if (!fs.existsSync(fullPath)) return res.status(404).json({ error: `File not found: ${filePath}` });
  
  const stats = fs.statSync(fullPath);
  if (stats.isDirectory()) return res.json({ category, path: filePath, type: 'directory', contents: listDirectory(fullPath) });
  res.json({ category, path: filePath, type: 'file', format: path.extname(fullPath).toLowerCase(), content: readFileContents(fullPath) });
});

app.get('/api/tanach/*', (req, res) => {
  const filePath = req.params[0] || '';
  const fullPath = resolvePathFuzzy(path.join(DATA_DIR, 'tanach'), filePath);

  if (!fullPath) return res.status(404).json({ error: `File not found: ${filePath}` });
  if (fs.statSync(fullPath).isDirectory()) return res.json({ path: filePath, type: 'directory', contents: listDirectory(fullPath) });
  res.json({ path: filePath, content: readFileContents(fullPath) });
});

app.get('/api/mishna/*', (req, res) => {
  const filePath = req.params[0];
  const fullPath = path.join(DATA_DIR, 'mishna', filePath);
  if (!fullPath.startsWith(path.join(DATA_DIR, 'mishna'))) return res.status(403).json({ error: 'Access denied' });
  if (!fs.existsSync(fullPath)) return res.status(404).json({ error: `File not found: ${filePath}` });
  if (fs.statSync(fullPath).isDirectory()) return res.json({ path: filePath, type: 'directory', contents: listDirectory(fullPath) });
  res.json({ path: filePath, content: readFileContents(fullPath) });
});

app.get('/api/gemara/*', (req, res) => {
  const filePath = req.params[0];
  const fullPath = resolvePathFuzzy(path.join(DATA_DIR, 'gemara'), filePath);

  if (!fullPath) return res.status(404).json({ error: `File not found: ${filePath}` });
  if (fs.statSync(fullPath).isDirectory()) return res.json({ path: filePath, type: 'directory', contents: listDirectory(fullPath) });
  res.json({ path: filePath, content: readFileContents(fullPath) });
});

app.get('/api/prayers/yesod/*', (req, res) => {
  const filePath = req.params[0];
  const fullPath = path.join(DATA_DIR, 'yesod', filePath);
  if (!fullPath.startsWith(path.join(DATA_DIR, 'yesod'))) return res.status(403).json({ error: 'Access denied' });
  if (!fs.existsSync(fullPath)) return res.status(404).json({ error: `File not found: ${filePath}` });
  if (fs.statSync(fullPath).isDirectory()) return res.json({ path: filePath, type: 'directory', contents: listDirectory(fullPath) });
  const content = readFileContents(fullPath);
  if (path.extname(fullPath).toLowerCase() === '.json') return res.json({ path: filePath, type: 'json', data: JSON.parse(content) });
  res.json({ path: filePath, type: 'text', content });
});

app.get('/api/prayers/*', (req, res) => {
  const filePath = req.params[0];
  const fullPath = resolvePathFuzzy(path.join(DATA_DIR, 'prayers'), filePath);

  if (!fullPath) return res.status(404).json({ error: `File not found: ${filePath}` });
  if (fs.statSync(fullPath).isDirectory()) return res.json({ path: filePath, type: 'directory', contents: listDirectory(fullPath) });
  res.json({ path: filePath, content: readFileContents(fullPath) });
});

app.get('/api/search', (req, res) => {
  res.json({ query: req.query.q, totalResults: 0, results: [] }); // Dummy fallback for now
});

app.get('/health', (req, res) => res.json({ status: 'healthy', timestamp: new Date().toISOString() }));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n📚 Sefria API Server Active at http://0.0.0.0:${PORT}`);
});
module.exports = app;
