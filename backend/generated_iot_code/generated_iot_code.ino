#include <Arduino.h>
#include <Wire.h>

/* =========================
   Optional Libraries
========================= */

#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <LiquidCrystal_I2C.h>
#include <Servo.h>


/* =========================
   Microcontroller Detection
========================= */

#if defined(ESP32)
#define LED_PIN 2
#define ANALOG_LDR 34
#define ANALOG_LM35 35
#else
#define LED_PIN 13
#define ANALOG_LDR A0
#define ANALOG_LM35 A1
#endif

/* =========================
   Sensor Pin Definitions
========================= */

// Digital Sensors
const int PIR_PIN = 4;
const int IR_OBSTACLE_PIN = 5;
const int FLAME_SENSOR_PIN = 6;
const int SOUND_SENSOR_PIN = 7;

// Analog Sensors
const int LDR_PIN = ANALOG_LDR;
const int LM35_PIN = ANALOG_LM35;
const int SOIL_SENSOR_PIN = A2;
const int RAIN_SENSOR_PIN = A3;
const int MQ2_PIN = A4; // Note: A4 is also SDA on Uno. If I2C is used, don't use MQ2.

// Ultrasonic
const int TRIG_PIN = 9;
const int ECHO_PIN = 10;

/* =========================
   Input Devices
========================= */

const int BUTTON_PIN = 2;

/* =========================
   Actuator Pins
========================= */

const int BUZZER_PIN = 8;
const int RELAY_PIN = 11;
const int SERVO_PIN = 3;

// Motor Driver
const int MOTOR_IN1 = 12;
const int MOTOR_IN2 = A5; // Fixed from 13 to A5 to avoid LED_BUILTIN conflict

/* =========================
   Display Configuration
========================= */

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64

Adafruit_SSD1306 oled(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire);
LiquidCrystal_I2C lcd(0x27, 16, 2);

Servo servoMotor;

/* =========================
   System Variables
========================= */

unsigned long lastReadTime = 0;
const unsigned long READ_INTERVAL = 1000;

bool motionDetected = false;
bool buttonState = false;

// Servo timer variables for non-blocking delay
bool servoActive = false;
unsigned long servoStartTime = 0;

/* =========================
   Setup
========================= */

void setup() {

  Serial.begin(115200);

  /* Sensor pin modes */

  pinMode(PIR_PIN, INPUT);
  pinMode(IR_OBSTACLE_PIN, INPUT);
  pinMode(FLAME_SENSOR_PIN, INPUT);
  pinMode(SOUND_SENSOR_PIN, INPUT);

  pinMode(BUTTON_PIN, INPUT_PULLUP);

  /* Actuator pin modes */

  pinMode(LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(RELAY_PIN, OUTPUT);

  pinMode(MOTOR_IN1, OUTPUT);
  pinMode(MOTOR_IN2, OUTPUT);

  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);

  /* Servo */

  servoMotor.attach(SERVO_PIN);
  servoMotor.write(0); // Initialize position

  /* OLED */
  // It handles failure gracefully if display is missing
  if (oled.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    oled.clearDisplay();
    oled.display(); // Force black screen
    oled.setTextSize(1);
    oled.setTextColor(SSD1306_WHITE);
  }

  /* LCD */
  lcd.init();
  lcd.backlight();

  Serial.println("System Initialized");
}

/* =========================
   Sensor Functions
========================= */

int readAnalogSensor(int pin) { return analogRead(pin); }

bool readDigitalSensor(int pin) { return digitalRead(pin); }

/* LM35 Temperature Conversion */

float readTemperature() {
  int value = analogRead(LM35_PIN);

#if defined(ESP32)
  // ESP32 has 12-bit ADC (0-4095) and operates at 3.3V
  float voltage = value * (3.3 / 4095.0);
#else
  // Arduino Uno has 10-bit ADC (0-1023) and operates at 5.0V
  float voltage = value * (5.0 / 1023.0);
#endif

  float tempC = voltage * 100;
  return tempC;
}

/* =========================
   Ultrasonic Distance
========================= */

float readDistance() {

  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);

  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);

  digitalWrite(TRIG_PIN, LOW);

  long duration = pulseIn(ECHO_PIN, HIGH);

  float distance = duration * 0.034 / 2;

  return distance;
}

/* =========================
   Actuator Control
========================= */

void setLED(bool state) { digitalWrite(LED_PIN, state); }

void setBuzzer(bool state) { digitalWrite(BUZZER_PIN, state); }

void setRelay(bool state) { digitalWrite(RELAY_PIN, state); }

void controlMotor(bool state) {
  if (state) {
    digitalWrite(MOTOR_IN1, HIGH);
    digitalWrite(MOTOR_IN2, LOW);
  } else {
    digitalWrite(MOTOR_IN1, LOW);
    digitalWrite(MOTOR_IN2, LOW);
  }
}

void moveServo(int angle) { servoMotor.write(angle); }

/* =========================
   Display Functions
========================= */

void updateOLED(String message) {
  oled.clearDisplay();
  oled.setCursor(0, 0);
  oled.println(message);
  oled.display();
}

void updateLCD(String line1, String line2) {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(line1);
  lcd.setCursor(0, 1);
  lcd.print(line2);
}

/* =========================
   Sensor Monitoring
========================= */

void monitorSensors(int ldr, float temp, float distance) {
  Serial.print("LDR: ");
  Serial.println(ldr);
  Serial.print("Temp: ");
  Serial.println(temp);
  Serial.print("Distance: ");
  Serial.println(distance);
}

/* =========================
   Main Loop
========================= */

void loop() {

  // 1. Non-blocking Servo Timer
  // Returns servo to 0 degrees after 500ms without using delay()
  if (servoActive && (millis() - servoStartTime >= 500)) {
    moveServo(0);
    servoActive = false;
  }

  // 2. Main 1-second interval execution
  if (millis() - lastReadTime >= READ_INTERVAL) {
    lastReadTime = millis();

    /* Read Sensors */
    bool pirState = readDigitalSensor(PIR_PIN);
    int ldrValue = readAnalogSensor(LDR_PIN);
    float temperature = readTemperature();
    float distance = readDistance();

    /* Motion Logic */
    if (pirState && !motionDetected) {
      Serial.println("Motion detected");
      setLED(true);
      setBuzzer(true);
      updateOLED("Motion detected");
      motionDetected = true;
    }

    if (!pirState && motionDetected) {
      setLED(false);
      setBuzzer(false);
      updateOLED("No motion");
      motionDetected = false;
    }

    /* Button Example (Non-blocking) */
    bool buttonPressed = digitalRead(BUTTON_PIN) == LOW;

    if (buttonPressed && !buttonState) {
      Serial.println("Button pressed");
      moveServo(90);
      servoActive = true;
      servoStartTime = millis();
      buttonState = true;
    }

    if (!buttonPressed) {
      buttonState = false;
    }

    /* Serial Monitoring */
    monitorSensors(ldrValue, temperature, distance);
  }
}