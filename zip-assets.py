import os
import zipfile
import time

def zip_assets(source_dir, output_zip):
    print(f"🚀 Bulding bulk asset bundle: {output_zip}...")
    start_time = time.time()
    
    with zipfile.ZipFile(output_zip, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(source_dir):
            for file in files:
                # Don't include the zip file itself if it's already there
                if file == 'books.zip':
                    continue
                    
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, source_dir)
                
                # Zip it up!
                zipf.write(file_path, arcname)
                # print(f"  Added: {arcname}")

    end_time = time.time()
    size_mb = os.path.getsize(output_zip) / (1024 * 1024)
    print(f"✅ Created {output_zip} in {end_time - start_time:.2f} seconds.")
    print(f"📦 Final size: {size_mb:.2f} MB")

if __name__ == "__main__":
    current_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(current_dir, 'data')
    output_zip = os.path.join(data_dir, 'books.zip')
    
    if os.path.exists(data_dir):
        zip_assets(data_dir, output_zip)
    else:
        print(f"❌ Error: data directory not found at {data_dir}")
