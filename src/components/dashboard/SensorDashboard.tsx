import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Thermometer, Droplets, Sun, Activity } from 'lucide-react';
import { SensorData } from '@/services/bleService';
import { supabaseService } from '@/services/supabaseService';
import { useAuth } from '@/hooks/useAuth';

interface FallDetectionAlert {
  id: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high';
}

const SensorDashboard: React.FC = () => {
  const [sensorData, setSensorData] = useState<SensorData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [fallAlerts, setFallAlerts] = useState<FallDetectionAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    // Load recent fall detections
    loadFallDetections();
    
    // Set up real-time subscription for sensor data
    if (user) {
      const subscription = supabaseService.subscribeToSensorReadings(user.id, (payload) => {
        // Handle real-time sensor data updates
        console.log('Real-time sensor data:', payload);
      });
      
      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user]);

  const loadFallDetections = async () => {
    if (!user) return;
    
    try {
      const fallDetections = await supabaseService.getRecentFallDetections(user.id, 24);
      const alerts = fallDetections.map(detection => ({
        id: detection.id || '',
        timestamp: new Date(detection.recorded_at),
        severity: 'high' as const
      }));
      setFallAlerts(alerts);
    } catch (error) {
      console.error('Error loading fall detections:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getTemperatureStatus = (temp: number) => {
    if (temp < 35) return { status: 'Low', variant: 'destructive' };
    if (temp > 37.5) return { status: 'High', variant: 'destructive' };
    return { status: 'Normal', variant: 'default' };
  };

  const getHumidityStatus = (humidity: number) => {
    if (humidity < 30) return { status: 'Low', variant: 'destructive' };
    if (humidity > 60) return { status: 'High', variant: 'destructive' };
    return { status: 'Normal', variant: 'default' };
  };

  const getAirQualityStatus = (quality: number) => {
    if (quality > 200) return { status: 'Poor', variant: 'destructive' };
    if (quality > 150) return { status: 'Fair', variant: 'warning' };
    return { status: 'Good', variant: 'default' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Health Monitoring Dashboard</h2>
        <Badge variant={isConnected ? "default" : "destructive"}>
          {isConnected ? "Connected" : "Disconnected"}
        </Badge>
      </div>

      {/* Sensor Data Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Temperature */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Temperature</CardTitle>
            <Thermometer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sensorData ? `${sensorData.temperature.toFixed(1)}°C` : '--°C'}
            </div>
            {sensorData && (
              <Badge variant={getTemperatureStatus(sensorData.temperature).variant as any}>
                {getTemperatureStatus(sensorData.temperature).status}
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* Humidity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Humidity</CardTitle>
            <Droplets className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sensorData ? `${sensorData.humidity.toFixed(1)}%` : '--%'}
            </div>
            {sensorData && (
              <Badge variant={getHumidityStatus(sensorData.humidity).variant as any}>
                {getHumidityStatus(sensorData.humidity).status}
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* Air Quality */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Air Quality</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sensorData ? sensorData.airQuality : '--'}
            </div>
            {sensorData && (
              <Badge variant={getAirQualityStatus(sensorData.airQuality).variant as any}>
                {getAirQualityStatus(sensorData.airQuality).status}
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* Light */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Light Level</CardTitle>
            <Sun className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sensorData ? `${sensorData.light}` : '--'}
            </div>
            <p className="text-xs text-muted-foreground">
              Lux
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Fall Detection Alerts */}
      {fallAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Recent Fall Detections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {fallAlerts.slice(0, 5).map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <span>Fall detected</span>
                  </div>
                  <Badge variant="destructive">{formatTimestamp(alert.timestamp)}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* IMU Data Visualization */}
      {sensorData && (
        <Card>
          <CardHeader>
            <CardTitle>Inertial Measurement Unit (IMU)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium">Acceleration (m/s²)</h4>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>X:</span>
                    <span className="font-mono">{sensorData.imu.ax.toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Y:</span>
                    <span className="font-mono">{sensorData.imu.ay.toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Z:</span>
                    <span className="font-mono">{sensorData.imu.az.toFixed(3)}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">Gyroscope (°/s)</h4>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>X:</span>
                    <span className="font-mono">{sensorData.imu.gx.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Y:</span>
                    <span className="font-mono">{sensorData.imu.gy.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Z:</span>
                    <span className="font-mono">{sensorData.imu.gz.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">Status</h4>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>Magnitude:</span>
                    <span className="font-mono">
                      {Math.sqrt(
                        sensorData.imu.ax ** 2 + 
                        sensorData.imu.ay ** 2 + 
                        sensorData.imu.az ** 2
                      ).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Fall Detected:</span>
                    <span className="font-mono">
                      {Math.sqrt(
                        sensorData.imu.ax ** 2 + 
                        sensorData.imu.ay ** 2 + 
                        sensorData.imu.az ** 2
                      ) < 1.0 ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Last Updated */}
      {sensorData && (
        <div className="text-center text-sm text-muted-foreground">
          Last updated: {formatTimestamp(sensorData.timestamp)}
        </div>
      )}
    </div>
  );
};

export default SensorDashboard;