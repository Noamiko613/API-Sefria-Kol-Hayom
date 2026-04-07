# 🚀 Kol Hayom API Standalone Hosting - Mini PC Setup

This project is the **Standalone Host Service** for the Kol Hayom (Siddur) app. Hosting this on your Mini PC makes all religious texts available to your app users worldwide!

---

## 🌩️ API Overview
- **Bulk Download (Offline)**: `GET /api/download-all` (Serves the 200MB `books.zip` bundle).
- **On-Demand (Online)**: `GET /api/books/...` (Fast, live fetching of Tanach/Gemara/etc).

---

## ⚡ Setup Command (Throw this into PowerShell on Mini PC)

Copy and paste the entire block below into your Mini PC's **PowerShell** window.  
*(Make sure you have Docker installed!)*

```powershell
# 1. CLONE THE REPO
git clone https://github.com/Noamiko613/API-Sefria-Kol-Hayom.git C:\KolHayomAPI
cd C:\KolHayomAPI

# 2. GENERATE BULK ASSET ZIP (For initial Offline mode!)
python zip-assets.py

# 3. SET YOUR STATIC SUBDOMAIN
$env:TUNNEL_NAME="kolhayom-siddur-api"

# 4. START DOCKER (API + INSTATUNNEL)
docker-compose up -d --build

# 5. DONE! Check if it's running
docker-compose ps
Write-Host "`n✅ API is running publicly at https://$env:TUNNEL_NAME.instatunnel.my !" -ForegroundColor Green
```

---

## 🧹 Cleanup / Removal Commands

If you need to completely remove old Cloudflare versions, old containers, or start fresh:

```powershell
# Stop and remove all containers, networks, and volumes for this project
docker-compose down -v

# (Optional) If you have old lingering cloudflared containers, remove them forcefully:
docker rm -f sefria-tunnel
```

---

## 🐳 Docker Components

- **sefria-api**: The Core Express/Node server running on port **3000**.
- **sefria-tunnel**: The `instatunnel` container that securely exposes your API to the internet at a static domain without port-forwarding.

## 🛠 Maintenance

### To update your texts:
1. Update files in the `data/` directory.
2. Run `python zip-assets.py` to regenerate the "Download All" bundle.
3. Restart Docker: `docker-compose restart sefria-api`.

### To change your public URL:
1. Edit the `TUNNEL_NAME` in your `.env` file or export it as an environment variable before running `docker-compose up -d`.
2. Ensure you use a unique name (e.g. `my-awesome-siddur-api`).

---

**Built with ❤️ for the Jewish learning community.**
