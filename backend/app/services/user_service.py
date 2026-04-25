"""
User service: CRUD operations on the MongoDB `users` collection.
"""
import os
import re
import logging
from datetime import datetime
from typing import Optional, Dict, Any

from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, DuplicateKeyError
from bson import ObjectId

from app.services.auth_service import hash_password, verify_password

logger = logging.getLogger(__name__)

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/")
MONGODB_DATABASE = os.getenv("MONGODB_DATABASE", "legal_documents")

PASSWORD_MIN_LENGTH = 8
PASSWORD_REGEX = re.compile(
    r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{}|;:'\",.<>?/`~])"
)

MAX_FAILED_ATTEMPTS = 5
LOCKOUT_MINUTES = 15


class UserService:
    """Manages user accounts in MongoDB."""

    def __init__(self):
        self.client: Optional[MongoClient] = None
        self.db = None
        self.users = None
        self.connected = False
        self._connect()

    def _connect(self):
        try:
            self.client = MongoClient(
                MONGODB_URI,
                serverSelectionTimeoutMS=5000,
                connectTimeoutMS=5000,
            )
            self.client.admin.command("ping")
            self.db = self.client[MONGODB_DATABASE]
            self.users = self.db["users"]
            self._ensure_indexes()
            self.connected = True
            logger.info("UserService connected to MongoDB")
        except ConnectionFailure as e:
            self.connected = False
            logger.error(f"UserService: MongoDB connection failed: {e}")
        except Exception as e:
            self.connected = False
            logger.error(f"UserService: unexpected error: {e}")

    def _ensure_indexes(self):
        """Create unique indexes on email and username."""
        self.users.create_index("email", unique=True)
        self.users.create_index("username", unique=True)

    @staticmethod
    def validate_password(password: str) -> Optional[str]:
        """Return an error message if password is weak, else None."""
        if len(password) < PASSWORD_MIN_LENGTH:
            return f"Password must be at least {PASSWORD_MIN_LENGTH} characters."
        if not PASSWORD_REGEX.match(password):
            return "Password must contain uppercase, lowercase, digit, and special character."
        return None

    def create_user(
        self, email: str, username: str, password: str, role: str = "user"
    ) -> Dict[str, Any]:
        """
        Register a new user. Returns {"success": True, "user_id": ...} or
        {"success": False, "error": ...}.
        """
        if not self.connected:
            return {"success": False, "error": "Database unavailable"}

        pw_error = self.validate_password(password)
        if pw_error:
            return {"success": False, "error": pw_error}

        now = datetime.utcnow()
        doc = {
            "email": email.lower().strip(),
            "username": username.strip(),
            "hashed_password": hash_password(password),
            "role": role,
            "is_active": True,
            "failed_login_attempts": 0,
            "locked_until": None,
            "created_at": now,
            "updated_at": now,
        }
        try:
            result = self.users.insert_one(doc)
            return {"success": True, "user_id": str(result.inserted_id)}
        except DuplicateKeyError:
            return {"success": False, "error": "Email or username already registered."}

    def authenticate(self, email: str, password: str) -> Dict[str, Any]:
        """
        Verify credentials. Returns {"success": True, "user": {...}} or
        {"success": False, "error": ...}.
        """
        if not self.connected:
            return {"success": False, "error": "Database unavailable"}

        user = self.users.find_one({"email": email.lower().strip()})
        if not user:
            return {"success": False, "error": "Invalid email or password."}

        if not user.get("is_active", True):
            return {"success": False, "error": "Account is deactivated."}

        if user.get("locked_until") and user["locked_until"] > datetime.utcnow():
            remaining = (user["locked_until"] - datetime.utcnow()).seconds // 60
            return {
                "success": False,
                "error": f"Account locked. Try again in {remaining + 1} minutes.",
            }

        if not verify_password(password, user["hashed_password"]):
            attempts = user.get("failed_login_attempts", 0) + 1
            update: Dict[str, Any] = {"$set": {"failed_login_attempts": attempts}}
            if attempts >= MAX_FAILED_ATTEMPTS:
                from datetime import timedelta
                lock_time = datetime.utcnow() + timedelta(minutes=LOCKOUT_MINUTES)
                update["$set"]["locked_until"] = lock_time
            self.users.update_one({"_id": user["_id"]}, update)
            return {"success": False, "error": "Invalid email or password."}

        self.users.update_one(
            {"_id": user["_id"]},
            {"$set": {"failed_login_attempts": 0, "locked_until": None}},
        )

        return {
            "success": True,
            "user": {
                "id": str(user["_id"]),
                "email": user["email"],
                "username": user["username"],
                "role": user.get("role", "user"),
            },
        }

    def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Fetch a user by ObjectId string."""
        if not self.connected:
            return None
        try:
            user = self.users.find_one({"_id": ObjectId(user_id)})
            if not user:
                return None
            return {
                "id": str(user["_id"]),
                "email": user["email"],
                "username": user["username"],
                "role": user.get("role", "user"),
                "is_active": user.get("is_active", True),
                "created_at": user.get("created_at"),
            }
        except Exception:
            return None


_user_service: Optional[UserService] = None


def get_user_service() -> UserService:
    global _user_service
    if _user_service is None:
        _user_service = UserService()
    return _user_service
