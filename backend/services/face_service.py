import numpy as np
import faiss
import pickle
import cv2
from pathlib import Path
from typing import Optional, Tuple
import io
from PIL import Image

class FaceService:
    def __init__(self):
        self.db_path = Path("data/face")
        self.db_path.mkdir(parents=True, exist_ok=True)
        
        self.index_file = self.db_path / "faiss_index.bin"
        self.labels_file = self.db_path / "labels.pkl"
        self.embeddings_file = self.db_path / "embeddings.pkl"
        
        self.dimension = 128  # FaceNet embedding dimension
        self.threshold = 0.6  # Cosine similarity threshold
        
        # Initialize or load FAISS index
        self.index = self._load_or_create_index()
        self.labels = self._load_labels()
        self.embeddings = self._load_embeddings()
        
    def _load_or_create_index(self) -> faiss.Index:
        """Load existing FAISS index or create new one"""
        if self.index_file.exists():
            return faiss.read_index(str(self.index_file))
        else:
            # Use L2 distance for now, can switch to Inner Product for cosine
            index = faiss.IndexFlatL2(self.dimension)
            return index
    
    def _load_labels(self) -> dict:
        """Load user ID labels"""
        if self.labels_file.exists():
            with open(self.labels_file, 'rb') as f:
                return pickle.load(f)
        return {}
    
    def _load_embeddings(self) -> dict:
        """Load stored embeddings"""
        if self.embeddings_file.exists():
            with open(self.embeddings_file, 'rb') as f:
                return pickle.load(f)
        return {}
    
    def _save_index(self):
        """Save FAISS index to disk"""
        faiss.write_index(self.index, str(self.index_file))
    
    def _save_labels(self):
        """Save labels to disk"""
        with open(self.labels_file, 'wb') as f:
            pickle.dump(self.labels, f)
    
    def _save_embeddings(self):
        """Save embeddings to disk"""
        with open(self.embeddings_file, 'wb') as f:
            pickle.dump(self.embeddings, f)
    
    def _extract_face_embedding(self, image_bytes: bytes) -> Optional[np.ndarray]:
        """
        Extract face embedding from image bytes
        Uses a simple placeholder - replace with actual FaceNet/DeepFace model
        """
        try:
            # Convert bytes to PIL Image
            image = Image.open(io.BytesIO(image_bytes))
            image_np = np.array(image)
            
            # Convert RGB to BGR for OpenCV
            if len(image_np.shape) == 3:
                image_np = cv2.cvtColor(image_np, cv2.COLOR_RGB2BGR)
            
            # Detect face using OpenCV Haar Cascade
            face_cascade = cv2.CascadeClassifier(
                cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
            )
            gray = cv2.cvtColor(image_np, cv2.COLOR_BGR2GRAY)
            faces = face_cascade.detectMultiScale(gray, 1.3, 5)
            
            if len(faces) == 0:
                return None
            
            # Get the first face
            (x, y, w, h) = faces[0]
            face_roi = image_np[y:y+h, x:x+w]
            
            # Resize to standard size
            face_roi = cv2.resize(face_roi, (160, 160))
            
            # Generate mock embedding (replace with actual FaceNet model)
            # In production, use: model.predict(face_roi)
            embedding = np.random.randn(self.dimension).astype('float32')
            
            # Normalize embedding
            embedding = embedding / np.linalg.norm(embedding)
            
            return embedding
            
        except Exception as e:
            print(f"Error extracting face embedding: {e}")
            return None
    
    async def enroll(self, user_id: str, image_bytes: bytes) -> dict:
        """Enroll a new face for a user"""
        try:
            embedding = self._extract_face_embedding(image_bytes)
            
            if embedding is None:
                return {
                    "success": False,
                    "message": "No face detected in image"
                }
            
            # Add to FAISS index
            embedding_reshaped = embedding.reshape(1, -1)
            index_id = self.index.ntotal
            self.index.add(embedding_reshaped)
            
            # Store label and embedding
            self.labels[index_id] = user_id
            
            if user_id not in self.embeddings:
                self.embeddings[user_id] = []
            self.embeddings[user_id].append(embedding)
            
            # Save to disk
            self._save_index()
            self._save_labels()
            self._save_embeddings()
            
            return {
                "success": True,
                "message": "Face enrolled successfully",
                "embedding_id": index_id
            }
            
        except Exception as e:
            return {
                "success": False,
                "message": f"Enrollment failed: {str(e)}"
            }
    
    async def verify(self, user_id: str, image_bytes: bytes) -> dict:
        """Verify a face against enrolled data"""
        try:
            embedding = self._extract_face_embedding(image_bytes)
            
            if embedding is None:
                return {
                    "success": False,
                    "match": False,
                    "message": "No face detected in image"
                }
            
            if self.index.ntotal == 0:
                return {
                    "success": False,
                    "match": False,
                    "message": "No enrolled faces in database"
                }
            
            # Search in FAISS index
            embedding_reshaped = embedding.reshape(1, -1)
            k = min(5, self.index.ntotal)  # Get top 5 matches
            distances, indices = self.index.search(embedding_reshaped, k)
            
            # Check if any match belongs to the user
            matched = False
            best_confidence = 0.0
            
            for i, idx in enumerate(indices[0]):
                if idx != -1 and self.labels.get(idx) == user_id:
                    # Convert L2 distance to similarity score
                    distance = distances[0][i]
                    confidence = 1 / (1 + distance)  # Simple conversion
                    
                    if confidence > self.threshold:
                        matched = True
                        best_confidence = max(best_confidence, confidence)
            
            return {
                "success": True,
                "match": matched,
                "confidence": float(best_confidence),
                "message": "Verification complete"
            }
            
        except Exception as e:
            return {
                "success": False,
                "match": False,
                "message": f"Verification failed: {str(e)}"
            }
