from typing import Optional, List
from beanie import Document, PydanticObjectId
from pydantic import BaseModel, Field

# --- Existing User Models (Keep these) ---
class User(Document):
    auth0Id: str = Field(..., unique=True)
    email: str
    name: Optional[str] = None
    picture: Optional[str] = None

    class Settings:
        name = 'users'


class UserCreate(BaseModel):
    sub: str
    email: str
    name: Optional[str] = None
    picture: Optional[str] = None


class SyncResponse(BaseModel):
    message: str
    user: User


# --- Bug Report Models ---
class BugReport(Document):
    title: str
    description: str
    is_approved: bool = False

    class Settings:
        name = 'bug_reports'


class BugReportCreate(BaseModel):
    title: str
    description: str


# NEW: Pydantic model for validating the incoming request body for updates.
class BugReportUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    is_approved: Optional[bool] = None


# NEW: Pydantic model for the delete response message.
class DeleteResponse(BaseModel):
    message: str
