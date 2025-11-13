import numpy as np
import faiss
import pickle
import cv2
from pathlib import Path
from typing import Optional, Tuple, Dict
import io
from PIL import Image
from keras_facenet import FaceNet
import os
import logging

logger = logging.getLogger(__name__)

class FaceService:
    def __init__(self):
        self.db_path = Path("data/face")
        self.db_path.mkdir(parents=True, exist_ok=True)
        
        self.index_file = self.db_path / "faiss_index.bin"
        self.labels_file = self.db_path / "labels.pkl"
        self.embeddings_file = self.db_path / "embeddings.pkl"
        
        self.dimension = 512  # FaceNet embedding dimension
        self.threshold = 0.75  # Cosine similarity threshold (higher = stricter)
        
        # Initialize FaceNet model
        try:
            self.facenet_model = FaceNet()
            logger.info("FaceNet model loaded successfully")
        except Exception as e:
            logger.warning(f"FaceNet model not available, using fallback: {e}")
            self.facenet_model = None
            # Use smaller dimension for fallback
            self.dimension = 128
        
        # Load face detector
        cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        self.face_cascade = cv2.CascadeClassifier(cascade_path)
        
        # Initialize or load FAISS index
        self.index = self._load_or_create_index()
        self.labels = self._load_labels()
        self.embeddings = self._load_embeddings()
        
    def _load_or_create_index(self) -> faiss.Index:
        """Load existing FAISS index or create new one"""
        if self.index_file.exists():
            try:
                index = faiss.read_index(str(self.index_file))
                logger.info(f"Loaded FAISS index with {index.ntotal} faces")
                return index
            except Exception as e:
                logger.error(f"Failed to load index: {e}")
        
        # Use Inner Product for cosine similarity (requires normalized vectors)
        index = faiss.IndexFlatIP(self.dimension)
        logger.info("Created new FAISS index")
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
        Extract face embedding from image bytes using FaceNet
        """
        try:
            # Convert bytes to PIL Image
            image = Image.open(io.BytesIO(image_bytes))
            image_np = np.array(image)
            
            # Convert RGB to BGR for OpenCV
            if len(image_np.shape) == 2:
                # Grayscale to BGR
                image_np = cv2.cvtColor(image_np, cv2.COLOR_GRAY2BGR)
            elif len(image_np.shape) == 3 and image_np.shape[2] == 3:
                image_np = cv2.cvtColor(image_np, cv2.COLOR_RGB2BGR)
            elif len(image_np.shape) == 3 and image_np.shape[2] == 4:
                image_np = cv2.cvtColor(image_np, cv2.COLOR_RGBA2BGR)
            
            # Detect face using OpenCV Haar Cascade
            gray = cv2.cvtColor(image_np, cv2.COLOR_BGR2GRAY)
            faces = self.face_cascade.detectMultiScale(
                gray, 
                scaleFactor=1.1, 
                minNeighbors=5,
                minSize=(30, 30)
            )
            
            if len(faces) == 0:
                logger.warning("No face detected in image")
                return None
            
            # Get the largest face
            largest_face = max(faces, key=lambda f: f[2] * f[3])
            (x, y, w, h) = largest_face
            
            # Add padding around face
            padding = int(0.2 * w)
            x = max(0, x - padding)
            y = max(0, y - padding)
            w = min(image_np.shape[1] - x, w + 2 * padding)
            h = min(image_np.shape[0] - y, h + 2 * padding)
            
            face_roi = image_np[y:y+h, x:x+w]
            
            # Resize to FaceNet input size (160x160)
            face_roi = cv2.resize(face_roi, (160, 160))
            
            # Convert BGR to RGB for FaceNet
            face_rgb = cv2.cvtColor(face_roi, cv2.COLOR_BGR2RGB)
            
            # Generate embedding using FaceNet
            if self.facenet_model is not None:
                # FaceNet expects input shape (1, 160, 160, 3)
                face_input = np.expand_dims(face_rgb, axis=0)
                embedding = self.facenet_model.embeddings(face_input)[0]
            else:
                # Fallback: Use histogram-based features
                logger.info("Using fallback embedding method (no FaceNet)")
                # Convert to grayscale for histogram
                gray_face = cv2.cvtColor(face_roi, cv2.COLOR_BGR2GRAY)
                # Resize to consistent size
                gray_face = cv2.resize(gray_face, (64, 64))
                # Extract HOG features (Histogram of Oriented Gradients)
                from skimage.feature import hog
                embedding = hog(
                    gray_face,
                    orientations=9,
                    pixels_per_cell=(8, 8),
                    cells_per_block=(2, 2),
                    visualize=False
                )
                # Ensure dimension matches
                if len(embedding) > self.dimension:
                    embedding = embedding[:self.dimension]
                elif len(embedding) < self.dimension:
                    embedding = np.pad(embedding, (0, self.dimension - len(embedding)))
            
            # Normalize embedding for cosine similarity
            embedding = embedding / np.linalg.norm(embedding)
            
            return embedding.astype('float32')
            
        except Exception as e:
            logger.error(f"Error extracting face embedding: {e}")
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
                    "confidence": 0.0,
                    "message": "No face detected in image"
                }
            
            if self.index.ntotal == 0:
                return {
                    "success": False,
                    "match": False,
                    "confidence": 0.0,
                    "message": "No enrolled faces in database"
                }
            
            # Search in FAISS index (using Inner Product for cosine similarity)
            embedding_reshaped = embedding.reshape(1, -1)
            k = min(10, self.index.ntotal)  # Get top 10 matches
            similarities, indices = self.index.search(embedding_reshaped, k)
            
            # Check if any match belongs to the user
            matched = False
            best_confidence = 0.0
            
            for i, idx in enumerate(indices[0]):
                if idx != -1 and self.labels.get(int(idx)) == user_id:
                    # Inner Product gives cosine similarity for normalized vectors
                    confidence = float(similarities[0][i])
                    
                    if confidence > self.threshold:
                        matched = True
                        best_confidence = max(best_confidence, confidence)
                        break
            
            logger.info(f"Face verification for {user_id}: match={matched}, confidence={best_confidence:.3f}")
            
            return {
                "success": True,
                "match": matched,
                "confidence": float(best_confidence),
                "message": "Face verified" if matched else "Face not recognized"
            }
            
        except Exception as e:
            logger.error(f"Verification failed: {e}")
            return {
                "success": False,
                "match": False,
                "confidence": 0.0,
                "message": f"Verification failed: {str(e)}"
            }
