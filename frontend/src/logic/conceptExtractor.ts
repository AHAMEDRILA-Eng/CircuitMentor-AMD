/**
 * ============================================================
 * conceptExtractor.ts — Keyword-based Local Concept Builder
 * ============================================================
 * Builds a {inputs, logic, outputs} concept from a user's
 * text prompt entirely on the frontend — zero API calls.
 *
 * Uses WORD-BOUNDARY matching so 'oled' never matches 'led',
 * and 'light' context is disambiguated correctly.
 * ============================================================
 */

interface Concept {
    inputs: string[];
    logic: string[];
    outputs: string[];
}

// ── Word-boundary keyword test ─────────────────────────────────────────────────
// Matches whole words only: 'led' matches "led" or "LED" but NOT "oled" or "bled"
function hasWord(text: string, word: string): boolean {
    if (word.includes(' ')) return text.includes(word);  // multi-word: substring OK
    return new RegExp(`(?<![a-z])${word}(?![a-z])`).test(text);
}

// ── Keyword → component mapping ───────────────────────────────────────────────
// exact: true  → use word-boundary match (prevents 'led' inside 'oled')
// exact: false → plain substring match (safe for unique strings like 'buzzer')

const SENSOR_KEYWORDS: Array<{ keywords: string[]; component: string; exact?: boolean }> = [
    { keywords: ['pir', 'motion', 'movement', 'presence'],                                  component: 'Sensor_PIR' },
    { keywords: ['ultrasonic', 'hc-sr04', 'hcsr04', 'distance', 'sonar'],                  component: 'Sensor_HC_SR04' },
    { keywords: ['dht11', 'dht 11', 'dht22', 'dht 22', ' DHT 11' ,'DHT11' , 'DHT22' , 'DHT 22' ,'temperature', 'temperatur', 'temp', 'humidity'], component: 'Sensor_DHT11' },
    { keywords: ['ldr', 'photoresistor', 'brightness', 'luminance'],                        component: 'Sensor_LDR',        exact: true },
    { keywords: ['flame', 'fire'],                                                           component: 'Sensor_Flame' },
    { keywords: ['gas', 'smoke', 'mq2', 'mq-2', 'carbon'],                                 component: 'Sensor_MQ2_Gas' },
    { keywords: ['sound sensor', 'sound detecting', 'clap sensor', 'ky-038', 'ky038', 'microphone', 'clap'], component: 'Sensor_Sound' },
    { keywords: ['soil', 'moisture', 'irrigation', 'plant'],                                component: 'Sensor_Soil_Moisture' },
    { keywords: ['rain', 'raindrop', 'rainfall'],                                           component: 'Sensor_Rain' },
    { keywords: ['ir sensor', 'ir obstacle', 'infrared sensor', 'obstacle sensor', 'infrared obstacle'], component: 'Sensor_IR_Obstacle' },
    { keywords: ['heart rate', 'heartbeat', 'pulse oximeter', 'bpm'],                      component: 'Sensor_DHT11' }, // Placeholder — no MAX30102 def yet
    { keywords: ['lm35'],                                                                   component: 'Sensor_Temperature_LM35' },
];

const INPUT_KEYWORDS: Array<{ keywords: string[]; component: string; exact?: boolean }> = [
    { keywords: ['button', 'push button', 'press'],            component: 'Input_Button' },
    { keywords: ['potentiometer', 'knob', 'dial'],             component: 'Input_Potentiometer' },
    { keywords: ['keypad', 'keyboard'],                        component: 'Input_Keypad' },
    { keywords: ['joystick'],                                  component: 'Input_Joystick' },
];

// IMPORTANT: 'led' uses exact:true so it won't match inside 'oled'
const ACTUATOR_KEYWORDS: Array<{ keywords: string[]; component: string; exact?: boolean }> = [
    { keywords: ['led', 'blink', 'indicator', 'lamp', 'glow'], component: 'Actuator_LED',       exact: true },
    { keywords: ['buzzer', 'alarm', 'beep', 'alert', 'horn'],  component: 'Actuator_Buzzer' },
    { keywords: ['servo', 'servo motor', 'motor arm'],          component: 'Actuator_Servo_SG90' },
    { keywords: ['relay', 'mains', '220v', 'ac load'],          component: 'Actuator_Relay_5V' },
    { keywords: ['dc fan', 'fan', 'cooling fan'],               component: 'Actuator_Fan' },
    { keywords: ['dc motor', 'motor driver', 'l298n'],          component: 'Actuator_DC_Motor' },
    { keywords: ['pump', 'water pump'],                         component: 'Actuator_Water_Pump' },
    { keywords: ['neopixel', 'rgb led', 'ws2812'],              component: 'Actuator_LED' },
];

const DISPLAY_KEYWORDS: Array<{ keywords: string[]; component: string; exact?: boolean }> = [
    // OLED must come before LCD to prevent 'oled' being missed
    { keywords: ['oled', 'ssd1306', 'i2c display', '128x64', '0.96'],  component: 'Display_OLED_SSD1306' },
    { keywords: ['lcd', '16x2', 'liquid crystal', '1602'],             component: 'Display_LCD_16x2' },
    { keywords: ['7segment', '7-segment', 'seven segment'],            component: 'Display_7Segment' },
];

// ── Power source detection ────────────────────────────────────────────────────
const POWER_KEYWORDS: Array<{ keywords: string[]; component: string; exact?: boolean }> = [
    { keywords: ['9v battery', '9v', 'battery'],          component: 'Power_9V_Battery' },
    { keywords: ['12v adapter', '12v', 'adapter'],        component: 'Power_12V_Adapter' },
    { keywords: ['lm7805', '7805', 'voltage regulator'],  component: 'Power_LM7805' },
];

// ── MCU / Platform detection ───────────────────────────────────────────────────
const MCU_KEYWORDS = ['esp32', 'esp 32', 'esp8266', 'esp 8266', 'nodemcu', 'node mcu', 'wifi', 'bluetooth', 'iot', 'cloud', 'internet', 'remote', 'telegram', 'blynk'];

function normalize(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function matchKeywords(
    text: string,
    groups: Array<{ keywords: string[]; component: string; exact?: boolean }>
): string[] {
    const found: string[] = [];
    const seen = new Set<string>();
    for (const group of groups) {
        for (const keyword of group.keywords) {
            const matched = group.exact ? hasWord(text, keyword) : text.includes(keyword);
            if (matched && !seen.has(group.component)) {
                found.push(group.component);
                seen.add(group.component);
                break;
            }
        }
    }
    return found;
}

// ── Main export ───────────────────────────────────────────────────────────────
export function extractConceptFromPrompt(prompt: string): Concept {
    const text = normalize(prompt);

    const sensors   = matchKeywords(text, SENSOR_KEYWORDS);
    const inputs    = matchKeywords(text, INPUT_KEYWORDS);
    const actuators = matchKeywords(text, ACTUATOR_KEYWORDS);
    const displays  = matchKeywords(text, DISPLAY_KEYWORDS);
    const power     = matchKeywords(text, POWER_KEYWORDS);

    const isEsp = MCU_KEYWORDS.some(k => text.includes(k));
    const mcu = isEsp ? 'MCU_ESP32' : 'MCU_Arduino_Uno';

    const hasInputs  = sensors.length > 0 || inputs.length > 0;
    const hasOutputs = actuators.length > 0 || displays.length > 0;

    if (!hasInputs && !hasOutputs) {
        // Truly empty prompt → basic default circuit
        sensors.push('Sensor_PIR');
        actuators.push('Actuator_LED');
    } else if (!hasOutputs) {
        // Only inputs detected → add a default LED so circuit has an output
        actuators.push('Actuator_LED');
    }
    // If only outputs (e.g. "arduino with oled") → no default sensor added

    return {
        inputs:  [...sensors, ...inputs],
        logic:   [mcu],
        outputs: [...actuators, ...displays, ...power],
    };
}
