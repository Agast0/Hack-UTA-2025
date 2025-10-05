# models.py
from typing import Optional
from beanie import Document
from pydantic import BaseModel, Field

# This is your Beanie model, equivalent to a Mongoose Schema.
# It represents the data structure in your MongoDB collection.
class User(Document):
    auth0Id: str = Field(..., unique=True)
    email: str
    name: Optional[str] = None
    picture: Optional[str] = None

    class Settings:
        name = 'users'   # The name of the MongoDB collection


# This is a Pydantic model for validating the incoming request body
# for the /api/create endpoint.
class UserCreate(BaseModel):
    sub: str
    email: str
    name: Optional[str] = None
    picture: Optional[str] = None


# This is a Pydantic model for the response from /api/create
class SyncResponse(BaseModel):
    message: str
    user: User
