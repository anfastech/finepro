from fastapi import FastAPI, Request, HTTPException, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging
import time

from .config import settings
# from .supabase_settings import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_JWT_SECRET
# from .database import init_db  # Disabled - using Supabase instead
from .api.v1.router import api_router
from .core.websocket_manager import ws_manager


# Configure logging
logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    logger.info("Starting up FinePro AI Backend...")
    # Note: Using Supabase instead of local PostgreSQL database
    # await init_db()  # Disabled - using Supabase
    logger.info("Backend ready (using Supabase)")
    
    yield
    
    # Shutdown
    logger.info("Shutting down FinePro AI Backend...")
    
    # Close all WebSocket connections
    for workspace_id in list(ws_manager.workspace_connections.keys()):
        for user_id in list(ws_manager.workspace_connections[workspace_id].keys()):
            await ws_manager.disconnect(user_id, workspace_id)


# Create FastAPI application
app = FastAPI(
    title="FinePro AI Backend",
    description="AI-powered project management platform backend",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS.split(",") if settings.ALLOWED_ORIGINS else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all incoming requests"""
    start_time = time.time()
    
    # Log request details
    is_websocket = "upgrade" in request.headers.get("connection", "").lower() and \
                   request.headers.get("upgrade", "").lower() == "websocket"
    
    logger.info(f"Incoming {'WebSocket upgrade' if is_websocket else 'request'}: {request.method} {request.url.path}")
    
    # Log origin
    logger.info(f"Origin: {request.headers.get('origin')}")
    
    # Log authorization header (redacted)
    auth_header = request.headers.get("Authorization")
    if auth_header:
        token_part = auth_header[:15] + "..." if len(auth_header) > 15 else "SHORT"
        logger.info(f"Authorization Header: {token_part}")
    else:
        # Don't log warning for WebSockets as they usually don't have Auth header (token is in URL)
        if not is_websocket:
            logger.warning("No Authorization Header present")
        
    response = await call_next(request)
    
    process_time = time.time() - start_time
    logger.info(f"Request completed: {request.method} {request.url.path} - Status: {response.status_code} - Time: {process_time:.4f}s")
    
    return response


# Request timing middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception: {exc}", exc_info=True)
    response = JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "Internal server error",
            "detail": str(exc) if settings.DEBUG else None
        }
    )
    # Ensure CORS headers are present on 500 errors
    origin = request.headers.get("origin")
    if origin:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
    return response


# Health check endpoint
@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "database": "connected",  # TODO: Add actual database health check
        "version": "1.0.0",
        "timestamp": time.time()
    }


# Root endpoint
@app.get("/", tags=["Root"])
async def root():
    """Root endpoint"""
    return {
        "message": "Welcome to FinePro AI Backend API",
        "version": "1.0.0",
        "docs": "/docs" if settings.DEBUG else "Documentation not available in production"
    }


@app.websocket("/ws-test")
async def websocket_test(websocket: WebSocket):
    """Test WebSocket endpoint"""
    await websocket.accept()
    logger.info("Test WebSocket connection accepted")
    try:
        while True:
            data = await websocket.receive_text()
            logger.info(f"Test WebSocket received: {data}")
            await websocket.send_text(f"Echo: {data}")
    except Exception as e:
        logger.info(f"Test WebSocket closed: {e}")


# Include API router
app.include_router(api_router, prefix="/api/v1")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level="info"
    )