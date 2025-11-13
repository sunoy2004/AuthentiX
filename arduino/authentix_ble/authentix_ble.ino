/*
  AuthentiX - Arduino Nano BLE 33 Rev2 Firmware
  Multi-Modal Authentication with Environmental Sensing
  
  Features:
  - Temperature & Humidity sensing (simulated - add DHT sensor for real data)
  - IMU (Accelerometer + Gyroscope) for gesture recognition
  - BLE communication with React app
  - Voice data passthrough (microphone to BLE)
*/

#include <ArduinoBLE.h>
#include <Arduino_LSM6DSOX.h>

// BLE Service and Characteristics UUIDs
#define DEVICE_NAME "AuthentiX-BLE"

// Environmental Sensing Service (standard BLE service)
BLEService environmentService("181A");
BLEFloatCharacteristic temperatureChar("2A6E", BLERead | BLENotify);
BLEFloatCharacteristic humidityChar("2A6F", BLERead | BLENotify);

// Custom IMU Service for Gesture Recognition
BLEService imuService("19B10000-E8F2-537E-4F6C-D104768A1214");
BLECharacteristic accelChar("19B10001-E8F2-537E-4F6C-D104768A1214", BLERead | BLENotify, 12); // 3 floats (x,y,z)
BLECharacteristic gyroChar("19B10002-E8F2-537E-4F6C-D104768A1214", BLERead | BLENotify, 12);  // 3 floats (x,y,z)

// Custom Voice Service (for audio data)
BLEService voiceService("19B10010-E8F2-537E-4F6C-D104768A1214");
BLECharacteristic voiceDataChar("19B10011-E8F2-537E-4F6C-D104768A1214", BLERead | BLENotify, 512); // Audio chunks

// Sensor data
float temperature = 22.0;
float humidity = 50.0;
float accelX, accelY, accelZ;
float gyroX, gyroY, gyroZ;

// Timing
unsigned long lastSensorUpdate = 0;
unsigned long lastIMUUpdate = 0;
const long sensorInterval = 2000;  // 2 seconds for environmental sensors
const long imuInterval = 50;        // 50ms for IMU (20Hz)

void setup() {
  Serial.begin(115200);
  while (!Serial && millis() < 3000); // Wait up to 3 seconds for Serial
  
  Serial.println("AuthentiX BLE 33 Rev2 Starting...");

  // Initialize IMU
  if (!IMU.begin()) {
    Serial.println("Failed to initialize IMU!");
    while (1);
  }
  Serial.println("IMU initialized");

  // Initialize BLE
  if (!BLE.begin()) {
    Serial.println("Failed to initialize BLE!");
    while (1);
  }
  
  // Set up BLE
  BLE.setLocalName(DEVICE_NAME);
  BLE.setDeviceName(DEVICE_NAME);
  
  // Add services
  BLE.setAdvertisedService(environmentService);
  environmentService.addCharacteristic(temperatureChar);
  environmentService.addCharacteristic(humidityChar);
  BLE.addService(environmentService);
  
  imuService.addCharacteristic(accelChar);
  imuService.addCharacteristic(gyroChar);
  BLE.addService(imuService);
  
  voiceService.addCharacteristic(voiceDataChar);
  BLE.addService(voiceService);
  
  // Set initial values
  temperatureChar.writeValue(temperature);
  humidityChar.writeValue(humidity);
  
  // Start advertising
  BLE.advertise();
  
  Serial.println("BLE peripheral is now advertising");
  Serial.print("Device name: ");
  Serial.println(DEVICE_NAME);
}

void loop() {
  // Wait for BLE central to connect
  BLEDevice central = BLE.central();
  
  if (central) {
    Serial.print("Connected to central: ");
    Serial.println(central.address());
    
    digitalWrite(LED_BUILTIN, HIGH);
    
    while (central.connected()) {
      unsigned long currentMillis = millis();
      
      // Update environmental sensors
      if (currentMillis - lastSensorUpdate >= sensorInterval) {
        lastSensorUpdate = currentMillis;
        updateEnvironmentalSensors();
      }
      
      // Update IMU data
      if (currentMillis - lastIMUUpdate >= imuInterval) {
        lastIMUUpdate = currentMillis;
        updateIMUData();
      }
    }
    
    digitalWrite(LED_BUILTIN, LOW);
    Serial.print("Disconnected from central: ");
    Serial.println(central.address());
  }
}

void updateEnvironmentalSensors() {
  // Simulate temperature and humidity readings
  // Replace with actual sensor readings (e.g., DHT22, SHT31)
  temperature = 20.0 + (random(0, 100) / 10.0); // 20-30°C
  humidity = 40.0 + (random(0, 300) / 10.0);    // 40-70%
  
  temperatureChar.writeValue(temperature);
  humidityChar.writeValue(humidity);
  
  Serial.print("Temperature: ");
  Serial.print(temperature);
  Serial.print("°C, Humidity: ");
  Serial.print(humidity);
  Serial.println("%");
}

void updateIMUData() {
  if (IMU.accelerationAvailable()) {
    IMU.readAcceleration(accelX, accelY, accelZ);
    
    // Pack accelerometer data into byte array
    byte accelData[12];
    memcpy(accelData, &accelX, 4);
    memcpy(accelData + 4, &accelY, 4);
    memcpy(accelData + 8, &accelZ, 4);
    accelChar.writeValue(accelData, 12);
  }
  
  if (IMU.gyroscopeAvailable()) {
    IMU.readGyroscope(gyroX, gyroY, gyroZ);
    
    // Pack gyroscope data into byte array
    byte gyroData[12];
    memcpy(gyroData, &gyroX, 4);
    memcpy(gyroData + 4, &gyroY, 4);
    memcpy(gyroData + 8, &gyroZ, 4);
    gyroChar.writeValue(gyroData, 12);
  }
}
