from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, WebSocket, WebSocketDisconnect, File, UploadFile
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
import json
import base64

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

# WebSocket Connection Manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
        self.user_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, chat_id: str, user_id: str):
        await websocket.accept()
        if chat_id not in self.active_connections:
            self.active_connections[chat_id] = []
        self.active_connections[chat_id].append(websocket)
        self.user_connections[user_id] = websocket

    def disconnect(self, websocket: WebSocket, chat_id: str, user_id: str):
        if chat_id in self.active_connections:
            self.active_connections[chat_id].remove(websocket)
        if user_id in self.user_connections:
            del self.user_connections[user_id]

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast_to_chat(self, message: str, chat_id: str):
        if chat_id in self.active_connections:
            for connection in self.active_connections[chat_id]:
                try:
                    await connection.send_text(message)
                except:
                    # Remove dead connections
                    self.active_connections[chat_id].remove(connection)

manager = ConnectionManager()

# Socket.IO server
sio = socketio.AsyncServer(
    cors_allowed_origins="*",
    logger=True,
    engineio_logger=True
)

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()

# Enhanced Models
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
    is_online: bool = True

class MessageCreate(BaseModel):
    content: str = Field(..., max_length=1000)
    message_type: str = "text"  # text, image, file, voice
    reply_to: Optional[str] = None

class Message(BaseModel):
    id: str
    chat_id: str
    sender_id: str
    content: str
    message_type: str = "text"  # text, image, file, voice, system
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    status: str = "sent"  # sent, delivered, read
    reply_to: Optional[str] = None
    file_data: Optional[str] = None  # base64 encoded file data
    file_name: Optional[str] = None
    file_size: Optional[int] = None

class ChatCreate(BaseModel):
    participant_id: Optional[str] = None
    participants: Optional[List[str]] = None
    chat_type: str = "private"  # private, group, channel
    name: Optional[str] = None
    description: Optional[str] = None

class Chat(BaseModel):
    id: str
    participants: List[str]
    chat_type: str = "private"  # private, group, channel
    name: Optional[str] = None
    description: Optional[str] = None
    avatar: Optional[str] = None
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_message: Optional[Dict[str, Any]] = None
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    unread_count: Optional[Dict[str, int]] = None

class GroupSettings(BaseModel):
    chat_id: str
    name: Optional[str] = None
    description: Optional[str] = None
    avatar: Optional[str] = None

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
        "is_online": True,
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
    
    # Update last seen and online status
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"last_seen": datetime.utcnow(), "status": "online", "is_online": True}}
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

@api_router.get("/users/search")
async def search_users(q: str, current_user: User = Depends(get_current_user)):
    """Search users by nickname or display name"""
    if len(q) < 2:
        return []
    
    users = await db.users.find({
        "$and": [
            {"_id": {"$ne": ObjectId(current_user.id)}},
            {
                "$or": [
                    {"nickname": {"$regex": q, "$options": "i"}},
                    {"display_name": {"$regex": q, "$options": "i"}}
                ]
            }
        ]
    }).limit(20).to_list(20)
    
    result = []
    for user in users:
        user["id"] = str(user["_id"])
        del user["_id"]
        del user["password"]
        result.append(user)
    
    return result

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
        
        # Calculate unread message count for current user
        unread_count = await db.messages.count_documents({
            "chat_id": chat["id"],
            "sender_id": {"$ne": current_user.id},
            "status": {"$ne": "read"}
        })
        chat["unread_count"] = unread_count
        
        result.append(chat)
    
    return result

@api_router.post("/chats")
async def create_chat(
    chat_data: ChatCreate,
    current_user: User = Depends(get_current_user)
):
    if chat_data.chat_type == "private":
        if not chat_data.participant_id:
            raise HTTPException(status_code=400, detail="participant_id required for private chat")
        
        # Check if participant exists
        participant = await db.users.find_one({"_id": ObjectId(chat_data.participant_id)})
        if not participant:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Check if chat already exists
        existing_chat = await db.chats.find_one({
            "participants": {"$all": [current_user.id, chat_data.participant_id]},
            "chat_type": "private"
        })
        
        if existing_chat:
            existing_chat["id"] = str(existing_chat["_id"])
            del existing_chat["_id"]  # Remove ObjectId field
            return existing_chat
        
        # Create new private chat
        chat_doc = {
            "participants": [current_user.id, chat_data.participant_id],
            "chat_type": "private",
            "created_by": current_user.id,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
    
    elif chat_data.chat_type == "group":
        if not chat_data.participants or not chat_data.name:
            raise HTTPException(status_code=400, detail="participants and name required for group chat")
        
        # Validate all participants exist
        participant_ids = [ObjectId(p) for p in chat_data.participants if p != current_user.id]
        participants_count = await db.users.count_documents({"_id": {"$in": participant_ids}})
        
        if participants_count != len(participant_ids):
            raise HTTPException(status_code=400, detail="One or more participants not found")
        
        # Create new group chat
        chat_doc = {
            "participants": [current_user.id] + chat_data.participants,
            "chat_type": "group",
            "name": chat_data.name,
            "description": chat_data.description,
            "created_by": current_user.id,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
    
    else:
        raise HTTPException(status_code=400, detail="Invalid chat type")
    
    result = await db.chats.insert_one(chat_doc)
    chat_doc["id"] = str(result.inserted_id)
    
    # Remove any ObjectId fields that might cause serialization issues
    if "_id" in chat_doc:
        del chat_doc["_id"]
    
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

@api_router.post("/chats/{chat_id}/messages")
async def send_message_rest(
    chat_id: str,
    message_data: MessageCreate,
    current_user: User = Depends(get_current_user)
):
    # Verify user is participant in chat
    chat = await db.chats.find_one({
        "_id": ObjectId(chat_id),
        "participants": current_user.id
    })
    
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    # Create message
    message_doc = {
        "chat_id": chat_id,
        "sender_id": current_user.id,
        "content": message_data.content,
        "message_type": message_data.message_type,
        "timestamp": datetime.utcnow(),
        "status": "sent",
        "reply_to": message_data.reply_to
    }
    
    result = await db.messages.insert_one(message_doc)
    message_doc["id"] = str(result.inserted_id)
    del message_doc["_id"]
    
    # Update chat's last message
    await db.chats.update_one(
        {"_id": ObjectId(chat_id)},
        {
            "$set": {
                "last_message": {
                    "content": message_data.content,
                    "sender_id": current_user.id,
                    "timestamp": message_doc["timestamp"]
                },
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    # Broadcast to WebSocket connections if any
    await manager.broadcast_to_chat(
        json.dumps({
            "type": "new_message",
            "message": {
                **message_doc,
                "timestamp": message_doc["timestamp"].isoformat()
            }
        }),
        chat_id
    )
    
    return message_doc

@api_router.post("/chats/{chat_id}/messages/{message_id}/read")
async def mark_message_read(
    chat_id: str,
    message_id: str,
    current_user: User = Depends(get_current_user)
):
    """Mark a message as read"""
    # Verify user is participant in chat
    chat = await db.chats.find_one({
        "_id": ObjectId(chat_id),
        "participants": current_user.id
    })
    
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    # Update message status
    result = await db.messages.update_one(
        {
            "_id": ObjectId(message_id),
            "chat_id": chat_id,
            "sender_id": {"$ne": current_user.id}  # Don't mark own messages as read
        },
        {"$set": {"status": "read"}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Message not found or already read")
    
    return {"status": "success", "message": "Message marked as read"}

@api_router.post("/chats/{chat_id}/upload")
async def upload_file(
    chat_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Upload file to chat (stored as base64)"""
    # Verify user is participant in chat
    chat = await db.chats.find_one({
        "_id": ObjectId(chat_id),
        "participants": current_user.id
    })
    
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    # Check file size (limit to 10MB)
    if file.size > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")
    
    # Read file and encode as base64
    file_content = await file.read()
    file_base64 = base64.b64encode(file_content).decode('utf-8')
    
    # Determine message type based on file
    message_type = "file"
    if file.content_type and file.content_type.startswith('image/'):
        message_type = "image"
    elif file.content_type and file.content_type.startswith('audio/'):
        message_type = "voice"
    
    # Create message with file
    message_doc = {
        "chat_id": chat_id,
        "sender_id": current_user.id,
        "content": file.filename or "File",
        "message_type": message_type,
        "timestamp": datetime.utcnow(),
        "status": "sent",
        "file_data": file_base64,
        "file_name": file.filename,
        "file_size": file.size
    }
    
    result = await db.messages.insert_one(message_doc)
    message_doc["id"] = str(result.inserted_id)
    del message_doc["_id"]
    
    # Update chat's last message
    await db.chats.update_one(
        {"_id": ObjectId(chat_id)},
        {
            "$set": {
                "last_message": {
                    "content": f"📎 {file.filename}",
                    "sender_id": current_user.id,
                    "timestamp": message_doc["timestamp"]
                },
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    return message_doc

@api_router.put("/chats/{chat_id}/settings")
async def update_group_settings(
    chat_id: str,
    settings: GroupSettings,
    current_user: User = Depends(get_current_user)
):
    """Update group chat settings (name, description, avatar)"""
    # Verify user is participant and chat is a group
    chat = await db.chats.find_one({
        "_id": ObjectId(chat_id),
        "participants": current_user.id,
        "chat_type": "group"
    })
    
    if not chat:
        raise HTTPException(status_code=404, detail="Group chat not found")
    
    # Check if user is admin (creator or has admin permissions)
    if chat["created_by"] != current_user.id:
        raise HTTPException(status_code=403, detail="Only group admin can modify settings")
    
    # Update group settings
    update_data = {"updated_at": datetime.utcnow()}
    if settings.name:
        update_data["name"] = settings.name
    if settings.description is not None:
        update_data["description"] = settings.description
    if settings.avatar:
        update_data["avatar"] = settings.avatar
    
    await db.chats.update_one(
        {"_id": ObjectId(chat_id)},
        {"$set": update_data}
    )
    
    return {"status": "success", "message": "Group settings updated"}

# WebSocket endpoint for real-time messaging
@app.websocket("/ws/chat/{chat_id}")
async def websocket_endpoint(websocket: WebSocket, chat_id: str, token: str = None):
    # Verify user authentication
    if not token:
        await websocket.close(code=4001)
        return
    
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            await websocket.close(code=4001)
            return
        
        # Verify user is participant in chat
        chat = await db.chats.find_one({
            "_id": ObjectId(chat_id),
            "participants": user_id
        })
        
        if not chat:
            await websocket.close(code=4004)
            return
        
        # Connect to chat
        await manager.connect(websocket, chat_id, user_id)
        
        # Send connection confirmation
        await manager.send_personal_message(
            json.dumps({"type": "connected", "chat_id": chat_id}),
            websocket
        )
        
        try:
            while True:
                # Receive message from client
                data = await websocket.receive_text()
                message_data = json.loads(data)
                
                if message_data.get("type") == "message":
                    # Create message in database
                    message_doc = {
                        "chat_id": chat_id,
                        "sender_id": user_id,
                        "content": message_data.get("content", ""),
                        "message_type": message_data.get("message_type", "text"),
                        "timestamp": datetime.utcnow(),
                        "status": "sent"
                    }
                    
                    result = await db.messages.insert_one(message_doc)
                    message_doc["id"] = str(result.inserted_id)
                    message_doc["timestamp"] = message_doc["timestamp"].isoformat()
                    del message_doc["_id"]
                    
                    # Update chat's last message
                    await db.chats.update_one(
                        {"_id": ObjectId(chat_id)},
                        {
                            "$set": {
                                "last_message": {
                                    "content": message_doc["content"],
                                    "sender_id": user_id,
                                    "timestamp": message_doc["timestamp"]
                                },
                                "updated_at": datetime.utcnow()
                            }
                        }
                    )
                    
                    # Broadcast message to all chat participants
                    await manager.broadcast_to_chat(
                        json.dumps({
                            "type": "new_message",
                            "message": message_doc
                        }),
                        chat_id
                    )
                    
        except WebSocketDisconnect:
            manager.disconnect(websocket, chat_id, user_id)
            
    except jwt.ExpiredSignatureError:
        await websocket.close(code=4001)
    except jwt.JWTError:
        await websocket.close(code=4001)
    except Exception as e:
        print(f"WebSocket error: {e}")
        await websocket.close(code=4000)

# Socket.IO Events (keeping for compatibility)
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

# Mount Socket.IO as a sub-application at /socket.io path
sio_app = socketio.ASGIApp(sio)
app.mount('/socket.io', sio_app)

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
    uvicorn.run(app, host="0.0.0.0", port=8001)