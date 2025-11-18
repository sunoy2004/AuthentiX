import { CHARACTERISTIC_UUIDS, BLE_SERVICE_UUID } from '@/lib/constants';

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
  timestamp: Date;
}

export interface BleService {
  device: BluetoothDevice | null;
  server: BluetoothRemoteGATTServer | null;
  service: BluetoothRemoteGATTService | null;
  isConnected: boolean;
  isConnecting: boolean;
  onSensorDataUpdate: ((data: SensorData) => void) | null;
  onError: ((error: string) => void) | null;
  onConnectionChange: ((connected: boolean) => void) | null;
}

class BleManager {
  private bleService: BleService = {
    device: null,
    server: null,
    service: null,
    isConnected: false,
    isConnecting: false,
    onSensorDataUpdate: null,
    onError: null,
    onConnectionChange: null
  };

  private characteristics: Map<string, BluetoothRemoteGATTCharacteristic> = new Map();
  private updateInterval: number | null = null;

  async connect(): Promise<boolean> {
    if (this.bleService.isConnecting) {
      return false;
    }

    this.bleService.isConnecting = true;

    try {
      // Request Bluetooth device
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ name: 'AuthentiX-Sensors' }],
        optionalServices: [BLE_SERVICE_UUID]
      });

      this.bleService.device = device;
      
      // Connect to GATT server
      const server = await device.gatt!.connect();
      this.bleService.server = server;
      
      // Get primary service
      const service = await server.getPrimaryService(BLE_SERVICE_UUID);
      this.bleService.service = service;
      
      // Get all characteristics
      await this.setupCharacteristics();
      
      this.bleService.isConnected = true;
      this.bleService.isConnecting = false;
      
      // Notify connection change
      if (this.bleService.onConnectionChange) {
        this.bleService.onConnectionChange(true);
      }
      
      // Start listening for updates
      this.startSensorUpdates();
      
      // Handle disconnection
      device.addEventListener('gattserverdisconnected', () => {
        this.handleDisconnection();
      });
      
      return true;
    } catch (error) {
      console.error('BLE Connection Error:', error);
      this.bleService.isConnecting = false;
      
      if (this.bleService.onError) {
        this.bleService.onError(`Connection failed: ${error}`);
      }
      
      return false;
    }
  }

  private async setupCharacteristics() {
    if (!this.bleService.service) return;

    try {
      // Get all characteristics
      const tempChar = await this.bleService.service.getCharacteristic(CHARACTERISTIC_UUIDS.TEMPERATURE);
      const humidityChar = await this.bleService.service.getCharacteristic(CHARACTERISTIC_UUIDS.HUMIDITY);
      const airQualityChar = await this.bleService.service.getCharacteristic(CHARACTERISTIC_UUIDS.AIR_QUALITY);
      const lightChar = await this.bleService.service.getCharacteristic(CHARACTERISTIC_UUIDS.LIGHT);
      const imuChar = await this.bleService.service.getCharacteristic(CHARACTERISTIC_UUIDS.IMU);

      this.characteristics.set('temperature', tempChar);
      this.characteristics.set('humidity', humidityChar);
      this.characteristics.set('airQuality', airQualityChar);
      this.characteristics.set('light', lightChar);
      this.characteristics.set('imu', imuChar);

      // Setup notifications for IMU data (most dynamic)
      imuChar.addEventListener('characteristicvaluechanged', () => {
        this.readAllSensorData();
      });
      await imuChar.startNotifications();
    } catch (error) {
      console.error('Error setting up characteristics:', error);
      throw error;
    }
  }

  private async readAllSensorData() {
    if (!this.bleService.isConnected) return;

    try {
      const readings = await Promise.all([
        this.readFloatCharacteristic('temperature'),
        this.readFloatCharacteristic('humidity'),
        this.readIntCharacteristic('airQuality'),
        this.readIntCharacteristic('light'),
        this.readStringCharacteristic('imu')
      ]);

      const sensorData: SensorData = {
        temperature: readings[0],
        humidity: readings[1],
        airQuality: readings[2],
        light: readings[3],
        imu: this.parseImuData(readings[4]),
        timestamp: new Date()
      };

      if (this.bleService.onSensorDataUpdate) {
        this.bleService.onSensorDataUpdate(sensorData);
      }
    } catch (error) {
      console.error('Error reading sensor data:', error);
      if (this.bleService.onError) {
        this.bleService.onError(`Sensor read error: ${error}`);
      }
    }
  }

  private parseImuData(imuString: string): SensorData['imu'] {
    try {
      const imuData = JSON.parse(imuString);
      return {
        ax: imuData.ax || 0,
        ay: imuData.ay || 0,
        az: imuData.az || 0,
        gx: imuData.gx || 0,
        gy: imuData.gy || 0,
        gz: imuData.gz || 0
      };
    } catch (error) {
      console.error('Error parsing IMU data:', error);
      return {
        ax: 0,
        ay: 0,
        az: 0,
        gx: 0,
        gy: 0,
        gz: 0
      };
    }
  }

  private async readFloatCharacteristic(name: string): Promise<number> {
    const characteristic = this.characteristics.get(name);
    if (!characteristic) throw new Error(`Characteristic ${name} not found`);
    
    const value = await characteristic.readValue();
    return value.getFloat32(0, true); // true for little endian
  }

  private async readIntCharacteristic(name: string): Promise<number> {
    const characteristic = this.characteristics.get(name);
    if (!characteristic) throw new Error(`Characteristic ${name} not found`);
    
    const value = await characteristic.readValue();
    return value.getInt32(0, true); // true for little endian
  }

  private async readStringCharacteristic(name: string): Promise<string> {
    const characteristic = this.characteristics.get(name);
    if (!characteristic) throw new Error(`Characteristic ${name} not found`);
    
    const value = await characteristic.readValue();
    return new TextDecoder().decode(value);
  }

  private startSensorUpdates() {
    // Read sensor data every 2 seconds
    this.updateInterval = window.setInterval(() => {
      this.readAllSensorData();
    }, 2000);
  }

  disconnect() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    if (this.bleService.device && this.bleService.device.gatt!.connected) {
      this.bleService.device.gatt!.disconnect();
    }

    this.handleDisconnection();
  }

  private handleDisconnection() {
    this.bleService.isConnected = false;
    this.bleService.isConnecting = false;
    this.characteristics.clear();
    
    if (this.bleService.onConnectionChange) {
      this.bleService.onConnectionChange(false);
    }
  }

  async reconnect(): Promise<boolean> {
    this.disconnect();
    return this.connect();
  }

  getService(): BleService {
    return { ...this.bleService };
  }

  // Method to detect fall based on IMU data
  detectFall(sensorData: SensorData): boolean {
    // Simple fall detection algorithm based on acceleration magnitude
    // In a real implementation, this would be more sophisticated
    const { ax, ay, az } = sensorData.imu;
    const magnitude = Math.sqrt(ax * ax + ay * ay + az * az);
    
    // If acceleration magnitude drops significantly, it might indicate a fall
    // Normal gravity is ~9.8 m/s², so a significant drop would be noticeable
    return magnitude < 1.0; // Threshold for fall detection
  }
}

export const bleManager = new BleManager();