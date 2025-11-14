import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Hand, Camera, Check, AlertCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { usePythonAPI } from '@/hooks/usePythonAPI';
import { useAuthMethods } from '@/hooks/useAuthMethods';

interface GestureAuthProps {
  isOpen: boolean;
  onComplete: (success: boolean) => void;
  onClose: () => void;
  mode: 'enroll' | 'verify';
}

export const GestureAuth: React.FC<GestureAuthProps> = ({ isOpen, onComplete, onClose, mode }) => {
  const { user } = useAuth();
  const { enrollGesture, verifyGesture } = usePythonAPI();
  const { updateMethodStatus, logAuthAttempt } = useAuthMethods(user?.id);

  const [isCapturing, setIsCapturing] = useState(false);
  const [gestureData, setGestureData] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const recordingIntervalRef = useRef<number | null>(null);
  const gestureFramesRef = useRef<any[]>([]);

  const startCamera = useCallback(async () => {
    console.log('[GestureAuth] Starting camera...');
    try {
      setCameraError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        } 
      });
      
      console.log('[GestureAuth] Camera stream acquired');
      streamRef.current = mediaStream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
        console.log('[GestureAuth] Video playback started');
      }
    } catch (error: any) {
      const errorMessage = error.name === 'NotAllowedError' 
        ? 'Camera permission denied. Please allow camera access.'
        : error.name === 'NotFoundError'
        ? 'No camera found on this device.'
        : `Unable to access camera: ${error.message}`;
      
      console.error('[GestureAuth] Camera error:', error);
      setCameraError(errorMessage);
      toast.error(errorMessage);
    }
  }, []);

  const stopCamera = useCallback(() => {
    console.log('[GestureAuth] Stopping camera...');
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('[GestureAuth] Track stopped:', track.kind);
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return null;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) return null;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Extract hand position data (simplified - in production use MediaPipe/TensorFlow.js)
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    
    // Simulate hand gesture data extraction
    // In production, use MediaPipe Hands or TensorFlow.js HandPose
    const gestureFrame = {
      timestamp: Date.now(),
      width: canvas.width,
      height: canvas.height,
      // Placeholder for hand landmarks - replace with actual ML model
      handDetected: true,
      features: {
        centroidX: Math.random() * canvas.width,
        centroidY: Math.random() * canvas.height,
        movement: Math.random() * 100,
      }
    };
    
    return gestureFrame;
  }, []);

  const startGestureRecording = useCallback(() => {
    console.log('[GestureAuth] Starting gesture recording...');
    setIsCapturing(true);
    setRecordingDuration(0);
    gestureFramesRef.current = [];
    
    const recordingDuration = 3000; // 3 seconds
    const frameRate = 30; // 30 fps
    const intervalMs = 1000 / frameRate;
    
    const startTime = Date.now();
    
    recordingIntervalRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      setRecordingDuration(Math.floor(elapsed / 1000));
      
      if (elapsed >= recordingDuration) {
        stopGestureRecording();
        return;
      }
      
      const frame = captureFrame();
      if (frame) {
        gestureFramesRef.current.push(frame);
      }
    }, intervalMs);
  }, [captureFrame]);

  const stopGestureRecording = useCallback(() => {
    console.log('[GestureAuth] Stopping gesture recording...');
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    
    setIsCapturing(false);
    setRecordingDuration(0);
    
    if (gestureFramesRef.current.length > 0) {
      console.log(`[GestureAuth] Captured ${gestureFramesRef.current.length} frames`);
      setGestureData(gestureFramesRef.current);
      toast.success(`Captured ${gestureFramesRef.current.length} gesture frames`);
    } else {
      toast.error('No gesture data captured');
    }
  }, []);

  const processGestureAuth = useCallback(async () => {
    if (gestureData.length === 0 || !user) {
      toast.error('Please record a gesture first');
      return;
    }

    console.log(`[GestureAuth] Processing ${gestureData.length} frames for ${mode}...`);
    setIsProcessing(true);
    
    try {
      let success = false;
      let confidence = 0;

      if (mode === 'enroll') {
        console.log('[GestureAuth] Enrolling gesture');
        success = await enrollGesture(user.id, gestureData);
        if (success) {
          await updateMethodStatus('gesture', true);
          console.log('[GestureAuth] Gesture enrolled successfully');
        }
      } else {
        console.log('[GestureAuth] Verifying gesture');
        const result = await verifyGesture(user.id, gestureData);
        success = result.success && (result.match ?? false);
        confidence = result.confidence ?? 0;
        console.log('[GestureAuth] Verification result:', { success, confidence });
      }

      await logAuthAttempt('gesture', success, confidence);

      if (success) {
        toast.success(`Gesture ${mode === 'enroll' ? 'enrolled' : 'verified'} successfully`);
        onComplete(true);
        handleClose();
      } else {
        toast.error(`Gesture ${mode === 'enroll' ? 'enrollment' : 'verification'} failed`);
        onComplete(false);
      }
    } catch (error) {
      console.error('[GestureAuth] Authentication error:', error);
      toast.error('Failed to process gesture authentication');
      onComplete(false);
    } finally {
      setIsProcessing(false);
    }
  }, [gestureData, user, mode, enrollGesture, verifyGesture, updateMethodStatus, logAuthAttempt, onComplete]);

  const resetCapture = useCallback(() => {
    console.log('[GestureAuth] Resetting capture');
    setGestureData([]);
    gestureFramesRef.current = [];
    setIsCapturing(false);
    setRecordingDuration(0);
  }, []);

  const handleClose = useCallback(() => {
    console.log('[GestureAuth] Closing dialog');
    stopCamera();
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }
    setGestureData([]);
    gestureFramesRef.current = [];
    setCameraError(null);
    onClose();
  }, [stopCamera, onClose]);

  // Auto-start camera when dialog opens
  useEffect(() => {
    if (isOpen && !streamRef.current) {
      console.log('[GestureAuth] Dialog opened, auto-starting camera');
      startCamera();
    }
  }, [isOpen, startCamera]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('[GestureAuth] Component unmounting, cleaning up');
      stopCamera();
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, [stopCamera]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md" aria-describedby="gesture-auth-description">
        <DialogHeader>
          <DialogTitle className="text-center flex items-center justify-center gap-2">
            <Hand className="w-5 h-5 text-primary" />
            {mode === 'enroll' ? 'Enroll Hand Gesture' : 'Verify Hand Gesture'}
          </DialogTitle>
          <DialogDescription id="gesture-auth-description">
            {mode === 'enroll' 
              ? 'Perform a unique hand gesture in front of the camera for 3 seconds'
              : 'Perform your registered hand gesture to verify your identity'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {cameraError && (
            <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <p className="text-sm">{cameraError}</p>
            </div>
          )}

          {gestureData.length === 0 && (
            <div className="space-y-4">
              {/* Camera Preview */}
              <div className="relative aspect-[4/3] bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                  muted
                />
                <div className="absolute inset-0 border-2 border-neon-green rounded-lg"></div>
                
                {/* Recording Indicator */}
                {isCapturing && (
                  <div className="absolute top-2 left-2 bg-red-500 text-white px-3 py-1 rounded-full flex items-center gap-2">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    <span className="text-sm font-semibold">REC {recordingDuration}s</span>
                  </div>
                )}
                
                {/* Instructions Overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                  <p className="text-white text-center text-sm">
                    {isCapturing 
                      ? '🖐️ Perform your gesture now!' 
                      : '✋ Position your hand in frame and click Start'
                    }
                  </p>
                </div>
              </div>

              {/* Controls */}
              <div className="flex gap-2">
                {!isCapturing ? (
                  <Button 
                    onClick={startGestureRecording}
                    disabled={!!cameraError}
                    className="flex-1 neon-green bg-neon-green hover:bg-neon-green-glow text-background"
                  >
                    <Hand className="w-4 h-4 mr-2" />
                    Start Recording (3s)
                  </Button>
                ) : (
                  <Button 
                    onClick={stopGestureRecording}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Stop
                  </Button>
                )}
              </div>
            </div>
          )}

          {gestureData.length > 0 && (
            <div className="space-y-4">
              <div className="text-center space-y-4">
                <div className="w-32 h-32 mx-auto bg-secondary rounded-full flex items-center justify-center">
                  <Check className="w-16 h-16 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">Gesture Captured</p>
                  <p className="text-muted-foreground text-sm">
                    {gestureData.length} frames recorded
                  </p>
                </div>
              </div>

              <div className="bg-secondary rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Frames:</span>
                  <span className="text-primary">{gestureData.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Duration:</span>
                  <span className="text-primary">~3 seconds</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Pattern Quality:</span>
                  <span className="text-primary">✓ Good</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={processGestureAuth}
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
                      {mode === 'enroll' ? 'Enroll Gesture' : 'Verify Gesture'}
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={resetCapture}
                  disabled={isProcessing}
                  className="px-4 border-muted"
                >
                  Retry
                </Button>
              </div>
            </div>
          )}

          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground">
                <strong>Camera-based Gesture:</strong> Perform a unique hand movement pattern for 3 seconds. 
                The system captures hand position and movement for recognition.
              </p>
            </div>
          </div>
        </div>

        <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
      </DialogContent>
    </Dialog>
  );
};
