import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, UserPlus, LogIn, Fingerprint, Mic, Waves, Lock, Thermometer, Sparkles, ArrowRight, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';

const Home = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 overflow-hidden">
      {/* Animated background effect */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_50%)] animate-pulse"></div>
      
      <div className="relative z-10">
        {/* Hero Section */}
        <div className="container mx-auto px-4 py-12 md:py-20">
          <div className="text-center space-y-8 animate-fade-in">
            {/* Logo */}
            <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full backdrop-blur-sm border border-blue-500/30 shadow-2xl shadow-blue-500/20 hover:scale-110 transition-transform duration-300">
              <Shield className="h-16 w-16 text-blue-400 animate-pulse" />
            </div>
            
            {/* Title */}
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-3">
                <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent animate-gradient">
                  AuthentiX
                </h1>
                <Sparkles className="h-10 w-10 text-yellow-400 animate-bounce" />
              </div>
              <p className="text-xl md:text-2xl text-slate-300 max-w-3xl mx-auto font-light">
                Next-Generation Multi-Modal Biometric Authentication
              </p>
            </div>
            
            {/* Badges */}
            <div className="flex flex-wrap gap-2 justify-center pt-2">
              <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 hover:bg-blue-500/30 transition-colors">
                <Zap className="h-3 w-3 mr-1" />
                FAISS-Powered
              </Badge>
              <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 hover:bg-purple-500/30 transition-colors">
                <Mic className="h-3 w-3 mr-1" />
                Voice Recognition
              </Badge>
              <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/30 hover:bg-orange-500/30 transition-colors">
                <Waves className="h-3 w-3 mr-1" />
                Gesture Auth
              </Badge>
              <Badge className="bg-green-500/20 text-green-300 border-green-500/30 hover:bg-green-500/30 transition-colors">
                <Thermometer className="h-3 w-3 mr-1" />
                IoT Sensors
              </Badge>
            </div>
          </div>

          {/* Action Cards */}
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mt-12">
            <Card 
              className="bg-slate-900/50 border-slate-800 hover:border-green-500/50 transition-all duration-300 cursor-pointer group backdrop-blur-sm hover:shadow-2xl hover:shadow-green-500/20 hover:-translate-y-2"
              onClick={() => navigate('/auth?mode=signup')}
            >
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg group-hover:scale-110 transition-transform shadow-lg">
                    <UserPlus className="h-8 w-8 text-white" />
                  </div>
                  <div className="text-left">
                    <CardTitle className="text-slate-100 text-xl group-hover:text-green-400 transition-colors">New User</CardTitle>
                    <CardDescription className="text-slate-400">Create account & enroll biometrics</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button 
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg shadow-green-500/30 transition-all group-hover:scale-105" 
                  size="lg"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('/auth?mode=signup');
                  }}
                >
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </CardContent>
            </Card>

            <Card 
              className="bg-slate-900/50 border-slate-800 hover:border-blue-500/50 transition-all duration-300 cursor-pointer group backdrop-blur-sm hover:shadow-2xl hover:shadow-blue-500/20 hover:-translate-y-2"
              onClick={() => navigate('/auth?mode=login')}
            >
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg group-hover:scale-110 transition-transform shadow-lg">
                    <LogIn className="h-8 w-8 text-white" />
                  </div>
                  <div className="text-left">
                    <CardTitle className="text-slate-100 text-xl group-hover:text-blue-400 transition-colors">Existing User</CardTitle>
                    <CardDescription className="text-slate-400">Sign in to authenticate</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button 
                  className="w-full border-blue-500/50 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 hover:border-blue-400 transition-all group-hover:scale-105" 
                  variant="outline" 
                  size="lg"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('/auth?mode=login');
                  }}
                >
                  Sign In
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Features */}
          <Card className="max-w-5xl mx-auto mt-12 bg-gradient-to-br from-slate-900/80 to-blue-900/30 border-slate-800 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-center text-2xl text-slate-100">🔐 Authentication Methods</CardTitle>
              <CardDescription className="text-center text-slate-300">Four layers of security, seamlessly integrated</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Face Recognition', icon: <Fingerprint className="h-8 w-8" />, gradient: 'from-blue-500 to-cyan-500', desc: 'FAISS ML' },
                  { label: 'Voice ID', icon: <Mic className="h-8 w-8" />, gradient: 'from-purple-500 to-pink-500', desc: 'MFCC Analysis' },
                  { label: 'Gesture Auth', icon: <Waves className="h-8 w-8" />, gradient: 'from-orange-500 to-red-500', desc: 'IMU Sensors' },
                  { label: 'PIN Security', icon: <Lock className="h-8 w-8" />, gradient: 'from-green-500 to-emerald-500', desc: 'SHA-256' },
                ].map((feature, index) => (
                  <div 
                    key={index} 
                    className="text-center p-6 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-slate-600 transition-all duration-300 group hover:scale-105 hover:shadow-xl cursor-pointer"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className={`inline-flex p-3 bg-gradient-to-br ${feature.gradient} rounded-lg mb-3 group-hover:scale-110 transition-transform shadow-lg`}>
                      <div className="text-white">
                        {feature.icon}
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">{feature.label}</div>
                    <div className="text-xs text-slate-500 mt-1">{feature.desc}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Tech Stack */}
          <div className="text-center space-y-4 pt-8 pb-12">
            <p className="text-slate-400 text-sm">Powered by cutting-edge technology</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {['Python FastAPI', 'React + TypeScript', 'Supabase', 'Arduino BLE', 'WebBluetooth'].map((tech, i) => (
                <Badge key={i} variant="outline" className="border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300 transition-colors">
                  {tech}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
