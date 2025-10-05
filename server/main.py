import os
import logging
from typing import List, Optional

from beanie import PydanticObjectId, init_beanie
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient

# Import all models
from models import (
    BugReport,
    BugReportCreate,
    BugReportUpdate,
    DeleteResponse,
    SyncResponse,
    Team,
    TeamCreate,
    TeamCreationResponse,
    TeamJoin,
    TeamResponse,
    TeamTypeEnum,
    User,
    UserCreate,
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
    if not os.getenv('GOOGLE_API_KEY'):
        print(
            '\033[31m[ERROR] GOOGLE_API_KEY environment variable is required\033[0m'
        )
        exit(1)

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
    # Add the BugReport and Team models to the list for Beanie initialization
    await init_beanie(
        database=client[db_name], document_models=[User, BugReport, Team]
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
            existing_user.team = await Team.get(existing_user.team.id)
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
        user.team = await Team.get(user.team.id)
    return user


@app.get('/api/users', response_model=List[UserResponse])
async def get_users():
    """Fetches a list of all users."""
    users = await User.find_all().to_list()
    # Manual, safe link fetching to avoid the aggregation error
    for user in users:
        if user.team and not isinstance(user.team, Team):
            # Replace the Link object with the full Team document
            user.team = await Team.get(user.team.id)
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
            member = await User.get(member_link.id)
            if member:
                fetched_members.append(member)
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
                    member = await User.get(member_link.id)
                    if member:
                        fetched_members.append(member)
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
    team_doc = await Team.get(creator.team.id)
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


# Helper to persist agent-style bug reports
async def persist_agent_bug_reports(agent_reports: list):
    """Accepts a list of agent-style bug reports and stores them.
    Expects objects with: title, description, roast, severity, reproduction_steps[], team_id (internal Team id).
    """
    for r in agent_reports or []:
        # Resolve team by internal DB id (string ObjectId)
        team_id_str = r.get('team_id')
        if not team_id_str:
            continue
        try:
            team_doc = await Team.get(PydanticObjectId(team_id_str))
        except Exception:
            team_doc = await Team.get(team_id_str)
        if not team_doc:
            continue

        steps = r.get('reproduction_steps') or []
        # Build document
        doc = BugReport(
            title=r.get('title', 'Untitled Bug'),
            description=r.get('description', ''),
            roast=r.get('roast'),
            severity=r.get('severity'),
            reproduction_steps=steps,
            team_id=team_id_str,
            team=team_doc,
        )
        await doc.insert()


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


if __name__ == '__main__':
    main()
