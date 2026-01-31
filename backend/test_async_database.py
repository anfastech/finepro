# Quick test - check if async database works

def test_async_connection():
    try:
        from app.database_async import get_async_db
        print("✅ Async database import successful")
        
        # Test database connection
        db = get_async_db()
        print("✅ Async database session created successfully")
        db.close()
        return True
    except Exception as e:
        print(f'❌ Error: {e}')
        return False

def test_task_model():
    try:
        from app.models.task import Task
        task = Task(
            title='Test Task',
            description='Test Description',
            status='TODO',
            extra_metadata={'test': 'data'}
        )
        print('✅ Task model created successfully with extra_metadata')
        return task
    except Exception as e:
        print(f'❌ Error: {e}')
        return None

# Run tests
try:
    print("Testing async database connection...") 
    if test_async_connection():
        print("Testing Task model creation...") 
        task = test_task_model()
        if task and task.extra_metadata == {'test': 'data'}:
            print("✅ All tests passed! Async database configuration is working correctly.")
        else:
            print("❌ Task model test failed")
    else:
        print("❌ Async database connection failed")
        
except Exception as e:
    print(f'❌ Unexpected error: {e}')