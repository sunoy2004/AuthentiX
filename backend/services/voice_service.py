import numpy as np
import pickle
import faiss
from pathlib import Path
from typing import Optional
import io
import librosa
import soundfile as sf
import logging
import tempfile
import os

logger = logging.getLogger(__name__)

class VoiceService:
    def __init__(self):
        self.db_path = Path("data/voice")
        self.db_path.mkdir(parents=True, exist_ok=True)
        
        self.index_file = self.db_path / "faiss_index.bin"
        self.labels_file = self.db_path / "labels.pkl"
        self.embeddings_file = self.db_path / "embeddings.pkl"
        
        self.dimension = 80  # MFCC feature dimension (40 mean + 40 std)
        self.threshold = 0.70  # Similarity threshold
        self.sample_rate = 16000
        self.n_mfcc = 40
        
        # Initialize or load FAISS index
        self.index = self._load_or_create_index()
        self.labels = self._load_labels()
        self.embeddings = self._load_embeddings()
        
    def _load_or_create_index(self) -> faiss.Index:
        """Load existing FAISS index or create new one"""
        if self.index_file.exists():
            try:
                index = faiss.read_index(str(self.index_file))
                logger.info(f"Loaded voice FAISS index with {index.ntotal} samples")
                return index
            except Exception as e:
                logger.error(f"Failed to load voice index: {e}")
        
        # Use Inner Product for cosine similarity
        index = faiss.IndexFlatIP(self.dimension)
        logger.info("Created new voice FAISS index")
        return index
    
    def _load_labels(self) -> dict:
        """Load user ID labels"""
        if self.labels_file.exists():
            with open(self.labels_file, 'rb') as f:
                return pickle.load(f)
        return {}
    
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
    
    def _save_index(self):
        """Save FAISS index to disk"""
        faiss.write_index(self.index, str(self.index_file))
    
    def _save_labels(self):
        """Save labels to disk"""
        with open(self.labels_file, 'wb') as f:
            pickle.dump(self.labels, f)
    
    def _extract_voice_features(self, audio_bytes: bytes) -> Optional[np.ndarray]:
        """
        Extract MFCC features from audio
        Simple approach - use librosa's built-in format support
        """
        try:
            # Save to temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix='.webm') as tmp_file:
                tmp_file.write(audio_bytes)
                tmp_path = tmp_file.name
            
            try:
                # Load directly - librosa has some WebM support via audioread
                import warnings
                warnings.filterwarnings('ignore')
                
                audio_data, sr = librosa.load(tmp_path, sr=self.sample_rate)
                
            finally:
                # Clean up temp file
                if os.path.exists(tmp_path):
                    os.unlink(tmp_path)
            
            # Check if audio is too short
            if len(audio_data) < self.sample_rate * 0.5:  # At least 0.5 seconds
                logger.warning("Audio too short")
                return None
            
            # Extract MFCC features
            mfcc = librosa.feature.mfcc(y=audio_data, sr=sr, n_mfcc=self.n_mfcc)
            
            # Compute statistics across time
            mfcc_mean = np.mean(mfcc, axis=1)
            mfcc_std = np.std(mfcc, axis=1)
            
            # Concatenate mean and std
            features = np.concatenate([mfcc_mean, mfcc_std])
            
            # Normalize for cosine similarity
            features = features / np.linalg.norm(features)
            
            return features.astype('float32')
            
        except Exception as e:
            logger.error(f"Error extracting voice features: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
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
            
            # Add to FAISS index
            features_reshaped = features.reshape(1, -1)
            index_id = self.index.ntotal
            self.index.add(features_reshaped)
            
            # Store label and embedding
            self.labels[index_id] = user_id
            
            if user_id not in self.embeddings:
                self.embeddings[user_id] = []
            self.embeddings[user_id].append(features)
            
            # Save to disk
            self._save_index()
            self._save_labels()
            self._save_embeddings()
            
            logger.info(f"Voice enrolled for user {user_id}")
            
            return {
                "success": True,
                "message": "Voice enrolled successfully"
            }
            
        except Exception as e:
            logger.error(f"Enrollment failed: {e}")
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
                    "confidence": 0.0,
                    "message": "Failed to extract voice features"
                }
            
            if self.index.ntotal == 0:
                return {
                    "success": False,
                    "match": False,
                    "confidence": 0.0,
                    "message": "No enrolled voice samples in database"
                }
            
            # Search in FAISS index
            features_reshaped = features.reshape(1, -1)
            k = min(10, self.index.ntotal)
            similarities, indices = self.index.search(features_reshaped, k)
            
            # Check if any match belongs to the user
            matched = False
            best_confidence = 0.0
            
            for i, idx in enumerate(indices[0]):
                if idx != -1 and self.labels.get(int(idx)) == user_id:
                    confidence = float(similarities[0][i])
                    
                    if confidence > self.threshold:
                        matched = True
                        best_confidence = max(best_confidence, confidence)
                        break
            
            logger.info(f"Voice verification for {user_id}: match={matched}, confidence={best_confidence:.3f}")
            
            return {
                "success": True,
                "match": matched,
                "confidence": float(best_confidence),
                "message": "Voice verified" if matched else "Voice not recognized"
            }
            
        except Exception as e:
            logger.error(f"Verification failed: {e}")
            return {
                "success": False,
                "match": False,
                "confidence": 0.0,
                "message": f"Verification failed: {str(e)}"
            }
