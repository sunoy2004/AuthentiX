from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import uvicorn
from typing import List, Optional
from datetime import datetime
import asyncio

# Simplified services without heavy ML dependencies
class SimpleFaceService:
    async def enroll(self, user_id: str, image_bytes: bytes):
        return {"success": True, "message": "Face enrolled successfully (mock)"}
    
    async def verify(self, user_id: str, image_bytes: bytes):
        return {"success": True, "match": True, "confidence": 0.92, "message": "Face verified (mock)"}

class SimpleVoiceService:
    async def enroll(self, user_id: str, audio_bytes: bytes):
        return {"success": True, "message": "Voice enrolled successfully (mock)"}
    
    async def verify(self, user_id: str, audio_bytes: bytes):
        return {"success": True, "match": True, "confidence": 0.88, "message": "Voice verified (mock)"}

class SimpleGestureService:
    async def enroll(self, user_id: str, gesture_sequence: List[dict]):
        return {"success": True, "message": "Gesture enrolled successfully (mock)"}
    
    async def verify(self, user_id: str, gesture_sequence: List[dict]):
        return {"success": True, "match": True, "confidence": 0.85, "message": "Gesture verified (mock)"}

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
face_service = SimpleFaceService()
voice_service = SimpleVoiceService()
gesture_service = SimpleGestureService()

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
        image_bytes = await image.read()
        result = await face_service.enroll(user_id, image_bytes)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/face/verify")
async def verify_face(
    user_id: str = Form(...),
    image: UploadFile = File(...)
):
    """Verify a face against enrolled data"""
    try:
        image_bytes = await image.read()
        result = await face_service.verify(user_id, image_bytes)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Voice Authentication Endpoints
@app.post("/voice/enroll")
async def enroll_voice(
    user_id: str = Form(...),
    audio: UploadFile = File(...)
):
    """Enroll a new voice sample for a user"""
    try:
        audio_bytes = await audio.read()
        result = await voice_service.enroll(user_id, audio_bytes)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/voice/verify")
async def verify_voice(
    user_id: str = Form(...),
    audio: UploadFile = File(...)
):
    """Verify a voice against enrolled data"""
    try:
        audio_bytes = await audio.read()
        result = await voice_service.verify(user_id, audio_bytes)
        return result
    except Exception as e:
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
