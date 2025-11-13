from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import uvicorn
from typing import List, Optional
from datetime import datetime
import asyncio
import logging

# Import actual services
from services.face_service import FaceService
from services.voice_service import VoiceService
from services.gesture_service import GestureService
from supabase_client import log_auth_event

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="AuthentiX API",
    description="Multi-Modal Authentication Backend",
    version="1.0.0"
)

# CORS middleware for React frontend - must be added BEFORE other middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:8080",
        "http://localhost:8081",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8080",
        "http://127.0.0.1:8081",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Initialize services
try:
    face_service = FaceService()
    logger.info("Face service initialized")
except Exception as e:
    logger.error(f"Failed to initialize face service: {e}")
    face_service = None

try:
    voice_service = VoiceService()
    logger.info("Voice service initialized")
except Exception as e:
    logger.error(f"Failed to initialize voice service: {e}")
    voice_service = None

gesture_service = GestureService()

# Pydantic models
class GestureData(BaseModel):
    user_id: str
    gesture_sequence: List[dict]

class HealthResponse(BaseModel):
    status: str
    timestamp: str
    services: dict

@app.get("/", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "services": {
            "face": "active",
            "voice": "active",
            "gesture": "active"
        }
    }

# Add OPTIONS handler for CORS preflight
@app.options("/{full_path:path}")
async def options_handler(full_path: str):
    """Handle CORS preflight requests"""
    return {"message": "OK"}

# Face Authentication Endpoints
@app.post("/face/enroll")
async def enroll_face(
    user_id: str = Form(...),
    image: UploadFile = File(...)
):
    """Enroll a new face for a user"""
    try:
        if face_service is None:
            raise HTTPException(status_code=503, detail="Face service not available")
        
        image_bytes = await image.read()
        result = await face_service.enroll(user_id, image_bytes)
        
        # Log to Supabase
        if result.get("success"):
            log_auth_event(user_id, "face", "enrolled", 1.0)
        else:
            log_auth_event(user_id, "face", "enrollment_failed", 0.0)
        
        return result
    except Exception as e:
        logger.error(f"Face enrollment error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/face/verify")
async def verify_face(
    user_id: str = Form(...),
    image: UploadFile = File(...)
):
    """Verify a face against enrolled data"""
    try:
        if face_service is None:
            raise HTTPException(status_code=503, detail="Face service not available")
        
        image_bytes = await image.read()
        result = await face_service.verify(user_id, image_bytes)
        
        # Log to Supabase
        if result.get("success") and result.get("match"):
            log_auth_event(user_id, "face", "verified", result.get("confidence", 0.0))
        else:
            log_auth_event(user_id, "face", "verification_failed", result.get("confidence", 0.0))
        
        return result
    except Exception as e:
        logger.error(f"Face verification error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Voice Authentication Endpoints
@app.post("/voice/enroll")
async def enroll_voice(
    user_id: str = Form(...),
    audio: UploadFile = File(...)
):
    """Enroll a new voice sample for a user"""
    try:
        if voice_service is None:
            raise HTTPException(status_code=503, detail="Voice service not available")
        
        audio_bytes = await audio.read()
        result = await voice_service.enroll(user_id, audio_bytes)
        
        # Log to Supabase
        if result.get("success"):
            log_auth_event(user_id, "voice", "enrolled", 1.0)
        else:
            log_auth_event(user_id, "voice", "enrollment_failed", 0.0)
        
        return result
    except Exception as e:
        logger.error(f"Voice enrollment error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/voice/verify")
async def verify_voice(
    user_id: str = Form(...),
    audio: UploadFile = File(...)
):
    """Verify a voice against enrolled data"""
    try:
        if voice_service is None:
            raise HTTPException(status_code=503, detail="Voice service not available")
        
        audio_bytes = await audio.read()
        result = await voice_service.verify(user_id, audio_bytes)
        
        # Log to Supabase
        if result.get("success") and result.get("match"):
            log_auth_event(user_id, "voice", "verified", result.get("confidence", 0.0))
        else:
            log_auth_event(user_id, "voice", "verification_failed", result.get("confidence", 0.0))
        
        return result
    except Exception as e:
        logger.error(f"Voice verification error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Gesture Authentication Endpoints
@app.post("/gesture/enroll")
async def enroll_gesture(gesture_data: GestureData):
    """Enroll a new gesture pattern for a user"""
    try:
        result = await gesture_service.enroll(
            gesture_data.user_id,
            gesture_data.gesture_sequence
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/gesture/verify")
async def verify_gesture(gesture_data: GestureData):
    """Verify a gesture against enrolled data"""
    try:
        result = await gesture_service.verify(
            gesture_data.user_id,
            gesture_data.gesture_sequence
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
