import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Thermometer, Droplets } from 'lucide-react';
import { SensorData } from '@/hooks/useBluetooth';

interface SensorDisplayProps {
  sensorData: SensorData | null;
}

export const SensorDisplay = ({ sensorData }: SensorDisplayProps) => {
  if (!sensorData) {
    return (
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 text-slate-200">
            <Thermometer className="h-5 w-5 text-slate-400" />
            Environmental Sensors
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-400 text-center py-4">
            🔌 Connect to Arduino to view sensor data
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2 text-slate-200">
          <Thermometer className="h-5 w-5 text-orange-400" />
          Live Sensor Data
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/30">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <Thermometer className="h-5 w-5 text-orange-400" />
            </div>
            <span className="text-sm font-medium text-slate-300">Temperature</span>
          </div>
          <span className="text-2xl font-bold text-orange-300">
            {sensorData.temperature.toFixed(1)}°C
          </span>
        </div>
        
        <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/30">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Droplets className="h-5 w-5 text-blue-400" />
            </div>
            <span className="text-sm font-medium text-slate-300">Humidity</span>
          </div>
          <span className="text-2xl font-bold text-blue-300">
            {sensorData.humidity.toFixed(1)}%
          </span>
        </div>

        <div className="text-xs text-slate-500 text-center pt-2">
          🔄 Last updated: {new Date(sensorData.timestamp).toLocaleTimeString()}
        </div>
      </CardContent>
    </Card>
  );
};
