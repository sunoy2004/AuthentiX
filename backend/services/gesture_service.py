import numpy as np
import pickle
from pathlib import Path
from typing import List, Dict, Optional

class GestureService:
    def __init__(self):
        self.db_path = Path("data/gesture")
        self.db_path.mkdir(parents=True, exist_ok=True)
        
        self.embeddings_file = self.db_path / "gesture_embeddings.pkl"
        self.embeddings = self._load_embeddings()
        
        self.threshold = 0.70  # DTW distance threshold
        
    def _load_embeddings(self) -> dict:
        """Load stored gesture embeddings"""
        if self.embeddings_file.exists():
            with open(self.embeddings_file, 'rb') as f:
                return pickle.load(f)
        return {}
    
    def _save_embeddings(self):
        """Save embeddings to disk"""
        with open(self.embeddings_file, 'wb') as f:
            pickle.dump(self.embeddings, f)
    
    def _extract_gesture_features(self, gesture_sequence: List[dict]) -> Optional[np.ndarray]:
        """
        Extract features from gesture IMU data
        Returns a time series of features
        """
        try:
            if not gesture_sequence or len(gesture_sequence) == 0:
                return None
            
            # Extract all IMU readings into arrays
            features = []
            for reading in gesture_sequence:
                feature_vector = [
                    reading.get('accelerometerX', 0),
                    reading.get('accelerometerY', 0),
                    reading.get('accelerometerZ', 0),
                    reading.get('gyroscopeX', 0),
                    reading.get('gyroscopeY', 0),
                    reading.get('gyroscopeZ', 0),
                ]
                features.append(feature_vector)
            
            features_array = np.array(features, dtype='float32')
            
            # Normalize each dimension
            for i in range(features_array.shape[1]):
                col = features_array[:, i]
                if np.std(col) > 0:
                    features_array[:, i] = (col - np.mean(col)) / np.std(col)
            
            return features_array
            
        except Exception as e:
            print(f"Error extracting gesture features: {e}")
            return None
    
    def _dtw_distance(self, seq1: np.ndarray, seq2: np.ndarray) -> float:
        """
        Calculate Dynamic Time Warping distance between two sequences
        """
        n, m = len(seq1), len(seq2)
        dtw_matrix = np.zeros((n + 1, m + 1))
        
        for i in range(n + 1):
            for j in range(m + 1):
                dtw_matrix[i, j] = np.inf
        dtw_matrix[0, 0] = 0
        
        for i in range(1, n + 1):
            for j in range(1, m + 1):
                cost = np.linalg.norm(seq1[i-1] - seq2[j-1])
                dtw_matrix[i, j] = cost + min(
                    dtw_matrix[i-1, j],      # insertion
                    dtw_matrix[i, j-1],      # deletion
                    dtw_matrix[i-1, j-1]     # match
                )
        
        return float(dtw_matrix[n, m])
    
    def _similarity_score(self, distance: float, max_distance: float = 100.0) -> float:
        """Convert DTW distance to similarity score (0-1)"""
        return max(0.0, 1.0 - (distance / max_distance))
    
    async def enroll(self, user_id: str, gesture_sequence: List[dict]) -> dict:
        """Enroll a new gesture pattern for a user"""
        try:
            features = self._extract_gesture_features(gesture_sequence)
            
            if features is None:
                return {
                    "success": False,
                    "message": "Failed to extract gesture features"
                }
            
            # Store features for user
            if user_id not in self.embeddings:
                self.embeddings[user_id] = []
            
            self.embeddings[user_id].append(features)
            
            # Save to disk
            self._save_embeddings()
            
            return {
                "success": True,
                "message": "Gesture enrolled successfully"
            }
            
        except Exception as e:
            return {
                "success": False,
                "message": f"Enrollment failed: {str(e)}"
            }
    
    async def verify(self, user_id: str, gesture_sequence: List[dict]) -> dict:
        """Verify gesture against enrolled patterns"""
        try:
            features = self._extract_gesture_features(gesture_sequence)
            
            if features is None:
                return {
                    "success": False,
                    "match": False,
                    "message": "Failed to extract gesture features"
                }
            
            if user_id not in self.embeddings or len(self.embeddings[user_id]) == 0:
                return {
                    "success": False,
                    "match": False,
                    "message": "No enrolled gestures for this user"
                }
            
            # Compare with all enrolled gestures using DTW
            distances = []
            for enrolled_features in self.embeddings[user_id]:
                distance = self._dtw_distance(features, enrolled_features)
                distances.append(distance)
            
            # Use best match (minimum distance)
            best_distance = min(distances)
            similarity = self._similarity_score(best_distance)
            matched = similarity >= self.threshold
            
            return {
                "success": True,
                "match": matched,
                "confidence": float(similarity),
                "message": "Verification complete"
            }
            
        except Exception as e:
            return {
                "success": False,
                "match": False,
                "message": f"Verification failed: {str(e)}"
            }
