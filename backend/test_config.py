#!/usr/bin/env python3

print("Testing basic Python imports and paths...")
try:
    import os
    from app.local_config import settings
    
    print(f"✅ Current working directory: {os.getcwd()}")
    print(f"✅ Local config file exists: {os.path.exists('app/local_config.py')}")
    print(f"✅ Settings import successful: {bool(settings)}")
    print(f"✅ Database URL: {settings.database_url}")
    print(f"✅ Directory listing works: {bool(os.path.exists('app'))}")
    
except Exception as e:
    print(f"❌ Error: {e}")

print("\\nTesting os.listdir on app directory:")
try:
    app_files = [f for f in os.listdir('app') if f.endswith('.py')]
    print(f"✅ App files: {app_files}")
    
    if app_files:
        print(f"✅ Found {len(app_files)} Python files in app directory")
    else:
        print("❌ No Python files found in app directory")
    
    # Check for subdirectories
    if os.path.exists('app/api/v1'):
        api_files = [f for f in os.listdir('app/api/v1') if f.endswith('.py')]
        print(f"✅ API v1 files: {api_files}")
        
        if api_files:
            print(f"✅ Found {len(api_files)} API v1 files")
        else:
            print("❌ No API v1 files found")
    
except Exception as e:
    print(f"❌ Error in file operations: {e}")

print("\\nTesting import statements:")
try:
    # Test main config import
    from app.config import settings
    print("✅ Main config import: SUCCESS")
    
    # Test local config import
    from app.local_config import settings
    print("✅ Local config import: SUCCESS")
    
except Exception as e:
    print(f"❌ Config import error: {e}")

print("\\nTesting SQLAlchemy imports:")
try:
    from sqlalchemy.ext.asyncio import create_async_engine
    print("✅ SQLAlchemy asyncio import: SUCCESS")
    
except Exception as e:
    print(f"❌ SQLAlchemy import error: {e}")

print("✅ Test completed!")