# Update script for API files
import os
import re

def update_imports(directory):
    """Update imports in all Python files in directory"""
    updated_count = 0
    
    for root, dirs, files in os.walk(directory):
        if root.endswith('.py') and files:
            file_path = os.path.join(root, files)
            
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Replace database imports with async version
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