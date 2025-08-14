from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import socketio
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
import jwt
import bcrypt
from bson import ObjectId

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_DELTA = timedelta(days=30)

# Socket.IO server
sio = socketio.AsyncServer(
    cors_allowed_origins="*",
    logger=True,
    engineio_logger=True
)

# Create the main app
app = FastAPI(title="Messenger API", version="1.0.0")
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()

# Models
class UserCreate(BaseModel):
    nickname: str = Field(..., min_length=3, max_length=30)
    email: EmailStr
    password: str = Field(..., min_length=6)
    phone: Optional[str] = None
    display_name: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    id: str
    nickname: str
    display_name: Optional[str] = None
    email: EmailStr
    phone: Optional[str] = None
    avatar: Optional[str] = None
    bio: Optional[str] = None
    status: str = "online"
    last_seen: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Message(BaseModel):
    id: str
    chat_id: str
    sender_id: str
    content: str
    message_type: str = "text"  # text, image, file, etc.
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    status: str = "sent"  # sent, delivered, read
    reply_to: Optional[str] = None

class Chat(BaseModel):
    id: str
    participants: List[str]
    chat_type: str = "private"  # private, group, channel
    name: Optional[str] = None
    avatar: Optional[str] = None
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_message: Optional[Dict[str, Any]] = None
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# Helper Functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + JWT_EXPIRATION_DELTA
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        
        user["id"] = str(user["_id"])
        return User(**user)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# API Routes
@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    # Check if nickname or email already exists
    existing_user = await db.users.find_one({
        "$or": [
            {"nickname": user_data.nickname},
            {"email": user_data.email}
        ]
    })
    
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Nickname or email already registered"
        )
    
    # Create user
    hashed_password = hash_password(user_data.password)
    user_doc = {
        "nickname": user_data.nickname,
        "email": user_data.email,
        "password": hashed_password,
        "phone": user_data.phone,
        "display_name": user_data.display_name or user_data.nickname,
        "avatar": None,
        "bio": "",
        "status": "online",
        "last_seen": datetime.utcnow(),
        "created_at": datetime.utcnow()
    }
    
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    
    # Create JWT token
    access_token = create_access_token({"sub": user_id})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "nickname": user_data.nickname,
            "display_name": user_doc["display_name"],
            "email": user_data.email
        }
    }

@api_router.post("/auth/login")
async def login(login_data: UserLogin):
    user = await db.users.find_one({"email": login_data.email})
    
    if not user or not verify_password(login_data.password, user["password"]):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )
    
    user_id = str(user["_id"])
    access_token = create_access_token({"sub": user_id})
    
    # Update last seen
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"last_seen": datetime.utcnow(), "status": "online"}}
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "nickname": user["nickname"],
            "display_name": user["display_name"],
            "email": user["email"]
        }
    }

@api_router.get("/users/me")
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user

@api_router.get("/chats")
async def get_user_chats(current_user: User = Depends(get_current_user)):
    chats = await db.chats.find(
        {"participants": current_user.id}
    ).sort("updated_at", -1).to_list(100)
    
    result = []
    for chat in chats:
        chat["id"] = str(chat["_id"])
        del chat["_id"]  # Remove the ObjectId field
        
        # Get other participants info
        other_participants = [p for p in chat["participants"] if p != current_user.id]
        if other_participants:
            participants_info = await db.users.find(
                {"_id": {"$in": [ObjectId(p) for p in other_participants]}}
            ).to_list(100)
            
            for p in participants_info:
                p["id"] = str(p["_id"])
                del p["_id"]  # Remove the ObjectId field
                del p["password"]  # Remove password from response
            
            chat["participants_info"] = participants_info
        
        result.append(chat)
    
    return result

@api_router.post("/chats")
async def create_chat(
    participant_id: str,
    current_user: User = Depends(get_current_user)
):
    # Check if participant exists
    participant = await db.users.find_one({"_id": ObjectId(participant_id)})
    if not participant:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if chat already exists
    existing_chat = await db.chats.find_one({
        "participants": {"$all": [current_user.id, participant_id]},
        "chat_type": "private"
    })
    
    if existing_chat:
        existing_chat["id"] = str(existing_chat["_id"])
        del existing_chat["_id"]  # Remove ObjectId field
        return existing_chat
    
    # Create new chat
    chat_doc = {
        "participants": [current_user.id, participant_id],
        "chat_type": "private",
        "created_by": current_user.id,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await db.chats.insert_one(chat_doc)
    chat_doc["id"] = str(result.inserted_id)
    
    return chat_doc

@api_router.get("/chats/{chat_id}/messages")
async def get_chat_messages(
    chat_id: str,
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user)
):
    # Verify user is participant in chat
    chat = await db.chats.find_one({
        "_id": ObjectId(chat_id),
        "participants": current_user.id
    })
    
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    messages = await db.messages.find(
        {"chat_id": chat_id}
    ).sort("timestamp", -1).skip(skip).limit(limit).to_list(limit)
    
    for message in messages:
        message["id"] = str(message["_id"])
        del message["_id"]  # Remove ObjectId field
    
    return list(reversed(messages))  # Return in chronological order

# Socket.IO Events
@sio.event
async def connect(sid, environ):
    print(f"Client {sid} connected")

@sio.event
async def disconnect(sid):
    print(f"Client {sid} disconnected")

@sio.event
async def join_chat(sid, data):
    chat_id = data.get('chat_id')
    user_id = data.get('user_id')
    
    if chat_id and user_id:
        await sio.enter_room(sid, f"chat_{chat_id}")
        print(f"User {user_id} joined chat {chat_id}")

@sio.event
async def send_message(sid, data):
    try:
        chat_id = data.get('chat_id')
        sender_id = data.get('sender_id')
        content = data.get('content', '')
        message_type = data.get('message_type', 'text')
        
        # Verify chat exists and user is participant
        chat = await db.chats.find_one({
            "_id": ObjectId(chat_id),
            "participants": sender_id
        })
        
        if not chat:
            await sio.emit('error', {'message': 'Chat not found'}, room=sid)
            return
        
        # Create message
        message_doc = {
            "chat_id": chat_id,
            "sender_id": sender_id,
            "content": content,
            "message_type": message_type,
            "timestamp": datetime.utcnow(),
            "status": "sent"
        }
        
        result = await db.messages.insert_one(message_doc)
        message_doc["id"] = str(result.inserted_id)
        
        # Update chat's last message and timestamp
        await db.chats.update_one(
            {"_id": ObjectId(chat_id)},
            {
                "$set": {
                    "last_message": {
                        "content": content,
                        "sender_id": sender_id,
                        "timestamp": message_doc["timestamp"]
                    },
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        # Emit message to chat room
        await sio.emit('new_message', message_doc, room=f"chat_{chat_id}")
        
    except Exception as e:
        print(f"Error sending message: {e}")
        await sio.emit('error', {'message': 'Failed to send message'}, room=sid)

# Mount Socket.IO app
socket_app = socketio.ASGIApp(sio, app)

# Include API router
app.include_router(api_router)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(socket_app, host="0.0.0.0", port=8001)