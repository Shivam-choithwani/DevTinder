import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from app.config import settings
from app.db import connect_db, disconnect_db
from app.routers import profile, recommender

# Set up logging configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("devtinder.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup actions
    logger.info("Initializing DevTinder Recommendation Service...")
    try:
        connect_db()
    except Exception as e:
        logger.error(f"Failed to establish database connection during startup: {e}")
    yield
    # Shutdown actions
    logger.info("Shutting down DevTinder Recommendation Service...")
    disconnect_db()

app = FastAPI(
    title="DevTinder Recommendation & Match Backend",
    description="AI builder profile creator, matching scoring engine, and vector search aggregator.",
    version="1.0.0",
    lifespan=lifespan
)

# Register routers
app.include_router(profile.router)
app.include_router(recommender.router)

@app.get("/")
async def root():
    return {
        "app": "DevTinder Recommendation Service Backend",
        "status": "healthy",
        "documentation": "/docs"
    }

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception caught on request {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal recommendation service error occurred."}
    )

if __name__ == "__main__":
    import uvicorn
    logger.info(f"Starting server on {settings.HOST}:{settings.PORT}")
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True
    )
