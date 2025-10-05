import os
import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from dotenv import load_dotenv

from models import User, UserCreate, SyncResponse   # Import your models

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
    allow_origins=[
        '*'
    ],  # Or specify your frontend URL e.g., "http://localhost:3000"
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
    await init_beanie(database=client[db_name], document_models=[User])
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


if __name__ == '__main__':
    main()
