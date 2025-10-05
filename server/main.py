# main.py
import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from dotenv import load_dotenv

from models import User, UserCreate, SyncResponse   # Import your models

# Load environment variables from .env file
load_dotenv()

# --- App Initialization ---
app = FastAPI()

# --- CORS Middleware ---
# This is the equivalent of app.use(cors()) in Express
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        '*'
    ],  # Or specify your frontend URL e.g., "http://localhost:3000"
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

# --- Database Connection ---
# This runs when the app starts up
@app.on_event('startup')
async def startup_db_client():
    # Connect to MongoDB using Motor
    client = AsyncIOMotorClient(os.getenv('MONGO_URI'))

    # Initialize Beanie with the User document and the database client
    await init_beanie(
        database=client[os.getenv('DATABASE_NAME')], document_models=[User]
    )
    print('MongoDB connection established successfully!')


# --- API Routes ---


@app.get('/')
def read_root():
    return {'message': 'Backend server is running!'}


@app.post('/api/create', response_model=SyncResponse)
async def create_user(user_data: UserCreate):
    """
    Finds a user by their Auth0 ID and creates them if they don't exist (upsert).
    FastAPI automatically validates the incoming body against the UserCreate model.
    """
    # Check if the user already exists
    existing_user = await User.find_one(User.auth0Id == user_data.sub)

    if existing_user:
        return {'message': 'User already exists', 'user': existing_user}

    # If user does not exist, create a new one
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
    """
    Fetches a user by their auth0Id from the database.
    The {auth0Id} in the path is automatically passed as an argument.
    """
    # In FastAPI, you need to manually URL-decode the pipe character
    decoded_auth0Id = auth0Id.replace('%7C', '|')

    user = await User.find_one(User.auth0Id == decoded_auth0Id)

    if not user:
        # This is the FastAPI way of sending an error response
        raise HTTPException(status_code=404, detail='User not found.')

    return user
