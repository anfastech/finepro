import asyncio
from sqlalchemy import text
from app.database import AsyncSessionLocal

async def apply_fixes():
    async with AsyncSessionLocal() as db:
        print("Applying DB fixes...")
        
        # 1. Add project_id to tasks if it doesn't exist
        try:
            await db.execute(text("ALTER TABLE tasks ADD COLUMN project_id VARCHAR(12) REFERENCES projects(id)"))
            print("- Added project_id to tasks table")
        except Exception as e:
            if "already exists" in str(e):
                print("- project_id already exists in tasks table")
            else:
                print(f"- Error adding project_id: {e}")
        
        # 2. Create teams table
        try:
            create_teams = """
            CREATE TABLE IF NOT EXISTS teams (
                id VARCHAR(12) PRIMARY KEY,
                workspace_id VARCHAR(12) NOT NULL REFERENCES workspaces(id),
                name VARCHAR(255) NOT NULL,
                description TEXT,
                image_url VARCHAR(500),
                color VARCHAR(50),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
            """
            await db.execute(text(create_teams))
            print("- Created teams table")
        except Exception as e:
            print(f"- Error creating teams table: {e}")

        # 3. Create team_members table
        try:
            create_team_members = """
            CREATE TABLE IF NOT EXISTS team_members (
                team_id VARCHAR(12) NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
                member_id VARCHAR(12) NOT NULL REFERENCES members(id) ON DELETE CASCADE,
                joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (team_id, member_id)
            )
            """
            await db.execute(text(create_team_members))
            print("- Created team_members table")
        except Exception as e:
            print(f"- Error creating team_members table: {e}")
            
        await db.commit()
        print("Done.")

if __name__ == "__main__":
    asyncio.run(apply_fixes())
