import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Scan, Mic, Hand, Lock, CheckCircle2, Sparkles, Trophy } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAuthMethods } from '@/hooks/useAuthMethods';
import { EnrollmentCard } from '@/components/EnrollmentCard';
import { FaceAuth } from '@/components/auth/FaceAuth';
import { VoiceAuth } from '@/components/auth/VoiceAuth';
import { GestureAuth } from '@/components/auth/GestureAuth';
import { PinAuth } from '@/components/auth/PinAuth';
import { Progress } from '@/components/ui/progress';

type EnrollmentStep = 'face' | 'voice' | 'gesture' | 'pin' | null;

const Enroll = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { methods, enrolledCount, isMethodEnrolled, refetch } = useAuthMethods(user?.id);
  const [activeStep, setActiveStep] = useState<EnrollmentStep>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  const progress = (enrolledCount / 4) * 100;

  const handleComplete = () => {
    refetch();
    setActiveStep(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
      <div className="max-w-5xl mx-auto space-y-6 py-8 px-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/dashboard')}
            className="text-slate-300 hover:text-white hover:bg-slate-800/50"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          
          {enrolledCount === 4 && (
            <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
              <Trophy className="h-3 w-3 mr-1" />
              Fully Enrolled!
            </Badge>
          )}
        </div>

        <Card className="bg-gradient-to-br from-slate-900/80 to-blue-900/30 border-slate-800 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-lg">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <div>
                <CardTitle className="text-3xl text-slate-100">Enrollment Center</CardTitle>
                <CardDescription className="text-slate-300">
                  Enroll in all authentication methods to secure your account
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-slate-200">Progress</span>
                <span className="text-slate-400">{enrolledCount}/4 methods enrolled</span>
              </div>
              <Progress value={progress} className="h-3 bg-slate-800" />
              <p className="text-xs text-slate-500 text-center pt-1">
                {enrolledCount === 0 && "Get started by enrolling your first authentication method"}
                {enrolledCount > 0 && enrolledCount < 4 && `${4 - enrolledCount} more to go!`}
                {enrolledCount === 4 && "🎉 All methods enrolled! You're all set."}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <EnrollmentCard
                title="Face Recognition"
                description="Enroll your facial biometrics"
                icon={Scan}
                isEnrolled={isMethodEnrolled('face')}
                onEnroll={() => setActiveStep('face')}
              />

              <EnrollmentCard
                title="Voice Authentication"
                description="Record your voice pattern"
                icon={Mic}
                isEnrolled={isMethodEnrolled('voice')}
                onEnroll={() => setActiveStep('voice')}
              />

              <EnrollmentCard
                title="Gesture Recognition"
                description="Perform your unique gesture"
                icon={Hand}
                isEnrolled={isMethodEnrolled('gesture')}
                onEnroll={() => setActiveStep('gesture')}
              />

              <EnrollmentCard
                title="PIN Security"
                description="Set your 4-digit PIN"
                icon={Lock}
                isEnrolled={isMethodEnrolled('pin')}
                onEnroll={() => setActiveStep('pin')}
              />
            </div>

            {enrolledCount === 4 && (
              <div className="flex flex-col items-center gap-4 p-6 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-lg">
                <CheckCircle2 className="h-16 w-16 text-green-400 animate-bounce" />
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-green-300 mb-2">Enrollment Complete!</h3>
                  <p className="text-slate-400 mb-4">All authentication methods are ready. You can now authenticate securely.</p>
                  <Button 
                    size="lg" 
                    onClick={() => navigate('/dashboard')}
                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg shadow-green-500/30"
                  >
                    Go to Dashboard
                    <ArrowLeft className="ml-2 h-5 w-5 rotate-180" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Enrollment Modals */}
      <FaceAuth
        isOpen={activeStep === 'face'}
        onClose={() => setActiveStep(null)}
        onComplete={handleComplete}
        mode="enroll"
      />

      <VoiceAuth
        isOpen={activeStep === 'voice'}
        onClose={() => setActiveStep(null)}
        onComplete={handleComplete}
        mode="enroll"
      />

      <GestureAuth
        isOpen={activeStep === 'gesture'}
        onClose={() => setActiveStep(null)}
        onComplete={handleComplete}
        mode="enroll"
      />

      <PinAuth
        isOpen={activeStep === 'pin'}
        onClose={() => setActiveStep(null)}
        onComplete={handleComplete}
        mode="enroll"
      />
    </div>
  );
};

export default Enroll;
