/**
 * ============================================================
 * telegramCodeBuilder.ts — Dynamic Telegram Bot Code Generator
 * ============================================================
 * Takes the flat components array (registry keys from
 * conceptExtractor.ts) and generates a fully personalized
 * ESP32 Telegram bot .ino file — zero API calls.
 * ============================================================
 */

// ── Types ──────────────────────────────────────────────────────
interface ComponentConfig {
  humanName: string;
  pinName: string;
  defaultPin: number;
  pinMode: 'INPUT' | 'OUTPUT' | 'INPUT_PULLUP';
  isAnalog: boolean;
  isI2C: boolean;
  requiresLibrary?: string[];
  globalDeclarations?: string[];    // e.g. DHT dht(DHT_PIN, DHT11);
  setupCode?: string[];             // inside setup()
  statusCode?: string[];            // inside /status handler
  commandName?: string;             // e.g. "on", "off", "beep"
  commandCode?: string[];           // inside command handler
  commandReply?: string;            // bot reply message
}

// ── Component Registry ─────────────────────────────────────────
// Default pins are chosen to match wiringRulesEngine.ts conventions:
//   GPIO2  → first digital output (LED, built-in)
//   GPIO4  → second digital output
//   GPIO5  → third digital output
//   GPIO13 → relay
//   GPIO14 → buzzer / servo
//   GPIO34 → first analog input  (ADC1, WiFi-safe)
//   GPIO35 → second analog input
//   GPIO32 → third analog input
//   GPIO26 → PIR / digital sensor
//   GPIO27 → second digital sensor

const COMPONENT_MAP: Record<string, ComponentConfig> = {
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
    statusCode: [
      'float humidity    = dht.readHumidity();',
      'float temperature = dht.readTemperature();',
      'if (isnan(humidity) || isnan(temperature)) {',
      '  bot.sendMessage(chat_id, "❌ DHT11 read failed! Check wiring.", "");',
      '} else {',
      '  String dhtMsg = "🌡️ Temp: " + String(temperature, 1) + "°C\\n";',
      '  dhtMsg += "💧 Humidity: " + String(humidity, 1) + "%";',
      '  bot.sendMessage(chat_id, dhtMsg, "");',
      '}',
    ],
  },

  Sensor_PIR: {
    humanName: 'PIR Motion Sensor',
    pinName: 'PIR_PIN',
    defaultPin: 27,
    pinMode: 'INPUT',
    isAnalog: false,
    isI2C: false,
    statusCode: [
      'int motion = digitalRead(PIR_PIN);',
      'String pirMsg = motion ? "🚨 Motion DETECTED!" : "✅ No motion detected.";',
      'bot.sendMessage(chat_id, pirMsg, "");',
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
    statusCode: [
      'digitalWrite(TRIG_PIN, LOW);',
      'delayMicroseconds(2);',
      'digitalWrite(TRIG_PIN, HIGH);',
      'delayMicroseconds(10);',
      'digitalWrite(TRIG_PIN, LOW);',
      'long duration = pulseIn(ECHO_PIN, HIGH);',
      'float distance = duration * 0.034 / 2;',
      'String ultrasonicMsg = "📏 Distance: " + String(distance, 1) + " cm";',
      'bot.sendMessage(chat_id, ultrasonicMsg, "");',
    ],
  },

  Sensor_LDR: {
    humanName: 'LDR Light Sensor',
    pinName: 'LDR_PIN',
    defaultPin: 34,
    pinMode: 'INPUT',
    isAnalog: true,
    isI2C: false,
    statusCode: [
      'long sum = 0;',
      'for (int k = 0; k < 10; k++) { sum += analogRead(LDR_PIN); delay(10); }',
      'int light = sum / 10;',
      'String ldrLevel = light < 1000 ? "🌑 Dark" : light < 2500 ? "🌤️ Dim" : "☀️ Bright";',
      'String ldrMsg = "💡 Light Level: " + String(light) + " (" + ldrLevel + ")";',
      'bot.sendMessage(chat_id, ldrMsg, "");',
    ],
  },

  Sensor_MQ2_Gas: {
    humanName: 'MQ-2 Gas/Smoke Sensor',
    pinName: 'GAS_PIN',
    defaultPin: 35,
    pinMode: 'INPUT',
    isAnalog: true,
    isI2C: false,
    statusCode: [
      'long sum = 0;',
      'for (int k = 0; k < 10; k++) { sum += analogRead(GAS_PIN); delay(10); }',
      'int gasLevel = sum / 10;',
      'String gasStatus = gasLevel > 2000 ? "⚠️ HIGH — Ventilate now!" : "✅ Normal";',
      'String gasMsg = "💨 Gas Level: " + String(gasLevel) + " — " + gasStatus;',
      'bot.sendMessage(chat_id, gasMsg, "");',
    ],
  },

  Sensor_Soil_Moisture: {
    humanName: 'Soil Moisture Sensor',
    pinName: 'SOIL_PIN',
    defaultPin: 34,
    pinMode: 'INPUT',
    isAnalog: true,
    isI2C: false,
    statusCode: [
      'long sum = 0;',
      'for (int k = 0; k < 10; k++) { sum += analogRead(SOIL_PIN); delay(10); }',
      'int moisture = sum / 10;',
      'int percent = map(moisture, 4095, 0, 0, 100);',
      'String soilLevel = percent < 30 ? "🏜️ Dry — needs water!" : percent < 70 ? "🌱 Moist — OK" : "💧 Wet";',
      'String soilMsg = "🪴 Soil Moisture: " + String(percent) + "% — " + soilLevel;',
      'bot.sendMessage(chat_id, soilMsg, "");',
    ],
  },

  Sensor_Rain: {
    humanName: 'Rain Sensor',
    pinName: 'RAIN_PIN',
    defaultPin: 34,
    pinMode: 'INPUT',
    isAnalog: true,
    isI2C: false,
    statusCode: [
      'int rainRaw = analogRead(RAIN_PIN);',
      'String rainStatus = rainRaw < 1500 ? "🌧️ Rain detected!" : "☀️ No rain.";',
      'String rainMsg = "🌂 Rain Sensor: " + String(rainRaw) + " — " + rainStatus;',
      'bot.sendMessage(chat_id, rainMsg, "");',
    ],
  },

  Sensor_Flame: {
    humanName: 'Flame Sensor',
    pinName: 'FLAME_PIN',
    defaultPin: 27,
    pinMode: 'INPUT',
    isAnalog: false,
    isI2C: false,
    statusCode: [
      'int flame = digitalRead(FLAME_PIN);',
      'String flameMsg = flame == LOW ? "🔥 FLAME DETECTED! Take action!" : "✅ No flame detected.";',
      'bot.sendMessage(chat_id, flameMsg, "");',
    ],
  },

  Sensor_Sound: {
    humanName: 'Sound Sensor',
    pinName: 'SOUND_PIN',
    defaultPin: 27,
    pinMode: 'INPUT',
    isAnalog: false,
    isI2C: false,
    statusCode: [
      'int sound = digitalRead(SOUND_PIN);',
      'String soundMsg = sound ? "🔊 Sound detected!" : "🔇 Quiet.";',
      'bot.sendMessage(chat_id, soundMsg, "");',
    ],
  },

  Sensor_IR_Obstacle: {
    humanName: 'IR Obstacle Sensor',
    pinName: 'IR_PIN',
    defaultPin: 27,
    pinMode: 'INPUT',
    isAnalog: false,
    isI2C: false,
    statusCode: [
      'int obstacle = digitalRead(IR_PIN);',
      'String irMsg = obstacle == LOW ? "🚧 Obstacle detected!" : "✅ Path clear.";',
      'bot.sendMessage(chat_id, irMsg, "");',
    ],
  },

  Sensor_Heartbeat: {
    humanName: 'Heartbeat / Pulse Sensor',
    pinName: 'PULSE_PIN',
    defaultPin: 34,
    pinMode: 'INPUT',
    isAnalog: true,
    isI2C: false,
    statusCode: [
      'int pulse = analogRead(PULSE_PIN);',
      'String pulseMsg = "❤️ Pulse Raw Value: " + String(pulse) + "\\n(Use a proper BPM library for real heart rate)";',
      'bot.sendMessage(chat_id, pulseMsg, "");',
    ],
  },

  Sensor_Temperature_LM35: {
    humanName: 'LM35 Temperature Sensor',
    pinName: 'LM35_PIN',
    defaultPin: 34,
    pinMode: 'INPUT',
    isAnalog: true,
    isI2C: false,
    statusCode: [
      'int raw = analogRead(LM35_PIN);',
      'float voltage = raw * (3.3 / 4095.0);',
      'float tempC = voltage * 100.0;',
      'String lm35Msg = "🌡️ Temperature: " + String(tempC, 1) + "°C";',
      'bot.sendMessage(chat_id, lm35Msg, "");',
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
    commandName: 'led',
    commandCode: [
      'if (text == "/ledon") {',
      '  digitalWrite(LED_PIN, HIGH);',
      '  bot.sendMessage(chat_id, "💡 LED turned ON", "");',
      '}',
      'else if (text == "/ledoff") {',
      '  digitalWrite(LED_PIN, LOW);',
      '  bot.sendMessage(chat_id, "🌑 LED turned OFF", "");',
      '}',
    ],
  },

  Actuator_Relay_5V: {
    humanName: 'Relay',
    pinName: 'RELAY_PIN',
    defaultPin: 13,
    pinMode: 'OUTPUT',
    isAnalog: false,
    isI2C: false,
    commandCode: [
      'if (text == "/relayon") {',
      '  digitalWrite(RELAY_PIN, LOW);   // Most relay modules are ACTIVE LOW',
      '  bot.sendMessage(chat_id, "⚡ Relay ON — device powered", "");',
      '}',
      'else if (text == "/relayoff") {',
      '  digitalWrite(RELAY_PIN, HIGH);',
      '  bot.sendMessage(chat_id, "🔌 Relay OFF — device unpowered", "");',
      '}',
    ],
  },

  Actuator_Buzzer: {
    humanName: 'Buzzer',
    pinName: 'BUZZER_PIN',
    defaultPin: 14,
    pinMode: 'OUTPUT',
    isAnalog: false,
    isI2C: false,
    commandCode: [
      'if (text == "/beep") {',
      '  digitalWrite(BUZZER_PIN, HIGH);',
      '  delay(500);',
      '  digitalWrite(BUZZER_PIN, LOW);',
      '  bot.sendMessage(chat_id, "🔔 Beep sent!", "");',
      '}',
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
    commandCode: [
      'if (text == "/open") {',
      '  myServo.write(90);',
      '  bot.sendMessage(chat_id, "🔓 Servo moved to 90°", "");',
      '}',
      'else if (text == "/close") {',
      '  myServo.write(0);',
      '  bot.sendMessage(chat_id, "🔒 Servo moved to 0°", "");',
      '}',
    ],
  },

  Actuator_Water_Pump: {
    humanName: 'Water Pump / DC Motor',
    pinName: 'PUMP_PIN',
    defaultPin: 13,
    pinMode: 'OUTPUT',
    isAnalog: false,
    isI2C: false,
    commandCode: [
      'if (text == "/pumpon") {',
      '  digitalWrite(PUMP_PIN, HIGH);',
      '  bot.sendMessage(chat_id, "💧 Pump ON — watering...", "");',
      '}',
      'else if (text == "/pumpoff") {',
      '  digitalWrite(PUMP_PIN, LOW);',
      '  bot.sendMessage(chat_id, "✅ Pump OFF", "");',
      '}',
    ],
  },

  // ── Displays (no Telegram commands, just noted in boot) ───────
  Display_OLED_SSD1306: {
    humanName: 'OLED Display (SSD1306)',
    pinName: 'OLED_SDA',
    defaultPin: 21,
    pinMode: 'OUTPUT',
    isAnalog: false,
    isI2C: true,
  },

  Display_LCD_16x2: {
    humanName: 'LCD 16x2',
    pinName: 'LCD_SDA',
    defaultPin: 21,
    pinMode: 'OUTPUT',
    isAnalog: false,
    isI2C: true,
  },

  // ── Inputs ────────────────────────────────────────────────────
  Input_Button: {
    humanName: 'Push Button',
    pinName: 'BUTTON_PIN',
    defaultPin: 32,
    pinMode: 'INPUT_PULLUP',
    isAnalog: false,
    isI2C: false,
    statusCode: [
      'int btn = digitalRead(BUTTON_PIN);',
      'String msg = btn == LOW ? "🔘 Button is PRESSED" : "⬜ Button is RELEASED";',
      'bot.sendMessage(chat_id, msg, "");',
    ],
  },

  Input_Potentiometer: {
    humanName: 'Potentiometer',
    pinName: 'POT_PIN',
    defaultPin: 35,
    pinMode: 'INPUT',
    isAnalog: true,
    isI2C: false,
    statusCode: [
      'int potVal = analogRead(POT_PIN);',
      'int percent = map(potVal, 0, 4095, 0, 100);',
      'String msg = "🎚️ Potentiometer: " + String(percent) + "%";',
      'bot.sendMessage(chat_id, msg, "");',
    ],
  },
};

// ── Pin collision resolver ─────────────────────────────────────
// Ensures no two components share the same GPIO pin
function assignPins(keys: string[]): Map<string, number> {
  const assigned = new Map<string, number>();
  const usedPins = new Set<number>();

  // Preferred analog pins (ADC1 only — ADC2 is blocked when WiFi is on)
  const analogPool = [34, 35, 32, 33, 36, 39];
  const digitalOutputPool = [2, 4, 5, 13, 14, 15, 16, 17, 18, 19];
  const digitalInputPool = [26, 27, 25, 23, 22];

  let analogIdx = 0, outputIdx = 0, inputIdx = 0;

  for (const key of keys) {
    const cfg = COMPONENT_MAP[key];
    if (!cfg) continue;

    // Try default pin first
    if (!usedPins.has(cfg.defaultPin)) {
      assigned.set(key, cfg.defaultPin);
      usedPins.add(cfg.defaultPin);
      continue;
    }

    // Fallback to pool
    if (cfg.isAnalog) {
      while (analogIdx < analogPool.length && usedPins.has(analogPool[analogIdx])) analogIdx++;
      const pin = analogPool[analogIdx++] ?? 39;
      assigned.set(key, pin);
      usedPins.add(pin);
    } else if (cfg.pinMode === 'OUTPUT') {
      while (outputIdx < digitalOutputPool.length && usedPins.has(digitalOutputPool[outputIdx])) outputIdx++;
      const pin = digitalOutputPool[outputIdx++] ?? 19;
      assigned.set(key, pin);
      usedPins.add(pin);
    } else {
      while (inputIdx < digitalInputPool.length && usedPins.has(digitalInputPool[inputIdx])) inputIdx++;
      const pin = digitalInputPool[inputIdx++] ?? 22;
      assigned.set(key, pin);
      usedPins.add(pin);
    }
  }

  return assigned;
}

// ── Human name helper ──────────────────────────────────────────
function toHumanName(key: string): string {
  return COMPONENT_MAP[key]?.humanName
    ?? key.replace(/^(Sensor_|Actuator_|Display_|Input_|MCU_)/, '').replace(/_/g, ' ');
}

// ── Command list builder ───────────────────────────────────────
function buildCommandList(keys: string[]): string[] {
  const cmds: string[] = ['/status — Read all sensor values'];
  for (const key of keys) {
    const cfg = COMPONENT_MAP[key];
    if (!cfg?.commandCode) continue;
    if (key === 'Actuator_LED')        { cmds.push('/ledon  — Turn LED ON'); cmds.push('/ledoff — Turn LED OFF'); }
    if (key === 'Actuator_Relay_5V')   { cmds.push('/relayon  — Turn relay ON'); cmds.push('/relayoff — Turn relay OFF'); }
    if (key === 'Actuator_Buzzer')     { cmds.push('/beep — Trigger buzzer'); }
    if (key === 'Actuator_Servo_SG90') { cmds.push('/open — Servo to 90°'); cmds.push('/close — Servo to 0°'); }
    if (key === 'Actuator_Water_Pump') { cmds.push('/pumpon — Start pump'); cmds.push('/pumpoff — Stop pump'); }
  }
  return cmds;
}

// ── Main code generator ───────────────────────────────────────
export function buildTelegramCode(
  components: string[],
  projectIdea: string
): string {
  // Filter out MCU keys — not physical components
  const keys = components.filter(k => !k.startsWith('MCU_'));

  const pinMap = assignPins(keys);
  const humanNames = keys.map(toHumanName);
  const projectTitle = projectIdea?.trim() || humanNames.join(' + ');

  // Collect unique libraries
  const libraries = new Set<string>();
  for (const key of keys) {
    const cfg = COMPONENT_MAP[key];
    cfg?.requiresLibrary?.forEach(l => libraries.add(l));
  }
  libraries.add('UniversalTelegramBot by Brian Lough');
  libraries.add('ArduinoJson (version 6.x.x)');

  // Collect extra global declarations (e.g. DHT object)
  const extraGlobals: string[] = [];
  for (const key of keys) {
    const cfg = COMPONENT_MAP[key];
    cfg?.globalDeclarations?.forEach(d => extraGlobals.push(d));
  }

  // Build pin definitions
  const pinDefs = keys
    .filter(k => COMPONENT_MAP[k] && !COMPONENT_MAP[k].isI2C)
    .map(k => {
      const cfg = COMPONENT_MAP[k]!;
      const pin = pinMap.get(k) ?? cfg.defaultPin;
      return `const int ${cfg.pinName} = ${pin};   // ${cfg.humanName}`;
    });

  // Build pinMode calls
  const pinModes = keys
    .filter(k => COMPONENT_MAP[k] && !COMPONENT_MAP[k].isI2C)
    .map(k => {
      const cfg = COMPONENT_MAP[k]!;
      return `  pinMode(${cfg.pinName}, ${cfg.pinMode});`;
    });

  // Build extra setup code
  const extraSetup: string[] = [];
  for (const key of keys) {
    const cfg = COMPONENT_MAP[key];
    cfg?.setupCode?.forEach(line => extraSetup.push(`  ${line}`));
  }

  // Build /status handler
  const statusBlocks: string[] = [];
  for (const key of keys) {
    const cfg = COMPONENT_MAP[key];
    if (cfg?.statusCode) {
      statusBlocks.push(`    // ${cfg.humanName}`);
      cfg.statusCode.forEach(line => statusBlocks.push(`    ${line}`));
      statusBlocks.push('');
    }
  }

  // If no sensors have status, add a default message
  if (statusBlocks.length === 0) {
    statusBlocks.push('    bot.sendMessage(chat_id, "✅ System is running!", "");');
  }

  // Build actuator command blocks
  const commandBlocks: string[] = [];
  for (const key of keys) {
    const cfg = COMPONENT_MAP[key];
    if (cfg?.commandCode) {
      commandBlocks.push(`    // ${cfg.humanName}`);
      cfg.commandCode.forEach(line => commandBlocks.push(`    ${line}`));
      commandBlocks.push('    else');
    }
  }
  // Remove trailing "else"
  if (commandBlocks[commandBlocks.length - 1] === '    else') {
    commandBlocks.pop();
  }

  // Build welcome message
  const commandList = buildCommandList(keys);
  const welcomeLines = commandList.map(c => `      welcome += "• ${c}\\\\n";`).join('\n');

  // Boot message
  const bootMsg = `🚀 ${projectTitle} — Online & Ready!`;

  // I2C note if needed
  const hasI2C = keys.some(k => COMPONENT_MAP[k]?.isI2C);
  const i2cNote = hasI2C
    ? '\n// ── I2C Components (SDA=GPIO21, SCL=GPIO22 on ESP32) ────────\n// Initialize these in setup() using their respective libraries.'
    : '';

  // Libraries comment
  const libList = [...libraries].map(l => `//    • ${l}`).join('\n');

  // ── Assemble final code ────────────────────────────────────────
  return `/* ============================================================
   CircuitMentor — Personalized Telegram Bot
   Project: ${projectTitle}
   Components: ${humanNames.join(', ')}
   Generated by CircuitMentor — not a generic template!
   ============================================================ */

// ── Required Libraries (Arduino IDE → Manage Libraries) ──────
// Install these before uploading:
${libList}

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <UniversalTelegramBot.h>
#include <ArduinoJson.h>
${extraGlobals.filter(l => l.startsWith('#include')).join('\n')}

// ── WiFi & Telegram Credentials ──────────────────────────────
const char* ssid     = "YOUR_WIFI_SSID";      // ← Your WiFi name
const char* password = "YOUR_WIFI_PASSWORD";  // ← Your WiFi password

#define BOT_TOKEN "YOUR_BOT_TOKEN_HERE"       // ← From BotFather
#define CHAT_ID   "YOUR_CHAT_ID_HERE"         // ← From @RawDataBot

WiFiClientSecure client;
UniversalTelegramBot bot(BOT_TOKEN, client);

// ── Pin Definitions ──────────────────────────────────────────
${pinDefs.join('\n')}
${i2cNote}

// ── Component Objects ─────────────────────────────────────────
${extraGlobals.filter(l => !l.startsWith('#include')).join('\n') || '// (none needed for these components)'}

int botRequestDelay = 1000;
unsigned long lastTimeBotRan;
bool firstBoot = true;

// ── Telegram Message Handler ──────────────────────────────────
void handleNewMessages(int numNewMessages) {
  for (int i = 0; i < numNewMessages; i++) {
    String chat_id  = String(bot.messages[i].chat_id);
    String text     = bot.messages[i].text;
    String from_name = bot.messages[i].from_name;

    Serial.println("📨 Received: " + text + " from " + from_name);

    // Security: only YOUR chat ID can control this device
    if (chat_id != CHAT_ID) {
      bot.sendMessage(chat_id, "⛔ Unauthorized access blocked.", "");
      continue;
    }

    if (text == "/start") {
      String welcome = "👋 Welcome, " + from_name + "!\\n";
      welcome += "📦 Project: ${projectTitle}\\n\\n";
      welcome += "Available commands:\\n";
${welcomeLines}
      bot.sendMessage(chat_id, welcome, "");
    }

    else if (text == "/status") {
${statusBlocks.join('\n')}
    }

${commandBlocks.join('\n')}

    else {
      bot.sendMessage(chat_id, "❓ Unknown command. Send /start for the list.", "");
    }
  }
}

// ── Setup ─────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);

  // Pin modes
${pinModes.join('\n')}

  // Component initialisation
${extraSetup.join('\n') || '  // (no extra setup needed)'}

  // Connect to WiFi
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  client.setInsecure(); // Fixes SSL cert errors on newer ESP32 cores

  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.print(".");
  }
  Serial.println("\\n✅ WiFi Connected! IP: " + WiFi.localIP().toString());
}

// ── Loop ──────────────────────────────────────────────────────
void loop() {
  // Auto-reconnect if WiFi drops
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ WiFi lost — reconnecting...");
    WiFi.begin(ssid, password);
    while (WiFi.status() != WL_CONNECTED) delay(1000);
    Serial.println("✅ Reconnected!");
  }

  if (millis() > lastTimeBotRan + botRequestDelay) {
    if (firstBoot) {
      bot.sendMessage(CHAT_ID, "${bootMsg}", "");
      firstBoot = false;
    }
    int numNewMessages = bot.getUpdates(bot.last_message_received + 1);
    if (numNewMessages > 0) handleNewMessages(numNewMessages);
    lastTimeBotRan = millis();
  }
}`;
}
