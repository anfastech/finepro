import asyncio
from sqlalchemy import text
from app.database import engine

async def inspect():
    async with engine.connect() as conn:
        # Check User
        print("\n--- Checking User '3es4e2ml781i' ---")
        result = await conn.execute(text("SELECT id, supabase_id, email, name FROM users WHERE id = '3es4e2ml781i'"))
        user = result.fetchone()
        if user:
            print(f"User Found: {user}")
        else:
            print("User NOT found with ID '3es4e2ml781i'")
            
            # Try finding by supabase_id if we knew it, or just list all users to see what's there
            print("Listing all users (limit 5):")
            all_users = await conn.execute(text("SELECT id, supabase_id, email FROM users LIMIT 5"))
            for u in all_users:
                print(f"- {u}")

        # Check Members
        print("\n--- Checking Members for User '3es4e2ml781i' ---")
        result = await conn.execute(text("SELECT * FROM members WHERE user_id = '3es4e2ml781i'"))
        members = result.fetchall()
        if members:
            print(f"Found {len(members)} memberships:")
            for m in members:
                print(f"- Workspace {m.workspace_id}, Role: {m.role}")
        else:
            print("No memberships found for this user.")
            
        # Check Workspaces owned by this user
        print("\n--- Checking Workspaces owned by User '3es4e2ml781i' ---")
        result = await conn.execute(text("SELECT id, name, owner_id FROM workspaces WHERE owner_id = '3es4e2ml781i'"))
        workspaces = result.fetchall()
        if workspaces:
             for w in workspaces:
                 print(f"- Workspace: {w.id} ({w.name}), Owner: {w.owner_id}")
        else:
            print("No workspaces owned by this user.")

if __name__ == "__main__":
    asyncio.run(inspect())
