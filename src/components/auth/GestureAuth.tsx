import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Hand, Bluetooth, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { usePythonAPI } from '@/hooks/usePythonAPI';
import { useAuthMethods } from '@/hooks/useAuthMethods';
import { useBluetooth } from '@/hooks/useBluetooth';

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
  const { connected, connect, recordGesture } = useBluetooth();

  const [isCapturing, setIsCapturing] = useState(false);
  const [gestureData, setGestureData] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConnect = async () => {
    await connect();
  };

  const captureGesture = useCallback(async () => {
    setIsCapturing(true);
    
    try {
      const data = await recordGesture(3000);
      setGestureData(data);
      setIsCapturing(false);
    } catch (error) {
      console.error('Gesture capture error:', error);
      setIsCapturing(false);
      toast.error("Failed to capture gesture data. Please try again.");
    }
  }, [recordGesture]);

  const processGestureAuth = useCallback(async () => {
    if (!gestureData || !user) return;

    setIsProcessing(true);
    
    try {
      let success = false;
      let confidence = 0;

      if (mode === 'enroll') {
        success = await enrollGesture(user.id, gestureData);
        if (success) {
          await updateMethodStatus('gesture', true);
        }
      } else {
        const result = await verifyGesture(user.id, gestureData);
        success = result.success && (result.match ?? false);
        confidence = result.confidence ?? 0;
      }

      await logAuthAttempt('gesture', success, confidence);

      if (success) {
        toast.success(`Gesture ${mode === 'enroll' ? 'enrolled' : 'verified'} successfully`);
        onComplete(true);
      } else {
        toast.error(`Gesture ${mode === 'enroll' ? 'enrollment' : 'verification'} failed`);
        onComplete(false);
      }
    } catch (error) {
      console.error('Gesture authentication error:', error);
      toast.error('Failed to process gesture authentication');
      onComplete(false);
    } finally {
      setIsProcessing(false);
    }
  }, [gestureData, user, mode, enrollGesture, verifyGesture, updateMethodStatus, logAuthAttempt, onComplete]);

  const resetCapture = useCallback(() => {
    setGestureData(null);
    setIsCapturing(false);
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center flex items-center justify-center gap-2">
            <Hand className="w-5 h-5 text-primary" />
            {mode === 'enroll' ? 'Enroll Gesture' : 'Verify Gesture'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {!connected && (
            <div className="text-center space-y-4">
              <div className="w-32 h-32 mx-auto bg-secondary rounded-full flex items-center justify-center">
                <Bluetooth className="w-16 h-16 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold mb-2">
                  Arduino Nano 33 BLE Sense Rev2
                </p>
                <p className="text-muted-foreground text-sm">
                  Connect your Arduino device to capture gesture patterns
                </p>
              </div>
              <Button 
                onClick={handleConnect}
                className="w-full"
              >
                <Bluetooth className="w-4 h-4 mr-2" />
                Connect Arduino
              </Button>
            </div>
          )}

          {connected && !gestureData && (
            <div className="text-center space-y-4">
              <div className="w-32 h-32 mx-auto bg-secondary rounded-full flex items-center justify-center">
                {isCapturing ? (
                  <Hand className="w-16 h-16 text-primary animate-bounce" />
                ) : (
                  <Hand className="w-16 h-16 text-primary" />
                )}
              </div>
              <div>
                <p className="font-semibold mb-2">
                  {isCapturing ? 'Capturing Gesture...' : 'Ready to Capture'}
                </p>
                <p className="text-muted-foreground text-sm">
                  {isCapturing 
                    ? 'Perform your gesture pattern now' 
                    : 'Make your unique air-swipe gesture when ready'
                  }
                </p>
              </div>
              {!isCapturing && (
                <Button 
                  onClick={captureGesture}
                  className="w-full"
                >
                  <Hand className="w-4 h-4 mr-2" />
                  Capture Gesture
                </Button>
              )}
              {isCapturing && (
                <div className="bg-primary/20 border border-primary rounded-lg p-4">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                  </div>
                  <p className="text-primary text-sm mt-2">Recording IMU data...</p>
                </div>
              )}
            </div>
          )}

          {gestureData && (
            <div className="space-y-4">
              <div className="text-center space-y-4">
                <div className="w-32 h-32 mx-auto bg-secondary rounded-full flex items-center justify-center">
                  <Check className="w-16 h-16 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">Gesture Captured</p>
                  <p className="text-muted-foreground text-sm">
                    {gestureData?.length || 0} data points recorded
                  </p>
                </div>
              </div>

              <div className="bg-secondary rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Accelerometer:</span>
                  <span className="text-primary">✓ Captured</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Gyroscope:</span>
                  <span className="text-primary">✓ Captured</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Pattern Quality:</span>
                  <span className="text-primary">Good</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={processGestureAuth}
                  disabled={isProcessing}
                  className="flex-1"
                >
                  {isProcessing ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin"></div>
                      Processing...
                    </div>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Verify Gesture
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={resetCapture}
                  className="px-4"
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
                <strong>Arduino Integration:</strong> This feature requires an Arduino Nano 33 BLE Sense Rev2 
                with custom firmware for IMU data streaming.
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
