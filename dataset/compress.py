import os
from PIL import Image

def compress_image(input_path, target_kb=105):
    """Compress image to approximately target_kb kilobytes."""
    target_bytes = target_kb * 1024
    
    img = Image.open(input_path)
    
    # Convert RGBA to RGB if needed (for JPEG saving)
    if img.mode in ('RGBA', 'P'):
        img = img.convert('RGB')
    
    # Binary search for the right quality
    low, high = 10, 95
    best_quality = low
    
    while low <= high:
        mid = (low + high) // 2
        img.save(input_path, 'JPEG', quality=mid, optimize=True)
        size = os.path.getsize(input_path)
        
        if size <= target_bytes:
            best_quality = mid
            low = mid + 1
        else:
            high = mid - 1
    
    img.save(input_path, 'JPEG', quality=best_quality, optimize=True)
    final_size = os.path.getsize(input_path) // 1024
    print(f"Compressed: {input_path} → {final_size} KB (quality={best_quality})")

def compress_folder(folder_path):
    extensions = ('.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG')
    for root, dirs, files in os.walk(folder_path):
        for file in files:
            if file.endswith(extensions):
                compress_image(os.path.join(root, file))

# ✏️ Change this to your folder path
compress_folder(r"C:\path\to\your\folder")
