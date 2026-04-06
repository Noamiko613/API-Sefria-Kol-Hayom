# 🚀 Kol Hayom API Standalone Hosting - Mini PC Setup

This project is the **Standalone Host Service** for the Kol Hayom (Siddur) app. Hosting this on your Mini PC makes all religious texts available to your app users worldwide!

---

## 🌩️ API Overview
- **Bulk Download (Offline)**: `GET /api/download-all` (Serves the 200MB `books.zip` bundle).
- **On-Demand (Online)**: `GET /api/books/...` (Fast, live fetching of Tanach/Gemara/etc).

---

## ⚡ Setup Command (Throw this into PowerShell on Mini PC)

Copy and paste the entire block below into your Mini PC's **PowerShell** window.  
*(Make sure you have Docker installed and your Cloudflare Tunnel Token ready!)*

```powershell
# 1. CLONE THE REPO
git clone https://github.com/Noamiko613/API-Sefria-Kol-Hayom.git C:\KolHayomAPI
cd C:\KolHayomAPI

# 2. GENERATE BULK ASSET ZIP (For initial Offline mode!)
python zip-assets.py

# 3. SET YOUR CLOUDFLARE TUNNEL TOKEN (Replace 'YOUR_TOKEN_HERE' with yours)
$env:TUNNEL_TOKEN="YOUR_TOKEN_HERE"

# 4. START DOCKER (API + CLOUDFLARE TUNNEL)
docker-compose up -d --build

# 5. DONE! Check if it's running
docker-compose ps
Write-Host "`n✅ API is running publicly via Cloudflare tunnel!" -ForegroundColor Green
```

---

## 🐳 Docker Components

- **sefria-api**: The Core Express/Node server running on port **3000**.
- **sefria-tunnel**: The Cloudflare `cloudflared` worker that securely exposes your API to the internet.

## 🛠 Maintenance

### To update your texts:
1. Update files in the `data/` directory.
2. Run `python zip-assets.py` to regenerate the "Download All" bundle.
3. Restart Docker: `docker-compose restart sefria-api`.

### To change your public URL:
1. Go to your [Cloudflare Dashboard](https://dash.cloudflare.com).
2. Update your **Public Hostname** in the Zero Trust section to point to `http://sefria-api:3000`.

---

**Built with ❤️ for the Jewish learning community.**
