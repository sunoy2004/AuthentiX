/*
 * AuthentiX - Environmental Sensors BLE Module
 * 
 * Sensors:
 * - DHT22: Temperature & Humidity
 * - MQ135: Air Quality (analog)
 * - BH1750: Light Intensity (I2C)
 * - MPU6050: IMU - Accelerometer & Gyroscope (I2C)
 * 
 * Compatible with: Arduino Nano 33 BLE Sense Rev2 or similar BLE-enabled boards
 */

#include <ArduinoBLE.h>
#include <DHT.h>
#include <Wire.h>
#include <BH1750.h>
#include <MPU6050.h>

// Pin Definitions
#define DHT_PIN 2
#define DHT_TYPE DHT22
#define MQ135_PIN A0

// Sensor Objects
DHT dht(DHT_PIN, DHT_TYPE);
BH1750 lightMeter;
MPU6050 mpu;

// BLE Service and Characteristics
BLEService sensorService("19B10000-E8F2-537E-4F6C-D104768A1214");

// Temperature Characteristic (Float)
BLEFloatCharacteristic tempCharacteristic("19B10001-E8F2-537E-4F6C-D104768A1214", BLERead | BLENotify);

// Humidity Characteristic (Float)
BLEFloatCharacteristic humidityCharacteristic("19B10002-E8F2-537E-4F6C-D104768A1214", BLERead | BLENotify);

// Air Quality Characteristic (Int)
BLEIntCharacteristic airQualityCharacteristic("19B10003-E8F2-537E-4F6C-D104768A1214", BLERead | BLENotify);

// Light Intensity Characteristic (Int - lux)
BLEIntCharacteristic lightCharacteristic("19B10004-E8F2-537E-4F6C-D104768A1214", BLERead | BLENotify);

// IMU Data Characteristic (String - JSON format)
BLEStringCharacteristic imuCharacteristic("19B10005-E8F2-537E-4F6C-D104768A1214", BLERead | BLENotify, 128);

// Sensor data update interval (milliseconds)
const unsigned long UPDATE_INTERVAL = 2000; // 2 seconds
unsigned long lastUpdateTime = 0;

void setup() {
  Serial.begin(9600);
  while (!Serial);
  
  Serial.println("AuthentiX Environmental Sensors");
  Serial.println("Initializing...");
  
  // Initialize I2C
  Wire.begin();
  
  // Initialize DHT22
  dht.begin();
  Serial.println("✓ DHT22 initialized");
  
  // Initialize BH1750 Light Sensor
  if (lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE)) {
    Serial.println("✓ BH1750 initialized");
  } else {
    Serial.println("✗ BH1750 initialization failed!");
  }
  
  // Initialize MPU6050 IMU
  mpu.initialize();
  if (mpu.testConnection()) {
    Serial.println("✓ MPU6050 initialized");
    mpu.setFullScaleAccelRange(MPU6050_ACCEL_FS_2);
    mpu.setFullScaleGyroRange(MPU6050_GYRO_FS_250);
  } else {
    Serial.println("✗ MPU6050 initialization failed!");
  }
  
  // Initialize BLE
  if (!BLE.begin()) {
    Serial.println("✗ Starting BLE failed!");
    while (1);
  }
  
  // Set BLE device name
  BLE.setLocalName("AuthentiX-Sensors");
  BLE.setDeviceName("AuthentiX Environmental Sensors");
  
  // Set advertised service
  BLE.setAdvertisedService(sensorService);
  
  // Add characteristics to service
  sensorService.addCharacteristic(tempCharacteristic);
  sensorService.addCharacteristic(humidityCharacteristic);
  sensorService.addCharacteristic(airQualityCharacteristic);
  sensorService.addCharacteristic(lightCharacteristic);
  sensorService.addCharacteristic(imuCharacteristic);
  
  // Add service
  BLE.addService(sensorService);
  
  // Set initial values
  tempCharacteristic.writeValue(0.0);
  humidityCharacteristic.writeValue(0.0);
  airQualityCharacteristic.writeValue(0);
  lightCharacteristic.writeValue(0);
  imuCharacteristic.writeValue("{}");
  
  // Start advertising
  BLE.advertise();
  
  Serial.println("✓ BLE initialized");
  Serial.println("Bluetooth device active, waiting for connections...");
  Serial.println("Device Name: AuthentiX-Sensors");
  Serial.println("Service UUID: 19B10000-E8F2-537E-4F6C-D104768A1214");
}

void loop() {
  // Wait for BLE connection
  BLEDevice central = BLE.central();
  
  if (central) {
    Serial.print("Connected to central: ");
    Serial.println(central.address());
    
    // While connected, update sensor data
    while (central.connected()) {
      unsigned long currentTime = millis();
      
      if (currentTime - lastUpdateTime >= UPDATE_INTERVAL) {
        updateSensorData();
        lastUpdateTime = currentTime;
      }
    }
    
    Serial.print("Disconnected from central: ");
    Serial.println(central.address());
  }
}

void updateSensorData() {
  // Read DHT22 - Temperature & Humidity
  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();
  
  if (isnan(temperature) || isnan(humidity)) {
    Serial.println("✗ Failed to read from DHT sensor!");
    temperature = 0.0;
    humidity = 0.0;
  }
  
  // Read MQ135 - Air Quality (0-1023)
  int airQuality = analogRead(MQ135_PIN);
  
  // Read BH1750 - Light Intensity (lux)
  uint16_t lux = lightMeter.readLightLevel();
  
  // Read MPU6050 - IMU Data
  int16_t ax, ay, az, gx, gy, gz;
  mpu.getMotion6(&ax, &ay, &az, &gx, &gy, &gz);
  
  // Convert IMU raw values to readable units
  float accelX = ax / 16384.0; // ±2g range
  float accelY = ay / 16384.0;
  float accelZ = az / 16384.0;
  float gyroX = gx / 131.0;    // ±250°/s range
  float gyroY = gy / 131.0;
  float gyroZ = gz / 131.0;
  
  // Create IMU JSON string
  String imuJson = "{";
  imuJson += "\"ax\":" + String(accelX, 3) + ",";
  imuJson += "\"ay\":" + String(accelY, 3) + ",";
  imuJson += "\"az\":" + String(accelZ, 3) + ",";
  imuJson += "\"gx\":" + String(gyroX, 2) + ",";
  imuJson += "\"gy\":" + String(gyroY, 2) + ",";
  imuJson += "\"gz\":" + String(gyroZ, 2);
  imuJson += "}";
  
  // Update BLE characteristics
  tempCharacteristic.writeValue(temperature);
  humidityCharacteristic.writeValue(humidity);
  airQualityCharacteristic.writeValue(airQuality);
  lightCharacteristic.writeValue(lux);
  imuCharacteristic.writeValue(imuJson);
  
  // Debug output
  Serial.println("=== Sensor Data ===");
  Serial.print("Temperature: "); Serial.print(temperature); Serial.println(" °C");
  Serial.print("Humidity: "); Serial.print(humidity); Serial.println(" %");
  Serial.print("Air Quality: "); Serial.println(airQuality);
  Serial.print("Light: "); Serial.print(lux); Serial.println(" lux");
  Serial.print("IMU: "); Serial.println(imuJson);
  Serial.println("==================");
}
