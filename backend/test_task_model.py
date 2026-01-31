# Simple test - no database
print('Testing basic Python syntax...')
print('Testing if Task class can be imported...')
try:
    from app.models.task import Task
    print('✅ Task model imported successfully')
except Exception as e:
    print(f'❌ Error importing Task model: {e}')

print('Testing extra_metadata field...')
try:
    # Test if we can create a Task with extra_metadata
    import uuid
    task_data = {
        'title': 'Test Task',
        'extra_metadata': {'test': 'data'}
    }
    task = Task(**task_data)
    print(f'✅ Task created with extra_metadata: {task.extra_metadata}')
except Exception as e:
    print(f'❌ Error creating Task with extra_metadata: {e}')