import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bluetooth, BluetoothConnected, BluetoothSearching, AlertCircle } from 'lucide-react';
import { bleManager, SensorData } from '@/services/bleService';
import { supabaseService } from '@/services/supabaseService';
import { useAuth } from '@/hooks/useAuth';

interface BleConnectorProps {
  onDataUpdate: (data: SensorData) => void;
  onConnectionChange: (connected: boolean) => void;
}

const BleConnector: React.FC<BleConnectorProps> = ({ onDataUpdate, onConnectionChange }) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    // Set up BLE callbacks
    bleManager.getService().onSensorDataUpdate = handleSensorDataUpdate;
    bleManager.getService().onError = handleError;
    bleManager.getService().onConnectionChange = handleConnectionChange;

    // Check initial connection status
    const service = bleManager.getService();
    setIsConnected(service.isConnected);

    return () => {
      // Clean up callbacks
      bleManager.getService().onSensorDataUpdate = null;
      bleManager.getService().onError = null;
      bleManager.getService().onConnectionChange = null;
    };
  }, []);

  const handleSensorDataUpdate = async (data: SensorData) => {
    onDataUpdate(data);
    
    // Save to Supabase if user is authenticated
    if (user) {
      try {
        await supabaseService.saveSensorReading(user.id, data);
      } catch (error) {
        console.error('Error saving sensor data:', error);
      }
    }
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    setIsConnecting(false);
  };

  const handleConnectionChange = (connected: boolean) => {
    setIsConnected(connected);
    setIsConnecting(false);
    onConnectionChange(connected);
    
    if (!connected) {
      setError('Device disconnected');
    } else {
      setError(null);
    }
  };

  const connectToDevice = async () => {
    if (isConnecting) return;
    
    setIsConnecting(true);
    setError(null);
    
    try {
      const success = await bleManager.connect();
      if (!success) {
        setError('Failed to connect to device');
        setIsConnecting(false);
      }
    } catch (err) {
      setError(`Connection error: ${err}`);
      setIsConnecting(false);
    }
  };

  const disconnectDevice = () => {
    bleManager.disconnect();
  };

  const reconnectDevice = async () => {
    setIsConnecting(true);
    setError(null);
    
    try {
      const success = await bleManager.reconnect();
      if (!success) {
        setError('Failed to reconnect to device');
        setIsConnecting(false);
      }
    } catch (err) {
      setError(`Reconnection error: ${err}`);
      setIsConnecting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bluetooth className="h-5 w-5" />
          BLE Device Connection
        </CardTitle>
        <CardDescription>
          Connect to your AuthentiX-Sensors device to receive real-time health monitoring data
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isConnecting ? (
              <BluetoothSearching className="h-4 w-4 animate-pulse text-blue-500" />
            ) : isConnected ? (
              <BluetoothConnected className="h-4 w-4 text-green-500" />
            ) : (
              <Bluetooth className="h-4 w-4 text-gray-500" />
            )}
            <span className="font-medium">
              {isConnecting ? 'Connecting...' : isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          
          <Badge variant={isConnected ? 'default' : isConnecting ? 'secondary' : 'destructive'}>
            {isConnected ? 'Online' : isConnecting ? 'Connecting' : 'Offline'}
          </Badge>
        </div>
        
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-md text-red-700 dark:text-red-300">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}
        
        <div className="text-sm text-muted-foreground">
          <p>Device Name: AuthentiX-Sensors</p>
          <p>Service UUID: 19B10000-E8F2-537E-4F6C-D104768A1214</p>
        </div>
      </CardContent>
      
      <CardFooter className="flex flex-col gap-2">
        {!isConnected ? (
          <Button 
            onClick={connectToDevice} 
            disabled={isConnecting}
            className="w-full"
          >
            {isConnecting ? (
              <>
                <BluetoothSearching className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Bluetooth className="mr-2 h-4 w-4" />
                Connect to Device
              </>
            )}
          </Button>
        ) : (
          <div className="flex gap-2 w-full">
            <Button 
              onClick={disconnectDevice} 
              variant="outline" 
              className="flex-1"
            >
              Disconnect
            </Button>
            <Button 
              onClick={reconnectDevice} 
              disabled={isConnecting}
              className="flex-1"
            >
              {isConnecting ? (
                <>
                  <BluetoothSearching className="mr-2 h-4 w-4 animate-spin" />
                  Reconnecting...
                </>
              ) : (
                'Reconnect'
              )}
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
};

export default BleConnector;