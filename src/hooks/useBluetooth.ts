import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';

// BLE Service and Characteristic UUIDs for Environmental Sensors
const SERVICE_UUID = '19b10000-e8f2-537e-4f6c-d104768a1214';
const TEMP_CHAR_UUID = '19b10001-e8f2-537e-4f6c-d104768a1214';
const HUMIDITY_CHAR_UUID = '19b10002-e8f2-537e-4f6c-d104768a1214';
const AIR_QUALITY_CHAR_UUID = '19b10003-e8f2-537e-4f6c-d104768a1214';
const LIGHT_CHAR_UUID = '19b10004-e8f2-537e-4f6c-d104768a1214';
const IMU_CHAR_UUID = '19b10005-e8f2-537e-4f6c-d104768a1214';

export interface SensorData {
  temperature: number;
  humidity: number;
  airQuality: number;
  light: number;
  imu: {
    ax: number;
    ay: number;
    az: number;
    gx: number;
    gy: number;
    gz: number;
  };
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
  const [connecting, setConnecting] = useState(false);
  const [sensorData, setSensorData] = useState<SensorData | null>(null);
  const [gestureData, setGestureData] = useState<GestureData | null>(null);
  
  const serverRef = useRef<BluetoothRemoteGATTServer | null>(null);
  const characteristicsRef = useRef<{
    temp?: BluetoothRemoteGATTCharacteristic;
    humidity?: BluetoothRemoteGATTCharacteristic;
    airQuality?: BluetoothRemoteGATTCharacteristic;
    light?: BluetoothRemoteGATTCharacteristic;
    imu?: BluetoothRemoteGATTCharacteristic;
  }>({});

  const connect = useCallback(async () => {
    console.log('[useBluetooth] Starting connection...');
    setConnecting(true);
    
    try {
      if (!navigator.bluetooth) {
        toast.error('Bluetooth is not supported on this device');
        return false;
      }

      console.log('[useBluetooth] Requesting device...');
      const bleDevice = await navigator.bluetooth.requestDevice({
        filters: [
          { name: 'AuthentiX-Sensors' },
          { services: [SERVICE_UUID] }
        ],
        optionalServices: [SERVICE_UUID]
      });

      console.log('[useBluetooth] Device selected:', bleDevice.name);
      setDevice(bleDevice);
      
      // Add disconnect listener
      bleDevice.addEventListener('gattserverdisconnected', handleDisconnect);
      
      console.log('[useBluetooth] Connecting to GATT server...');
      const server = await bleDevice.gatt!.connect();
      serverRef.current = server;
      
      console.log('[useBluetooth] Getting service...');
      const service = await server.getPrimaryService(SERVICE_UUID);
      
      // Get all characteristics
      console.log('[useBluetooth] Getting characteristics...');
      const tempChar = await service.getCharacteristic(TEMP_CHAR_UUID);
      const humidityChar = await service.getCharacteristic(HUMIDITY_CHAR_UUID);
      const airQualityChar = await service.getCharacteristic(AIR_QUALITY_CHAR_UUID);
      const lightChar = await service.getCharacteristic(LIGHT_CHAR_UUID);
      const imuChar = await service.getCharacteristic(IMU_CHAR_UUID);
      
      characteristicsRef.current = {
        temp: tempChar,
        humidity: humidityChar,
        airQuality: airQualityChar,
        light: lightChar,
        imu: imuChar
      };
      
      // Start notifications
      console.log('[useBluetooth] Starting notifications...');
      await tempChar.startNotifications();
      await humidityChar.startNotifications();
      await airQualityChar.startNotifications();
      await lightChar.startNotifications();
      await imuChar.startNotifications();
      
      // Add event listeners
      tempChar.addEventListener('characteristicvaluechanged', handleTempChange);
      humidityChar.addEventListener('characteristicvaluechanged', handleHumidityChange);
      airQualityChar.addEventListener('characteristicvaluechanged', handleAirQualityChange);
      lightChar.addEventListener('characteristicvaluechanged', handleLightChange);
      imuChar.addEventListener('characteristicvaluechanged', handleImuChange);

      setConnected(true);
      toast.success('Connected to AuthentiX Environmental Sensors');
      console.log('[useBluetooth] Successfully connected');
      
      return true;
    } catch (error: any) {
      console.error('[useBluetooth] Connection error:', error);
      
      // More detailed error messages
      if (error.name === 'NotFoundError') {
        toast.error('Arduino not found. Make sure it is powered on and nearby.');
      } else if (error.name === 'SecurityError') {
        toast.error('Bluetooth access denied. Check browser permissions.');
      } else if (error.name === 'NetworkError') {
        toast.error('Connection failed. Arduino may be out of range.');
      } else if (error.message?.includes('User cancelled')) {
        toast.info('Connection cancelled');
      } else {
        toast.error(`Failed to connect: ${error.message || 'Unknown error'}`);
      }
      
      return false;
    } finally {
      setConnecting(false);
    }
  }, []);

  const handleDisconnect = useCallback(() => {
    console.log('[useBluetooth] Device disconnected');
    setConnected(false);
    setDevice(null);
    serverRef.current = null;
    characteristicsRef.current = {};
    setSensorData(null);
    toast.info('Disconnected from Arduino');
  }, []);
  
  const handleTempChange = useCallback((event: Event) => {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    const value = target.value!.getFloat32(0, true);
    setSensorData(prev => ({
      temperature: value,
      humidity: prev?.humidity || 0,
      airQuality: prev?.airQuality || 0,
      light: prev?.light || 0,
      imu: prev?.imu || { ax: 0, ay: 0, az: 0, gx: 0, gy: 0, gz: 0 },
      timestamp: Date.now()
    }));
  }, []);
  
  const handleHumidityChange = useCallback((event: Event) => {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    const value = target.value!.getFloat32(0, true);
    setSensorData(prev => ({
      temperature: prev?.temperature || 0,
      humidity: value,
      airQuality: prev?.airQuality || 0,
      light: prev?.light || 0,
      imu: prev?.imu || { ax: 0, ay: 0, az: 0, gx: 0, gy: 0, gz: 0 },
      timestamp: Date.now()
    }));
  }, []);
  
  const handleAirQualityChange = useCallback((event: Event) => {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    const value = target.value!.getInt32(0, true);
    setSensorData(prev => ({
      temperature: prev?.temperature || 0,
      humidity: prev?.humidity || 0,
      airQuality: value,
      light: prev?.light || 0,
      imu: prev?.imu || { ax: 0, ay: 0, az: 0, gx: 0, gy: 0, gz: 0 },
      timestamp: Date.now()
    }));
  }, []);
  
  const handleLightChange = useCallback((event: Event) => {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    const value = target.value!.getInt32(0, true);
    setSensorData(prev => ({
      temperature: prev?.temperature || 0,
      humidity: prev?.humidity || 0,
      airQuality: prev?.airQuality || 0,
      light: value,
      imu: prev?.imu || { ax: 0, ay: 0, az: 0, gx: 0, gy: 0, gz: 0 },
      timestamp: Date.now()
    }));
  }, []);
  
  const handleImuChange = useCallback((event: Event) => {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    const decoder = new TextDecoder('utf-8');
    const jsonString = decoder.decode(target.value!);
    try {
      const imu = JSON.parse(jsonString);
      setSensorData(prev => ({
        temperature: prev?.temperature || 0,
        humidity: prev?.humidity || 0,
        airQuality: prev?.airQuality || 0,
        light: prev?.light || 0,
        imu: imu,
        timestamp: Date.now()
      }));
    } catch (err) {
      console.error('[useBluetooth] Failed to parse IMU data:', err);
    }
  }, []);

  const disconnect = useCallback(async () => {
    console.log('[useBluetooth] Disconnecting...');
    
    if (serverRef.current?.connected) {
      serverRef.current.disconnect();
    }
    
    if (device) {
      device.removeEventListener('gattserverdisconnected', handleDisconnect);
    }
    
    setConnected(false);
    setDevice(null);
    serverRef.current = null;
    characteristicsRef.current = {};
    setSensorData(null);
  }, [device, handleDisconnect]);

  const readSensorData = useCallback(async (): Promise<SensorData | null> => {
    if (!serverRef.current?.connected) {
      toast.error('Device not connected');
      return null;
    }

    try {
      const { temp, humidity, airQuality, light, imu } = characteristicsRef.current;
      
      if (!temp || !humidity || !airQuality || !light || !imu) {
        throw new Error('Characteristics not initialized');
      }
      
      const tempValue = await temp.readValue();
      const humidValue = await humidity.readValue();
      const airValue = await airQuality.readValue();
      const lightValue = await light.readValue();
      const imuValue = await imu.readValue();
      
      const decoder = new TextDecoder('utf-8');
      const imuJson = JSON.parse(decoder.decode(imuValue));
      
      const data: SensorData = {
        temperature: tempValue.getFloat32(0, true),
        humidity: humidValue.getFloat32(0, true),
        airQuality: airValue.getInt32(0, true),
        light: lightValue.getInt32(0, true),
        imu: imuJson,
        timestamp: Date.now(),
      };

      setSensorData(data);
      return data;
    } catch (error) {
      console.error('Failed to read sensor data:', error);
      return null;
    }
  }, []);

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
    connecting,
    sensorData,
    gestureData,
    connect,
    disconnect,
    readSensorData,
    recordGesture,
    recordAudio,
  };
};
