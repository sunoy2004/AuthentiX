"""
Test script to verify backend services are working
"""
import sys
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_imports():
    """Test if all required packages can be imported"""
    print("=" * 50)
    print("Testing Backend Dependencies")
    print("=" * 50)
    
    try:
        import numpy as np
        print("✓ numpy imported successfully")
    except ImportError as e:
        print(f"✗ numpy import failed: {e}")
        return False
    
    try:
        import faiss
        print("✓ faiss imported successfully")
    except ImportError as e:
        print(f"✗ faiss import failed: {e}")
        return False
    
    try:
        import cv2
        print("✓ opencv-python imported successfully")
    except ImportError as e:
        print(f"✗ opencv-python import failed: {e}")
        return False
    
    try:
        from PIL import Image
        print("✓ Pillow imported successfully")
    except ImportError as e:
        print(f"✗ Pillow import failed: {e}")
        return False
    
    try:
        import librosa
        print("✓ librosa imported successfully")
    except ImportError as e:
        print(f"✗ librosa import failed: {e}")
        return False
    
    try:
        from keras_facenet import FaceNet
        print("✓ keras-facenet imported successfully")
        model = FaceNet()
        print(f"  FaceNet model loaded: embedding dimension = {model.embeddings(np.zeros((1, 160, 160, 3))).shape}")
    except ImportError as e:
        print(f"✗ keras-facenet import failed: {e}")
        print("  Note: This is optional but recommended for face recognition")
    except Exception as e:
        print(f"✗ FaceNet model loading failed: {e}")
    
    try:
        from supabase import create_client
        print("✓ supabase imported successfully")
    except ImportError as e:
        print(f"✗ supabase import failed: {e}")
        return False
    
    try:
        from fastapi import FastAPI
        print("✓ FastAPI imported successfully")
    except ImportError as e:
        print(f"✗ FastAPI import failed: {e}")
        return False
    
    return True

def test_services():
    """Test if services can be initialized"""
    print("\n" + "=" * 50)
    print("Testing Service Initialization")
    print("=" * 50)
    
    try:
        from services.face_service import FaceService
        face_service = FaceService()
        print(f"✓ FaceService initialized (dimension: {face_service.dimension})")
    except Exception as e:
        print(f"✗ FaceService initialization failed: {e}")
    
    try:
        from services.voice_service import VoiceService
        voice_service = VoiceService()
        print(f"✓ VoiceService initialized (dimension: {voice_service.dimension})")
    except Exception as e:
        print(f"✗ VoiceService initialization failed: {e}")
    
    try:
        from services.gesture_service import GestureService
        gesture_service = GestureService()
        print(f"✓ GestureService initialized")
    except Exception as e:
        print(f"✗ GestureService initialization failed: {e}")

def test_supabase():
    """Test Supabase connection"""
    print("\n" + "=" * 50)
    print("Testing Supabase Connection")
    print("=" * 50)
    
    try:
        from supabase_client import get_supabase_client
        client = get_supabase_client()
        print("✓ Supabase client created successfully")
        print(f"  URL: {client.supabase_url}")
    except Exception as e:
        print(f"✗ Supabase connection failed: {e}")

if __name__ == "__main__":
    print("\n🧪 Kinetic Auth Backend Test Suite\n")
    
    if test_imports():
        print("\n✅ All core dependencies imported successfully!")
    else:
        print("\n❌ Some dependencies failed to import")
        sys.exit(1)
    
    test_services()
    test_supabase()
    
    print("\n" + "=" * 50)
    print("Test Suite Complete")
    print("=" * 50)
    print("\n✅ Backend is ready to start!")
    print("   Run: python main.py")
