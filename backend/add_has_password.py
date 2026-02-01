import asyncio
from sqlalchemy import text
from app.database import engine

async def migrate():
    async with engine.begin() as conn:
        print("Starting has_password column migration...")
        
        # Check if column exists
        result = await conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'users' 
            AND column_name = 'has_password';
        """))
        
        if result.fetchone():
            print("Column 'has_password' already exists.")
        else:
            print("Adding 'has_password' column to users table...")
            await conn.execute(text("ALTER TABLE users ADD COLUMN has_password BOOLEAN DEFAULT FALSE;"))
            
        print("Migration completed successfully.")

if __name__ == "__main__":
    asyncio.run(migrate())
