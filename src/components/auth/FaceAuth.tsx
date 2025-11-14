import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, X, Check, AlertCircle } from 'lucide-react';
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
  const [capturedImages, setCapturedImages] = useState<Blob[]>([]);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = useCallback(async () => {
    console.log('[FaceAuth] Starting camera...');
    try {
      setCameraError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        } 
      });
      
      console.log('[FaceAuth] Camera stream acquired');
      streamRef.current = mediaStream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
        console.log('[FaceAuth] Video playback started');
      }
      
      setIsCapturing(true);
    } catch (error: any) {
      const errorMessage = error.name === 'NotAllowedError' 
        ? 'Camera permission denied. Please allow camera access.'
        : error.name === 'NotFoundError'
        ? 'No camera found on this device.'
        : `Unable to access camera: ${error.message}`;
      
      console.error('[FaceAuth] Camera error:', error);
      setCameraError(errorMessage);
      toast.error(errorMessage);
    }
  }, []);

  const stopCamera = useCallback(() => {
    console.log('[FaceAuth] Stopping camera...');
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('[FaceAuth] Track stopped:', track.kind);
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCapturing(false);
  }, []);

  const captureFrame = useCallback(async (): Promise<void> => {
    console.log('[FaceAuth] Capturing frame...');
    if (!videoRef.current || !canvasRef.current) {
      console.error('[FaceAuth] Video or canvas ref not available');
      return;
    }

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) {
      console.error('[FaceAuth] Canvas context not available');
      return;
    }

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    
    // Draw the video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert to blob
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          console.log(`[FaceAuth] Frame captured: ${blob.size} bytes`);
          setCapturedImages(prev => [...prev, blob]);
          
          // Create thumbnail for preview
          const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.6);
          setThumbnails(prev => [...prev, thumbnailUrl]);
          
          toast.success(`Captured ${capturedImages.length + 1} frame(s)`);
        }
        resolve();
      }, 'image/jpeg', 0.9);
    });
  }, [capturedImages.length]);

  const processFaceAuth = useCallback(async () => {
    if (capturedImages.length === 0 || !user) {
      toast.error('Please capture at least one image');
      return;
    }

    console.log(`[FaceAuth] Processing ${capturedImages.length} image(s) for ${mode}...`);
    setIsProcessing(true);
    
    try {
      let success = false;
      let confidence = 0;

      if (mode === 'enroll') {
        console.log('[FaceAuth] Enrolling face with', capturedImages.length, 'images');
        success = await enrollFace(user.id, capturedImages);
        if (success) {
          await updateMethodStatus('face', true);
          console.log('[FaceAuth] Face enrolled successfully');
        }
      } else {
        console.log('[FaceAuth] Verifying face');
        // Use the first captured image for verification
        const result = await verifyFace(user.id, capturedImages[0]);
        success = result.success && (result.match ?? false);
        confidence = result.confidence ?? 0;
        console.log('[FaceAuth] Verification result:', { success, confidence });
      }

      await logAuthAttempt('face', success, confidence);

      if (success) {
        toast.success(`Face ${mode === 'enroll' ? 'enrolled' : 'verified'} successfully`);
        onComplete(true);
        handleClose();
      } else {
        toast.error(`Face ${mode === 'enroll' ? 'enrollment' : 'verification'} failed`);
        onComplete(false);
      }
    } catch (error) {
      console.error('[FaceAuth] Authentication error:', error);
      toast.error('Failed to process face authentication');
      onComplete(false);
    } finally {
      setIsProcessing(false);
    }
  }, [capturedImages, user, mode, enrollFace, verifyFace, updateMethodStatus, logAuthAttempt, onComplete]);

  const retakePhoto = useCallback(() => {
    console.log('[FaceAuth] Retaking photos');
    setCapturedImages([]);
    setThumbnails([]);
    startCamera();
  }, [startCamera]);

  const handleClose = useCallback(() => {
    console.log('[FaceAuth] Closing dialog');
    stopCamera();
    setCapturedImages([]);
    setThumbnails([]);
    setCameraError(null);
    onClose();
  }, [stopCamera, onClose]);

  // Auto-start camera when dialog opens
  useEffect(() => {
    if (isOpen && !isCapturing && capturedImages.length === 0) {
      console.log('[FaceAuth] Dialog opened, auto-starting camera');
      startCamera();
    }
  }, [isOpen, isCapturing, capturedImages.length, startCamera]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('[FaceAuth] Component unmounting, cleaning up');
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md" aria-describedby="face-auth-description">
        <DialogHeader>
          <DialogTitle className="text-center flex items-center justify-center gap-2">
            <Camera className="w-5 h-5 text-primary" />
            {mode === 'enroll' ? 'Enroll Face' : 'Verify Face'}
          </DialogTitle>
          <DialogDescription id="face-auth-description">
            {mode === 'enroll' 
              ? 'Capture 1-5 images of your face from different angles for enrollment'
              : 'Position your face in the camera frame to verify your identity'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {cameraError && (
            <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <p className="text-sm">{cameraError}</p>
            </div>
          )}

          {!isCapturing && capturedImages.length === 0 && (
            <div className="text-center space-y-4">
              <div className="w-32 h-32 mx-auto bg-secondary rounded-full flex items-center justify-center">
                <Camera className="w-16 h-16 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">
                {mode === 'enroll' 
                  ? 'Capture multiple images for better accuracy'
                  : 'Position your face in the camera frame'}
              </p>
              <Button 
                onClick={startCamera}
                className="w-full neon-green bg-neon-green hover:bg-neon-green-glow text-background"
                disabled={!!cameraError}
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
                {capturedImages.length > 0 && (
                  <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-sm">
                    {capturedImages.length} frame{capturedImages.length !== 1 ? 's' : ''} captured
                  </div>
                )}
              </div>

              {/* Thumbnail previews */}
              {thumbnails.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {thumbnails.map((thumb, idx) => (
                    <img 
                      key={idx}
                      src={thumb} 
                      alt={`Capture ${idx + 1}`}
                      className="w-20 h-20 object-cover rounded border-2 border-neon-green"
                    />
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <Button 
                  onClick={captureFrame}
                  disabled={mode === 'enroll' && capturedImages.length >= 5}
                  className="flex-1 neon-green bg-neon-green hover:bg-neon-green-glow text-background"
                >
                  Capture {capturedImages.length > 0 && `(${capturedImages.length}/5)`}
                </Button>
                {capturedImages.length > 0 && (
                  <Button 
                    onClick={() => {
                      stopCamera();
                    }}
                    className="flex-1 bg-primary hover:bg-primary/90"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Done
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  onClick={handleClose}
                  className="px-4 border-muted"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {!isCapturing && capturedImages.length > 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {thumbnails.map((thumb, idx) => (
                  <div key={idx} className="aspect-square bg-black rounded-lg overflow-hidden">
                    <img 
                      src={thumb} 
                      alt={`Captured ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
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
                      {mode === 'enroll' ? 'Enroll Face' : 'Verify Face'}
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={retakePhoto}
                  disabled={isProcessing}
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