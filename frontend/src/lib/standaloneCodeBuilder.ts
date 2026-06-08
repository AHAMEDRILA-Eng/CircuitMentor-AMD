/**
 * ============================================================
 * standaloneCodeBuilder.ts — Dynamic Standalone Arduino/ESP32
 * Code Generator
 * ============================================================
 * Takes the flat components array (registry keys from
 * conceptExtractor.ts) and generates a clean, personalized
 * standalone .ino file — no IoT platform, no Telegram, no Blynk.
 * Just sensors + actuators + Serial monitor output.
 *
 * Same pin assignment logic as telegramCodeBuilder.ts.
 * Zero API calls — fully deterministic.
 * ============================================================
 */

// ── Types ──────────────────────────────────────────────────────
interface StandaloneComponentConfig {
  humanName: string;
  pinName: string;
  defaultPin: number;
  pinMode: 'INPUT' | 'OUTPUT' | 'INPUT_PULLUP';
  isAnalog: boolean;
  isI2C: boolean;
  requiresLibrary?: string[];
  globalDeclarations?: string[];  // #include, object declarations
  setupCode?: string[];           // inside setup()
  loopCode?: string[];            // inside loop() read/act block
  stateVars?: string[];           // global state variables needed
}

// ── Component Map ──────────────────────────────────────────────
const STANDALONE_MAP: Record<string, StandaloneComponentConfig> = {

  // ── Sensors ──────────────────────────────────────────────────

  Sensor_DHT11: {
    humanName: 'DHT11 Temperature & Humidity Sensor',
    pinName: 'DHT_PIN',
    defaultPin: 4,
    pinMode: 'INPUT',
    isAnalog: false,
    isI2C: false,
    requiresLibrary: ['DHT sensor library by Adafruit'],
    globalDeclarations: [
      '#include <DHT.h>',
      '#define DHT_TYPE DHT11',
      'DHT dht(DHT_PIN, DHT_TYPE);',
    ],
    setupCode: [
      'dht.begin();',
      'Serial.println("DHT11 ready.");',
    ],
    loopCode: [
      '  // ── DHT11 Temperature & Humidity ──────────────────────',
      '  float dhtTemp = dht.readTemperature();',
      '  float dhtHum  = dht.readHumidity();',
      '  if (!isnan(dhtTemp) && !isnan(dhtHum)) {',
      '    Serial.print("Temperature: "); Serial.print(dhtTemp, 1); Serial.println(" C");',
      '    Serial.print("Humidity:    "); Serial.print(dhtHum, 1);  Serial.println(" %");',
      '  } else {',
      '    Serial.println("DHT11: read failed — check wiring!");',
      '  }',
    ],
  },

  Sensor_PIR: {
    humanName: 'PIR Motion Sensor',
    pinName: 'PIR_PIN',
    defaultPin: 5,
    pinMode: 'INPUT',
    isAnalog: false,
    isI2C: false,
    stateVars: ['bool lastMotionState = false;'],
    loopCode: [
      '  // ── PIR Motion Sensor ──────────────────────────────────',
      '  bool motionNow = digitalRead(PIR_PIN);',
      '  if (motionNow && !lastMotionState) {',
      '    Serial.println("PIR: Motion DETECTED!");',
      '    lastMotionState = true;',
      '  }',
      '  if (!motionNow && lastMotionState) {',
      '    Serial.println("PIR: No motion.");',
      '    lastMotionState = false;',
      '  }',
    ],
  },

  Sensor_HC_SR04: {
    humanName: 'HC-SR04 Ultrasonic Sensor',
    pinName: 'TRIG_PIN',
    defaultPin: 9,
    pinMode: 'OUTPUT',
    isAnalog: false,
    isI2C: false,
    globalDeclarations: ['const int ECHO_PIN = 10;'],
    setupCode: [
      'pinMode(TRIG_PIN, OUTPUT);',
      'pinMode(ECHO_PIN, INPUT);',
    ],
    loopCode: [
      '  // ── HC-SR04 Ultrasonic Distance ────────────────────────',
      '  digitalWrite(TRIG_PIN, LOW);',
      '  delayMicroseconds(2);',
      '  digitalWrite(TRIG_PIN, HIGH);',
      '  delayMicroseconds(10);',
      '  digitalWrite(TRIG_PIN, LOW);',
      '  long ultraDuration = pulseIn(ECHO_PIN, HIGH, 30000);',
      '  float ultraDist    = ultraDuration * 0.034 / 2.0;',
      '  Serial.print("Distance: "); Serial.print(ultraDist, 1); Serial.println(" cm");',
    ],
  },

  Sensor_LDR: {
    humanName: 'LDR Light Sensor',
    pinName: 'LDR_PIN',
    defaultPin: 34,
    pinMode: 'INPUT',
    isAnalog: true,
    isI2C: false,
    loopCode: [
      '  // ── LDR Light Sensor ───────────────────────────────────',
      '  long ldrSum = 0;',
      '  for (int k = 0; k < 10; k++) { ldrSum += analogRead(LDR_PIN); delay(5); }',
      '  int ldrVal = ldrSum / 10;',
      '  String ldrLevel = ldrVal < 1000 ? "Dark" : ldrVal < 2500 ? "Dim" : "Bright";',
      '  Serial.print("Light: "); Serial.print(ldrVal); Serial.print("  ("); Serial.print(ldrLevel); Serial.println(")");',
    ],
  },

  Sensor_MQ2_Gas: {
    humanName: 'MQ-2 Gas/Smoke Sensor',
    pinName: 'GAS_PIN',
    defaultPin: 35,
    pinMode: 'INPUT',
    isAnalog: true,
    isI2C: false,
    loopCode: [
      '  // ── MQ-2 Gas Sensor ────────────────────────────────────',
      '  long gasSum = 0;',
      '  for (int k = 0; k < 10; k++) { gasSum += analogRead(GAS_PIN); delay(5); }',
      '  int gasVal = gasSum / 10;',
      '  String gasSafety = gasVal > 2000 ? "WARNING — HIGH GAS!" : "Normal";',
      '  Serial.print("Gas Level: "); Serial.print(gasVal); Serial.print("  "); Serial.println(gasSafety);',
    ],
  },

  Sensor_Soil_Moisture: {
    humanName: 'Soil Moisture Sensor',
    pinName: 'SOIL_PIN',
    defaultPin: 34,
    pinMode: 'INPUT',
    isAnalog: true,
    isI2C: false,
    loopCode: [
      '  // ── Soil Moisture Sensor ───────────────────────────────',
      '  long soilSum = 0;',
      '  for (int k = 0; k < 10; k++) { soilSum += analogRead(SOIL_PIN); delay(5); }',
      '  int soilRaw = soilSum / 10;',
      '  int soilPct = map(soilRaw, 4095, 0, 0, 100);',
      '  String soilStatus = soilPct < 30 ? "DRY — needs water" : soilPct < 70 ? "Moist — OK" : "Wet";',
      '  Serial.print("Soil Moisture: "); Serial.print(soilPct); Serial.print("%  "); Serial.println(soilStatus);',
    ],
  },

  Sensor_Rain: {
    humanName: 'Rain Sensor',
    pinName: 'RAIN_PIN',
    defaultPin: 34,
    pinMode: 'INPUT',
    isAnalog: true,
    isI2C: false,
    loopCode: [
      '  // ── Rain Sensor ────────────────────────────────────────',
      '  int rainVal = analogRead(RAIN_PIN);',
      '  String rainStatus = rainVal < 1500 ? "Rain detected!" : "No rain.";',
      '  Serial.print("Rain Sensor: "); Serial.print(rainVal); Serial.print("  "); Serial.println(rainStatus);',
    ],
  },

  Sensor_Flame: {
    humanName: 'Flame Sensor',
    pinName: 'FLAME_PIN',
    defaultPin: 6,
    pinMode: 'INPUT',
    isAnalog: false,
    isI2C: false,
    loopCode: [
      '  // ── Flame Sensor ───────────────────────────────────────',
      '  bool flameDetected = (digitalRead(FLAME_PIN) == LOW);',
      '  Serial.println(flameDetected ? "FLAME DETECTED!" : "Flame: clear.");',
    ],
  },

  Sensor_Sound: {
    humanName: 'Sound Sensor',
    pinName: 'SOUND_PIN',
    defaultPin: 7,
    pinMode: 'INPUT',
    isAnalog: false,
    isI2C: false,
    loopCode: [
      '  // ── Sound Sensor ───────────────────────────────────────',
      '  bool soundDetected = digitalRead(SOUND_PIN);',
      '  Serial.println(soundDetected ? "Sound detected!" : "Sound: quiet.");',
    ],
  },

  Sensor_IR_Obstacle: {
    humanName: 'IR Obstacle Sensor',
    pinName: 'IR_PIN',
    defaultPin: 5,
    pinMode: 'INPUT',
    isAnalog: false,
    isI2C: false,
    loopCode: [
      '  // ── IR Obstacle Sensor ─────────────────────────────────',
      '  bool irObstacle = (digitalRead(IR_PIN) == LOW);',
      '  Serial.println(irObstacle ? "IR: Obstacle detected!" : "IR: Path clear.");',
    ],
  },

  Sensor_Heartbeat: {
    humanName: 'Heartbeat Sensor',
    pinName: 'PULSE_PIN',
    defaultPin: 34,
    pinMode: 'INPUT',
    isAnalog: true,
    isI2C: false,
    loopCode: [
      '  // ── Heartbeat Sensor ───────────────────────────────────',
      '  int pulseRaw = analogRead(PULSE_PIN);',
      '  Serial.print("Pulse raw: "); Serial.println(pulseRaw);',
      '  // Note: Use a BPM library for accurate heart rate calculation.',
    ],
  },

  Sensor_Temperature_LM35: {
    humanName: 'LM35 Temperature Sensor',
    pinName: 'LM35_PIN',
    defaultPin: 35,
    pinMode: 'INPUT',
    isAnalog: true,
    isI2C: false,
    loopCode: [
      '  // ── LM35 Temperature Sensor ────────────────────────────',
      '  int lm35Raw  = analogRead(LM35_PIN);',
      '  float lm35V  = lm35Raw * (3.3 / 4095.0);  // ESP32 3.3V reference',
      '  float lm35T  = lm35V * 100.0;              // 10mV per degree C',
      '  Serial.print("Temperature (LM35): "); Serial.print(lm35T, 1); Serial.println(" C");',
    ],
  },

  // ── Actuators ─────────────────────────────────────────────────

  Actuator_LED: {
    humanName: 'LED',
    pinName: 'LED_PIN',
    defaultPin: 2,
    pinMode: 'OUTPUT',
    isAnalog: false,
    isI2C: false,
    loopCode: [
      '  // ── LED ────────────────────────────────────────────────',
      '  // LED is controlled by your sensor logic above.',
      '  // Example: digitalWrite(LED_PIN, motionNow ? HIGH : LOW);',
    ],
  },

  Actuator_Relay_5V: {
    humanName: 'Relay',
    pinName: 'RELAY_PIN',
    defaultPin: 13,
    pinMode: 'OUTPUT',
    isAnalog: false,
    isI2C: false,
    setupCode: [
      'digitalWrite(RELAY_PIN, HIGH); // Start with relay OFF (active-LOW module)',
    ],
    loopCode: [
      '  // ── Relay ──────────────────────────────────────────────',
      '  // Relay is controlled by your sensor logic above.',
      '  // ACTIVE-LOW: digitalWrite(RELAY_PIN, LOW) = ON',
      '  //             digitalWrite(RELAY_PIN, HIGH) = OFF',
      '  // Example: digitalWrite(RELAY_PIN, triggerCondition ? LOW : HIGH);',
    ],
  },

  Actuator_Buzzer: {
    humanName: 'Buzzer',
    pinName: 'BUZZER_PIN',
    defaultPin: 8,
    pinMode: 'OUTPUT',
    isAnalog: false,
    isI2C: false,
    loopCode: [
      '  // ── Buzzer ─────────────────────────────────────────────',
      '  // Buzzer is controlled by your sensor logic above.',
      '  // Example: digitalWrite(BUZZER_PIN, alertCondition ? HIGH : LOW);',
    ],
  },

  Actuator_Servo_SG90: {
    humanName: 'Servo Motor (SG90)',
    pinName: 'SERVO_PIN',
    defaultPin: 3,
    pinMode: 'OUTPUT',
    isAnalog: false,
    isI2C: false,
    requiresLibrary: ['ESP32Servo (for ESP32) or built-in Servo.h (for Arduino)'],
    globalDeclarations: [
      '#if defined(ESP32)',
      '#include <ESP32Servo.h>',
      '#else',
      '#include <Servo.h>',
      '#endif',
      'Servo myServo;',
    ],
    setupCode: [
      'myServo.attach(SERVO_PIN);',
      'myServo.write(0); // Start at 0 degrees',
    ],
    loopCode: [
      '  // ── Servo Motor ────────────────────────────────────────',
      '  // Control servo angle based on your sensor logic.',
      '  // Example: myServo.write(90); // Move to 90 degrees',
      '  // Example: myServo.write(0);  // Return to 0 degrees',
    ],
  },

  Actuator_Water_Pump: {
    humanName: 'Water Pump',
    pinName: 'PUMP_PIN',
    defaultPin: 13,
    pinMode: 'OUTPUT',
    isAnalog: false,
    isI2C: false,
    setupCode: [
      'digitalWrite(PUMP_PIN, LOW); // Start with pump OFF',
    ],
    loopCode: [
      '  // ── Water Pump ─────────────────────────────────────────',
      '  // Pump is controlled via relay — connect through relay module.',
      '  // Example: digitalWrite(PUMP_PIN, soilPct < 30 ? HIGH : LOW);',
    ],
  },

  // ── Displays ──────────────────────────────────────────────────

  Display_OLED_SSD1306: {
    humanName: 'OLED Display (SSD1306)',
    pinName: 'OLED_SDA',
    defaultPin: 21,
    pinMode: 'OUTPUT',
    isAnalog: false,
    isI2C: true,
    requiresLibrary: ['Adafruit SSD1306', 'Adafruit GFX Library'],
    globalDeclarations: [
      '#include <Wire.h>',
      '#include <Adafruit_GFX.h>',
      '#include <Adafruit_SSD1306.h>',
      '#define SCREEN_WIDTH 128',
      '#define SCREEN_HEIGHT 64',
      'Adafruit_SSD1306 oled(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);',
    ],
    setupCode: [
      'if (!oled.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {',
      '  Serial.println("OLED not found — check wiring!");',
      '} else {',
      '  oled.clearDisplay();',
      '  oled.setTextSize(1);',
      '  oled.setTextColor(SSD1306_WHITE);',
      '  oled.setCursor(0, 0);',
      '  oled.println("System Ready!");',
      '  oled.display();',
      '}',
    ],
    loopCode: [
      '  // ── OLED Display ────────────────────────────────────────',
      '  // Update OLED with your sensor readings.',
      '  // Example:',
      '  // oled.clearDisplay();',
      '  // oled.setCursor(0, 0);',
      '  // oled.print("Temp: "); oled.println(dhtTemp);',
      '  // oled.display();',
    ],
  },

  Display_LCD_16x2: {
    humanName: 'LCD 16x2 Display',
    pinName: 'LCD_SDA',
    defaultPin: 21,
    pinMode: 'OUTPUT',
    isAnalog: false,
    isI2C: true,
    requiresLibrary: ['LiquidCrystal I2C by Frank de Brabander'],
    globalDeclarations: [
      '#include <Wire.h>',
      '#include <LiquidCrystal_I2C.h>',
      'LiquidCrystal_I2C lcd(0x27, 16, 2);',
    ],
    setupCode: [
      'lcd.init();',
      'lcd.backlight();',
      'lcd.setCursor(0, 0);',
      'lcd.print("System Ready!");',
    ],
    loopCode: [
      '  // ── LCD 16x2 Display ────────────────────────────────────',
      '  // Update LCD with your sensor readings.',
      '  // Example:',
      '  // lcd.clear();',
      '  // lcd.setCursor(0, 0); lcd.print("Temp: "); lcd.print(dhtTemp);',
      '  // lcd.setCursor(0, 1); lcd.print("Hum:  "); lcd.print(dhtHum);',
    ],
  },

  // ── Inputs ────────────────────────────────────────────────────

  Input_Button: {
    humanName: 'Push Button',
    pinName: 'BUTTON_PIN',
    defaultPin: 2,
    pinMode: 'INPUT_PULLUP',
    isAnalog: false,
    isI2C: false,
    stateVars: ['bool lastButtonState = false;'],
    loopCode: [
      '  // ── Push Button ─────────────────────────────────────────',
      '  bool btnPressed = (digitalRead(BUTTON_PIN) == LOW); // PULLUP: LOW = pressed',
      '  if (btnPressed && !lastButtonState) {',
      '    Serial.println("Button pressed!");',
      '    // Add your button action here',
      '  }',
      '  lastButtonState = btnPressed;',
    ],
  },

  Input_Potentiometer: {
    humanName: 'Potentiometer',
    pinName: 'POT_PIN',
    defaultPin: 34,
    pinMode: 'INPUT',
    isAnalog: true,
    isI2C: false,
    loopCode: [
      '  // ── Potentiometer ───────────────────────────────────────',
      '  int potRaw = analogRead(POT_PIN);',
      '  int potPct = map(potRaw, 0, 4095, 0, 100);',
      '  Serial.print("Potentiometer: "); Serial.print(potPct); Serial.println("%");',
    ],
  },
};

// ── Pin collision resolver ─────────────────────────────────────
function assignPins(keys: string[]): Map<string, number> {
  const assigned   = new Map<string, number>();
  const usedPins   = new Set<number>();
  const analogPool  = [34, 35, 32, 33, 36, 39];
  const outputPool  = [2, 3, 4, 5, 8, 11, 12, 13, 15, 16];
  const inputPool   = [6, 7, 9, 17, 18, 19, 23];
  let ai = 0, oi = 0, ii = 0;

  for (const key of keys) {
    const cfg = STANDALONE_MAP[key];
    if (!cfg) continue;
    if (!usedPins.has(cfg.defaultPin)) {
      assigned.set(key, cfg.defaultPin);
      usedPins.add(cfg.defaultPin);
      continue;
    }
    if (cfg.isAnalog) {
      while (ai < analogPool.length && usedPins.has(analogPool[ai])) ai++;
      const pin = analogPool[ai++] ?? 39;
      assigned.set(key, pin); usedPins.add(pin);
    } else if (cfg.pinMode === 'OUTPUT') {
      while (oi < outputPool.length && usedPins.has(outputPool[oi])) oi++;
      const pin = outputPool[oi++] ?? 13;
      assigned.set(key, pin); usedPins.add(pin);
    } else {
      while (ii < inputPool.length && usedPins.has(inputPool[ii])) ii++;
      const pin = inputPool[ii++] ?? 23;
      assigned.set(key, pin); usedPins.add(pin);
    }
  }
  return assigned;
}

// ── Human name helper ──────────────────────────────────────────
function toHumanName(key: string): string {
  return STANDALONE_MAP[key]?.humanName
    ?? key.replace(/^(Sensor_|Actuator_|Display_|Input_|MCU_)/, '').replace(/_/g, ' ');
}

// ── MCU detector ───────────────────────────────────────────────
function isESP32Project(components: string[]): boolean {
  return components.some(k => k === 'MCU_ESP32');
}

// ── Main code generator ────────────────────────────────────────
export function buildStandaloneCode(
  components: string[],
  projectIdea: string
): string {
  const keys       = components.filter(k => !k.startsWith('MCU_'));
  const pinMap     = assignPins(keys);
  const humanNames = keys.map(toHumanName);
  const projectTitle = projectIdea?.trim() || humanNames.join(' + ');
  const isESP      = isESP32Project(components);
  const mcuName    = isESP ? 'ESP32 DevKit V1' : 'Arduino Uno R3';

  // ── Libraries ─────────────────────────────────────────────────
  const libraries = new Set<string>();
  for (const key of keys) {
    STANDALONE_MAP[key]?.requiresLibrary?.forEach(l => libraries.add(l));
  }
  const libList = [...libraries].map(l => `//    • ${l}`).join('\n');

  // ── Global declarations ────────────────────────────────────────
  const includeLines: string[] = [];
  const objectLines:  string[] = [];
  for (const key of keys) {
    const cfg = STANDALONE_MAP[key];
    cfg?.globalDeclarations?.forEach(d => {
      if (d.startsWith('#include') || d.startsWith('#if') || d.startsWith('#else') || d.startsWith('#endif') || d.startsWith('#define')) {
        includeLines.push(d);
      } else {
        objectLines.push(d);
      }
    });
  }
  // Deduplicate includes
  const uniqueIncludes = [...new Set(includeLines)];

  // ── Pin definitions ────────────────────────────────────────────
  const pinDefs = keys
    .filter(k => STANDALONE_MAP[k] && !STANDALONE_MAP[k].isI2C)
    .map(k => {
      const cfg = STANDALONE_MAP[k]!;
      const pin = pinMap.get(k) ?? cfg.defaultPin;
      return `const int ${cfg.pinName} = ${pin};   // ${cfg.humanName}`;
    });

  // HC-SR04 special case — ECHO_PIN declared in globalDeclarations
  // already handled above, skip duplicate

  // ── State variables ────────────────────────────────────────────
  const stateVars: string[] = [];
  for (const key of keys) {
    STANDALONE_MAP[key]?.stateVars?.forEach(v => stateVars.push(v));
  }

  // ── pinMode calls ──────────────────────────────────────────────
  const pinModes = keys
    .filter(k => STANDALONE_MAP[k] && !STANDALONE_MAP[k].isI2C)
    .map(k => {
      const cfg = STANDALONE_MAP[k]!;
      return `  pinMode(${cfg.pinName}, ${cfg.pinMode});`;
    });

  // ── Extra setup code ───────────────────────────────────────────
  const extraSetup: string[] = [];
  for (const key of keys) {
    STANDALONE_MAP[key]?.setupCode?.forEach(l => extraSetup.push(`  ${l}`));
  }

  // ── Loop body ──────────────────────────────────────────────────
  const loopBlocks: string[] = [];
  for (const key of keys) {
    const cfg = STANDALONE_MAP[key];
    if (cfg?.loopCode) {
      cfg.loopCode.forEach(l => loopBlocks.push(l));
      loopBlocks.push('');
    }
  }

  // ── I2C note ───────────────────────────────────────────────────
  const hasI2C = keys.some(k => STANDALONE_MAP[k]?.isI2C);
  const i2cNote = hasI2C
    ? `\n// ── I2C Bus (shared by all I2C devices) ─────────────────────\n// SDA → ${isESP ? 'GPIO 21' : 'A4'}   SCL → ${isESP ? 'GPIO 22' : 'A5'}`
    : '';

  // ── Assemble ───────────────────────────────────────────────────
  return `/* ============================================================
   CircuitMentor — Personalized Standalone Sketch
   Project:    ${projectTitle}
   Board:      ${mcuName}
   Components: ${humanNames.join(', ')}
   Generated by CircuitMentor — not a generic template!
   ============================================================ */

// ── Required Libraries (Arduino IDE → Manage Libraries) ──────
// Install ALL of these before uploading:
${libList || '//    • (no extra libraries needed)'}

#include <Arduino.h>
${uniqueIncludes.join('\n')}

// ── Pin Definitions ──────────────────────────────────────────
${pinDefs.join('\n') || '// (no physical pins — all I2C)'}
${i2cNote}

// ── Component Objects & State Variables ──────────────────────
${objectLines.join('\n') || '// (none needed)'}
${stateVars.join('\n')}

// ── Timing ───────────────────────────────────────────────────
unsigned long lastReadTime = 0;
const unsigned long READ_INTERVAL = 1000; // Read sensors every 1 second

// ── Setup ─────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  Serial.println("============================================");
  Serial.println("  ${projectTitle}");
  Serial.println("  CircuitMentor — Personalized Sketch");
  Serial.println("============================================");

  // Pin modes
${pinModes.join('\n') || '  // (no digital pin modes needed)'}

  // Component initialisation
${extraSetup.join('\n') || '  // (none needed)'}

  Serial.println("System ready! Reading every 1 second...");
}

// ── Loop ──────────────────────────────────────────────────────
void loop() {
  // Non-blocking 1-second interval
  if (millis() - lastReadTime >= READ_INTERVAL) {
    lastReadTime = millis();
    Serial.println("--------------------------------------------");

${loopBlocks.join('\n') || '  // No sensor logic generated.'}
  }
}`;
}