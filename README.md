# 📚 Sefria API

A comprehensive REST API for Jewish religious texts including Tanach, Mishna, Gemara, Rambam, Tur, and Prayers in multiple nuschaot (liturgical traditions).

## 🐳 Docker Setup

### Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/api-sefria.git
cd api-sefria

# Build and start the container
docker-compose up -d

# Check if it's running
docker-compose ps

# View logs
docker-compose logs -f

# Stop the container
docker-compose down
```

### Docker Commands Reference

#### Build the image manually
```bash
docker build -t sefria-api .
```

#### Run without docker-compose
```bash
docker run -d \
  --name sefria-api \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data:ro \
  -e NODE_ENV=production \
  sefria-api
```

#### Rebuild after code changes
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

#### Update prayer data
The `data/` directory is mounted as a read-only volume, so you can update texts without rebuilding:
```bash
# Just restart the container after modifying data/
docker-compose restart
```

#### Health Check
```bash
# Check container health
docker inspect --format='{{.State.Health.Status}}' sefria-api

# Or via API
curl http://localhost:3000/health
```

### Docker Compose Options

- `docker-compose up -d` - Start in detached mode (background)
- `docker-compose up` - Start in foreground (see logs)
- `docker-compose down` - Stop and remove containers
- `docker-compose down -v` - Stop and remove containers + volumes
- `docker-compose logs -f` - Follow logs
- `docker-compose restart` - Restart services
- `docker-compose exec sefria-api sh` - Shell into container

## 📖 API Documentation

Base URL: `http://localhost:3000`

### Root Endpoint

```bash
GET /
```

Returns API information and available endpoints.

### Health Check

```bash
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-04-06T12:00:00.000Z",
  "uptime": 123.456
}
```

---

## 📚 Books API

### List All Categories

```bash
GET /api/books
```

**Response:**
```json
{
  "categories": [
    "tanach",
    "mishna",
    "gemara",
    "rambam",
    "tur",
    "prayers",
    "yesod_prayers"
  ]
}
```

### List Category Contents

```bash
GET /api/books/:category
```

**Example:**
```bash
curl http://localhost:3000/api/books/tanach
```

**Response:**
```json
{
  "category": "tanach",
  "contents": [
    {
      "name": "TORA",
      "isDirectory": true,
      "path": "tanach/TORA"
    },
    {
      "name": "NAVI",
      "isDirectory": true,
      "path": "tanach/NAVI"
    }
  ]
}
```

### Get File Content

```bash
GET /api/books/:category/*filepath
```

**Example:**
```bash
curl http://localhost:3000/api/books/tanach/TORA/01_BERESHIT/file.txt
```

---

## ✡️ Tanach API

Hebrew Bible - 24 books divided into Torah (5 books), Nevi'im (Prophets), and Ketuvim (Writings).

### List Tanach Sections

```bash
GET /api/tanach
```

**Response:**
```json
{
  "category": "tanach",
  "description": "Hebrew Bible - 24 books divided into Torah, Nevi'im, and Ketuvim",
  "contents": [...]
}
```

### List Section Contents

```bash
GET /api/tanach/:section
```

**Example:**
```bash
curl http://localhost:3000/api/tanach/TORA
```

### Get Tanach File

```bash
GET /api/tanach/:section/*filepath
```

**Example:**
```bash
curl http://localhost:3000/api/tanach/TORA/01_BERESHIT/a01_Bereshit.txt
```

**Response:**
```json
{
  "section": "TORA",
  "path": "01_BERESHIT/a01_Bereshit.txt",
  "content": "בְּרֵאשִׁית בָּרָא אֱלֹהִים..."
}
```

---

## 📖 Mishna API

Mishna - 6 orders (Sedarim) with 63 tractates.

### List Mishna Orders

```bash
GET /api/mishna
```

**Response:**
```json
{
  "category": "mishna",
  "description": "Mishna - 6 orders (Sedarim) with 63 tractates",
  "contents": [
    {"name": "100_SEDER_ZRAIM", "isDirectory": true, "path": "mishna/100_SEDER_ZRAIM"},
    {"name": "101_SEDER_MOED", "isDirectory": true, "path": "mishna/101_SEDER_MOED"},
    ...
  ]
}
```

### Get Mishna File

```bash
GET /api/mishna/*filepath
```

**Example:**
```bash
curl http://localhost:3000/api/mishna/100_SEDER_ZRAIM/10001_MZ_BRAHOT/MZ_BRAHOT_L1.txt
```

---

## 📚 Gemara API

Babylonian Talmud - 37 tractates.

### List Gemara

```bash
GET /api/gemara
```

### Get Gemara File

```bash
GET /api/gemara/*filepath
```

---

## 📜 Rambam API

Mishneh Torah by Rambam (Maimonides) - 14 books.

### List Rambam Books

```bash
GET /api/rambam
```

**Response:**
```json
{
  "category": "rambam",
  "description": "Mishneh Torah by Rambam - 14 books",
  "contents": [
    {"name": "00000_RAMBAM-MRG_NEW.txt", "isDirectory": false, "path": "rambam/00000_RAMBAM-MRG_NEW.txt"},
    ...
  ]
}
```

### Get Rambam File

```bash
GET /api/rambam/*filepath
```

**Example:**
```bash
curl http://localhost:3000/api/rambam/00002_mada_merged.txt
```

---

## ⚖️ Tur API

Arba'ah Turim (Four Rows) - 4 sections with commentaries.

### List Tur Sections

```bash
GET /api/tur
```

**Response:**
```json
{
  "category": "tur",
  "description": "Arba'ah Turim - 4 sections with commentaries",
  "contents": [
    {"name": "030_orach_chaim_merged.txt", "isDirectory": false, "path": "tur/030_orach_chaim_merged.txt"},
    {"name": "031_yore_deaa_merged.txt", "isDirectory": false, "path": "tur/031_yore_deaa_merged.txt"},
    ...
  ]
}
```

### Get Tur File

```bash
GET /api/tur/*filepath
```

**Example:**
```bash
curl http://localhost:3000/api/tur/030_orach_chaim_merged.txt
```

---

## 🙏 Prayers API

Prayer texts organized by nusach (liturgical tradition).

### List Prayer Categories

```bash
GET /api/prayers
```

**Response:**
```json
{
  "category": "prayers",
  "description": "Prayer texts organized by nusach (Ashkenaz, Sefarad, Edot HaMizrach)",
  "contents": [
    {"name": "siddur ashkenaz", "isDirectory": true, "path": "prayers/siddur ashkenaz"},
    {"name": "siddur sefarad", "isDirectory": true, "path": "prayers/siddur sefarad"},
    {"name": "siddur edot hamizrach", "isDirectory": true, "path": "prayers/siddur edot hamizrach"},
    ...
  ]
}
```

### Get Prayer File

```bash
GET /api/prayers/*filepath
```

**Example:**
```bash
curl http://localhost:3000/api/prayers/siddur%20sefarad/shachrit_lechol.txt
```

---

## ✨ Yesod Prayers API

Comprehensive collection of Yesod nusach prayers organized by category and nusach. Includes daily prayers, Shabbat, holidays, and special prayers.

### List Yesod Prayers

```bash
GET /api/prayers/yesod
```

**Response:**
```json
{
  "category": "yesod_prayers",
  "description": "Yesod nusach prayers - comprehensive collection organized by category and nusach",
  "source": "Compiled from mobile.tora.ws and traditional siddurim",
  "metadata": {
    "nusach": "Yesod",
    "description": "Yesod prayer texts - comprehensive collection organized by category and nusach",
    "categories": {
      "daily": "Daily prayers (Shacharit, Mincha, Maariv) for weekdays",
      "shabbat": "Shabbat prayers (Kabbalat Shabbat, Shacharit, Musaf, Mincha, Havdalah)",
      ...
    }
  },
  "contents": [...]
}
```

### Get Yesod Metadata

```bash
GET /api/prayers/yesod/metadata
```

**Response:**
```json
{
  "category": "yesod_prayers",
  "metadata": {
    "nusach": "Yesod",
    "description": "...",
    "source": "...",
    "categories": {...}
  }
}
```

### Get Yesod Index

```bash
GET /api/prayers/yesod/index
```

**Response:**
```json
{
  "yesod_prayers": [...],
  "total_files": 88,
  "categories": {...}
}
```

### Get Yesod Prayer File

```bash
GET /api/prayers/yesod/*filepath
```

**Example:**
```bash
# List daily prayers
curl http://localhost:3000/api/prayers/yesod/daily

# Get specific prayer
curl http://localhost:3000/api/prayers/yesod/daily/shacharit.txt

# Get nusach-specific prayer
curl http://localhost:3000/api/prayers/yesod/nusach_sefarad/shachrit_lechol.txt
```

**Response (text file):**
```json
{
  "path": "nusach_sefarad/shachrit_lechol.txt",
  "type": "text",
  "content": "בָּרוּךְ שֶׁאָמַר וְהָיָה הָעוֹלָם..."
}
```

**Response (JSON file):**
```json
{
  "path": "metadata.json",
  "type": "json",
  "data": {...}
}
```

### Yesod Prayer Categories

| Category | Description |
|----------|-------------|
| `daily` | Daily prayers (Shacharit, Mincha, Maariv) |
| `shabbat` | Shabbat prayers (Kabbalat Shabbat, Shacharit, Musaf, Mincha, Havdalah) |
| `rosh_chodesh` | Rosh Chodesh (New Month) prayers |
| `hagim` | Holiday prayers (Pesach, Shavuot, Sukkot, etc.) |
| `special` | Special prayers (Hallel, Tachanun, Selichot, etc.) |
| `birkat_hashachar` | Morning blessings |
| `pesukei_dzimra` | Verses of praise |
| `kriat_shma` | Shema and its blessings |
| `amidah` | The Amidah for all occasions |
| `nusach_ashkenaz` | Ashkenaz nusach prayers |
| `nusach_sefarad` | Sefard nusach prayers |
| `nusach_edot_mizrach` | Edot HaMizrach nusach prayers |

---

## 🔍 Search API

Search across all texts.

```bash
GET /api/search?q=query
```

**Example:**
```bash
curl "http://localhost:3000/api/search?q=בראשית"
```

**Response:**
```json
{
  "query": "בראשית",
  "totalResults": 5,
  "results": [
    {
      "category": "tanach",
      "file": "TORA/01_BERESHIT/a01_Bereshit.txt",
      "matches": [
        {"line": 1, "text": "בְּרֵאשִׁית בָּרָא אֱלֹהִים..."},
        ...
      ]
    },
    ...
  ]
}
```

---

## 📁 Data Structure

```
data/
├── tanach/               # Hebrew Bible
│   ├── TORA/            # Torah (5 books)
│   │   ├── 01_BERESHIT/
│   │   ├── 02_SHEMOT/
│   │   ├── 03_VAIKRA/
│   │   ├── 04_BAMIDBAR/
│   │   └── 05_DEVARIM/
│   └── NAVI/            # Prophets (21 books)
│       ├── 06_YEHOSUA/
│       ├── 07_SHOFETIM/
│       └── ...
├── mishna/              # Mishna (6 orders)
│   ├── 100_SEDER_ZRAIM/
│   ├── 101_SEDER_MOED/
│   ├── 102_SEDER_NASHIM/
│   ├── 103_SEDER_NEZIKIN/
│   ├── 104_SEDER_KADASHIM/
│   └── 105_SEDER_TAHAROT/
├── gemara/              # Babylonian Talmud
├── rambam/              # Mishneh Torah (14 books)
├── tur/                 # Arba'ah Turim (4 sections)
├── prayers/             # Prayer texts
│   ├── siddur ashkenaz/
│   ├── siddur sefarad/
│   ├── siddur edot hamizrach/
│   └── [root level prayer files]
└── yesod_prayers/       # Yesod nusach prayers
    ├── metadata.json
    ├── index.json
    ├── daily/
    ├── shabbat/
    ├── rosh_chodesh/
    ├── hagim/
    ├── special/
    ├── nusach_ashkenaz/
    ├── nusach_sefarad/
    └── nusach_edot_mizrach/
```

---

## 🛠 Local Development (Without Docker)

### Prerequisites
- Node.js >= 18.0.0
- npm

### Setup

```bash
# Install dependencies
npm install

# Start development server (with auto-reload)
npm run dev

# Or start production server
npm start
```

### Project Structure

```
api-sefria/
├── data/                 # Religious texts
├── src/
│   ├── server.js        # Main server file
│   ├── controllers/     # Route controllers (empty - routes in server.js)
│   ├── middleware/      # Middleware (empty)
│   └── routes/          # Route definitions (empty - routes in server.js)
├── scrape_tora.py       # Prayer scraper script
├── Dockerfile
├── docker-compose.yml
├── .dockerignore
├── package.json
└── README.md
```

---

## 📊 API Statistics

- **Total Categories:** 7 (tanach, mishna, gemara, rambam, tur, prayers, yesod_prayers)
- **Tanach Books:** 24 (5 Torah + 8 Nevi'im Rishonim + 3 Nevi'im Acharonim + 12 Trei Asar)
- **Mishna Tractates:** 63 across 6 orders
- **Rambam Books:** 14 books of Mishneh Torah
- **Tur Sections:** 4 main sections with commentaries
- **Prayers:** Multiple nuschaot (Ashkenaz, Sefarad, Edot HaMizrach)
- **Yesod Prayers:** 88+ files across 11 categories

---

## 📝 License

MIT

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

**Built with ❤️ for the Jewish learning community**
