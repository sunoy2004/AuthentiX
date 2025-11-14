// Simple test to verify Serial communication
// No libraries needed - just basic Serial test

void setup() {
  Serial.begin(115200);
  delay(2000); // Wait 2 seconds
  
  Serial.println("=================================");
  Serial.println("ARDUINO IS WORKING!");
  Serial.println("Serial communication successful");
  Serial.println("=================================");
}

void loop() {
  Serial.println("Loop running... " + String(millis()));
  delay(1000);
}
