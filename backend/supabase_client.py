from supabase import create_client, Client
from typing import Optional
import os
import logging

logger = logging.getLogger(__name__)

# Supabase configuration
SUPABASE_URL = "https://oygijeabsjjbiwxoujuu.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95Z2lqZWFic2pqYml3eG91anV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3NTY3NDgsImV4cCI6MjA3ODMzMjc0OH0.VpJYfov5U0aN3ExhLAgHMmJpBVjwcwcU983p4mbCoAM"

supabase_client: Optional[Client] = None

def get_supabase_client() -> Client:
    """Get or create Supabase client"""
    global supabase_client
    
    if supabase_client is None:
        try:
            supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
            logger.info("Supabase client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Supabase client: {e}")
            raise
    
    return supabase_client

def log_auth_event(user_id: str, auth_type: str, status: str, confidence: float = 0.0, device_info: str = ""):
    """Log authentication event to Supabase"""
    try:
        client = get_supabase_client()
        
        # Simple data structure that matches basic table schema
        data = {
            "user_id": user_id,
            "auth_type": auth_type,
            "status": status
        }
        
        result = client.table("auth_logs").insert(data).execute()
        logger.info(f"Logged auth event: {auth_type} for user {user_id} - {status}")
        
        return result
    except Exception as e:
        logger.error(f"Failed to log auth event: {e}")
        return None
