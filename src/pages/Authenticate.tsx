import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAuthMethods } from '@/hooks/useAuthMethods';
import { useBluetooth } from '@/hooks/useBluetooth';
import { FaceAuth } from '@/components/auth/FaceAuth';
import { VoiceAuth } from '@/components/auth/VoiceAuth';
import { GestureAuth } from '@/components/auth/GestureAuth';
import { PinAuth } from '@/components/auth/PinAuth';
import { SensorDisplay } from '@/components/SensorDisplay';
import { toast } from 'sonner';

type AuthStep = 'face' | 'voice' | 'gesture' | 'pin';

interface StepStatus {
  face: boolean | null;
  voice: boolean | null;
  gesture: boolean | null;
  pin: boolean | null;
}

const Authenticate = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { isMethodEnrolled } = useAuthMethods(user?.id);
  const { connected, sensorData, connect, readSensorData } = useBluetooth();

  const [currentStep, setCurrentStep] = useState<AuthStep>('face');
  const [stepStatus, setStepStatus] = useState<StepStatus>({
    face: null,
    voice: null,
    gesture: null,
    pin: null,
  });
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (connected) {
      const interval = setInterval(() => {
        readSensorData();
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [connected, readSensorData]);

  const startAuthentication = async () => {
    if (!connected) {
      const success = await connect();
      if (!success) {
        toast.error('Please connect to Arduino first');
        return;
      }
    }

    setIsAuthenticating(true);
    setCurrentStep('face');
    setShowModal(true);
  };

  const handleStepComplete = (step: AuthStep, success: boolean) => {
    setStepStatus(prev => ({ ...prev, [step]: success }));
    setShowModal(false);

    if (!success) {
      setIsAuthenticating(false);
      toast.error(`${step} authentication failed`);
      return;
    }

    // Move to next step
    const steps: AuthStep[] = ['face', 'voice', 'gesture', 'pin'];
    const currentIndex = steps.indexOf(step);
    
    if (currentIndex < steps.length - 1) {
      const nextStep = steps[currentIndex + 1];
      setCurrentStep(nextStep);
      setShowModal(true);
    } else {
      // All steps completed
      setIsAuthenticating(false);
      toast.success('Authentication successful!');
      setTimeout(() => navigate('/dashboard'), 1500);
    }
  };

  const getStepIcon = (status: boolean | null) => {
    if (status === null) return <Loader2 className="h-4 w-4 animate-spin" />;
    if (status) return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    return <XCircle className="h-4 w-4 text-red-500" />;
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  const enrolledMethods = ['face', 'voice', 'gesture', 'pin'].filter(m => 
    isMethodEnrolled(m as AuthStep)
  );

  if (enrolledMethods.length < 3) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/10 flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Enrollment Required</CardTitle>
            <CardDescription>
              You need to enroll in at least 3 authentication methods before you can authenticate
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Currently enrolled: {enrolledMethods.length}/4 methods
            </p>
            <Button onClick={() => navigate('/enroll')} className="w-full">
              Complete Enrollment
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/10 p-4">
      <div className="max-w-4xl mx-auto space-y-6 py-8 animate-fade-in">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <Badge variant={connected ? "default" : "secondary"}>
            {connected ? 'Arduino Connected' : 'Arduino Disconnected'}
          </Badge>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Multi-Factor Authentication</CardTitle>
            <CardDescription>
              Complete all authentication steps to verify your identity
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(['face', 'voice', 'gesture', 'pin'] as AuthStep[]).map((step) => (
                <div
                  key={step}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card"
                >
                  <span className="text-sm font-medium capitalize">{step}</span>
                  {getStepIcon(stepStatus[step])}
                </div>
              ))}
            </div>

            <Button
              onClick={startAuthentication}
              disabled={isAuthenticating}
              size="lg"
              className="w-full"
            >
              {isAuthenticating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Authenticating...
                </>
              ) : (
                'Start Authentication'
              )}
            </Button>
          </CardContent>
        </Card>

        <SensorDisplay sensorData={sensorData} />
      </div>

      {/* Authentication Modals */}
      <FaceAuth
        isOpen={showModal && currentStep === 'face'}
        onClose={() => {
          setShowModal(false);
          setIsAuthenticating(false);
        }}
        onComplete={(success) => handleStepComplete('face', success)}
        mode="verify"
      />

      <VoiceAuth
        isOpen={showModal && currentStep === 'voice'}
        onClose={() => {
          setShowModal(false);
          setIsAuthenticating(false);
        }}
        onComplete={(success) => handleStepComplete('voice', success)}
        mode="verify"
      />

      <GestureAuth
        isOpen={showModal && currentStep === 'gesture'}
        onClose={() => {
          setShowModal(false);
          setIsAuthenticating(false);
        }}
        onComplete={(success) => handleStepComplete('gesture', success)}
        mode="verify"
      />

      <PinAuth
        isOpen={showModal && currentStep === 'pin'}
        onClose={() => {
          setShowModal(false);
          setIsAuthenticating(false);
        }}
        onComplete={(success) => handleStepComplete('pin', success)}
        mode="verify"
      />
    </div>
  );
};

export default Authenticate;
