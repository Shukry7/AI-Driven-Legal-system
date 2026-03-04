"""Clear prediction cache"""
from pathlib import Path
import os

cache_dir = Path(__file__).parent / "uploads" / ".prediction_cache"

if cache_dir.exists():
    count = 0
    for file in cache_dir.glob("*.json"):
        file.unlink()
        count += 1
    print(f"✅ Cleared {count} cache files")
else:
    print("❌ Cache directory not found")
