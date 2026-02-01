# FinePro AI Backend

Phase 1 backend implementation for FinePro AI - AI-powered project management platform.

## Features Implemented

### ✅ Completed
- **FastAPI Application**: Modern async API framework with CORS support
- **PostgreSQL Integration**: Async SQLAlchemy 2.0 with asyncpg driver
- **Database Models**: Complete SQLAlchemy models for Users, Workspaces, Projects, Epics, Tasks, Sprints, Comments, Activity Logs
- **Authentication System**: JWT token management with Supabase integration
- **API Endpoints**:
  - Authentication: `/api/v1/auth/verify`, `/api/v1/auth/exchange`, `/api/v1/auth/refresh`, `/api/v1/auth/me`
  - Workspaces: Basic CRUD operations (GET, POST, PATCH, DELETE)
- **Database Migrations**: Alembic setup for schema management
- **Pydantic Schemas**: Request/response validation for all models
- **Service Layer**: Business logic abstraction
- **Dependency Injection**: FastAPI dependencies for auth and database
- **Error Handling**: Global exception handling and proper HTTP status codes
- **Logging**: Application logging with debug mode support

### 🔄 In Progress
- **Testing**: Basic test structure for endpoints

### ⏳ Next Steps (Future Phases)
- Project CRUD endpoints
- Task CRUD endpoints  
- Sprint management
- Real-time features (WebSockets)
- AI agent integration
- WhatsApp notifications
- Advanced permission system
- Project planning AI features

## Setup Instructions

### 1. Prerequisites
- Python 3.8+
- PostgreSQL 12+
- Node.js (for frontend)

### 2. Installation
```bash
# Clone repository
git clone <repository-url>
cd finepro/backend

# Install dependencies
pip install -r requirements.txt

# Copy environment configuration
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### 3. Environment Variables
Create a `.env` file from `.env.example`:

```bash
# Supabase Configuration
# Supabase CLI Configuration
SUPABASE_ACCESS_TOKEN=your_supabase_access_token
SUPABASE_PROJECT_REF=your_project_ref
# Supabase API keys/secrets (used by CLI and backend if needed)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key

# PostgreSQL Database
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/finepro

# FastAPI JWT Configuration
SECRET_KEY=your-super-secret-key-change-in-production

# Server Configuration
DEBUG=true
ALLOWED_ORIGINS=http://localhost:3000
```

### 4. Database Setup

#### Option A: Local PostgreSQL
```bash
# Start PostgreSQL service
brew services start postgresql  # macOS
sudo systemctl start postgresql  # Linux

# Create database
createdb finepro

# Create user (optional)
createuser finepro_user
```

#### Option B: Docker PostgreSQL
```bash
# Run PostgreSQL in Docker
docker run --name finepro-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=finepro \
  -e POSTGRES_USER=postgres \
  -p 5432:5432 \
  -d postgres:15
```

### 5. Database Migrations
```bash
# Initialize database
alembic upgrade head

# Create new migration
alembic revision --autogenerate -m "Description"

# Apply migrations
alembic upgrade head
```

### 6. Run Development Server
```bash
# Start FastAPI server
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Server will be available at:
# API: http://localhost:8000
# Docs: http://localhost:8000/docs (when DEBUG=true)
```

### 7. Testing
```bash
# Run all tests
pytest

# Run specific test
pytest tests/test_main.py::TestHealthCheck::test_health_check -v

# Run with coverage
pytest --cov=app --cov-report=html
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/verify` - Verify Supabase JWT
- `POST /api/v1/auth/exchange` - Exchange Supabase token for FastAPI tokens
- `POST /api/v1/auth/refresh` - Refresh access token
- `GET /api/v1/auth/me` - Get current user info
- `POST /api/v1/auth/logout` - Logout user

### Workspaces
- `GET /api/v1/workspaces/` - List user workspaces
- `POST /api/v1/workspaces/` - Create workspace
- `GET /api/v1/workspaces/{id}` - Get workspace details
- `PATCH /api/v1/workspaces/{id}` - Update workspace
- `DELETE /api/v1/workspaces/{id}` - Delete workspace

### Health
- `GET /health` - Application health check
- `GET /` - Root endpoint

## Authentication Flow

1. **Supabase Token Verification**: Frontend sends Supabase JWT to `/api/v1/auth/verify`
2. **Token Exchange**: Verify token → Create/get user → Generate FastAPI tokens
3. **Access Token**: Use FastAPI JWT in `Authorization: Bearer {token}` header
4. **Token Refresh**: Use refresh token to get new access token

## Database Schema

### Core Models
- **User**: User accounts with Supabase integration
- **Workspace**: Project workspaces with member management
- **Project**: Individual projects within workspaces
- **Epic**: Large features within projects
- **Task**: Specific tasks with assignments and status
- **Sprint**: Time-boxed work periods
- **Member**: Workspace membership with roles
- **Comment**: Task comments and discussions
- **ActivityLog**: Audit trail of all changes

## Development Notes

### Code Style
- Uses Python type hints
- Pydantic for validation
- Async/await patterns throughout
- SQLAlchemy 2.0 async syntax
- FastAPI dependency injection

### Security
- JWT tokens with configurable expiration
- Supabase JWT verification
- Password hashing with bcrypt
- CORS configuration
- Input validation and sanitization

## Production Deployment

### Environment Setup
```bash
# Production environment variables
DEBUG=false
SECRET_KEY=<strong-random-key>
DATABASE_URL=postgresql+asyncpg://user:pass@prod-db:5432/finepro
ALLOWED_ORIGINS=https://yourdomain.com
```

### Docker Deployment
```bash
# Build image
docker build -t finepro-backend .

# Run container
docker run -p 8000:8000 --env-file .env finepro-backend
```

### Process Management
```bash
# Production server with Gunicorn
pip install gunicorn
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

## Troubleshooting

### Common Issues
1. **Database Connection Failed**
   - Check PostgreSQL is running
   - Verify DATABASE_URL format
   - Ensure database exists

2. **Import Errors**
   - Run `pip install -r requirements.txt`
   - Check Python version compatibility

3. **CORS Issues**
   - Update ALLOWED_ORIGINS in .env
   - Check frontend URL matches allowed origins

4. **JWT Token Errors**
   - Verify SECRET_KEY is set
   - Check token expiration settings

### Debug Mode
```bash
# Enable debug logging
DEBUG=true python -m uvicorn app.main:app --reload
```

## Architecture

```
┌─────────────────────────────────────────────────┐
│                FastAPI Application                │
├─────────────────────────────────────────────────┤
│              API Router (/api/v1)          │
├─────────────────────────────────────────────────┤
│          Auth Module │ Workspaces Module         │
├─────────────────────────────────────────────────┤
│          JWT Handler   │ CRUD Operations         │
├─────────────────────────────────────────────────┤
│            Database (PostgreSQL)               │
└─────────────────────────────────────────────────┘
```

## Next Steps for Phase 2

1. Implement Project CRUD endpoints
2. Implement Task CRUD endpoints
3. Add Sprint management
4. Implement WebSocket real-time features
5. Add AI agent infrastructure
6. Integrate WhatsApp notifications
7. Add comprehensive test coverage
8. Performance optimization
9. Production deployment configuration

---

**Phase 1 Status**: ✅ **COMPLETE** - Core backend foundation implemented and ready for Phase 2 development.