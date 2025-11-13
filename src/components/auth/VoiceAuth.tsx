import React, { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Mic, Square, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { usePythonAPI } from '@/hooks/usePythonAPI';
import { useAuthMethods } from '@/hooks/useAuthMethods';

interface VoiceAuthProps {
  isOpen: boolean;
  onComplete: (success: boolean) => void;
  onClose: () => void;
  mode: 'enroll' | 'verify';
}

export const VoiceAuth: React.FC<VoiceAuthProps> = ({ isOpen, onComplete, onClose, mode }) => {
  const { user } = useAuth();
  const { enrollVoice, verifyVoice } = usePythonAPI();
  const { updateMethodStatus, logAuthAttempt } = useAuthMethods(user?.id);

  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout>();

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      mediaRecorderRef.current = mediaRecorder;

      const chunks: BlobPart[] = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm;codecs=opus' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast.error("Unable to access microphone. Please check permissions.");
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  }, [isRecording]);

  const processVoiceAuth = useCallback(async () => {
    if (!audioBlob || !user) return;

    setIsProcessing(true);
    
    try {
      let success = false;
      let confidence = 0;

      if (mode === 'enroll') {
        success = await enrollVoice(user.id, audioBlob);
        if (success) {
          await updateMethodStatus('voice', true);
        }
      } else {
        const result = await verifyVoice(user.id, audioBlob);
        success = result.success && (result.match ?? false);
        confidence = result.confidence ?? 0;
      }

      await logAuthAttempt('voice', success, confidence);

      if (success) {
        toast.success(`Voice ${mode === 'enroll' ? 'enrolled' : 'verified'} successfully`);
        onComplete(true);
      } else {
        toast.error(`Voice ${mode === 'enroll' ? 'enrollment' : 'verification'} failed`);
        onComplete(false);
      }
    } catch (error) {
      console.error('Voice authentication error:', error);
      toast.error('Failed to process voice authentication');
      onComplete(false);
    } finally {
      setIsProcessing(false);
    }
  }, [audioBlob, user, mode, enrollVoice, verifyVoice, updateMethodStatus, logAuthAttempt, onComplete]);

  const resetRecording = useCallback(() => {
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setRecordingTime(0);
  }, [audioUrl]);

  React.useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center flex items-center justify-center gap-2">
            <Mic className="w-5 h-5 text-primary" />
            {mode === 'enroll' ? 'Enroll Voice' : 'Verify Voice'}
          </DialogTitle>
          <DialogDescription className="text-center">
            {mode === 'enroll' ? 'Record your voice for enrollment' : 'Verify your identity with your voice'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {!isRecording && !audioBlob && (
            <div className="text-center space-y-4">
              <div className="w-32 h-32 mx-auto bg-secondary rounded-full flex items-center justify-center">
                <Mic className="w-16 h-16 text-muted-foreground" />
              </div>
              <div>
                <p className="text-muted-foreground mb-2">
                  Please say the following phrase clearly:
                </p>
                <p className="font-semibold text-lg">
                  "This is my voice for authentication"
                </p>
              </div>
              <Button 
                onClick={startRecording}
                className="w-full"
              >
                Start Recording
              </Button>
            </div>
          )}

          {isRecording && (
            <div className="text-center space-y-4">
              <div className="w-32 h-32 mx-auto bg-secondary rounded-full flex items-center justify-center relative">
                <Mic className="w-16 h-16 text-primary animate-pulse" />
                <div className="absolute inset-0 rounded-full border-4 border-primary animate-ping"></div>
              </div>
              <div>
                <p className="text-muted-foreground mb-2">Recording...</p>
                <p className="font-mono text-2xl">
                  {formatTime(recordingTime)}
                </p>
                <p className="text-primary font-semibold mt-2">
                  "This is my voice for authentication"
                </p>
              </div>
              <Button 
                onClick={stopRecording}
                variant="destructive"
                className="w-full"
              >
                <Square className="w-4 h-4 mr-2" />
                Stop Recording
              </Button>
            </div>
          )}

          {audioBlob && (
            <div className="space-y-4">
              <div className="text-center space-y-4">
                <div className="w-32 h-32 mx-auto bg-secondary rounded-full flex items-center justify-center">
                  <Check className="w-16 h-16 text-primary" />
                </div>
                <div>
                  <p className="text-muted-foreground">Recording completed</p>
                  <p className="font-mono text-lg">
                    Duration: {formatTime(recordingTime)}
                  </p>
                </div>
              </div>

              {audioUrl && (
                <div className="bg-secondary rounded-lg p-4">
                  <audio 
                    controls 
                    src={audioUrl}
                    className="w-full"
                  >
                    Your browser does not support audio playback.
                  </audio>
                </div>
              )}

              <div className="flex gap-2">
                <Button 
                  onClick={processVoiceAuth}
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
                      Verify Voice
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={resetRecording}
                  className="px-4"
                >
                  Retry
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
