# Update script for API files with new structure
import os
import re

def update_imports(directory):
    """Update imports in all Python files in directory"""
    updated_count = 0
    
    for root, dirs, files in os.listdir(directory):
        if root.startswith('.') or not files:
            continue
            
            file_path = os.path.join(root, files)
            
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Update imports based on file location
                if 'app/api/v1/' in file_path or 'app/core/' in file_path:
                    if 'from app.database import get_db' in content:
                        updated_content = re.sub(
                            r'from app\.database import get_db',
                            'from app.database_async import get_async_db',
                            content
                        )
                    
                    f.seek(0)
                f.write(updated_content)
                f.close()
                
                updated_count += 1
                print(f"Updated {file_path}")
                
            except Exception as e:
                print(f"Error updating {file_path}: {e}")
    
    print(f"Updated {updated_count} files")

if __name__ == "__main__":
    # Update API v1 directory
    update_imports("app/api/v1")
    
    print("Database import updates completed!")