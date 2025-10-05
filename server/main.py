import os
import logging
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie, PydanticObjectId
from dotenv import load_dotenv

# Import all models, including the new ones
from models import (
    User,
    UserCreate,
    SyncResponse,
    BugReport,
    BugReportCreate,
    BugReportUpdate,
    DeleteResponse,
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
    # Add the BugReport model to the list for Beanie initialization
    await init_beanie(
        database=client[db_name], document_models=[User, BugReport]
    )
    print('MongoDB connection established successfully!')


# --- API Routes ---


@app.get('/')
def read_root():
    return {'message': 'Backend server is running!'}


# --- User Endpoints ---
@app.post('/api/create', response_model=SyncResponse)
async def create_user(user_data: UserCreate):
    existing_user = await User.find_one(User.auth0Id == user_data.sub)

    if existing_user:
        return {'message': 'User already exists', 'user': existing_user}

    new_user = User(
        auth0Id=user_data.sub,
        email=user_data.email,
        name=user_data.name,
        picture=user_data.picture,
    )
    await new_user.insert()

    return {'message': 'User synced successfully', 'user': new_user}


@app.get('/api/user/{auth0Id}', response_model=User)
async def get_user(auth0Id: str):
    decoded_auth0Id = auth0Id.replace('%7C', '|')
    user = await User.find_one(User.auth0Id == decoded_auth0Id)

    if not user:
        raise HTTPException(status_code=404, detail='User not found.')

    return user


# --- Bug Report CRUD Endpoints ---


@app.post(
    '/api/bugs', response_model=BugReport, status_code=status.HTTP_201_CREATED
)
async def submit_bug_report(report_data: BugReportCreate):
    """
    Creates a new bug report. It will automatically be marked as 'not approved'.
    """
    new_report = BugReport(
        title=report_data.title, description=report_data.description
    )
    await new_report.insert()
    return new_report


@app.get('/api/bugs', response_model=List[BugReport])
async def get_bug_reports(
    status: Optional[str] = Query(
        None, description="Filter by status: 'approved' or 'not_approved'"
    )
):
    """
    Fetches bug reports. Can be filtered by approval status.
    """
    if status == 'approved':
        query = BugReport.find(BugReport.is_approved == True)
    elif status == 'not_approved':
        query = BugReport.find(BugReport.is_approved == False)
    else:
        query = BugReport.find_all()

    reports = await query.to_list()
    return reports


@app.get('/api/bugs/{bug_id}', response_model=BugReport)
async def get_bug_report(bug_id: PydanticObjectId):
    """
    Fetches a single bug report by its unique ID.
    """
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
    """
    Updates a bug report's details (e.g., approve it).
    """
    report = await BugReport.get(bug_id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Bug report not found.',
        )

    # Get a dictionary of the fields that were actually sent in the request
    update_data = report_update.model_dump(exclude_unset=True)

    # Loop through the update data and apply it to the document instance
    for key, value in update_data.items():
        setattr(report, key, value)

    # Save the changes to the database
    await report.save()

    return report


@app.delete('/api/bugs/{bug_id}', response_model=DeleteResponse)
async def delete_bug_report(bug_id: PydanticObjectId):
    """
    Deletes a bug report by its unique ID.
    """
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
