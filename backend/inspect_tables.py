import asyncio
from sqlalchemy import text
from app.database import AsyncSessionLocal

async def inspect():
    async with AsyncSessionLocal() as db:
        with open("db_inspect.txt", "w") as f:
            f.write("--- Tables ---\n")
            result = await db.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"))
            tables = result.scalars().all()
            for table in tables:
                f.write(f"Table: {table}\n")
                col_result = await db.execute(text(f"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '{table}'"))
                cols = col_result.all()
                for col in cols:
                    f.write(f"  - {col[0]} ({col[1]})\n")
            
            f.write("\n--- Users ---\n")
            user_result = await db.execute(text("SELECT id, email, name, supabase_id FROM users LIMIT 5"))
            users = user_result.all()
            for user in users:
                f.write(f"{user}\n")

if __name__ == "__main__":
    asyncio.run(inspect())
