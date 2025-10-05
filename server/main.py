import os
import logging
from datetime import datetime
from typing import List, Optional

from beanie import PydanticObjectId, init_beanie
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient

# Import all models
from models import (
    AgentRun,
    AgentRunCreate,
    AgentRunInfo,
    AgentRunResponse,
    AgentRunUpdate,
    AuditStatusEnum,
    BugFinding,
    BugFindingInfo,
    BugFindingResponse,
    BugFindingUpdate,
    BugReport,
    BugReportCreate,
    BugReportUpdate,
    BugSeverityEnum,
    BugStatusEnum,
    DeleteResponse,
    SyncResponse,
    Team,
    TeamCreate,
    TeamCreationResponse,
    TeamJoin,
    TeamResponse,
    TeamTypeEnum,
    TestCase,
    TestCaseCreate,
    TestCaseInfo,
    TestCaseStatusEnum,
    User,
    UserCreate,
    UserInfo,
    UserResponse,
)

# Load environment variables from .env file
load_dotenv()


def main():
    """Start the FastAPI server for the Agentuity agent"""
    # Setup logging
    logging.basicConfig(
        level=logging.INFO,
        format='[%(levelname)-5.5s] %(message)s',
    )

    # Check for required environment variables
    google_api_key = os.getenv('GOOGLE_API_KEY')
    if not google_api_key:
        print(
            '\033[33m[WARNING] GOOGLE_API_KEY environment variable not set - AI agent features will be disabled\033[0m'
        )
    else:
        print('Google API key found - AI agent features enabled')

    print('Starting Agentuity Agent FastAPI server...')
    print('API Documentation available at: http://localhost:8000/docs')
    print('Agent endpoint: http://localhost:8000/agent')

    import uvicorn

    uvicorn.run(
        'main:app', host='0.0.0.0', port=8000, reload=True, log_level='info'
    )


# --- App Initialization ---
app = FastAPI()

# --- CORS Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)


# --- Database Connection ---
@app.on_event('startup')
async def startup_db_client():
    mongo_uri = os.getenv('MONGO_URI')
    db_name = os.getenv('DATABASE_NAME')
    if not mongo_uri or not db_name:
        logging.error(
            'MONGO_URI and DATABASE_NAME environment variables are required'
        )
        exit(1)
    client = AsyncIOMotorClient(mongo_uri)
    # Add all models to the list for Beanie initialization
    await init_beanie(
        database=client[db_name], 
        document_models=[User, Team, BugReport, AgentRun, TestCase, BugFinding]
    )
    print('MongoDB connection established successfully!')


# --- Helper Function ---
async def get_user_by_auth0_id(auth0_id: str) -> User:
    """Helper to find a user by their Auth0 ID, handling "|" decoding."""
    decoded_auth0_id = auth0_id.replace('%7C', '|')
    user = await User.find_one(User.auth0Id == decoded_auth0_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail='User not found.'
        )
    return user


# --- API Routes ---
@app.get('/')
def read_root():
    return {'message': 'Backend server is running!'}


# --- User Endpoints ---
@app.post('/api/create', response_model=SyncResponse)
async def create_user(user_data: UserCreate):
    """Syncs a user from Auth0. Users are created without a team."""
    existing_user = await User.find_one(User.auth0Id == user_data.sub)
    if existing_user:
        # Manually fetch the team if the link is not already a full document
        if existing_user.team and not isinstance(existing_user.team, Team):
            try:
                existing_user.team = await Team.get(existing_user.team.ref.id)
            except Exception as e:
                print(f"Error fetching team: {e}")
                existing_user.team = None
        return {'message': 'User already exists', 'user': existing_user}

    new_user = User(
        auth0Id=user_data.sub,
        email=user_data.email,
        name=user_data.name,
        picture=user_data.picture,
    )
    await new_user.insert()
    return {'message': 'User synced successfully', 'user': new_user}


@app.get('/api/user/{auth0Id}', response_model=UserResponse)
async def get_user(auth0Id: str):
    """Gets a user's profile by their Auth0 ID."""
    user = await get_user_by_auth0_id(auth0Id)
    # Manual, safe link fetching
    if user.team and not isinstance(user.team, Team):
        try:
            user.team = await Team.get(user.team.ref.id)
        except Exception as e:
            print(f"Error fetching team: {e}")
            user.team = None
    return user


@app.get('/api/users', response_model=List[UserResponse])
async def get_users():
    """Fetches a list of all users."""
    users = await User.find_all().to_list()
    # Manual, safe link fetching to avoid the aggregation error
    for user in users:
        if user.team and not isinstance(user.team, Team):
            # Replace the Link object with the full Team document
            try:
                user.team = await Team.get(user.team.ref.id)
            except Exception as e:
                print(f"Error fetching team: {e}")
                user.team = None
    return users


# --- Team Endpoints ---
@app.post(
    '/api/teams',
    response_model=TeamCreationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_team(team_data: TeamCreate):
    """Creates a new team and assigns the creator as the first member."""
    if await Team.find_one(Team.name == team_data.name):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail='A team with this name already exists.',
        )

    creator = await get_user_by_auth0_id(team_data.creator_auth0Id)
    if creator.team:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='User is already on a team. Must leave the current team first.',
        )

    new_team = Team(name=team_data.name, team_type=team_data.team_type)
    await new_team.insert()

    creator.team = new_team
    new_team.members.append(creator)
    await creator.save()
    await new_team.save()

    # Manually populate members for the response
    new_team.members = [creator]
    return {'message': 'Team created successfully', 'team': new_team}


@app.post('/api/teams/{team_id}/join', response_model=TeamCreationResponse)
async def join_team(team_id: PydanticObjectId, join_data: TeamJoin):
    """Allows a user to join an existing team."""
    team_to_join = await Team.get(team_id)
    if not team_to_join:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail='Team not found.'
        )

    user = await get_user_by_auth0_id(join_data.user_auth0Id)
    if user.team:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='User is already on a team. Must leave the current team first.',
        )

    user.team = team_to_join
    team_to_join.members.append(user)
    await user.save()
    await team_to_join.save()

    # Manually fetch all members for the response
    fetched_members = []
    for member_link in team_to_join.members:
        if not isinstance(member_link, User):
            # Handle Beanie Link objects
            try:
                member = await User.get(member_link.ref.id)
                if member:
                    fetched_members.append(member)
            except Exception as e:
                print(f"Error fetching member: {e}")
                continue
        else:
            fetched_members.append(member_link)
    team_to_join.members = fetched_members

    return {'message': 'Successfully joined team', 'team': team_to_join}


@app.get('/api/teams', response_model=List[TeamResponse])
async def get_teams(
    team_type: Optional[TeamTypeEnum] = Query(
        None, description='Filter by team type'
    )
):
    """Fetches all teams, optionally filtering by type."""
    if team_type:
        teams = await Team.find(Team.team_type == team_type).to_list()
    else:
        teams = await Team.find_all().to_list()

    # Manual, safe link fetching for members of each team
    for team in teams:
        if team.members:
            fetched_members = []
            for member_link in team.members:
                if not isinstance(member_link, User):
                    # Handle Beanie Link objects
                    try:
                        member = await User.get(member_link.ref.id)
                        if member:
                            fetched_members.append(member)
                    except Exception as e:
                        print(f"Error fetching member: {e}")
                        continue
                else:
                    fetched_members.append(member_link)
            team.members = fetched_members
    return teams


# --- Bug Report CRUD Endpoints ---
@app.post(
    '/api/bugs', response_model=BugReport, status_code=status.HTTP_201_CREATED
)
async def submit_bug_report(report_data: BugReportCreate):
    creator = await get_user_by_auth0_id(report_data.creator_auth0Id)
    if not creator.team:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='User must be on a team to create a bug report.',
        )
    # The creator.team is a Link, we need the actual document for the BugReport
    team_doc = await Team.get(creator.team.ref.id)
    if not team_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Creator's team not found.",
        )

    new_report = BugReport(
        title=report_data.title,
        description=report_data.description,
        team=team_doc,
    )
    await new_report.insert()
    return new_report


@app.get('/api/bugs', response_model=List[BugReport])
async def get_bug_reports(
    status: Optional[str] = Query(
        None, description="Filter by status: 'approved' or 'not_approved'"
    ),
    team_type: Optional[TeamTypeEnum] = Query(
        None, description="Filter by team type: 'front-end' or 'back-end'"
    ),
):
    query_conditions = []
    if status == 'approved':
        query_conditions.append(BugReport.is_approved == True)
    elif status == 'not_approved':
        query_conditions.append(BugReport.is_approved == False)
    if team_type:
        teams = await Team.find(Team.team_type == team_type).to_list()
        team_ids = [team.id for team in teams]
        query_conditions.append(BugReport.team.id in team_ids)
    query = (
        BugReport.find(*query_conditions)
        if query_conditions
        else BugReport.find_all()
    )
    return await query.to_list()


@app.get('/api/bugs/{bug_id}', response_model=BugReport)
async def get_bug_report(bug_id: PydanticObjectId):
    report = await BugReport.get(bug_id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Bug report not found.',
        )
    return report


@app.put('/api/bugs/{bug_id}', response_model=BugReport)
async def update_bug_report(
    bug_id: PydanticObjectId, report_update: BugReportUpdate
):
    report = await BugReport.get(bug_id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Bug report not found.',
        )
    update_data = report_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(report, key, value)
    await report.save()
    return report


@app.delete('/api/bugs/{bug_id}', response_model=DeleteResponse)
async def delete_bug_report(bug_id: PydanticObjectId):
    report = await BugReport.get(bug_id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Bug report not found.',
        )
    await report.delete()
    return {'message': 'Bug report deleted successfully.'}


# --- NEW: BugZooka Workflow API Endpoints ---

@app.post('/api/audits', response_model=AgentRunResponse)
async def create_audit(audit_data: AgentRunCreate):
    """Create a new audit (AgentRun) with test cases."""
    # Get the creator user
    creator = await get_user_by_auth0_id(audit_data.creator_auth0Id)
    
    if not creator.team:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='User must be on a team to create an audit.',
        )
    
    # Create test cases first
    test_cases = []
    for test_case_data in audit_data.test_cases:
        test_case = TestCase(
            name=test_case_data.name,
            expected_output=test_case_data.expected_output,
            status=TestCaseStatusEnum.QUEUED
        )
        await test_case.save()
        test_cases.append(test_case)
    
    # Create the agent run
    agent_run = AgentRun(
        team=creator.team,
        target_url=audit_data.target_url,
        created_by=creator,
        status=AuditStatusEnum.QUEUED,
        test_cases=test_cases,
        settings=audit_data.settings or {}
    )
    await agent_run.save()
    
    # Convert to response format
    agent_run_info = await convert_agent_run_to_info(agent_run)
    
    return {'message': 'Audit created successfully', 'agent_run': agent_run_info}


@app.get('/api/audits', response_model=List[AgentRunInfo])
async def get_audits(
    team_id: Optional[PydanticObjectId] = Query(None, description="Filter by team ID"),
    status: Optional[AuditStatusEnum] = Query(None, description="Filter by status"),
    created_by: Optional[str] = Query(None, description="Filter by creator Auth0 ID")
):
    """Get all audits with optional filtering."""
    query_conditions = []
    
    if team_id:
        team = await Team.get(team_id)
        if team:
            query_conditions.append(AgentRun.team == team)
    
    if status:
        query_conditions.append(AgentRun.status == status)
    
    if created_by:
        creator = await get_user_by_auth0_id(created_by)
        query_conditions.append(AgentRun.created_by == creator)
    
    query = AgentRun.find(*query_conditions) if query_conditions else AgentRun.find_all()
    audits = await query.to_list()
    
    # Convert to response format
    audit_infos = []
    for audit in audits:
        audit_info = await convert_agent_run_to_info(audit)
        audit_infos.append(audit_info)
    
    return audit_infos


@app.get('/api/audits/{audit_id}', response_model=AgentRunInfo)
async def get_audit(audit_id: PydanticObjectId):
    """Get a specific audit by ID."""
    audit = await AgentRun.get(audit_id)
    if not audit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Audit not found.',
        )
    
    audit_info = await convert_agent_run_to_info(audit)
    return audit_info


@app.put('/api/audits/{audit_id}', response_model=AgentRunInfo)
async def update_audit(audit_id: PydanticObjectId, audit_update: AgentRunUpdate):
    """Update an audit's status or completion time."""
    audit = await AgentRun.get(audit_id)
    if not audit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Audit not found.',
        )
    
    update_data = audit_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(audit, key, value)
    
    await audit.save()
    
    audit_info = await convert_agent_run_to_info(audit)
    return audit_info


@app.get('/api/audits/{audit_id}/bug-findings', response_model=List[BugFindingInfo])
async def get_audit_bug_findings(audit_id: PydanticObjectId):
    """Get all bug findings for a specific audit."""
    audit = await AgentRun.get(audit_id)
    if not audit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Audit not found.',
        )
    
    # Fetch bug findings
    bug_findings = []
    for bug_link in audit.bug_findings:
        if not isinstance(bug_link, BugFinding):
            try:
                bug = await BugFinding.get(bug_link.ref.id)
                if bug:
                    bug_findings.append(bug)
            except Exception as e:
                print(f"Error fetching bug finding: {e}")
                continue
        else:
            bug_findings.append(bug_link)
    
    # Convert to response format
    bug_infos = []
    for bug in bug_findings:
        bug_info = await convert_bug_finding_to_info(bug)
        bug_infos.append(bug_info)
    
    return bug_infos


@app.put('/api/bug-findings/{bug_id}', response_model=BugFindingResponse)
async def update_bug_finding(bug_id: PydanticObjectId, bug_update: BugFindingUpdate):
    """Update a bug finding's status (confirm/reject)."""
    bug = await BugFinding.get(bug_id)
    if not bug:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Bug finding not found.',
        )
    
    # Get the reviewer
    reviewer = await get_user_by_auth0_id(bug_update.reviewer_auth0Id)
    
    # Update status and reviewer info
    bug.status = bug_update.status
    if bug_update.status == BugStatusEnum.CONFIRMED:
        bug.confirmed_by = reviewer
        bug.confirmed_at = datetime.utcnow()
        bug.rejected_by = None
        bug.rejected_at = None
    elif bug_update.status == BugStatusEnum.REJECTED:
        bug.rejected_by = reviewer
        bug.rejected_at = datetime.utcnow()
        bug.confirmed_by = None
        bug.confirmed_at = None
    
    await bug.save()
    
    bug_info = await convert_bug_finding_to_info(bug)
    return {'message': 'Bug finding updated successfully', 'bug_finding': bug_info}


# --- Helper Functions for Response Conversion ---

async def convert_agent_run_to_info(agent_run: AgentRun) -> AgentRunInfo:
    """Convert AgentRun document to AgentRunInfo response model."""
    # Fetch created_by user
    created_by_user = agent_run.created_by
    if not isinstance(created_by_user, User):
        try:
            created_by_user = await User.get(created_by_user.ref.id)
        except Exception as e:
            print(f"Error fetching created_by user: {e}")
            created_by_user = None
    
    # Fetch test cases
    test_cases = []
    for test_link in agent_run.test_cases:
        if not isinstance(test_link, TestCase):
            try:
                test_case = await TestCase.get(test_link.ref.id)
                if test_case:
                    test_cases.append(test_case)
            except Exception as e:
                print(f"Error fetching test case: {e}")
                continue
        else:
            test_cases.append(test_link)
    
    # Fetch bug findings
    bug_findings = []
    for bug_link in agent_run.bug_findings:
        if not isinstance(bug_link, BugFinding):
            try:
                bug = await BugFinding.get(bug_link.ref.id)
                if bug:
                    bug_findings.append(bug)
            except Exception as e:
                print(f"Error fetching bug finding: {e}")
                continue
        else:
            bug_findings.append(bug_link)
    
    # Convert to info models
    test_case_infos = [TestCaseInfo.model_validate(tc) for tc in test_cases]
    bug_finding_infos = []
    for bug in bug_findings:
        bug_info = await convert_bug_finding_to_info(bug)
        bug_finding_infos.append(bug_info)
    
    return AgentRunInfo(
        id=agent_run.id,
        target_url=agent_run.target_url,
        created_by=UserInfo.model_validate(created_by_user) if created_by_user else None,
        status=agent_run.status,
        created_at=agent_run.created_at,
        completed_at=agent_run.completed_at,
        test_cases=test_case_infos,
        bug_findings=bug_finding_infos,
        settings=agent_run.settings
    )


async def convert_bug_finding_to_info(bug: BugFinding) -> BugFindingInfo:
    """Convert BugFinding document to BugFindingInfo response model."""
    # Fetch confirmed_by user
    confirmed_by_user = None
    if bug.confirmed_by:
        if not isinstance(bug.confirmed_by, User):
            try:
                confirmed_by_user = await User.get(bug.confirmed_by.ref.id)
            except Exception as e:
                print(f"Error fetching confirmed_by user: {e}")
        else:
            confirmed_by_user = bug.confirmed_by
    
    # Fetch rejected_by user
    rejected_by_user = None
    if bug.rejected_by:
        if not isinstance(bug.rejected_by, User):
            try:
                rejected_by_user = await User.get(bug.rejected_by.ref.id)
            except Exception as e:
                print(f"Error fetching rejected_by user: {e}")
        else:
            rejected_by_user = bug.rejected_by
    
    return BugFindingInfo(
        id=bug.id,
        title=bug.title,
        description=bug.description,
        steps_to_reproduce=bug.steps_to_reproduce,
        severity=bug.severity,
        roast_message=bug.roast_message,
        screenshot_urls=bug.screenshot_urls,
        status=bug.status,
        confirmed_by=UserInfo.model_validate(confirmed_by_user) if confirmed_by_user else None,
        rejected_by=UserInfo.model_validate(rejected_by_user) if rejected_by_user else None,
        confirmed_at=bug.confirmed_at,
        rejected_at=bug.rejected_at,
        created_at=bug.created_at
    )


if __name__ == '__main__':
    main()
