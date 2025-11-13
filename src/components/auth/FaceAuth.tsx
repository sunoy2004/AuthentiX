import React, { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, X, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { usePythonAPI } from '@/hooks/usePythonAPI';
import { useAuthMethods } from '@/hooks/useAuthMethods';

interface FaceAuthProps {
  isOpen: boolean;
  onComplete: (success: boolean) => void;
  onClose: () => void;
  mode: 'enroll' | 'verify';
}

export const FaceAuth: React.FC<FaceAuthProps> = ({ isOpen, onComplete, onClose, mode }) => {
  const { user } = useAuth();
  const { enrollFace, verifyFace } = usePythonAPI();
  const { updateMethodStatus, logAuthAttempt } = useAuthMethods(user?.id);
  
  const [isCapturing, setIsCapturing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        } 
      });
      
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
      setIsCapturing(true);
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast.error("Unable to access camera. Please check permissions.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCapturing(false);
  }, [stream]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw the video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert to base64
    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedImage(imageData);
    stopCamera();
  }, [stopCamera]);

  const processFaceAuth = useCallback(async () => {
    if (!capturedImage || !user) return;

    setIsProcessing(true);
    
    try {
      // Convert base64 to blob
      const response = await fetch(capturedImage);
      const blob = await response.blob();

      let success = false;
      let confidence = 0;

      if (mode === 'enroll') {
        success = await enrollFace(user.id, blob);
        if (success) {
          await updateMethodStatus('face', true);
        }
      } else {
        const result = await verifyFace(user.id, blob);
        success = result.success && (result.match ?? false);
        confidence = result.confidence ?? 0;
      }

      await logAuthAttempt('face', success, confidence);

      if (success) {
        toast.success(`Face ${mode === 'enroll' ? 'enrolled' : 'verified'} successfully`);
        onComplete(true);
      } else {
        toast.error(`Face ${mode === 'enroll' ? 'enrollment' : 'verification'} failed`);
        onComplete(false);
      }
    } catch (error) {
      console.error('Face authentication error:', error);
      toast.error('Failed to process face authentication');
      onComplete(false);
    } finally {
      setIsProcessing(false);
    }
  }, [capturedImage, user, mode, enrollFace, verifyFace, updateMethodStatus, logAuthAttempt, onComplete]);

  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
    startCamera();
  }, [startCamera]);

  React.useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center flex items-center justify-center gap-2">
            <Camera className="w-5 h-5 text-primary" />
            {mode === 'enroll' ? 'Enroll Face' : 'Verify Face'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {!isCapturing && !capturedImage && (
            <div className="text-center space-y-4">
              <div className="w-32 h-32 mx-auto bg-secondary rounded-full flex items-center justify-center">
                <Camera className="w-16 h-16 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">
                Position your face in the camera frame and capture
              </p>
              <Button 
                onClick={startCamera}
                className="w-full neon-green bg-neon-green hover:bg-neon-green-glow text-background"
              >
                Start Camera
              </Button>
            </div>
          )}

          {isCapturing && (
            <div className="space-y-4">
              <div className="relative aspect-[4/3] bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                  muted
                />
                <div className="absolute inset-0 border-2 border-neon-green rounded-lg"></div>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={capturePhoto}
                  className="flex-1 neon-green bg-neon-green hover:bg-neon-green-glow text-background"
                >
                  Capture
                </Button>
                <Button 
                  variant="outline" 
                  onClick={stopCamera}
                  className="px-4 border-muted"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {capturedImage && (
            <div className="space-y-4">
              <div className="aspect-[4/3] bg-black rounded-lg overflow-hidden">
                <img 
                  src={capturedImage} 
                  alt="Captured face" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={processFaceAuth}
                  disabled={isProcessing}
                  className="flex-1 neon-green bg-neon-green hover:bg-neon-green-glow text-background"
                >
                  {isProcessing ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin"></div>
                      Processing...
                    </div>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Verify Face
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={retakePhoto}
                  className="px-4 border-muted"
                >
                  Retake
                </Button>
              </div>
            </div>
          )}
        </div>

        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </DialogContent>
    </Dialog>
  );
};