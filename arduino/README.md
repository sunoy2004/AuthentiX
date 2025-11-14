# Arduino Environmental Sensors Setup

## Hardware Required

- **Arduino Nano 33 BLE Sense Rev2** (or compatible BLE board)
- **DHT22** - Temperature & Humidity Sensor
- **MQ135** - Air Quality Sensor
- **BH1750** - Light Intensity Sensor (I2C)
- **MPU6050** - IMU Accelerometer/Gyroscope (I2C)
- Breadboard and jumper wires

## Wiring Diagram

### DHT22 (Temperature & Humidity)
- VCC → 5V
- GND → GND
- DATA → Digital Pin 2

### MQ135 (Air Quality)
- VCC → 5V
- GND → GND
- AOUT → Analog Pin A0

### BH1750 (Light Sensor - I2C)
- VCC → 3.3V
- GND → GND
- SCL → SCL (A5)
- SDA → SDA (A4)

### MPU6050 (IMU - I2C)
- VCC → 3.3V
- GND → GND
- SCL → SCL (A5) - shared with BH1750
- SDA → SDA (A4) - shared with BH1750

## Arduino IDE Setup

### 1. Install Arduino Libraries

Open Arduino IDE → Tools → Manage Libraries, then install:

- **ArduinoBLE** (by Arduino)
- **DHT sensor library** (by Adafruit)
- **Adafruit Unified Sensor** (dependency for DHT)
- **BH1750** (by Christopher Laws)
- **MPU6050** (by Electronic Cats or Jeff Rowberg)

### 2. Upload the Sketch

1. Open `EnvironmentalSensors.ino` in Arduino IDE
2. Select your board: Tools → Board → Arduino Mbed OS Nano Boards → Arduino Nano 33 BLE
3. Select the correct port: Tools → Port → (your Arduino port)
4. Click Upload (→)

### 3. Verify Serial Output

Open Serial Monitor (Tools → Serial Monitor, 9600 baud):

```
AuthentiX Environmental Sensors
Initializing...
✓ DHT22 initialized
✓ BH1750 initialized
✓ MPU6050 initialized
✓ BLE initialized
Bluetooth device active, waiting for connections...
Device Name: AuthentiX-Sensors
Service UUID: 19B10000-E8F2-537E-4F6C-D104768A1214
```

## BLE Service Details

**Service UUID:** `19B10000-E8F2-537E-4F6C-D104768A1214`

### Characteristics

| Sensor | UUID | Type | Description |
|--------|------|------|-------------|
| Temperature | `19B10001-E8F2-537E-4F6C-D104768A1214` | Float | Temperature in °C |
| Humidity | `19B10002-E8F2-537E-4F6C-D104768A1214` | Float | Humidity in % |
| Air Quality | `19B10003-E8F2-537E-4F6C-D104768A1214` | Int | Raw value (0-1023) |
| Light | `19B10004-E8F2-537E-4F6C-D104768A1214` | Int | Illuminance in lux |
| IMU | `19B10005-E8F2-537E-4F6C-D104768A1214` | String | JSON: {ax, ay, az, gx, gy, gz} |

## Connecting from Web App

1. Upload the sketch to Arduino
2. Power on the Arduino
3. Open the AuthentiX web app
4. Navigate to Dashboard
5. Click "Connect Arduino BLE"
6. Select "AuthentiX-Sensors" from the dialog
7. View real-time sensor data

## Troubleshooting

### No BLE Device Found
- Ensure Bluetooth is enabled on your computer
- Check that Arduino is powered and running
- Verify Serial Monitor shows "Bluetooth device active"

### Sensor Reading Errors
- Check wiring connections
- Verify I2C devices (BH1750, MPU6050) share same SCL/SDA
- Ensure proper voltage levels (3.3V for I2C devices)

### Library Compilation Errors
- Update all libraries to latest versions
- Check board support package is installed
- Verify correct board is selected

## Data Format

Sensor data is broadcast every 2 seconds:

```json
{
  "temp": 25.3,
  "humidity": 45.0,
  "air_quality": 112,
  "light": 850,
  "imu": {
    "ax": 0.012,
    "ay": -0.998,
    "az": 0.045,
    "gx": 1.23,
    "gy": -0.45,
    "gz": 0.12
  }
}
```
