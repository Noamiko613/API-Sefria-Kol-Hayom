# 📚 Sefria API - Mini PC Hosting Guide

This project is the **Standalone Host Service** for the Kol Hayom (Siddur) app. It serves all religious texts (Tanach, Gemara, etc.) and is designed to run in a Docker container on your Mini PC.

---

## 🌩️ API Endpoints

### 1. Offline Mode (Download All)
- **`GET /api/download-all`**: Serves the `books.zip` bundle. 
- *The app will call this once, unzip locally, and run without internet.*

### 2. Online Mode (On-demand)
- **`GET /api/books`**: List categories.
- **`GET /api/books/:category`**: List specific books.
- **`GET /api/books/:category/*filepath`**: Fetch a specific chapter or text file.
- *The app calls these as the user browses, saving phone storage.*

---

## 🐳 Docker Setup on Mini PC

### 1. Transfer Files
Copy the **entire project folder** (`API sefria`) to your Mini PC.

### 2. Prepare the Data
Ensure all texts are in the `data/` folder.  
To generate the `books.zip` bundle for the "Download All" feature, run this on your Mini PC:
```bash
python zip-assets.py
```

### 3. Start the API
Open a terminal in the project root and run:
```bash
# Build and start the container
docker-compose up -d --build
```
The API is now running on **port 3000**.

---

## 🌍 Global Access (For Play Store)

To make your Mini PC's API accessible to anyone using your app, you must expose it to the internet.

### Option A: Cloudflare Tunnel (Recommended)
1.  Install `cloudflared` on your Mini PC.
2.  Run: `cloudflared tunnel --url http://localhost:3000`
3.  Use the provided HTTPS URL in your Flutter app!

### Option B: Port Forwarding
1.  Forward port **3000** on your router to the local IP of your Mini PC.

---

## 📱 Flutter Integration

In your Flutter app, point your base URL to your public API (e.g., `https://api.myjewishapp.com`).

**Workflow:**
- **At startup**: Ask the user: "Download All (200MB)" or "Stream Online".
- **If Download All**: Hit `/api/download-all`, unzip to local storage, and use files locally.
- **If Stream**: Hit `/api/books/...` whenever a text is needed.
