/**
 * ============================================================
 * blynkCodeBuilder.ts — Dynamic Blynk IoT Code Generator
 * ============================================================
 * Takes the flat components array (registry keys from
 * conceptExtractor.ts) and generates a fully personalized
 * ESP32 Blynk .ino file — zero API calls.
 *
 * Key differences from Telegram builder:
 * - Sensors push data via Blynk.virtualWrite(Vx, value) on a timer
 * - Actuators receive commands via BLYNK_WRITE(Vx) handlers
 * - Each component gets its own virtual pin (V0, V1, V2...)
 * ============================================================
 */

// ── Types ──────────────────────────────────────────────────────
interface BlynkComponentConfig {
  humanName: string;
  pinName: string;
  defaultPin: number;
  pinMode: 'INPUT' | 'OUTPUT' | 'INPUT_PULLUP';
  isAnalog: boolean;
  isI2C: boolean;
  requiresLibrary?: string[];
  globalDeclarations?: string[];   // #include, object declarations
  setupCode?: string[];            // inside setup()
  // Sensor: code inside sendSensorData() timer function
  // virtualPin assigned dynamically (V0, V1, V2...)
  sensorReadCode?: (vPin: string, varSuffix: string) => string[];
  // Actuator: BLYNK_WRITE(Vx) handler body
  actuatorWriteCode?: (vPin: string) => string[];
  // Datastream config hint for the guide
  datastreamHint?: string;
}

// ── Component Map ──────────────────────────────────────────────
const BLYNK_COMPONENT_MAP: Record<string, BlynkComponentConfig> = {

  // ── Sensors ──────────────────────────────────────────────────

  Sensor_DHT11: {
    humanName: 'DHT11 Temp & Humidity Sensor',
    pinName: 'DHT_PIN',
    defaultPin: 26,
    pinMode: 'INPUT',
    isAnalog: false,
    isI2C: false,
    requiresLibrary: ['DHT sensor library by Adafruit'],
    globalDeclarations: [
      '#include <DHT.h>',
      '#define DHT_TYPE DHT11',
      'DHT dht(DHT_PIN, DHT_TYPE);',
    ],
    setupCode: ['dht.begin();'],
    datastreamHint: 'Create 2 datastreams: V? → Temperature (Double, -40 to 80), V? → Humidity (Integer, 0-100)',
    sensorReadCode: (vPin, sfx) => [
      `  // DHT11 — Temperature & Humidity`,
      `  float dht${sfx}Temp = dht.readTemperature();`,
      `  float dht${sfx}Hum  = dht.readHumidity();`,
      `  if (!isnan(dht${sfx}Temp) && !isnan(dht${sfx}Hum)) {`,
      `    Blynk.virtualWrite(${vPin},     dht${sfx}Temp);  // Temperature`,
      `    Blynk.virtualWrite(${sfx}_HUM_VPIN, dht${sfx}Hum);   // Humidity`,
      `    Serial.printf("DHT11 → %.1f°C  %.1f%%\\n", dht${sfx}Temp, dht${sfx}Hum);`,
      `  } else {`,
      `    Serial.println("DHT11 read failed — check wiring!");`,
      `  }`,
    ],
  },

  Sensor_PIR: {
    humanName: 'PIR Motion Sensor',
    pinName: 'PIR_PIN',
    defaultPin: 27,
    pinMode: 'INPUT',
    isAnalog: false,
    isI2C: false,
    datastreamHint: 'Create 1 datastream: V? → Motion (Integer, 0-1). Use an "Event" widget for alerts.',
    sensorReadCode: (vPin, sfx) => [
      `  // PIR Motion Sensor`,
      `  int pir${sfx} = digitalRead(PIR_PIN);`,
      `  Blynk.virtualWrite(${vPin}, pir${sfx});`,
      `  if (pir${sfx}) Blynk.logEvent("motion_detected", "🚨 Motion detected!");`,
      `  Serial.printf("PIR → %s\\n", pir${sfx} ? "MOTION" : "clear");`,
    ],
  },

  Sensor_HC_SR04: {
    humanName: 'HC-SR04 Ultrasonic Sensor',
    pinName: 'TRIG_PIN',
    defaultPin: 25,
    pinMode: 'OUTPUT',
    isAnalog: false,
    isI2C: false,
    globalDeclarations: ['const int ECHO_PIN = 33;'],
    setupCode: [
      'pinMode(TRIG_PIN, OUTPUT);',
      'pinMode(ECHO_PIN, INPUT);',
    ],
    datastreamHint: 'Create 1 datastream: V? → Distance (Double, 0-400). Use a "Gauge" widget.',
    sensorReadCode: (vPin, sfx) => [
      `  // HC-SR04 Ultrasonic Distance`,
      `  digitalWrite(TRIG_PIN, LOW);`,
      `  delayMicroseconds(2);`,
      `  digitalWrite(TRIG_PIN, HIGH);`,
      `  delayMicroseconds(10);`,
      `  digitalWrite(TRIG_PIN, LOW);`,
      `  long dur${sfx} = pulseIn(ECHO_PIN, HIGH, 30000);`,
      `  float dist${sfx} = dur${sfx} * 0.034 / 2.0;`,
      `  Blynk.virtualWrite(${vPin}, dist${sfx});`,
      `  Serial.printf("Ultrasonic → %.1f cm\\n", dist${sfx});`,
    ],
  },

  Sensor_LDR: {
    humanName: 'LDR Light Sensor',
    pinName: 'LDR_PIN',
    defaultPin: 34,  // LDR
    pinMode: 'INPUT',
    isAnalog: true,
    isI2C: false,
    datastreamHint: 'Create 1 datastream: V? → Light Level (Integer, 0-4095). Use a "Gauge" or "SuperChart".',
    sensorReadCode: (vPin, sfx) => [
      `  // LDR Light Sensor`,
      `  long ldrSum${sfx} = 0;`,
      `  for (int k = 0; k < 10; k++) { ldrSum${sfx} += analogRead(LDR_PIN); delay(5); }`,
      `  int ldr${sfx} = ldrSum${sfx} / 10;`,
      `  Blynk.virtualWrite(${vPin}, ldr${sfx});`,
      `  Serial.printf("LDR → %d\\n", ldr${sfx});`,
    ],
  },

  Sensor_MQ2_Gas: {
    humanName: 'MQ-2 Gas/Smoke Sensor',
    pinName: 'GAS_PIN',
    defaultPin: 35,
    pinMode: 'INPUT',
    isAnalog: true,
    isI2C: false,
    datastreamHint: 'Create 1 datastream: V? → Gas Level (Integer, 0-4095). Add an "Event" for high gas alerts.',
    sensorReadCode: (vPin, sfx) => [
      `  // MQ-2 Gas Sensor`,
      `  long gasSum${sfx} = 0;`,
      `  for (int k = 0; k < 10; k++) { gasSum${sfx} += analogRead(GAS_PIN); delay(5); }`,
      `  int gas${sfx} = gasSum${sfx} / 10;`,
      `  Blynk.virtualWrite(${vPin}, gas${sfx});`,
      `  if (gas${sfx} > 2000) Blynk.logEvent("gas_alert", "⚠️ High gas level detected!");`,
      `  Serial.printf("Gas → %d\\n", gas${sfx});`,
    ],
  },

  Sensor_Soil_Moisture: {
    humanName: 'Soil Moisture Sensor',
    pinName: 'SOIL_PIN',
    defaultPin: 35,
    pinMode: 'INPUT',
    isAnalog: true,
    isI2C: false,
    datastreamHint: 'Create 1 datastream: V? → Moisture % (Integer, 0-100). Use a "Gauge" widget.',
    sensorReadCode: (vPin, sfx) => [
      `  // Soil Moisture Sensor`,
      `  long soilSum${sfx} = 0;`,
      `  for (int k = 0; k < 10; k++) { soilSum${sfx} += analogRead(SOIL_PIN); delay(5); }`,
      `  int soilRaw${sfx} = soilSum${sfx} / 10;`,
      `  int soilPct${sfx} = map(soilRaw${sfx}, 4095, 0, 0, 100);`,
      `  Blynk.virtualWrite(${vPin}, soilPct${sfx});`,
      `  if (soilPct${sfx} < 30) Blynk.logEvent("dry_soil", "🏜️ Soil is dry — needs water!");`,
      `  Serial.printf("Soil → %d%%\\n", soilPct${sfx});`,
    ],
  },

  Sensor_Rain: {
    humanName: 'Rain Sensor',
    pinName: 'RAIN_PIN',
    defaultPin: 32,
    pinMode: 'INPUT',
    isAnalog: true,
    isI2C: false,
    datastreamHint: 'Create 1 datastream: V? → Rain Raw (Integer, 0-4095). Low value = wet.',
    sensorReadCode: (vPin, sfx) => [
      `  // Rain Sensor`,
      `  int rain${sfx} = analogRead(RAIN_PIN);`,
      `  Blynk.virtualWrite(${vPin}, rain${sfx});`,
      `  if (rain${sfx} < 1500) Blynk.logEvent("rain_alert", "🌧️ Rain detected!");`,
      `  Serial.printf("Rain → %d\\n", rain${sfx});`,
    ],
  },

  Sensor_Flame: {
    humanName: 'Flame Sensor',
    pinName: 'FLAME_PIN',
    defaultPin: 27,
    pinMode: 'INPUT',
    isAnalog: false,
    isI2C: false,
    datastreamHint: 'Create 1 datastream: V? → Flame (Integer, 0-1). Add a "Notification" event for flame alerts.',
    sensorReadCode: (vPin, sfx) => [
      `  // Flame Sensor`,
      `  int flame${sfx} = digitalRead(FLAME_PIN);`,
      `  Blynk.virtualWrite(${vPin}, flame${sfx} == LOW ? 1 : 0);`,
      `  if (flame${sfx} == LOW) Blynk.logEvent("flame_alert", "🔥 FLAME DETECTED!");`,
      `  Serial.printf("Flame → %s\\n", flame${sfx} == LOW ? "DETECTED" : "clear");`,
    ],
  },

  Sensor_Sound: {
    humanName: 'Sound Sensor',
    pinName: 'SOUND_PIN',
    defaultPin: 27,
    pinMode: 'INPUT',
    isAnalog: false,
    isI2C: false,
    datastreamHint: 'Create 1 datastream: V? → Sound (Integer, 0-1). Use an "LED" indicator widget.',
    sensorReadCode: (vPin, sfx) => [
      `  // Sound Sensor`,
      `  int sound${sfx} = digitalRead(SOUND_PIN);`,
      `  Blynk.virtualWrite(${vPin}, sound${sfx});`,
      `  Serial.printf("Sound → %s\\n", sound${sfx} ? "detected" : "quiet");`,
    ],
  },

  Sensor_IR_Obstacle: {
    humanName: 'IR Obstacle Sensor',
    pinName: 'IR_PIN',
    defaultPin: 27,
    pinMode: 'INPUT',
    isAnalog: false,
    isI2C: false,
    datastreamHint: 'Create 1 datastream: V? → Obstacle (Integer, 0-1). Use an "LED" indicator widget.',
    sensorReadCode: (vPin, sfx) => [
      `  // IR Obstacle Sensor`,
      `  int ir${sfx} = digitalRead(IR_PIN);`,
      `  Blynk.virtualWrite(${vPin}, ir${sfx} == LOW ? 1 : 0);`,
      `  Serial.printf("IR → %s\\n", ir${sfx} == LOW ? "obstacle" : "clear");`,
    ],
  },

  Sensor_Heartbeat: {
    humanName: 'Heartbeat / Pulse Sensor',
    pinName: 'PULSE_PIN',
    defaultPin: 36,
    pinMode: 'INPUT',
    isAnalog: true,
    isI2C: false,
    datastreamHint: 'Create 1 datastream: V? → Pulse Raw (Integer, 0-4095). Use a "SuperChart" widget.',
    sensorReadCode: (vPin, sfx) => [
      `  // Heartbeat Sensor (raw value — use BPM library for accurate readings)`,
      `  int pulse${sfx} = analogRead(PULSE_PIN);`,
      `  Blynk.virtualWrite(${vPin}, pulse${sfx});`,
      `  Serial.printf("Pulse raw → %d\\n", pulse${sfx});`,
    ],
  },

  Sensor_Temperature_LM35: {
    humanName: 'LM35 Temperature Sensor',
    pinName: 'LM35_PIN',
    defaultPin: 33,
    pinMode: 'INPUT',
    isAnalog: true,
    isI2C: false,
    datastreamHint: 'Create 1 datastream: V? → Temperature (Double, -10 to 150). Use a "Gauge" widget.',
    sensorReadCode: (vPin, sfx) => [
      `  // LM35 Temperature Sensor`,
      `  int lm35Raw${sfx} = analogRead(LM35_PIN);`,
      `  float lm35V${sfx}    = lm35Raw${sfx} * (3.3 / 4095.0);`,
      `  float lm35T${sfx}    = lm35V${sfx} * 100.0;`,
      `  Blynk.virtualWrite(${vPin}, lm35T${sfx});`,
      `  Serial.printf("LM35 → %.1f°C\\n", lm35T${sfx});`,
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
    datastreamHint: 'Create 1 datastream: V? → LED Control (Integer, 0-1). Use a "Button" widget (Switch mode).',
    actuatorWriteCode: (vPin) => [
      `  // LED Control`,
      `  int ledState = param.asInt();`,
      `  digitalWrite(LED_PIN, ledState);`,
      `  Serial.printf("LED → %s\\n", ledState ? "ON" : "OFF");`,
    ],
  },

  Actuator_Relay_5V: {
    humanName: 'Relay',
    pinName: 'RELAY_PIN',
    defaultPin: 13,
    pinMode: 'OUTPUT',
    isAnalog: false,
    isI2C: false,
    datastreamHint: 'Create 1 datastream: V? → Relay Control (Integer, 0-1). Use a "Button" widget (Switch mode).',
    actuatorWriteCode: (vPin) => [
      `  // Relay Control (ACTIVE LOW — most relay modules)`,
      `  int relayCmd = param.asInt();`,
      `  digitalWrite(RELAY_PIN, relayCmd ? LOW : HIGH);`,
      `  Serial.printf("Relay → %s\\n", relayCmd ? "ON" : "OFF");`,
    ],
  },

  Actuator_Buzzer: {
    humanName: 'Buzzer',
    pinName: 'BUZZER_PIN',
    defaultPin: 14,
    pinMode: 'OUTPUT',
    isAnalog: false,
    isI2C: false,
    datastreamHint: 'Create 1 datastream: V? → Buzzer (Integer, 0-1). Use a "Button" widget (Push mode) for momentary beep.',
    actuatorWriteCode: (vPin) => [
      `  // Buzzer Control`,
      `  int buzzCmd = param.asInt();`,
      `  if (buzzCmd) {`,
      `    digitalWrite(BUZZER_PIN, HIGH);`,
      `    delay(300);`,
      `    digitalWrite(BUZZER_PIN, LOW);`,
      `    Serial.println("Buzzer beeped!");`,
      `  }`,
    ],
  },

  Actuator_Servo_SG90: {
    humanName: 'Servo Motor (SG90)',
    pinName: 'SERVO_PIN',
    defaultPin: 15,
    pinMode: 'OUTPUT',
    isAnalog: false,
    isI2C: false,
    requiresLibrary: ['ESP32Servo'],
    globalDeclarations: [
      '#include <ESP32Servo.h>',
      'Servo myServo;',
    ],
    setupCode: ['myServo.attach(SERVO_PIN);'],
    datastreamHint: 'Create 1 datastream: V? → Servo Angle (Integer, 0-180). Use a "Slider" widget.',
    actuatorWriteCode: (vPin) => [
      `  // Servo Motor`,
      `  int angle = param.asInt();`,
      `  myServo.write(angle);`,
      `  Serial.printf("Servo → %d°\\n", angle);`,
    ],
  },

  Actuator_Water_Pump: {
    humanName: 'Water Pump',
    pinName: 'PUMP_PIN',
    defaultPin: 4,
    pinMode: 'OUTPUT',
    isAnalog: false,
    isI2C: false,
    datastreamHint: 'Create 1 datastream: V? → Pump Control (Integer, 0-1). Use a "Button" widget (Switch mode).',
    actuatorWriteCode: (vPin) => [
      `  // Water Pump Control`,
      `  int pumpCmd = param.asInt();`,
      `  digitalWrite(PUMP_PIN, pumpCmd ? HIGH : LOW);`,
      `  Serial.printf("Pump → %s\\n", pumpCmd ? "ON" : "OFF");`,
    ],
  },

  // ── Displays (I2C — noted but no virtual pin needed) ──────────

  Display_OLED_SSD1306: {
    humanName: 'OLED Display (SSD1306)',
    pinName: 'OLED_SDA',
    defaultPin: 21,
    pinMode: 'OUTPUT',
    isAnalog: false,
    isI2C: true,
    datastreamHint: 'OLED displays render locally — no Blynk datastream needed. Data from other sensors can be shown on OLED inside sendSensorData().',
  },

  Display_LCD_16x2: {
    humanName: 'LCD 16x2',
    pinName: 'LCD_SDA',
    defaultPin: 21,
    pinMode: 'OUTPUT',
    isAnalog: false,
    isI2C: true,
    datastreamHint: 'LCD displays render locally — no Blynk datastream needed.',
  },

  // ── Inputs ────────────────────────────────────────────────────

  Input_Button: {
    humanName: 'Push Button',
    pinName: 'BUTTON_PIN',
    defaultPin: 32,
    pinMode: 'INPUT_PULLUP',
    isAnalog: false,
    isI2C: false,
    datastreamHint: 'Create 1 datastream: V? → Button State (Integer, 0-1). Use an "LED" indicator widget.',
    sensorReadCode: (vPin, sfx) => [
      `  // Push Button`,
      `  int btn${sfx} = digitalRead(BUTTON_PIN) == LOW ? 1 : 0;  // PULLUP: LOW = pressed`,
      `  Blynk.virtualWrite(${vPin}, btn${sfx});`,
      `  Serial.printf("Button → %s\\n", btn${sfx} ? "PRESSED" : "released");`,
    ],
  },

  Input_Potentiometer: {
    humanName: 'Potentiometer',
    pinName: 'POT_PIN',
    defaultPin: 35,
    pinMode: 'INPUT',
    isAnalog: true,
    isI2C: false,
    datastreamHint: 'Create 1 datastream: V? → Pot % (Integer, 0-100). Use a "Gauge" or "SuperChart" widget.',
    sensorReadCode: (vPin, sfx) => [
      `  // Potentiometer`,
      `  int potVal${sfx} = analogRead(POT_PIN);`,
      `  int potPct${sfx} = map(potVal${sfx}, 0, 4095, 0, 100);`,
      `  Blynk.virtualWrite(${vPin}, potPct${sfx});`,
      `  Serial.printf("Pot → %d%%\\n", potPct${sfx});`,
    ],
  },
};

// ── Pin collision resolver ─────────────────────────────────────
function assignPins(keys: string[]): Map<string, number> {
  const assigned = new Map<string, number>();
  const usedPins = new Set<number>();
  const analogPool = [34, 35, 32, 33, 36, 39];
  const outputPool = [2, 4, 5, 13, 14, 15, 16, 17, 18, 19];
  const inputPool  = [26, 27, 25, 23, 22];
  let ai = 0, oi = 0, ii = 0;

  for (const key of keys) {
    const cfg = BLYNK_COMPONENT_MAP[key];
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
      const pin = outputPool[oi++] ?? 19;
      assigned.set(key, pin); usedPins.add(pin);
    } else {
      while (ii < inputPool.length && usedPins.has(inputPool[ii])) ii++;
      const pin = inputPool[ii++] ?? 22;
      assigned.set(key, pin); usedPins.add(pin);
    }
  }
  return assigned;
}

// ── Human name helper ──────────────────────────────────────────
function toHumanName(key: string): string {
  return BLYNK_COMPONENT_MAP[key]?.humanName
    ?? key.replace(/^(Sensor_|Actuator_|Display_|Input_|MCU_)/, '').replace(/_/g, ' ');
}

// ── Virtual pin allocator ──────────────────────────────────────
// Sensors get V0, V1, V2... Actuators follow after sensors.
// DHT11 is special — needs two virtual pins (temp + humidity).
function assignVirtualPins(keys: string[]): Map<string, string> {
  const vMap = new Map<string, string>();
  let v = 0;
  for (const key of keys) {
    const cfg = BLYNK_COMPONENT_MAP[key];
    if (!cfg || cfg.isI2C) continue;
    vMap.set(key, `V${v}`);
    // DHT11 needs an extra vPin for humidity — reserve V(v+1)
    if (key === 'Sensor_DHT11') v += 2;
    else v += 1;
  }
  return vMap;
}

// ── Datastream guide builder ───────────────────────────────────
export function buildBlynkDatastreamGuide(components: string[]): string[] {
  const keys = components.filter(k => !k.startsWith('MCU_'));
  const vMap = assignVirtualPins(keys);
  const lines: string[] = [];
  let v = 0;

  for (const key of keys) {
    const cfg = BLYNK_COMPONENT_MAP[key];
    if (!cfg) continue;
    const vPin = vMap.get(key) ?? `V${v}`;
    if (key === 'Sensor_DHT11') {
      lines.push(`${vPin} → Temperature (Double, -40 to 80°C)`);
      lines.push(`V${v + 1} → Humidity (Integer, 0-100%)`);
    } else if (!cfg.isI2C) {
      lines.push(`${vPin} → ${cfg.humanName}`);
    }
    v = parseInt(vPin.replace('V', '')) + (key === 'Sensor_DHT11' ? 2 : 1);
  }
  return lines;
}

// ── Main code generator ────────────────────────────────────────
export function buildBlynkCode(
  components: string[],
  projectIdea: string
): string {
  const keys = components.filter(k => !k.startsWith('MCU_'));
  const pinMap  = assignPins(keys);
  const vMap    = assignVirtualPins(keys);
  const humanNames = keys.map(toHumanName);
  const projectTitle = projectIdea?.trim() || humanNames.join(' + ');

  // ── Libraries ────────────────────────────────────────────────
  const libraries = new Set<string>(['Blynk by Volodymyr Shymanskyy']);
  for (const key of keys) {
    BLYNK_COMPONENT_MAP[key]?.requiresLibrary?.forEach(l => libraries.add(l));
  }

  // ── Global declarations ───────────────────────────────────────
  const extraGlobals: string[] = [];
  for (const key of keys) {
    BLYNK_COMPONENT_MAP[key]?.globalDeclarations?.forEach(d => extraGlobals.push(d));
  }

  // ── Pin definitions ───────────────────────────────────────────
  const pinDefs = keys
    .filter(k => BLYNK_COMPONENT_MAP[k] && !BLYNK_COMPONENT_MAP[k].isI2C)
    .map(k => {
      const cfg = BLYNK_COMPONENT_MAP[k]!;
      const pin = pinMap.get(k) ?? cfg.defaultPin;
      return `const int ${cfg.pinName} = ${pin};   // ${cfg.humanName}`;
    });

  // ── pinMode calls ─────────────────────────────────────────────
  const pinModes = keys
    .filter(k => BLYNK_COMPONENT_MAP[k] && !BLYNK_COMPONENT_MAP[k].isI2C)
    .map(k => {
      const cfg = BLYNK_COMPONENT_MAP[k]!;
      return `  pinMode(${cfg.pinName}, ${cfg.pinMode});`;
    });

  // ── Extra setup code ──────────────────────────────────────────
  const extraSetup: string[] = [];
  for (const key of keys) {
    BLYNK_COMPONENT_MAP[key]?.setupCode?.forEach(l => extraSetup.push(`  ${l}`));
  }

  // ── sendSensorData() body ─────────────────────────────────────
  const sensorBlocks: string[] = [];
  for (const key of keys) {
    const cfg = BLYNK_COMPONENT_MAP[key];
    if (!cfg?.sensorReadCode) continue;
    const vPin = vMap.get(key) ?? 'V0';
    const sfx  = key.replace(/^(Sensor_|Input_)/, '').replace(/_/g, '');
    // DHT11: pass the humidity vPin as V(n+1)
    let resolvedVPin = vPin;
    if (key === 'Sensor_DHT11') {
      const vNum = parseInt(vPin.replace('V', ''));
      resolvedVPin = `V${vNum}`;
      // Inject the humidity vPin constant before the read block
      sensorBlocks.push(`  #define ${sfx}_HUM_VPIN V${vNum + 1}`);
    }
    cfg.sensorReadCode(resolvedVPin, sfx).forEach(l => sensorBlocks.push(l));
    sensorBlocks.push('');
  }

  // ── BLYNK_WRITE handlers ──────────────────────────────────────
  const actuatorHandlers: string[] = [];
  for (const key of keys) {
    const cfg = BLYNK_COMPONENT_MAP[key];
    if (!cfg?.actuatorWriteCode) continue;
    const vPin = vMap.get(key) ?? 'V0';
    actuatorHandlers.push(`BLYNK_WRITE(${vPin}) {  // ${cfg.humanName}`);
    cfg.actuatorWriteCode(vPin).forEach(l => actuatorHandlers.push(l));
    actuatorHandlers.push('}');
    actuatorHandlers.push('');
  }

  // ── Datastream reference comment ──────────────────────────────
  const datastreamRef = buildBlynkDatastreamGuide(components);
  const datastreamComment = datastreamRef.length > 0
    ? `// ── Virtual Pin Assignments (set these up in Blynk Console) ─\n` +
      datastreamRef.map(l => `// ${l}`).join('\n')
    : '// (no datastreams needed)';

  // ── I2C note ──────────────────────────────────────────────────
  const hasI2C = keys.some(k => BLYNK_COMPONENT_MAP[k]?.isI2C);
  const i2cNote = hasI2C
    ? '\n// ── I2C Components (SDA=GPIO21, SCL=GPIO22) ─────────────────\n// Initialise these in setup() using their own libraries.'
    : '';

  // ── Libraries list ────────────────────────────────────────────
  const libList = [...libraries].map(l => `//    • ${l}`).join('\n');

  // ── Assemble ──────────────────────────────────────────────────
  return `/* ============================================================
   CircuitMentor — Personalized Blynk IoT Project
   Project: ${projectTitle}
   Components: ${humanNames.join(', ')}
   Generated by CircuitMentor — not a generic template!
   ============================================================ */

// ── Required Libraries (Arduino IDE → Manage Libraries) ──────
// Install ALL of these before uploading:
${libList}

#define BLYNK_TEMPLATE_ID   "YOUR_TEMPLATE_ID"    // ← From Blynk Console → Template → Settings
#define BLYNK_TEMPLATE_NAME "YOUR_TEMPLATE_NAME"  // ← Your template name
#define BLYNK_AUTH_TOKEN    "YOUR_AUTH_TOKEN"      // ← From Blynk Console → Device → Auth Token

#include <WiFi.h>
#include <BlynkSimpleEsp32.h>
${extraGlobals.filter(l => l.startsWith('#include')).join('\n')}

// ── WiFi Credentials ─────────────────────────────────────────
const char* ssid     = "YOUR_WIFI_SSID";      // ← Your WiFi name
const char* password = "YOUR_WIFI_PASSWORD";  // ← Your WiFi password

// ── Pin Definitions ──────────────────────────────────────────
${pinDefs.join('\n')}
${i2cNote}

// ── Component Objects ─────────────────────────────────────────
${extraGlobals.filter(l => !l.startsWith('#include')).join('\n') || '// (none needed)'}

${datastreamComment}

BlynkTimer timer;

// ── Send sensor data to Blynk every 2 seconds ────────────────
void sendSensorData() {
${sensorBlocks.length > 0 ? sensorBlocks.join('\n') : '  // No sensors detected'}
}

// ── Receive commands from Blynk app ──────────────────────────
${actuatorHandlers.length > 0 ? actuatorHandlers.join('\n') : '// (no actuators to control)'}

// ── Setup ─────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);

  // Pin modes
${pinModes.join('\n') || '  // (none)'}

  // Component initialisation
${extraSetup.join('\n') || '  // (none)'}

  // Connect to WiFi + Blynk
  Blynk.begin(BLYNK_AUTH_TOKEN, ssid, password);

  // Schedule sensor reads every 2 seconds
  timer.setInterval(2000L, sendSensorData);

  Serial.println("✅ ${projectTitle} — Blynk Connected!");
}

// ── Loop ──────────────────────────────────────────────────────
void loop() {
  Blynk.run();   // Keep Blynk connection alive
  timer.run();   // Fire scheduled sendSensorData()
}`;
}
