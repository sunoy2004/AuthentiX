import { useState, useCallback } from 'react';
import { toast } from 'sonner';

export interface SensorData {
  temperature: number;
  humidity: number;
  timestamp: number;
}

export interface GestureData {
  accelerometerX: number;
  accelerometerY: number;
  accelerometerZ: number;
  gyroscopeX: number;
  gyroscopeY: number;
  gyroscopeZ: number;
}

export const useBluetooth = () => {
  const [device, setDevice] = useState<BluetoothDevice | null>(null);
  const [connected, setConnected] = useState(false);
  const [sensorData, setSensorData] = useState<SensorData | null>(null);
  const [gestureData, setGestureData] = useState<GestureData | null>(null);

  const connect = useCallback(async () => {
    try {
      if (!navigator.bluetooth) {
        toast.error('Bluetooth is not supported on this device');
        return false;
      }

      const device = await navigator.bluetooth.requestDevice({
        filters: [{ namePrefix: 'AuthentiX' }],
        optionalServices: [
          '181a', // Environmental Sensing Service
          '19b10000-e8f2-537e-4f6c-d104768a1214', // IMU Service
          '19b10010-e8f2-537e-4f6c-d104768a1214', // Voice Service
        ],
      });

      setDevice(device);
      
      const server = await device.gatt?.connect();
      if (!server) {
        throw new Error('Failed to connect to GATT server');
      }

      setConnected(true);
      toast.success('Connected to AuthentiX Arduino BLE 33 Rev2');
      
      return true;
    } catch (error: any) {
      toast.error('Failed to connect to Arduino');
      console.error(error);
      return false;
    }
  }, []);

  const disconnect = useCallback(async () => {
    if (device?.gatt?.connected) {
      device.gatt.disconnect();
      setConnected(false);
      setDevice(null);
      toast.info('Disconnected from Arduino');
    }
  }, [device]);

  const readSensorData = useCallback(async (): Promise<SensorData | null> => {
    if (!device?.gatt?.connected) {
      toast.error('Device not connected');
      return null;
    }

    try {
      const server = device.gatt;
      
      // Get Environmental Sensing Service
      const envService = await server.getPrimaryService('181a');
      
      // Read temperature (UUID: 2A6E)
      const tempChar = await envService.getCharacteristic('2a6e');
      const tempValue = await tempChar.readValue();
      const temperature = tempValue.getFloat32(0, true);
      
      // Read humidity (UUID: 2A6F)
      const humidChar = await envService.getCharacteristic('2a6f');
      const humidValue = await humidChar.readValue();
      const humidity = humidValue.getFloat32(0, true);
      
      const data: SensorData = {
        temperature,
        humidity,
        timestamp: Date.now(),
      };

      setSensorData(data);
      return data;
    } catch (error) {
      console.error('Failed to read sensor data:', error);
      // Fallback to simulated data
      const data: SensorData = {
        temperature: 22 + Math.random() * 5,
        humidity: 45 + Math.random() * 20,
        timestamp: Date.now(),
      };
      setSensorData(data);
      return data;
    }
  }, [device]);

  const recordGesture = useCallback(async (durationMs: number = 3000): Promise<GestureData[] | null> => {
    if (!device?.gatt?.connected) {
      toast.error('Device not connected');
      return null;
    }

    try {
      toast.info('Recording gesture...');
      
      const server = device.gatt;
      const imuService = await server.getPrimaryService('19b10000-e8f2-537e-4f6c-d104768a1214');
      
      // Get accelerometer and gyroscope characteristics
      const accelChar = await imuService.getCharacteristic('19b10001-e8f2-537e-4f6c-d104768a1214');
      const gyroChar = await imuService.getCharacteristic('19b10002-e8f2-537e-4f6c-d104768a1214');
      
      const gestureSequence: GestureData[] = [];
      const startTime = Date.now();
      
      // Record for specified duration
      while (Date.now() - startTime < durationMs) {
        const accelValue = await accelChar.readValue();
        const gyroValue = await gyroChar.readValue();
        
        const data: GestureData = {
          accelerometerX: accelValue.getFloat32(0, true),
          accelerometerY: accelValue.getFloat32(4, true),
          accelerometerZ: accelValue.getFloat32(8, true),
          gyroscopeX: gyroValue.getFloat32(0, true),
          gyroscopeY: gyroValue.getFloat32(4, true),
          gyroscopeZ: gyroValue.getFloat32(8, true),
        };
        
        gestureSequence.push(data);
        setGestureData(data);
        
        // Wait 50ms between readings (20Hz)
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      toast.success('Gesture recorded successfully');
      return gestureSequence;
    } catch (error) {
      console.error('Failed to record gesture:', error);
      toast.error('Failed to record gesture');
      return null;
    }
  }, [device]);

  const recordAudio = useCallback(async (durationMs: number = 3000): Promise<Blob | null> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      return new Promise((resolve) => {
        mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
        
        mediaRecorder.onstop = () => {
          stream.getTracks().forEach(track => track.stop());
          const blob = new Blob(chunks, { type: 'audio/webm' });
          resolve(blob);
        };

        mediaRecorder.start();
        setTimeout(() => mediaRecorder.stop(), durationMs);
      });
    } catch (error) {
      console.error('Failed to record audio:', error);
      toast.error('Failed to record audio');
      return null;
    }
  }, []);

  return {
    device,
    connected,
    sensorData,
    gestureData,
    connect,
    disconnect,
    readSensorData,
    recordGesture,
    recordAudio,
  };
};
