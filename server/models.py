from __future__ import annotations
from enum import Enum
from typing import Optional, List
from datetime import datetime
from beanie import Document, PydanticObjectId, Link
from pydantic import BaseModel, Field


# --- Enums ---
class TeamTypeEnum(str, Enum):
    FRONT_END = 'front-end'
    BACK_END = 'back-end'


class AuditStatusEnum(str, Enum):
    RUNNING = 'running'
    COMPLETED = 'completed'
    FAILED = 'failed'
    QUEUED = 'queued'


class TestCaseStatusEnum(str, Enum):
    RUNNING = 'running'
    COMPLETED = 'completed'
    FAILED = 'failed'
    QUEUED = 'queued'


class BugSeverityEnum(str, Enum):
    CRITICAL = 'critical'
    HIGH = 'high'
    MEDIUM = 'medium'
    LOW = 'low'


class BugStatusEnum(str, Enum):
    PENDING = 'pending'
    CONFIRMED = 'confirmed'
    REJECTED = 'rejected'


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


# --- NEW: BugZooka API Input Models ---

class TestCaseCreate(BaseModel):
    name: str
    expected_output: str


class AgentRunCreate(BaseModel):
    target_url: str
    test_cases: List[TestCaseCreate]
    creator_auth0Id: str
    settings: Optional[dict] = None


class BugFindingUpdate(BaseModel):
    status: BugStatusEnum
    reviewer_auth0Id: str


class AgentRunUpdate(BaseModel):
    status: Optional[AuditStatusEnum] = None
    completed_at: Optional[datetime] = None


# --- DB Models for Bug Reports ---
class BugReport(Document):
    title: str
    description: str
    is_approved: bool = False
    team: Link[Team]

    class Settings:
        name = 'bug_reports'


# --- NEW: BugZooka Workflow Models ---

class TestCase(Document):
    name: str
    expected_output: str
    status: TestCaseStatusEnum = TestCaseStatusEnum.QUEUED
    progress: int = Field(default=0, ge=0, le=100)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None

    class Settings:
        name = 'test_cases'


class BugFinding(Document):
    title: str
    description: str
    steps_to_reproduce: List[str] = []
    severity: BugSeverityEnum
    roast_message: str
    screenshot_urls: List[str] = []
    status: BugStatusEnum = BugStatusEnum.PENDING
    confirmed_by: Optional[Link[User]] = None
    rejected_by: Optional[Link[User]] = None
    confirmed_at: Optional[datetime] = None
    rejected_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = 'bug_findings'


class AgentRun(Document):
    team: Link[Team]
    target_url: str
    created_by: Link[User]
    status: AuditStatusEnum = AuditStatusEnum.QUEUED
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    test_cases: List[Link[TestCase]] = []
    bug_findings: List[Link[BugFinding]] = []
    settings: dict = Field(default_factory=dict)  # For custom headers, subdomains, etc.

    class Settings:
        name = 'agent_runs'


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


# --- NEW: BugZooka Response Models ---

class TestCaseInfo(BaseModel):
    id: PydanticObjectId
    name: str
    expected_output: str
    status: TestCaseStatusEnum
    progress: int
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None

    class Config:
        from_attributes = True


class BugFindingInfo(BaseModel):
    id: PydanticObjectId
    title: str
    description: str
    steps_to_reproduce: List[str]
    severity: BugSeverityEnum
    roast_message: str
    screenshot_urls: List[str]
    status: BugStatusEnum
    confirmed_by: Optional[UserInfo] = None
    rejected_by: Optional[UserInfo] = None
    confirmed_at: Optional[datetime] = None
    rejected_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AgentRunInfo(BaseModel):
    id: PydanticObjectId
    target_url: str
    created_by: UserInfo
    status: AuditStatusEnum
    created_at: datetime
    completed_at: Optional[datetime] = None
    test_cases: List[TestCaseInfo] = []
    bug_findings: List[BugFindingInfo] = []
    settings: dict

    class Config:
        from_attributes = True


# --- General API Response Models ---
class SyncResponse(BaseModel):
    message: str
    user: UserResponse   # Use the safe response model


class TeamCreationResponse(BaseModel):
    message: str
    team: TeamResponse   # Use the safe response model


class AgentRunResponse(BaseModel):
    message: str
    agent_run: AgentRunInfo


class BugFindingResponse(BaseModel):
    message: str
    bug_finding: BugFindingInfo


class DeleteResponse(BaseModel):
    message: str
