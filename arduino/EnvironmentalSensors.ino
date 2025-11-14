/*
 * AuthentiX - Environmental Sensors BLE Module
 * 
 * Uses BUILT-IN sensors of Arduino Nano 33 BLE Sense Rev2:
 * - HTS221: Temperature & Humidity (built-in)
 * - APDS9960: Light & Proximity (built-in)
 * - LSM9DS1: IMU - Accelerometer & Gyroscope (built-in)
 * 
 * NO EXTERNAL WIRING NEEDED!
 * Just upload this code and power the Arduino via USB or battery.
 * The device will automatically broadcast sensor data via Bluetooth.
 */

#include <ArduinoBLE.h>
#include <Arduino_HS300x.h>  // Temperature & Humidity for Rev2
#include <Arduino_APDS9960.h> // Built-in light sensor
#include <Arduino_BMI270_BMM150.h>  // IMU for Rev2 (replaces LSM9DS1)

// No pin definitions needed - all sensors are built-in!

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
  Serial.begin(115200);
  delay(1000); // Wait for serial (optional, works without serial monitor)
  
  Serial.println("AuthentiX Environmental Sensors");
  Serial.println("Using BUILT-IN sensors - No wiring needed!");
  Serial.println("Initializing...");
  
  // Initialize HS300x (Temperature & Humidity) for Rev2
  if (!HS300x.begin()) {
    Serial.println("✗ HS300x initialization failed!");
  } else {
    Serial.println("✓ HS300x (Temp & Humidity) initialized");
  }
  
  // Initialize APDS9960 (Light & Proximity)
  if (!APDS.begin()) {
    Serial.println("✗ APDS9960 initialization failed!");
  } else {
    Serial.println("✓ APDS9960 (Light) initialized");
  }
  
  // Initialize BMI270/BMM150 (IMU) for Rev2
  if (!IMU.begin()) {
    Serial.println("✗ BMI270 initialization failed!");
  } else {
    Serial.println("✓ BMI270 (IMU) initialized");
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
  // Read HS300x - Temperature & Humidity (Rev2)
  float temperature = HS300x.readTemperature();
  float humidity = HS300x.readHumidity();
  
  // Read APDS9960 - Light Intensity
  int lightIntensity = 0;
  while (!APDS.colorAvailable()) {
    delay(5);
  }
  int r, g, b;
  APDS.readColor(r, g, b);
  // Calculate approximate lux from RGB (simple average)
  lightIntensity = (r + g + b) / 3;
  
  // Simulate air quality (0-1023) - not available on built-in sensors
  // You can add external sensor later or use proximity as alternative
  int airQuality = random(80, 150); // Simulated good air quality
  
  // Read LSM9DS1 - IMU Data (built-in)
  float accelX = 0, accelY = 0, accelZ = 0;
  float gyroX = 0, gyroY = 0, gyroZ = 0;
  
  if (IMU.accelerationAvailable()) {
    IMU.readAcceleration(accelX, accelY, accelZ);
  }
  
  if (IMU.gyroscopeAvailable()) {
    IMU.readGyroscope(gyroX, gyroY, gyroZ);
  }
  
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
  lightCharacteristic.writeValue(lightIntensity);
  imuCharacteristic.writeValue(imuJson);
  
  // Debug output
  Serial.println("=== Sensor Data ===");
  Serial.print("Temperature: "); Serial.print(temperature); Serial.println(" °C");
  Serial.print("Humidity: "); Serial.print(humidity); Serial.println(" %");
  Serial.print("Air Quality: "); Serial.print(airQuality); Serial.println(" (simulated)");
  Serial.print("Light: "); Serial.print(lightIntensity); Serial.println(" (RGB avg)");
  Serial.print("IMU: "); Serial.println(imuJson);
  Serial.println("==================");
}
