import asyncio
from sqlalchemy import text
from app.database import engine

async def migrate():
    async with engine.begin() as conn:
        print("Starting migration...")
        
        # Check if avatar_url exists
        result = await conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='users' AND column_name='avatar_url';
        """))
        if not result.fetchone():
            print("Adding column avatar_url to users table...")
            await conn.execute(text("ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500);"))
        else:
            print("Column avatar_url already exists.")
            
        print("Migration completed successfully.")

if __name__ == "__main__":
    asyncio.run(migrate())
