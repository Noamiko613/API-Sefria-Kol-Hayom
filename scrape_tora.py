"""
Scrape and organize prayers from mobile.tora.ws and existing Siddur app data
This script extracts prayer texts and organizes them into yesod_prayers folder
"""

import requests
from bs4 import BeautifulSoup
import json
import os
import time
from urllib.parse import urljoin
import re
import shutil

# Paths
API_SEFRIA_DIR = r"C:\Users\noami\My Projects\API sefria"
SIDDUR_APP_DIR = r"C:\Users\noami\My Projects\siddur app"
YESOD_DIR = os.path.join(API_SEFRIA_DIR, "data", "yesod_prayers")
PRAYERS_DIR = os.path.join(SIDDUR_APP_DIR, "prayers")

# Headers to mimic a browser request
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
}

def create_yesod_structure():
    """Create the Yesod prayers directory structure with metadata"""
    
    # Create main directories
    dirs = [
        YESOD_DIR,
        os.path.join(YESOD_DIR, "daily"),
        os.path.join(YESOD_DIR, "shabbat"),
        os.path.join(YESOD_DIR, "rosh_chodesh"),
        os.path.join(YESOD_DIR, "hagim"),
        os.path.join(YESOD_DIR, "special"),
        os.path.join(YESOD_DIR, "birkat_hashachar"),
        os.path.join(YESOD_DIR, "pesukei_dzimra"),
        os.path.join(YESOD_DIR, "kriat_shma"),
        os.path.join(YESOD_DIR, "amidah"),
        os.path.join(YESOD_DIR, "nusach_ashkenaz"),
        os.path.join(YESOD_DIR, "nusach_sefarad"),
        os.path.join(YESOD_DIR, "nusach_edot_mizrach"),
    ]
    
    for d in dirs:
        os.makedirs(d, exist_ok=True)
    
    # Create metadata file
    metadata = {
        "nusach": "Yesod",
        "description": "Yesod prayer texts - comprehensive collection organized by category and nusach",
        "source": "Compiled from multiple sources including mobile.tora.ws and traditional siddurim",
        "language": "Hebrew with vowelization",
        "categories": {
            "daily": "Daily prayers (Shacharit, Mincha, Maariv) for weekdays",
            "shabbat": "Shabbat prayers (Kabbalat Shabbat, Shacharit, Musaf, Mincha, Havdalah)",
            "rosh_chodesh": "Rosh Chodesh (New Month) prayers",
            "hagim": "Holiday prayers (Pesach, Shavuot, Sukkot, etc.)",
            "special": "Special occasion prayers (Hallel, Tachanun, Selichot, etc.)",
            "birkat_hashachar": "Morning blessings",
            "pesukei_dzimra": "Verses of praise",
            "kriat_shma": "Shema and its blessings",
            "amidah": "The Amidah (Standing Prayer) for all occasions",
            "nusach_ashkenaz": "Ashkenaz nusach variants",
            "nusach_sefarad": "Sefard nusach variants",
            "nusach_edot_mizrach": "Edot HaMizrach nusach variants"
        }
    }
    
    metadata_file = os.path.join(YESOD_DIR, "metadata.json")
    with open(metadata_file, "w", encoding="utf-8") as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)
    
    print(f"✓ Created Yesod structure at: {YESOD_DIR}")
    return metadata

def copy_prayers_by_nusach():
    """Copy and organize prayers from existing siddur app by nusach"""
    
    nusach_mapping = {
        "siddur ashkenaz": "nusach_ashkenaz",
        "siddur sefarad": "nusach_sefarad",
        "siddur edot hamizrach": "nusach_edot_mizrach"
    }
    
    for source_dir, target_dir in nusach_mapping.items():
        source_path = os.path.join(PRAYERS_DIR, source_dir)
        target_path = os.path.join(YESOD_DIR, target_dir)
        
        if os.path.exists(source_path):
            # Copy all files
            for item in os.listdir(source_path):
                source_file = os.path.join(source_path, item)
                target_file = os.path.join(target_path, item)
                
                if os.path.isfile(source_file):
                    shutil.copy2(source_file, target_file)
                    print(f"  ✓ Copied: {item} → {target_dir}/")
                elif os.path.isdir(source_file):
                    dest = os.path.join(target_path, item)
                    if os.path.exists(dest):
                        shutil.rmtree(dest)
                    shutil.copytree(source_file, dest)
                    print(f"  ✓ Copied directory: {item} → {target_dir}/")
    
    # Copy root level prayer files
    for item in os.listdir(PRAYERS_DIR):
        source_file = os.path.join(PRAYERS_DIR, item)
        if os.path.isfile(source_file) and item.endswith('.txt'):
            target_file = os.path.join(YESOD_DIR, item)
            shutil.copy2(source_file, target_file)
            print(f"  ✓ Copied root file: {item}")
    
    print(f"✓ Organized nusach prayers")

def categorize_prayers():
    """Categorize prayers into daily, shabbat, holidays, etc."""
    
    # Daily prayers
    daily_files = {
        "shacharit": ["שחרית", "shacharit"],
        "mincha": ["מנחה", "mincha"],
        "maariv": ["ערבית", "maariv", "maariv_lechol"]
    }
    
    # Shabbat prayers
    shabbat_files = {
        "kabbalat_shabbat": ["קבלת שבת", "kabbalat"],
        "shacharit": ["שחרית לשבת", "shacharit_lechol"],
        "musaf": ["מוסף", "musaf"],
        "mincha": ["מנחה לשבת", "mincha_leshabbat"],
        "havdalah": ["הבדלה", "havdalah"]
    }
    
    # Holiday prayers
    hagim_files = {
        "pesach": ["פסח", "pesach"],
        "shavuot": ["שבועות", "shavuot"],
        "sukkot": ["סוכות", "sukkot"],
        "rosh_hashana": ["ראש השנה", "rosh_hashana"],
        "yom_kippur": ["יום כיפור", "yom_kippur"],
        "chanukah": ["חנוכה", "chanukah"],
        "purim": ["פורים", "purim"],
        "sefira": ["ספירה", "sefira"]
    }
    
    # Special prayers
    special_files = {
        "hallel": ["הלל", "hallel"],
        "tachanun": ["תחנון", "tachanun"],
        "selichot": ["סליחות", "selichot"],
        "kiddush_levana": ["קידוש לבנה", "kiddush"],
        "birkat_hachama": ["ברכת החמה", "birkat_hachama"],
        "tefilat_haderech": ["תפילת הדרך", "haderech"]
    }
    
    def find_and_copy(category_dict, target_category):
        """Find files matching keywords and copy to target directory"""
        target_dir = os.path.join(YESOD_DIR, target_category)
        os.makedirs(target_dir, exist_ok=True)
        
        # Search in all nusach directories
        for nusach_dir in ["nusach_ashkenaz", "nusach_sefarad", "nusach_edot_mizrach"]:
            nusach_path = os.path.join(YESOD_DIR, nusach_dir)
            if not os.path.exists(nusach_path):
                continue
                
            for item in os.listdir(nusach_path):
                item_lower = item.lower()
                
                for prayer_name, keywords in category_dict.items():
                    if any(kw in item_lower for kw in keywords):
                        source = os.path.join(nusach_path, item)
                        target = os.path.join(target_dir, f"{nusach_dir}_{item}")
                        shutil.copy2(source, target)
                        print(f"  ✓ Categorized: {item} → {target_category}/{prayer_name}")
    
    print("\nCategorizing prayers...")
    find_and_copy(daily_files, "daily")
    find_and_copy(shabbat_files, "shabbat")
    find_and_copy(hagim_files, "hagim")
    find_and_copy(special_files, "special")

def create_index_file():
    """Create a comprehensive index of all yesod prayers"""
    
    index = {
        "yesod_prayers": [],
        "total_files": 0,
        "categories": {}
    }
    
    for root, dirs, files in os.walk(YESOD_DIR):
        # Skip metadata files
        if "metadata.json" in files or "index.json" in files:
            files = [f for f in files if f not in ["metadata.json", "index.json"]]
        
        rel_root = os.path.relpath(root, YESOD_DIR)
        if rel_root == ".":
            rel_root = "root"
        
        if files:
            index["categories"][rel_root] = files
            index["total_files"] += len(files)
            
            for file in files:
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, "r", encoding="utf-8") as f:
                        content = f.read()
                        index["yesod_prayers"].append({
                            "file": file,
                            "path": os.path.join("yesod_prayers", rel_root, file),
                            "size_bytes": len(content.encode("utf-8")),
                            "category": rel_root
                        })
                except Exception as e:
                    print(f"  ⚠ Error reading {file}: {e}")
    
    index_file = os.path.join(YESOD_DIR, "index.json")
    with open(index_file, "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)
    
    print(f"\n✓ Created index with {index['total_files']} files")
    return index

def scrape_mobile_tora():
    """Attempt to scrape from mobile.tora.ws"""
    print("\nAttempting to scrape from mobile.tora.ws...")
    
    urls = [
        "https://mobile.tora.ws",
        "https://tora.ws/siddur",
        "https://mobile.tora.ws/siddur",
    ]
    
    scraped_content = {}
    
    for url in urls:
        try:
            print(f"  Trying: {url}")
            response = requests.get(url, headers=headers, timeout=10)
            
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'html.parser')
                
                # Save raw HTML
                html_file = os.path.join(YESOD_DIR, "tora_raw.html")
                with open(html_file, "w", encoding="utf-8") as f:
                    f.write(response.text)
                
                # Extract text
                text = soup.get_text(separator='\n', strip=True)
                if len(text) > 100:  # Only save if there's substantial content
                    text_file = os.path.join(YESOD_DIR, "tora_text.txt")
                    with open(text_file, "w", encoding="utf-8") as f:
                        f.write(text)
                    print(f"  ✓ Extracted {len(text)} characters")
                
                # Find links
                links = soup.find_all('a', href=True)
                if links:
                    scraped_content[url] = [link['href'] for link in links]
                    print(f"  ✓ Found {len(links)} links")
            else:
                print(f"  ✗ Status: {response.status_code}")
        except Exception as e:
            print(f"  ✗ Error: {e}")
        
        time.sleep(1)  # Be respectful to the server
    
    return scraped_content

def main():
    print("=" * 60)
    print("Yesod Prayers Scraper & Organizer")
    print("=" * 60)
    
    # Step 1: Try to scrape from mobile.tora.ws
    scraped = scrape_mobile_tora()
    
    # Step 2: Create Yesod structure
    print("\nCreating Yesod prayer structure...")
    metadata = create_yesod_structure()
    
    # Step 3: Copy and organize prayers from Siddur app
    print("\nCopying prayers from Siddur app...")
    copy_prayers_by_nusach()
    
    # Step 4: Categorize prayers
    categorize_prayers()
    
    # Step 5: Create index
    print("\nCreating index...")
    index = create_index_file()
    
    print("\n" + "=" * 60)
    print("✓ Yesod prayers organization complete!")
    print(f"  Location: {YESOD_DIR}")
    print(f"  Total files: {index['total_files']}")
    print(f"  Categories: {len(index['categories'])}")
    print("=" * 60)

if __name__ == "__main__":
    main()
