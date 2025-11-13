import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LogOut, Shield, UserPlus, CheckCircle2, AlertCircle, Bluetooth, BluetoothConnected, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAuthMethods } from '@/hooks/useAuthMethods';
import { useBluetooth } from '@/hooks/useBluetooth';
import { SensorDisplay } from '@/components/SensorDisplay';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const { methods, enrolledCount, loading: methodsLoading } = useAuthMethods(user?.id);
  const { connected, sensorData, connect, readSensorData } = useBluetooth();

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

  if (loading || methodsLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  const enrollmentComplete = enrolledCount >= 3;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
      <div className="max-w-6xl mx-auto space-y-6 py-8 px-4 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full shadow-lg">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-100">Dashboard</h1>
              <p className="text-slate-400">Welcome back, {user.email?.split('@')[0]}!</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            onClick={signOut}
            className="border-red-500/50 text-red-300 hover:bg-red-500/10 hover:text-red-200"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>

        {/* Status Card */}
        <Card className="bg-gradient-to-br from-slate-900/80 to-blue-900/30 border-slate-800 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <CardTitle className="text-slate-100 text-2xl">🔒 Authentication Status</CardTitle>
                <CardDescription className="text-slate-300">
                  {enrollmentComplete 
                    ? 'Your account is fully secured with multi-factor authentication'
                    : 'Complete enrollment to unlock all security features'}
                </CardDescription>
              </div>
              {enrollmentComplete ? (
                <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-base px-4 py-2">
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  Fully Secured
                </Badge>
              ) : (
                <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 text-base px-4 py-2">
                  <AlertCircle className="h-5 w-5 mr-2" />
                  Setup Required
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-blue-400" />
                  Enrolled Methods
                </h3>
                <div className="space-y-2">
                  {methods.map((method) => (
                    <div
                      key={method.method_type}
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-colors"
                    >
                      <span className="capitalize text-slate-300 font-medium">{method.method_type}</span>
                      {method.is_enrolled ? (
                        <CheckCircle2 className="h-5 w-5 text-green-400" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-slate-600" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-200">Arduino Sensors</h3>
                  {connected ? (
                    <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                      <BluetoothConnected className="h-3 w-3 mr-1" />
                      Connected
                    </Badge>
                  ) : (
                    <Badge className="bg-slate-700/50 text-slate-400 border-slate-600">
                      <Bluetooth className="h-3 w-3 mr-1" />
                      Disconnected
                    </Badge>
                  )}
                </div>
                <SensorDisplay sensorData={sensorData} />
                {!connected && (
                  <Button 
                    onClick={connect} 
                    variant="outline" 
                    className="w-full border-blue-500/50 text-blue-300 hover:bg-blue-500/10"
                  >
                    <Bluetooth className="h-4 w-4 mr-2" />
                    Connect Arduino BLE
                  </Button>
                )}
              </div>
            </div>

            <div className="flex gap-4 flex-wrap">
              {!enrollmentComplete ? (
                <Button 
                  onClick={() => navigate('/enroll')} 
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg shadow-blue-500/30"
                  size="lg"
                >
                  <UserPlus className="h-5 w-5 mr-2" />
                  Complete Enrollment ({enrolledCount}/4)
                </Button>
              ) : (
                <Button 
                  onClick={() => navigate('/authenticate')} 
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg shadow-green-500/30"
                  size="lg"
                >
                  <Shield className="h-5 w-5 mr-2" />
                  Authenticate Now
                </Button>
              )}
              
              <Button 
                onClick={() => navigate('/enroll')} 
                variant="outline"
                className="border-slate-700 text-slate-300 hover:bg-slate-800/50"
                size="lg"
              >
                Manage Methods
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* User Info Card */}
        <Card className="bg-gradient-to-br from-slate-900/80 to-blue-900/30 border-slate-800 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-slate-100">👤 Account Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center p-3 rounded-lg bg-slate-900/50 border border-slate-800">
              <span className="text-slate-400">Email</span>
              <span className="font-medium text-slate-200">{user.email}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-slate-900/50 border border-slate-800">
              <span className="text-slate-400">User ID</span>
              <span className="font-mono text-sm text-slate-200">{user.id.slice(0, 8)}...</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-slate-900/50 border border-slate-800">
              <span className="text-slate-400">Account Created</span>
              <span className="font-medium text-slate-200">
                {new Date(user.created_at).toLocaleDateString()}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
