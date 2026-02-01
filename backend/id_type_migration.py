import asyncio
from sqlalchemy import text
from app.database import engine

async def migrate():
    async with engine.begin() as conn:
        print("Starting ID type conversion migration...")
        
        # 1. Drop all foreign key constraints first
        constraints = [
            ("activity_logs", "activity_logs_user_id_fkey"),
            ("comments", "comments_task_id_fkey"),
            ("comments", "comments_user_id_fkey"),
            ("epics", "epics_project_id_fkey"),
            ("members", "members_user_id_fkey"),
            ("members", "members_workspace_id_fkey"),
            ("projects", "projects_created_by_fkey"),
            ("projects", "projects_workspace_id_fkey"),
            ("sprint_task_details", "sprint_task_details_sprint_id_fkey"),
            ("sprint_task_details", "sprint_task_details_task_id_fkey"),
            ("sprints", "sprints_project_id_fkey"),
            ("tasks", "tasks_assigned_to_fkey"),
            ("tasks", "tasks_created_by_fkey"),
            ("tasks", "tasks_epic_id_fkey"),
            ("time_entries", "time_entries_task_id_fkey"),
            ("time_entries", "time_entries_user_id_fkey"),
            ("workspaces", "workspaces_owner_id_fkey"),
        ]
        
        for table, constraint in constraints:
            print(f"Dropping constraint {constraint} on {table}...")
            await conn.execute(text(f"ALTER TABLE {table} DROP CONSTRAINT IF EXISTS {constraint};"))

        # 2. Convert Primary Key Columns to VARCHAR(36)
        tables_with_pk = [
            "users", "workspaces", "members", "projects", "epics", 
            "tasks", "activity_logs", "comments", "sprints", 
            "sprint_task_details", "time_entries"
        ]
        
        for table in tables_with_pk:
            print(f"Converting ID column in {table} to VARCHAR(36)...")
            await conn.execute(text(f"ALTER TABLE {table} ALTER COLUMN id TYPE VARCHAR(36) USING id::text;"))

        # 3. Convert Foreign Key Columns to VARCHAR(36)
        fk_columns = [
            ("activity_logs", "user_id"),
            ("comments", "task_id"),
            ("comments", "user_id"),
            ("epics", "project_id"),
            ("members", "user_id"),
            ("members", "workspace_id"),
            ("projects", "created_by"),
            ("projects", "workspace_id"),
            ("sprint_task_details", "sprint_id"),
            ("sprint_task_details", "task_id"),
            ("sprints", "project_id"),
            ("tasks", "assigned_to"),
            ("tasks", "created_by"),
            ("tasks", "epic_id"),
            ("time_entries", "task_id"),
            ("time_entries", "user_id"),
            ("workspaces", "owner_id"),
        ]

        for table, col in fk_columns:
            print(f"Converting FK column {col} in {table} to VARCHAR(36)...")
            await conn.execute(text(f"ALTER TABLE {table} ALTER COLUMN {col} TYPE VARCHAR(36) USING {col}::text;"))

        # 4. Recreate Foreign Key Constraints
        recreate_constraints = [
            "ALTER TABLE activity_logs ADD CONSTRAINT activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id)",
            "ALTER TABLE comments ADD CONSTRAINT comments_task_id_fkey FOREIGN KEY (task_id) REFERENCES tasks(id)",
            "ALTER TABLE comments ADD CONSTRAINT comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id)",
            "ALTER TABLE epics ADD CONSTRAINT epics_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id)",
            "ALTER TABLE members ADD CONSTRAINT members_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id)",
            "ALTER TABLE members ADD CONSTRAINT members_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id)",
            "ALTER TABLE projects ADD CONSTRAINT projects_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id)",
            "ALTER TABLE projects ADD CONSTRAINT projects_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id)",
            "ALTER TABLE sprint_task_details ADD CONSTRAINT sprint_task_details_sprint_id_fkey FOREIGN KEY (sprint_id) REFERENCES sprints(id)",
            "ALTER TABLE sprint_task_details ADD CONSTRAINT sprint_task_details_task_id_fkey FOREIGN KEY (task_id) REFERENCES tasks(id)",
            "ALTER TABLE sprints ADD CONSTRAINT sprints_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id)",
            "ALTER TABLE tasks ADD CONSTRAINT tasks_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES users(id)",
            "ALTER TABLE tasks ADD CONSTRAINT tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id)",
            "ALTER TABLE tasks ADD CONSTRAINT tasks_epic_id_fkey FOREIGN KEY (epic_id) REFERENCES epics(id)",
            "ALTER TABLE time_entries ADD CONSTRAINT time_entries_task_id_fkey FOREIGN KEY (task_id) REFERENCES tasks(id)",
            "ALTER TABLE time_entries ADD CONSTRAINT time_entries_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id)",
            "ALTER TABLE workspaces ADD CONSTRAINT workspaces_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES users(id)"
        ]

        for sql in recreate_constraints:
            print(f"Recreating constraint: {sql}...")
            await conn.execute(text(sql))

        print("Migration completed successfully.")

if __name__ == "__main__":
    asyncio.run(migrate())
