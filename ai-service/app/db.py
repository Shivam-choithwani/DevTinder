import logging
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

logger = logging.getLogger("devtinder.db")

class Database:
    client: AsyncIOMotorClient = None
    db = None

db_helper = Database()

def connect_db():
    try:
        logger.info(f"Connecting to MongoDB URI: {settings.MONGODB_URI.split('@')[-1]}")
        db_helper.client = AsyncIOMotorClient(settings.MONGODB_URI)
        db_helper.db = db_helper.client[settings.MONGODB_DB_NAME]
        logger.info("Successfully connected to MongoDB.")
    except Exception as e:
        logger.error(f"Error connecting to MongoDB: {e}")
        raise e

def disconnect_db():
    if db_helper.client:
        db_helper.client.close()
        logger.info("Closed MongoDB connection.")

def get_db():
    if db_helper.db is None:
        connect_db()
    return db_helper.db

# Collection Helper Accessors
def get_collection(name: str):
    database = get_db()
    return database[name]

def get_users_collection():
    return get_collection("users")

def get_profiles_collection():
    return get_collection("profiles")

def get_github_profiles_collection():
    return get_collection("github_profiles")

def get_builder_profiles_collection():
    return get_collection("builder_profiles")

def get_swipes_collection():
    return get_collection("swipes")

def get_matches_collection():
    return get_collection("matches")
