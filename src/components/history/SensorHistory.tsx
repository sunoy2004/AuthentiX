import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { supabaseService, SensorReading } from '@/services/supabaseService';
import { useAuth } from '@/hooks/useAuth';

interface ChartDataPoint {
  timestamp: string;
  temperature: number;
  humidity: number;
  airQuality: number;
  light: number;
  acceleration: number;
}

const SensorHistory: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    loadSensorData();
  }, [user, timeRange]);

  const loadSensorData = async () => {
    if (!user) return;
    
    setLoading(true);
    
    try {
      // Get sensor readings based on time range
      const readings = await supabaseService.getSensorReadings(user.id, 100);
      
      // Transform data for charts
      const transformedData = readings.map(reading => ({
        timestamp: new Date(reading.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        temperature: reading.temperature,
        humidity: reading.humidity,
        airQuality: reading.air_quality,
        light: reading.light,
        acceleration: Math.sqrt(
          reading.acceleration_x ** 2 + 
          reading.acceleration_y ** 2 + 
          reading.acceleration_z ** 2
        )
      })).reverse(); // Reverse to show oldest first
      
      setChartData(transformedData);
    } catch (error) {
      console.error('Error loading sensor data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getChartDataByRange = () => {
    // For now, we'll use all data regardless of range
    // In a full implementation, we would filter based on timeRange
    return chartData;
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
        <h2 className="text-2xl font-bold">Sensor History</h2>
        <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">Last 24 Hours</SelectItem>
            <SelectItem value="7d">Last 7 Days</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {chartData.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">No sensor data available</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Temperature Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Temperature Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={getChartDataByRange()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" />
                  <YAxis unit="°C" />
                  <Tooltip 
                    formatter={(value) => [`${value}°C`, 'Temperature']}
                    labelFormatter={(label) => `Time: ${label}`}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="temperature" 
                    stroke="#8884d8" 
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    activeDot={{ r: 6 }}
                    name="Temperature"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Humidity Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Humidity Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={getChartDataByRange()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" />
                  <YAxis unit="%" />
                  <Tooltip 
                    formatter={(value) => [`${value}%`, 'Humidity']}
                    labelFormatter={(label) => `Time: ${label}`}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="humidity" 
                    stroke="#82ca9d" 
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    activeDot={{ r: 6 }}
                    name="Humidity"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Air Quality Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Air Quality Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={getChartDataByRange()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value) => [value, 'Air Quality']}
                    labelFormatter={(label) => `Time: ${label}`}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="airQuality" 
                    stroke="#ffc658" 
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    activeDot={{ r: 6 }}
                    name="Air Quality"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Light Level Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Light Level Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={getChartDataByRange()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value) => [value, 'Light Level']}
                    labelFormatter={(label) => `Time: ${label}`}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="light" 
                    stroke="#ff7300" 
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    activeDot={{ r: 6 }}
                    name="Light Level"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Acceleration Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Acceleration Magnitude Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={getChartDataByRange()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value) => [value, 'Acceleration']}
                    labelFormatter={(label) => `Time: ${label}`}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="acceleration" 
                    stroke="#00ff00" 
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    activeDot={{ r: 6 }}
                    name="Acceleration"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default SensorHistory;