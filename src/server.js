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

// Request logging middleware
app.use((req, res, next) => {
  log(`${req.method} ${req.url}`);
  next();
});

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

const NUSACH_REDIRECTS = {
  'siddur_ashkenaz': 'prayers/siddur ashkenaz',
  'siddur_edot_hamizrach': 'prayers/siddur edot hamizrach',
  'siddur_sefarad': 'prayers/siddur sefarad',
  'siddur_rav_amram': 'prayers/siddur rav amram',
  'seder_rav_amram': 'prayers/siddur rav amram',
  'siddur_teiman': 'prayers/siddur teiman'
};

const CATEGORY_MAP = {
  'tanach': ['TORA', 'NAVI', 'KETUVIM'],
  'mishna': ['100_SEDER_ZRAIM', '101_SEDER_MOED', '102_SEDER_NASHIM', '103_SEDER_NEZIKIN', '104_SEDER_KADASHIM', '105_SEDER_TAHAROT'],
};

function resolvePathFuzzy(dir, rel) {
  if (!rel) return dir;
  const parts = decodeURIComponent(rel).split('/').filter(Boolean);
  
  const HEBREW_MAP = {
    shacharit: 'שחרית', mincha: 'מנחה', arvit: 'ערבית', maariv: 'מעריב',
    arvit_chol: 'תפילת ערבית לימי החול', mincha_chol: 'תפילת מנחה לימי החול',
    shacharit_chol: 'תפילת שחרית לימות החול', shacharit_lechol: 'תפילת שחרית לימי החול',
    birkat_hamazon: 'ברכות', tehillim: 'תהילים', kriat_shema: 'קריאת שמע', hallel: 'הלל',
    seder_kriat_shema: 'סדר ק_ש', birkat_hamazon_seder: 'ברכת המזון לבד סדר רב עמרם'
  };

  const FILENAME_OVERRIDE = {
    bereshit: 'BERESHIT', genesis: 'BERESHIT', 'בראשית': 'BERESHIT',
    shmot: 'SHEMOT', exodus: 'SHEMOT', 'שמות': 'SHEMOT',
    vaikra: 'VAIKRA', leviticus: 'VAIKRA', 'ויקרא': 'VAIKRA',
    bamidbar: 'BAMIDBAR', numbers: 'BAMIDBAR', 'במדבר': 'BAMIDBAR',
    devarim: 'DEVARIM', deuteronomy: 'DEVARIM', 'דברים': 'DEVARIM',
    yehoshua: 'YEHOSHUA', joshua: 'YEHOSHUA', 'יהושע': 'YEHOSHUA',
    shoftim: 'SHOFTIM', judges: 'SHOFTIM', 'שופטים': 'SHOFTIM',
    'shemuel_a': 'SHEMUEL_A', 'samuel_1': 'SHEMUEL_A', 'שמואל א': 'SHEMUEL_A',
    'shemuel_b': 'SHEMUEL_B', 'samuel_2': 'SHEMUEL_B', 'שמואל ב': 'SHEMUEL_B',
    'melakhim_a': 'MELAKHIM_A', 'kings_1': 'MELAKHIM_A', 'מלכים א': 'MELAKHIM_A',
    'melakhim_b': 'MELAKHIM_B', 'kings_2': 'MELAKHIM_B', 'מלכים ב': 'MELAKHIM_B',
    'yeshayahu': 'YESHAYAHU', isaiah: 'YESHAYAHU', 'ישעיהו': 'YESHAYAHU',
    'yirmeyahu': 'YIRMEYAHU', jeremiah: 'YIRMEYAHU', 'ירמיהו': 'YIRMEYAHU',
    'yekhezkel': 'YEKHEZKEL', ezekiel: 'YEKHEZKEL', 'יחזקאל': 'YEKHEZKEL',
    'tehillim': 'תהילים', psalms: 'תהילים', 'תהילים': 'תהילים',
    'mishlei': 'proverbs', proverbs: 'proverbs', 'משלי': 'proverbs',
  };

  let current = dir;
  for (const part of parts) {
    if (!fs.existsSync(current)) return null;
    const items = fs.readdirSync(current);
    const lowPart = part.toLowerCase();
    const cleanPart = lowPart.replace('.txt','').replace('.json','');
    const mapped = (HEBREW_MAP[cleanPart] || FILENAME_OVERRIDE[cleanPart] || part).toUpperCase();

    // 1. Direct or Shallow Fuzzy check
    let match = items.find(i => {
       const il = i.toUpperCase();
       return il === part.toUpperCase() || il === mapped || il.includes(mapped) || mapped.includes(il);
    });

    if (match) {
      current = path.join(current, match);
    } else {
      // 2. Performance: Only dive into categories for the first segment
      const categories = CATEGORY_MAP[path.basename(current).toLowerCase()];
      if (categories) {
         for (const cat of categories) {
            const sub = path.join(current, cat);
            const subMatch = resolvePathFuzzy(sub, part);
            if (subMatch) { return subMatch; }
         }
      }
      return null;
    }
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
  log(`Download Request: ${category || 'bulk'}`);
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
  log(`Tanach Request: ${filePath}`);
  const fullPath = resolvePathFuzzy(path.join(DATA_DIR, 'tanach'), filePath);

  if (!fullPath) return res.status(404).json({ error: `File not found: ${filePath}` });
  if (fs.statSync(fullPath).isDirectory()) return res.json({ path: filePath, type: 'directory', contents: listDirectory(fullPath) });
  res.send(readFileContents(fullPath));
});

app.get('/api/mishna/*', (req, res) => {
  const filePath = req.params[0];
  log(`Mishna Request: ${filePath}`);
  const fullPath = path.join(DATA_DIR, 'mishna', filePath);
  if (!fullPath.startsWith(path.join(DATA_DIR, 'mishna'))) return res.status(403).json({ error: 'Access denied' });
  if (!fs.existsSync(fullPath)) return res.status(404).json({ error: `File not found: ${filePath}` });
  if (fs.statSync(fullPath).isDirectory()) return res.json({ path: filePath, type: 'directory', contents: listDirectory(fullPath) });
  res.send(readFileContents(fullPath));
});

app.get('/api/gemara/*', (req, res) => {
  const filePath = req.params[0];
  log(`Gemara Request: ${filePath}`);
  const fullPath = resolvePathFuzzy(path.join(DATA_DIR, 'gemara'), filePath);

  if (!fullPath) return res.status(404).json({ error: `File not found: ${filePath}` });
  if (fs.statSync(fullPath).isDirectory()) return res.json({ path: filePath, type: 'directory', contents: listDirectory(fullPath) });
  res.send(readFileContents(fullPath));
});


app.get('/api/prayers/*', (req, res) => {
  let filePath = req.params[0];
  
  // Intercept the request and route custom nusachs to the yesod folder
  let baseFolder = 'prayers';
  
  // If the path already has 'yesod/' in it (from the app), we clear the base folder and use it as-is
  if (filePath.startsWith('yesod/')) {
    baseFolder = '';
  } else {
    for (const [key, dest] of Object.entries(NUSACH_REDIRECTS)) {
      if (filePath.startsWith(key)) {
        filePath = filePath.replace(key, dest);
        baseFolder = ''; // Because destination is already fully qualified from DATA_DIR
        break;
      }
    }
  }

  let fullPath = resolvePathFuzzy(path.join(DATA_DIR, baseFolder), filePath);

  // High-performance fallback: If the file wasn't found in the base prayers folder, 
  // try the "Seder Rav Amram" folder automatically (as it is our primary default).
  if (!fullPath && baseFolder === 'prayers') {
    fullPath = resolvePathFuzzy(path.join(DATA_DIR, 'prayers', 'siddur rav amram'), filePath);
  }

  if (!fullPath) return res.status(404).json({ error: `File not found: ${filePath}` });
  if (fs.statSync(fullPath).isDirectory()) return res.json({ path: filePath, type: 'directory', contents: listDirectory(fullPath) });
  
  // Return purely raw text, dropping the JSON wrapper to ensure compatibility with Flutter Assistant
  res.send(readFileContents(fullPath));
});

app.get('/api/search', (req, res) => {
  res.json({ query: req.query.q, totalResults: 0, results: [] }); // Dummy fallback for now
});

app.get('/health', (req, res) => res.json({ status: 'healthy', timestamp: new Date().toISOString() }));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n📚 Sefria API Server Active at http://0.0.0.0:${PORT}`);
});
module.exports = app;
