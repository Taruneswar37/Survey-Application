from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
import socketio

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# Socket.IO setup
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',
    logger=False,
    engineio_logger=False
)

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Password hashing
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")

# Models
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    full_name: str
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: User

class QuestionModel(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str  # multiple_choice, short_answer, long_answer
    text: str
    options: Optional[List[str]] = None
    required: bool = True

class SurveyCreate(BaseModel):
    title: str
    description: Optional[str] = None
    questions: List[QuestionModel]

class Survey(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    description: Optional[str] = None
    creator_id: str
    creator_name: str
    questions: List[QuestionModel]
    created_at: str
    is_active: bool = True
    response_count: int = 0

class AnswerModel(BaseModel):
    question_id: str
    answer: Any  # Can be string or list for multiple choice

class ResponseCreate(BaseModel):
    survey_id: str
    answers: List[AnswerModel]
    respondent_name: Optional[str] = None

class Response(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    survey_id: str
    answers: List[AnswerModel]
    respondent_name: Optional[str] = None
    submitted_at: str

# Auth endpoints
@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserRegister):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_id = str(uuid.uuid4())
    hashed_password = get_password_hash(user_data.password)
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "full_name": user_data.full_name,
        "password_hash": hashed_password,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    # Create token
    access_token = create_access_token(data={"sub": user_id})
    user = User(
        id=user_id,
        email=user_data.email,
        full_name=user_data.full_name,
        created_at=user_doc["created_at"]
    )
    return TokenResponse(access_token=access_token, token_type="bearer", user=user)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    access_token = create_access_token(data={"sub": user["id"]})
    user_obj = User(
        id=user["id"],
        email=user["email"],
        full_name=user["full_name"],
        created_at=user["created_at"]
    )
    return TokenResponse(access_token=access_token, token_type="bearer", user=user_obj)

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: dict = Depends(get_current_user)):
    return User(**current_user)

# Survey endpoints
@api_router.post("/surveys", response_model=Survey)
async def create_survey(survey_data: SurveyCreate, current_user: dict = Depends(get_current_user)):
    survey_id = str(uuid.uuid4())
    survey_doc = {
        "id": survey_id,
        "title": survey_data.title,
        "description": survey_data.description,
        "creator_id": current_user["id"],
        "creator_name": current_user["full_name"],
        "questions": [q.model_dump() for q in survey_data.questions],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "is_active": True,
        "response_count": 0
    }
    await db.surveys.insert_one(survey_doc)
    return Survey(**survey_doc)

@api_router.get("/surveys", response_model=List[Survey])
async def get_surveys(current_user: dict = Depends(get_current_user)):
    surveys = await db.surveys.find({"creator_id": current_user["id"]}, {"_id": 0}).to_list(1000)
    return [Survey(**s) for s in surveys]

@api_router.get("/surveys/{survey_id}", response_model=Survey)
async def get_survey(survey_id: str, current_user: dict = Depends(get_current_user)):
    survey = await db.surveys.find_one({"id": survey_id, "creator_id": current_user["id"]}, {"_id": 0})
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")
    return Survey(**survey)

@api_router.get("/surveys/public/{survey_id}", response_model=Survey)
async def get_public_survey(survey_id: str):
    survey = await db.surveys.find_one({"id": survey_id, "is_active": True}, {"_id": 0})
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found or inactive")
    return Survey(**survey)

@api_router.delete("/surveys/{survey_id}")
async def delete_survey(survey_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.surveys.delete_one({"id": survey_id, "creator_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Survey not found")
    # Also delete all responses
    await db.responses.delete_many({"survey_id": survey_id})
    return {"message": "Survey deleted successfully"}

# Response endpoints
@api_router.post("/responses", response_model=Response)
async def submit_response(response_data: ResponseCreate):
    # Verify survey exists
    survey = await db.surveys.find_one({"id": response_data.survey_id, "is_active": True})
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found or inactive")
    
    response_id = str(uuid.uuid4())
    response_doc = {
        "id": response_id,
        "survey_id": response_data.survey_id,
        "answers": [a.model_dump() for a in response_data.answers],
        "respondent_name": response_data.respondent_name,
        "submitted_at": datetime.now(timezone.utc).isoformat()
    }
    await db.responses.insert_one(response_doc)
    
    # Update response count
    await db.surveys.update_one(
        {"id": response_data.survey_id},
        {"$inc": {"response_count": 1}}
    )
    
    # Emit real-time event
    await sio.emit('new_response', {
        'survey_id': response_data.survey_id,
        'response_id': response_id,
        'timestamp': response_doc["submitted_at"]
    })
    
    return Response(**response_doc)

@api_router.get("/responses/survey/{survey_id}", response_model=List[Response])
async def get_survey_responses(survey_id: str, current_user: dict = Depends(get_current_user)):
    # Verify user owns the survey
    survey = await db.surveys.find_one({"id": survey_id, "creator_id": current_user["id"]})
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")
    
    responses = await db.responses.find({"survey_id": survey_id}, {"_id": 0}).to_list(10000)
    return [Response(**r) for r in responses]

@api_router.get("/analytics/{survey_id}")
async def get_analytics(survey_id: str, current_user: dict = Depends(get_current_user)):
    # Verify user owns the survey
    survey = await db.surveys.find_one({"id": survey_id, "creator_id": current_user["id"]}, {"_id": 0})
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")
    
    # Get all responses
    responses = await db.responses.find({"survey_id": survey_id}, {"_id": 0}).to_list(10000)
    
    # Aggregate data
    analytics = {
        "survey_id": survey_id,
        "survey_title": survey["title"],
        "total_responses": len(responses),
        "questions_analytics": []
    }
    
    for question in survey["questions"]:
        q_analytics = {
            "question_id": question["id"],
            "question_text": question["text"],
            "question_type": question["type"],
            "answers": []
        }
        
        # Collect all answers for this question
        for response in responses:
            for answer in response["answers"]:
                if answer["question_id"] == question["id"]:
                    q_analytics["answers"].append(answer["answer"])
        
        # For multiple choice, count occurrences
        if question["type"] == "multiple_choice":
            answer_counts = {}
            for answer in q_analytics["answers"]:
                if isinstance(answer, list):
                    for opt in answer:
                        answer_counts[opt] = answer_counts.get(opt, 0) + 1
                else:
                    answer_counts[answer] = answer_counts.get(answer, 0) + 1
            q_analytics["answer_distribution"] = answer_counts
        
        analytics["questions_analytics"].append(q_analytics)
    
    return analytics

# WebSocket events
@sio.event
async def connect(sid, environ):
    logging.info(f"Client connected: {sid}")

@sio.event
async def disconnect(sid):
    logging.info(f"Client disconnected: {sid}")

@sio.event
async def join_survey(sid, data):
    survey_id = data.get('survey_id')
    await sio.enter_room(sid, f"survey_{survey_id}")
    logging.info(f"Client {sid} joined survey room {survey_id}")

# Include router
app.include_router(api_router)

# Mount Socket.IO
socket_app = socketio.ASGIApp(sio, other_asgi_app=app)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

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