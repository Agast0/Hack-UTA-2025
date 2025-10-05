from __future__ import annotations
from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, Field
from beanie import Document, PydanticObjectId, Link
from pydantic import BaseModel, Field


# --- Enums ---
class TeamTypeEnum(str, Enum):
    FRONT_END = 'front-end'
    BACK_END = 'back-end'


# --- DB Models (Documents) - These stay the same ---
class Team(Document):
    name: str = Field(..., unique=True)
    team_type: TeamTypeEnum
    members: List[Link['User']] = []

    class Settings:
        name = 'teams'


class User(Document):
    auth0Id: str = Field(..., unique=True)
    email: str
    name: Optional[str] = None
    picture: Optional[str] = None
    team: Optional[Link[Team]] = None

    class Settings:
        name = 'users'


# --- API Input Models - These stay the same ---
class UserCreate(BaseModel):
    sub: str
    email: str
    name: Optional[str] = None
    picture: Optional[str] = None


class BugReportCreate(BaseModel):
    title: str
    description: str
    creator_auth0Id: str


class BugReportUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    is_approved: Optional[bool] = None


class TeamCreate(BaseModel):
    name: str
    team_type: TeamTypeEnum
    creator_auth0Id: str


class TeamJoin(BaseModel):
    user_auth0Id: str


# --- DB Models for Bug Reports ---
class SeverityEnum(str, Enum):
    CRITICAL = 'critical'
    HIGH = 'high'
    MEDIUM = 'medium'
    LOW = 'low'


class ReproductionStep(BaseModel):
    step_number: int
    text: str
    image_url: str  # base64 data URL expected from agent


class BugReport(Document):
    title: str
    description: str
    roast: Optional[str] = None
    severity: Optional[SeverityEnum] = None
    reproduction_steps: List[ReproductionStep] = []
    team_id: Optional[str] = None  # auth0 id provided by agent (aka tester/team id)
    is_approved: bool = False
    team: Link[Team]

    class Settings:
        name = 'bug_reports'


# --- NEW: API Response Models to Prevent Circular References ---

# A "view" of a Team without its members list
class TeamInfo(BaseModel):
    id: PydanticObjectId
    name: str
    team_type: TeamTypeEnum

    class Config:
        from_attributes = True


# A "view" of a User without their team info
class UserInfo(BaseModel):
    id: PydanticObjectId
    auth0Id: str
    email: str
    name: Optional[str] = None
    picture: Optional[str] = None

    class Config:
        from_attributes = True


# The full User response, which can safely include team info
class UserResponse(UserInfo):
    team: Optional[TeamInfo] = None


# The full Team response, which can safely include a list of members
class TeamResponse(TeamInfo):
    members: List[UserInfo] = []


# --- General API Response Models ---
class SyncResponse(BaseModel):
    message: str
    user: UserResponse   # Use the safe response model


class TeamCreationResponse(BaseModel):
    message: str
    team: TeamResponse   # Use the safe response model


class DeleteResponse(BaseModel):
    message: str
