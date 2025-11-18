import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Bell, CheckCircle, XCircle, Clock } from 'lucide-react';
import { supabaseService } from '@/services/supabaseService';
import { useAuth } from '@/hooks/useAuth';

interface Alert {
  id: string;
  type: 'fall' | 'health' | 'device';
  severity: 'low' | 'medium' | 'high';
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  patientName?: string;
}

const CaregiverAlerts: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    loadAlerts();
    
    // Set up real-time subscription for alerts
    if (user) {
      const subscription = supabaseService.subscribeToSensorReadings(user.id, (payload) => {
        // Handle real-time alert updates
        loadAlerts();
      });
      
      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user]);

  const loadAlerts = async () => {
    if (!user) return;
    
    try {
      // Get recent fall detections as alerts
      const fallDetections = await supabaseService.getRecentFallDetections(user.id, 24);
      
      const alertData: Alert[] = fallDetections.map(detection => ({
        id: detection.id || '',
        type: 'fall',
        severity: 'high',
        message: 'Fall detected by patient device',
        timestamp: new Date(detection.recorded_at),
        acknowledged: false,
        patientName: 'Patient' // In a real app, this would come from the patient's profile
      }));
      
      // Get recent authentication logs as alerts
      const authLogs = await supabaseService.getAuthenticationLogs(user.id);
      
      const authAlerts: Alert[] = authLogs
        .filter(log => !log.success)
        .slice(0, 5)
        .map(log => ({
          id: log.id,
          type: 'health',
          severity: log.confidence_score && log.confidence_score < 0.5 ? 'high' : 'medium',
          message: `Authentication failed (${log.method_type})`,
          timestamp: new Date(log.created_at),
          acknowledged: false
        }));
      
      // Combine and sort alerts
      const allAlerts = [...alertData, ...authAlerts].sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
      );
      
      setAlerts(allAlerts);
    } catch (error) {
      console.error('Error loading alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    // In a real implementation, we would update the alert status in the database
    setAlerts(alerts.map(alert => 
      alert.id === alertId ? { ...alert, acknowledged: true } : alert
    ));
  };

  const acknowledgeAllAlerts = () => {
    setAlerts(alerts.map(alert => ({ ...alert, acknowledged: true })));
  };

  const getSeverityColor = (severity: Alert['severity']) => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'warning';
      default: return 'default';
    }
  };

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'fall': return <AlertTriangle className="h-4 w-4" />;
      case 'health': return <Bell className="h-4 w-4" />;
      case 'device': return <Bell className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Caregiver Alerts</h2>
          <p className="text-muted-foreground">Monitor patient health and device status</p>
        </div>
        {alerts.filter(a => !a.acknowledged).length > 0 && (
          <Button onClick={acknowledgeAllAlerts} variant="outline">
            Acknowledge All
          </Button>
        )}
      </div>

      {alerts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Active Alerts</h3>
            <p className="text-muted-foreground">
              All systems are functioning normally
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => (
            <Card 
              key={alert.id} 
              className={alert.acknowledged ? 'opacity-75' : ''}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-full ${
                    alert.severity === 'high' ? 'bg-red-100 dark:bg-red-900/30' :
                    alert.severity === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                    'bg-blue-100 dark:bg-blue-900/30'
                  }`}>
                    {getAlertIcon(alert.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium truncate">{alert.message}</h3>
                      {!alert.acknowledged && (
                        <Badge variant={getSeverityColor(alert.severity) as any}>
                          {alert.severity.toUpperCase()}
                        </Badge>
                      )}
                    </div>
                    
                    {alert.patientName && (
                      <p className="text-sm text-muted-foreground mb-2">
                        Patient: {alert.patientName}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatTimeAgo(alert.timestamp)}</span>
                      </div>
                      
                      {alert.acknowledged && (
                        <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                          <CheckCircle className="h-3 w-3" />
                          <span>Acknowledged</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {!alert.acknowledged && (
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => acknowledgeAlert(alert.id)}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default CaregiverAlerts;