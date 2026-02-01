import asyncio
from sqlalchemy import text
from app.database import engine

async def migrate():
    async with engine.begin() as conn:
        print("Starting final migration...")
        
        # 1. Rename auth_id to supabase_id if it exists
        result = await conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'auth_id';
        """))
        if result.fetchone():
            print("Renaming column auth_id to supabase_id...")
            await conn.execute(text("ALTER TABLE users RENAME COLUMN auth_id TO supabase_id;"))
        else:
            print("Column auth_id not found or already renamed.")

        # 2. Change type of supabase_id to VARCHAR(255) if it's currently UUID
        result = await conn.execute(text("""
            SELECT data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'supabase_id';
        """))
        row = result.fetchone()
        if row and row[0] == 'uuid':
            print("Changing supabase_id type from uuid to varchar(255)...")
            await conn.execute(text("ALTER TABLE users ALTER COLUMN supabase_id TYPE VARCHAR(255);"))
        
        # 3. Ensure avatar_url exists
        result = await conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'avatar_url';
        """))
        if not result.fetchone():
            print("Adding column avatar_url...")
            await conn.execute(text("ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500);"))
        else:
            print("Column avatar_url already exists.")
            
        print("Migration completed successfully.")

if __name__ == "__main__":
    asyncio.run(migrate())
