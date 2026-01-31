# FinePro AI

A comprehensive project management platform built with modern technologies for seamless team collaboration and productivity.

```mermaid
graph TB
    subgraph Client_Layer["Client Layer"]
        Browser[Web Browser]
        Mobile[Mobile App]
    end
    
    subgraph Frontend["Frontend (Next.js 15)"]
        UI[UI Components<br/>shadcn/ui]
        Auth[Authentication<br/>Supabase Auth]
        State[State Management<br/>TanStack Query]
        RealtimeC[Real-time Client<br/>Socket.IO]
    end
    
    subgraph Backend_API["Backend API (FastAPI)"]
        REST[REST API Routes<br/>v1/endpoints]
        WSS[WebSocket Server<br/>Real-time Hub]
        AuthS[Auth Service<br/>JWT Validation]
    end
    
    subgraph Services["Services Layer"]
        TaskS[Task Service]
        ProjectS[Project Service]
        WorkspaceS[Workspace Service]
        UserS[User Service]
        NotificationS[Notification Service]
        PresenceS[Presence Service]
    end
    
    subgraph Realtime_Services["Real-time Services"]
        RT[RealtimeTaskService]
        PS[PresenceService]
        NS[NotificationService]
        AFS[ActivityFeedService]
    end
    
    subgraph Database["Database Layer (Supabase)"]
        PostgreSQL[(PostgreSQL 17<br/>RLS Enabled)]
        AuthDB[(Auth Users)]
        Storage[(Storage Bucket)]
    end
    
    subgraph External["External Services"]
        SupabaseAPI[Supabase API<br/>PostgREST]
        SupabaseRT[Supabase Realtime<br/>Broadcast]
    end
    
    %% Connections
    Browser --> UI
    Mobile --> UI
    
    UI --> Auth
    UI --> State
    UI --> RealtimeC
    UI --> REST
    
    Auth --> AuthS
    State --> REST
    RealtimeC --> WSS
    REST --> AuthS
    REST --> TaskS
    REST --> ProjectS
    REST --> WorkspaceS
    REST --> UserS
    
    WSS --> RT
    WSS --> PS
    WSS --> NS
    WSS --> AFS
    
    TaskS --> RT
    ProjectS --> RT
    WorkspaceS --> RT
    UserS --> RT
    
    RT --> WSS
    PS --> WSS
    NS --> WSS
    AFS --> WSS
    
    TaskS --> PostgreSQL
    ProjectS --> PostgreSQL
    WorkspaceS --> PostgreSQL
    UserS --> PostgreSQL
    
    PostgreSQL --> AuthDB
    PostgreSQL --> Storage
    
    WSS --> SupabaseRT
    RT --> SupabaseRT
```

---

## Mission

FinePro AI aims to empower teams with an intelligent, real-time project management solution that streamlines workflows, enhances collaboration, and delivers AI-driven insights to boost productivity.

---

## Unique Selling Points

- **Real-time Collaboration**: Live updates, presence indicators, and instant notifications
- **AI-Powered Insights**: Intelligent suggestions and automation for project workflows
- **Scalable Architecture**: Built with modern, maintainable technologies
- **Enterprise-Grade Security**: Row Level Security (RLS) for data protection
- **High Performance**: Async backend with WebSocket real-time communication
- **Modern UI/UX**: Beautiful, responsive interface with Next.js 15

---

## Technology Stack

### Frontend

| Technology | Purpose |
|------------|---------|
| Next.js 15 | React framework for production-grade applications |
| React 19 | UI library for building user interfaces |
| TypeScript | Type-safe JavaScript for better developer experience |
| Tailwind CSS | Utility-first CSS framework for styling |
| shadcn/ui | Beautiful, accessible UI components |
| TanStack Query | Data fetching and caching |
| Socket.IO Client | Real-time communication |
| Supabase Client | Direct database access and authentication |

### Backend

| Technology | Purpose |
|------------|---------|
| FastAPI | Modern Python web framework for building APIs |
| Python 3.11+ | Programming language |
| SQLAlchemy | SQL toolkit and ORM |
| asyncpg | Asynchronous PostgreSQL driver |
| Pydantic | Data validation using Python type hints |
| Alembic | Database migration tool |
| Python-JOSE | JWT token handling |
| WebSocket (native) | Real-time bidirectional communication |

### Database and Infrastructure

| Technology | Purpose |
|------------|---------|
| PostgreSQL 17 | Relational database |
| Supabase | PostgreSQL hosting, Auth, Realtime, Storage |
| Supabase CLI | Local development environment |
| PgBouncer | Connection pooling (production) |

### DevOps and Tools

| Technology | Purpose |
|------------|---------|
| Git | Version control |
| GitHub | Code hosting and collaboration |
| VS Code | Code editor |
| Mermaid | Diagrams and documentation |

---

## Architecture

### System Architecture

```
+-----------------------------------------------------------------+
|                      Frontend (Next.js)                         |
|  +--------------+  +--------------+  +----------------------+   |
|  |  Components  |  |   Hooks &    |  |   API Integration    |   |
|  |   (shadcn)   |  |   Queries    |  |   (TanStack Query)   |   |
|  +--------------+  +--------------+  +----------------------+   |
|           |                  |                   |              |
|           +------------------+-------------------+              |
|                              |                                 |
|              +-------------------------------+                 |
|              |    Supabase Client            |                 |
|              |  (Auth + Direct DB Access)    |                 |
|              +-------------------------------+                 |
+-----------------------------------------------------------------+
                              |
                              | HTTPS / WebSocket
                              v
+-----------------------------------------------------------------+
|                      Backend (FastAPI)                           |
|  +--------------+  +--------------+  +----------------------+   |
|  |   REST API   |  |  WebSocket   |  |   Services Layer     |   |
|  |   (Routes)   |  |   Server     |  |   (Business Logic)   |   |
|  +--------------+  +--------------+  +----------------------+   |
|           |                  |                   |              |
|           +------------------+-------------------+              |
|                              v                                 |
|         +-------------------------------------+                |
|         |        SQLAlchemy ORM               |                |
|         |   (Async with asyncpg driver)       |                |
|         +-------------------------------------+                |
+-----------------------------------------------------------------+
                              |
                              | TCP / SSL
                              v
+-----------------------------------------------------------------+
|                    Database Layer (Supabase)                     |
|  +----------------------------------------------------------+   |
|  |                    PostgreSQL 17                          |   |
|  |              (Row Level Security Enabled)                 |   |
|  +----------------------------------------------------------+   |
|                              |                                 |
|              +---------------+---------------+                 |
|              v               v               v                 |
|        +---------+    +----------+    +----------+             |
|        |  Auth   |    |Realtime  |    | Storage  |             |
|        +---------+    +----------+    +----------+             |
+-----------------------------------------------------------------+
```

### Task Flow Architecture

```mermaid
graph TB
    subgraph Task_Endpoints["Task Endpoints"]
        TC[Task Create] --> UE[Task Update] --> AS[Assign] --> ST["Status Change"] --> DL[Delete] --> CM[Comment]
    end
    
    subgraph EnhancedTaskService["EnhancedTaskService"]
        TC --> E1[create_task_with_realtime]
        UE --> E2[update_task_with_realtime]
        AS --> E3[assign_task_with_realtime]
        ST --> E4[change_task_status_with_realtime]
        DL --> E5[delete_task_with_realtime]
        CM --> E6[add_comment_with_realtime]
    end
    
    subgraph Realtime_Integration["Realtime Integration"]
        E1 --> R1[_handle_task_created]
        E2 --> R2[_handle_task_updated]
        E3 --> R3[_handle_task_assigned]
        E4 --> R4[_handle_status_changed]
        E5 --> R5[_handle_task_deleted]
        E6 --> R6[_handle_comment_added]
    end
    
    subgraph Services_Layer["Services Layer"]
        R1 --> RT[RealtimeTaskService]
        R2 --> RT
        R3 --> RT
        R4 --> RT
        R5 --> RT
        R6 --> RT
        
        R1 --> NS[NotificationService]
        R3 --> NS
        R4 --> NS
        R6 --> NS
        
        R1 --> AF[ActivityFeedService]
        R2 --> AF
        R3 --> AF
        R4 --> AF
        R5 --> AF
        R6 --> AF
        
        R2 --> PS[PresenceService]
    end
    
    subgraph WebSocket_Layer["WebSocket Layer"]
        RT --> WS[WebSocket Manager]
        NS --> WS
        PS --> WS
        AF --> WS
    end
```

---

## Database Schema

```
+-------------------------------------------------------------+
|                      finepro_db                             |
+-------------------------------------------------------------+
|  users ---+-- members ---+-- workspaces                     |
|           |               |    |                            |
|           |               +----+-- projects                 |
|           |                      |    |                     |
|           |                      +----+-- epics             |
|           |                             |    |              |
|           |                             +----+-- tasks       |
|           |                                    |    |       |
|           |                                    +----+-- comments |
|           |                                       |          |
|           +----------------------------------+--- sprints    |
|                                        |                  |
|                                        +---- time_entries |
+-------------------------------------------------------------+
```

### Tables

| Table | Description |
|-------|-------------|
| users | User accounts and profiles |
| workspaces | Project workspaces with invite codes |
| projects | Individual projects within workspaces |
| epics | Large features within projects |
| tasks | Specific tasks with assignments and status |
| sprints | Time-boxed work periods |
| members | Workspace membership with roles (owner/admin/member) |
| comments | Task comments and discussions |
| activity_logs | Audit trail of all changes |
| time_entries | Time tracking for tasks |

---

## Security

### Row Level Security (RLS)

FinePro implements Row Level Security (RLS) at the database level to ensure data isolation and protection. Policies are defined in [backend/supabase/rls_policies.sql](backend/supabase/rls_policies.sql).

#### RLS Policies Overview

| Table | Policy | Description |
|-------|--------|-------------|
| users | Public Read | All users can view user profiles |
| users | Own Update | Users can update only their own profile |
| workspaces | Member View | View workspaces where user is a member |
| workspaces | Owner Manage | Owners can update/delete their workspaces |
| projects | Workspace Access | CRUD based on workspace membership |
| tasks | Workspace Access | CRUD based on workspace membership |
| epics | Workspace Access | CRUD based on workspace membership |
| members | Role-Based | Owners/Admins can manage members |
| comments | Task Access | View/Create based on task accessibility |
| activity_logs | Workspace View | View activity in accessible workspaces |
| time_entries | Task Access | CRUD based on task accessibility |

#### Applying RLS

RLS policies can be applied at any time:

```bash
# Via Supabase CLI
cd backend/supabase
supabase db push

# Or via Supabase Dashboard
# SQL Editor -> Run contents of rls_policies.sql
```

#### RLS Verification

```sql
-- Check if RLS is enabled
SELECT tablename, rowlevelsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
```

### Authentication

- Supabase Auth for user management
- JWT Tokens for API authentication
- Role-Based Access Control (RBAC) for workspace permissions

### Frontend Security

- Only Anon Key is exposed to the frontend
- Service Role Key is backend-only (never exposed to client)
- All sensitive operations go through the backend API

---

## Real-Time Features

FinePro provides comprehensive real-time capabilities:

| Feature | Implementation | Description |
|---------|---------------|-------------|
| Live Updates | Custom WebSocket Server | Instant task/project updates |
| Presence | WebSocket + Presence Service | See who is online in workspace |
| Typing Indicators | Realtime Service | Show when users are typing |
| Notifications | Notification Service | Real-time alerts and updates |
| Activity Feed | Activity Feed Service | Live activity stream |

### WebSocket Endpoints

```
ws://localhost:8000/ws/connect/{token}
```

### Realtime Services

- [realtime_task_service.py](backend/app/services/realtime_task_service.py) - Task updates
- [presence_service.py](backend/app/services/presence_service.py) - User presence
- [notification_service.py](backend/app/services/notification_service.py) - Notifications
- [websocket_manager.py](backend/app/core/websocket_manager.py) - Connection management

---

## Getting Started

For detailed setup instructions, see the individual README files:
- [Frontend README](frontend/README.md)
- [Backend README](backend/README.md)

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/your-repo/finepro.git
cd finepro

# 2. Start Supabase locally
cd backend/supabase
supabase start

# 3. Set up backend
cd ../..
cd backend
cp .env.example .env
# Edit .env with your configuration
pip install -r requirements.txt
uvicorn app.main:app --reload

# 4. Set up frontend
cd ../frontend
npm install
npm run dev
```

---

## Project Structure

```
finepro/
├── backend/                    # FastAPI Backend
│   ├── app/
│   │   ├── api/v1/            # API routes
│   │   ├── core/              # Core utilities (security, websocket)
│   │   ├── models/            # SQLAlchemy models
│   │   ├── schemas/           # Pydantic schemas
│   │   ├── services/          # Business logic
│   │   └── database.py        # Database connection
│   ├── supabase/              # Supabase configuration
│   │   ├── config.toml        # Supabase CLI config
│   │   └── rls_policies.sql   # RLS policies
│   ├── alembic/               # Database migrations
│   └── requirements.txt       # Python dependencies
│
├── frontend/                   # Next.js Frontend
│   ├── src/
│   │   ├── app/               # Next.js App Router pages
│   │   ├── components/        # UI components
│   │   ├── features/          # Feature-based modules
│   │   ├── lib/               # Utilities and clients
│   │   └── config.ts          # Supabase configuration
│   └── package.json           # Node dependencies
│
├── Docs/                       # Documentation
├── tests/                      # Test files
└── README.md                   # This file
```

---

## API Documentation

FastAPI provides auto-generated API documentation:

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

---

## Testing

```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test
```

---

## License

MIT License - see LICENSE file for details.

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## Support

For issues and feature requests, please create an issue on GitHub.

---

Built with care by the FinePro Team
