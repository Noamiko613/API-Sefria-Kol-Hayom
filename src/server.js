const express = require('express');
const cors = require('cors');
const compression = require('compression');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(compression());
app.use(express.json());

const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, '..', 'data');

// Maps for book names and prayers to their respective paths or Hebrew filenames
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
  'Prayers': 'prayers',
};

const HEBREW_MAP = {
  'shacharit': 'תפילת שחרית',
  'mincha': 'תפילת מנחה',
  'arvit': 'תפילת ערבית',
  'birkat_hamazon': 'ברכת המזון',
  'tehillim': 'תהילים',
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

app.get('/health', (req, res) => res.json({ status: 'healthy', uptime: process.uptime() }));

// Phase 1: Online Mode (API-First) - Unified Text Fetcher
// Handles /text/Genesis/1 or /text/Berakhot/2a
app.get('/text/:book/:chapter', (req, res) => {
  const { book, chapter } = req.params;
  const fileName = `${chapter}.json`;
  
  // 1. Try pre-mapped paths (for speed)
  let searchDir = BOOK_MAP[book] ? path.join(DATA_DIR, BOOK_MAP[book]) : null;
  
  // 2. If not pre-mapped, fuzzy find the directory
  if (!searchDir) {
    searchDir = findDirFuzzy(DATA_DIR, book);
  }

  if (!searchDir) {
    return res.status(404).json({ error: `Book '${book}' not found` });
  }

  // 3. Try to find the chapter file
  // Check for chapter.json first (the new way), then fall back to chapter.txt
  const jsonPath = path.join(searchDir, fileName);
  const txtPath = path.join(searchDir, `${chapter}.txt`);
  
  // Also handle some data structures like a01_Genesis.txt where everything is one file
  // but for now let's assume one file per chapter as per Phase 3 docs
  
  if (fs.existsSync(jsonPath)) {
    return res.sendFile(jsonPath);
  } else if (fs.existsSync(txtPath)) {
    const content = fs.readFileSync(txtPath, 'utf8');
    return res.send(content);
  }

  // Final fuzzy check
  const files = fs.readdirSync(searchDir);
  const cleanChapter = chapter.replace('.txt', '').toLowerCase();
  
  // Try mapped name first
  const mapped = HEBREW_MAP[cleanChapter];
  
  const match = files.find(f => {
    const fn = f.toLowerCase();
    if (mapped && fn.includes(mapped)) return true;
    return fn.includes(cleanChapter);
  });
  
  if (match) {
    const fullMatch = path.join(searchDir, match);
    const content = fs.readFileSync(fullMatch, 'utf8');
    return res.json({ content, book, chapter, match });
  }

  res.status(404).json({ error: `Chapter ${chapter} of ${book} not found in ${searchDir}` });
});

// Phase 2: Category and Bulk Downloads
// Handles /download (bulk) or /download/tanach (specific)
app.get(['/download', '/download/:category'], (req, res) => {
  const category = req.params.category;
  
  if (!category) {
    // Bulk download
    const bulkPath = path.join(DATA_DIR, 'books.zip');
    if (fs.existsSync(bulkPath)) return res.download(bulkPath);
    return res.status(404).json({ error: 'Bulk books.zip not found' });
  }

  // Specific category download (Category name => Category zip)
  const catZip = path.join(DATA_DIR, `${category.toLowerCase()}.zip`);
  if (fs.existsSync(catZip)) {
    return res.download(catZip);
  }

  // If zip doesn't exist, try to return error or list files
  res.status(404).json({ error: `Category zip '${category}.zip' not found. Ensure zip-assets.py was run for categories.` });
});

// Utility: Fuzzy find a directory in the data forest
function findDirFuzzy(root, target) {
  const entries = fs.readdirSync(root, { withFileTypes: true });
  const t = target.toLowerCase();
  
  // 1. Direct folder match
  for (const e of entries) {
    if (e.isDirectory()) {
      const en = e.name.toLowerCase();
      if (en === t || en.includes(t)) return path.join(root, e.name);
    }
  }

  // 2. Check if folder contains a file with that name (e.g. searching for 'Genesis' should find '01_BERESHIT')
  for (const e of entries) {
    if (e.isDirectory()) {
      const sub = path.join(root, e.name);
      try {
         const files = fs.readdirSync(sub);
         if (files.some(f => f.toLowerCase().includes(t))) return sub;
      } catch(_) {}
    }
  }

  // 3. Deeper recursive search
  for (const e of entries) {
    if (e.isDirectory()) {
      const found = findDirFuzzy(path.join(root, e.name), target);
      if (found) return found;
    }
  }
  return null;
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 API active at http://0.0.0.0:${PORT}`);
  console.log(`📂 Data root: ${DATA_DIR}`);
});
