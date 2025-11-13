import numpy as np
import pickle
from pathlib import Path
from typing import Optional
import io
import librosa

class VoiceService:
    def __init__(self):
        self.db_path = Path("data/voice")
        self.db_path.mkdir(parents=True, exist_ok=True)
        
        self.embeddings_file = self.db_path / "voice_embeddings.pkl"
        self.embeddings = self._load_embeddings()
        
        self.threshold = 0.75  # Similarity threshold
        self.sample_rate = 16000
        self.n_mfcc = 40
        
    def _load_embeddings(self) -> dict:
        """Load stored voice embeddings"""
        if self.embeddings_file.exists():
            with open(self.embeddings_file, 'rb') as f:
                return pickle.load(f)
        return {}
    
    def _save_embeddings(self):
        """Save embeddings to disk"""
        with open(self.embeddings_file, 'wb') as f:
            pickle.dump(self.embeddings, f)
    
    def _extract_voice_features(self, audio_bytes: bytes) -> Optional[np.ndarray]:
        """
        Extract MFCC features from audio
        """
        try:
            # Load audio from bytes
            audio_data, sr = librosa.load(io.BytesIO(audio_bytes), sr=self.sample_rate)
            
            # Extract MFCC features
            mfcc = librosa.feature.mfcc(y=audio_data, sr=sr, n_mfcc=self.n_mfcc)
            
            # Compute statistics across time
            mfcc_mean = np.mean(mfcc, axis=1)
            mfcc_std = np.std(mfcc, axis=1)
            
            # Concatenate mean and std
            features = np.concatenate([mfcc_mean, mfcc_std])
            
            # Normalize
            features = features / np.linalg.norm(features)
            
            return features.astype('float32')
            
        except Exception as e:
            print(f"Error extracting voice features: {e}")
            return None
    
    def _cosine_similarity(self, a: np.ndarray, b: np.ndarray) -> float:
        """Calculate cosine similarity between two vectors"""
        return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))
    
    async def enroll(self, user_id: str, audio_bytes: bytes) -> dict:
        """Enroll a new voice sample for a user"""
        try:
            features = self._extract_voice_features(audio_bytes)
            
            if features is None:
                return {
                    "success": False,
                    "message": "Failed to extract voice features"
                }
            
            # Store features for user
            if user_id not in self.embeddings:
                self.embeddings[user_id] = []
            
            self.embeddings[user_id].append(features)
            
            # Save to disk
            self._save_embeddings()
            
            return {
                "success": True,
                "message": "Voice enrolled successfully"
            }
            
        except Exception as e:
            return {
                "success": False,
                "message": f"Enrollment failed: {str(e)}"
            }
    
    async def verify(self, user_id: str, audio_bytes: bytes) -> dict:
        """Verify voice against enrolled samples"""
        try:
            features = self._extract_voice_features(audio_bytes)
            
            if features is None:
                return {
                    "success": False,
                    "match": False,
                    "message": "Failed to extract voice features"
                }
            
            if user_id not in self.embeddings or len(self.embeddings[user_id]) == 0:
                return {
                    "success": False,
                    "match": False,
                    "message": "No enrolled voice samples for this user"
                }
            
            # Compare with all enrolled samples
            similarities = []
            for enrolled_features in self.embeddings[user_id]:
                sim = self._cosine_similarity(features, enrolled_features)
                similarities.append(sim)
            
            # Use best match
            best_similarity = max(similarities)
            matched = best_similarity >= self.threshold
            
            return {
                "success": True,
                "match": matched,
                "confidence": float(best_similarity),
                "message": "Verification complete"
            }
            
        except Exception as e:
            return {
                "success": False,
                "match": False,
                "message": f"Verification failed: {str(e)}"
            }
