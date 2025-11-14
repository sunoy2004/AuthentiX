import { useState } from 'react';
import { toast } from 'sonner';

// Configure your Python FastAPI backend URL
const PYTHON_API_URL = import.meta.env.VITE_PYTHON_API_URL || 'http://localhost:8000';

export interface EmbeddingResponse {
  success: boolean;
  embedding?: number[];
  match?: boolean;
  confidence?: number;
  message?: string;
}

export const usePythonAPI = () => {
  const [loading, setLoading] = useState(false);

  const enrollFace = async (userId: string, images: Blob | Blob[]): Promise<boolean> => {
    setLoading(true);
    console.log('[usePythonAPI] enrollFace started for user:', userId);
    
    try {
      const formData = new FormData();
      formData.append('user_id', userId);
      
      // Handle single or multiple images
      const imageArray = Array.isArray(images) ? images : [images];
      console.log(`[usePythonAPI] Uploading ${imageArray.length} image(s)`);
      
      imageArray.forEach((imageBlob, index) => {
        formData.append('images', imageBlob, `face-${index}.jpg`);
      });

      console.log(`[usePythonAPI] Sending request to ${PYTHON_API_URL}/face/enroll`);
      const response = await fetch(`${PYTHON_API_URL}/face/enroll`, {
        method: 'POST',
        body: formData,
        mode: 'cors',
        credentials: 'omit',
      });

      console.log('[usePythonAPI] Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: EmbeddingResponse = await response.json();
      console.log('[usePythonAPI] Response data:', data);

      if (data.success) {
        toast.success('Face enrolled successfully');
        return true;
      } else {
        toast.error(data.message || 'Failed to enroll face');
        return false;
      }
    } catch (error) {
      console.error('[usePythonAPI] Face enrollment error:', error);
      toast.error('Failed to connect to face recognition service');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const verifyFace = async (userId: string, imageBlob: Blob): Promise<EmbeddingResponse> => {
    setLoading(true);
    console.log('[usePythonAPI] verifyFace started for user:', userId);
    
    try {
      const formData = new FormData();
      formData.append('user_id', userId);
      formData.append('image', imageBlob, 'face.jpg');

      console.log(`[usePythonAPI] Sending request to ${PYTHON_API_URL}/face/verify`);
      const response = await fetch(`${PYTHON_API_URL}/face/verify`, {
        method: 'POST',
        body: formData,
        mode: 'cors',
        credentials: 'omit',
      });

      console.log('[usePythonAPI] Response status:', response.status);
      const data: EmbeddingResponse = await response.json();
      console.log('[usePythonAPI] Response data:', data);
      
      return data;
    } catch (error) {
      console.error('[usePythonAPI] Face verification error:', error);
      toast.error('Failed to connect to face recognition service');
      return { success: false, message: 'Connection failed' };
    } finally {
      setLoading(false);
    }
  };

  const enrollVoice = async (userId: string, audioBlob: Blob): Promise<boolean> => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('user_id', userId);
      formData.append('audio', audioBlob);

      const response = await fetch(`${PYTHON_API_URL}/voice/enroll`, {
        method: 'POST',
        body: formData,
        mode: 'cors',
        credentials: 'omit',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: EmbeddingResponse = await response.json();

      if (data.success) {
        toast.success('Voice enrolled successfully');
        return true;
      } else {
        toast.error(data.message || 'Failed to enroll voice');
        return false;
      }
    } catch (error) {
      console.error('Voice enrollment error:', error);
      toast.error('Failed to connect to voice recognition service');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const verifyVoice = async (userId: string, audioBlob: Blob): Promise<EmbeddingResponse> => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('user_id', userId);
      formData.append('audio', audioBlob);

      const response = await fetch(`${PYTHON_API_URL}/voice/verify`, {
        method: 'POST',
        body: formData,
      });

      const data: EmbeddingResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Voice verification error:', error);
      toast.error('Failed to connect to voice recognition service');
      return { success: false, message: 'Connection failed' };
    } finally {
      setLoading(false);
    }
  };

  const enrollGesture = async (userId: string, gestureData: any[]): Promise<boolean> => {
    setLoading(true);
    try {
      const response = await fetch(`${PYTHON_API_URL}/gesture/enroll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          gesture_sequence: gestureData,
        }),
        mode: 'cors',
        credentials: 'omit',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: EmbeddingResponse = await response.json();

      if (data.success) {
        toast.success('Gesture enrolled successfully');
        return true;
      } else {
        toast.error(data.message || 'Failed to enroll gesture');
        return false;
      }
    } catch (error) {
      console.error('Gesture enrollment error:', error);
      toast.error('Failed to connect to gesture recognition service');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const verifyGesture = async (userId: string, gestureData: any[]): Promise<EmbeddingResponse> => {
    setLoading(true);
    try {
      const response = await fetch(`${PYTHON_API_URL}/gesture/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          gesture_sequence: gestureData,
        }),
      });

      const data: EmbeddingResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Gesture verification error:', error);
      toast.error('Failed to connect to gesture recognition service');
      return { success: false, message: 'Connection failed' };
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    enrollFace,
    verifyFace,
    enrollVoice,
    verifyVoice,
    enrollGesture,
    verifyGesture,
  };
};
