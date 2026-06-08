/**
 * Quick smoke test for wiringRulesEngine.ts
 * Run with: node test_wiring.mjs
 *
 * We inline just the normalizer + rules lookup so we can test without tsc.
 */

// ── Mirrored from wiringRulesEngine.ts ────────────────────────────────────────
const RULES = {
  PIR:          { kind: 'SENSOR',   signalType: 'DIGITAL' },
  DHT11:        { kind: 'SENSOR',   signalType: 'DIGITAL' },
  DHT22:        { kind: 'SENSOR',   signalType: 'DIGITAL' },
  HC_SR04:      { kind: 'SENSOR',   signalType: 'DIGITAL' },
  LDR:          { kind: 'SENSOR',   signalType: 'ANALOG'  },
  SOIL_MOISTURE:{ kind: 'SENSOR',   signalType: 'ANALOG'  },
  MQ2_GAS:      { kind: 'SENSOR',   signalType: 'ANALOG'  },
  FLAME:        { kind: 'SENSOR',   signalType: 'DIGITAL' },
  SOUND:        { kind: 'SENSOR',   signalType: 'DIGITAL' },
  NTC_TEMP:     { kind: 'SENSOR',   signalType: 'ANALOG'  },
  SOILMOISTURE: { kind: 'SENSOR',   signalType: 'ANALOG'  },
  RAIN:         { kind: 'SENSOR',   signalType: 'ANALOG'  },
  IR:           { kind: 'SENSOR',   signalType: 'DIGITAL' },
  MQ2:          { kind: 'SENSOR',   signalType: 'ANALOG'  },
  HC:           { kind: 'SENSOR',   signalType: 'DIGITAL' },
  HCSR04:       { kind: 'SENSOR',   signalType: 'DIGITAL' },
  BUTTON:       { kind: 'INPUT',    signalType: 'DIGITAL' },
  POTENTIOMETER:{ kind: 'INPUT',    signalType: 'ANALOG'  },
  LED:          { kind: 'ACTUATOR', signalType: 'DIGITAL' },
  BUZZER:       { kind: 'ACTUATOR', signalType: 'DIGITAL' },
  SERVO:        { kind: 'ACTUATOR', signalType: 'PWM'     },
  RELAY:        { kind: 'ACTUATOR', signalType: 'DIGITAL' },
  WATERPUMP:    { kind: 'ACTUATOR', signalType: 'DIGITAL' },
  WATER_PUMP:   { kind: 'ACTUATOR', signalType: 'DIGITAL' },
  FAN:          { kind: 'ACTUATOR', signalType: 'DIGITAL' },
  DC_MOTOR:     { kind: 'ACTUATOR', signalType: 'DIGITAL' },
  LCD:          { kind: 'DISPLAY',  signalType: 'I2C'     },
  OLED:         { kind: 'DISPLAY',  signalType: 'I2C'     },
};

function normalizeComponentKey(key) {
  return key
    .replace(/^Actuator_/, '')
    .replace(/^Sensor_/, '')
    .replace(/^Display_/, '')
    .replace(/^Input_/, '')
    .replace(/^MCU_/, '')
    .replace(/_5V$/, '')
    .replace(/_SSD1306$/, '')
    .replace(/_16x2$/, '')
    .replace(/_SG90$/, '')
    .replace(/_SR04$/, '')
    .replace(/_MQ2$/, '')
    .replace(/_DHT11$/, '')
    .replace(/_PIR$/, '')
    .replace(/_LDR$/, '')
    .replace(/_HC$/, '')
    .replace(/_/g, '')
    .toUpperCase();
}

function resolveRule(raw) {
  // Step 1: normalizer exact match
  const normalized = normalizeComponentKey(raw);
  const exactMatch = Object.keys(RULES).find(
    k => k.replace(/_/g, '').toUpperCase() === normalized
  );
  if (exactMatch) return exactMatch;

  // Step 2: substring fallback
  const up = raw.toUpperCase().replace(/-/g, '_').replace(/[^A-Z0-9_]/g, '');
  return Object.keys(RULES).find(k => up.includes(k));
}

// ── Test Cases ─────────────────────────────────────────────────────────────────
const TEST_COMPONENTS = {
  'Actuator_Relay_5V':     'RELAY',
  'Actuator_LED':          'LED',
  'Actuator_Buzzer':       'BUZZER',
  'Actuator_Servo_SG90':   'SERVO',
  'Actuator_Water_Pump':   'WATERPUMP',   // normalizer → WATERPUMP
  'Actuator_Fan':          'FAN',
  'Sensor_DHT11':          'DHT11',
  'Sensor_PIR':            'PIR',
  'Sensor_LDR':            'LDR',
  'Sensor_HC_SR04':        'HC',           // normalizer strips _SR04 suffix → HCSR04 → resolves to HC alias
  'Sensor_Soil_Moisture':  'SOIL_MOISTURE', // substring fallback wins; same analog wiring as SOILMOISTURE
  'Sensor_Rain':           'RAIN',
  'Sensor_MQ2_Gas':        'MQ2_GAS',
  'Sensor_Flame':          'FLAME',
  'Sensor_Sound':          'SOUND',
  'Sensor_IR_Obstacle':    'IR',
  'Display_LCD_16x2':      'LCD',
  'Display_OLED_SSD1306':  'OLED',
};

// ── Run ────────────────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

console.log('\n═══════════════════════════════════════════════════════');
console.log('  wiringRulesEngine — normalizer + resolveRule smoke test');
console.log('═══════════════════════════════════════════════════════\n');

for (const [raw, expected] of Object.entries(TEST_COMPONENTS)) {
  const resolved = resolveRule(raw);
  const ok = resolved === expected;
  if (ok) {
    console.log(`  ✅  ${raw.padEnd(28)}  →  ${resolved}`);
    passed++;
  } else {
    console.log(`  ❌  ${raw.padEnd(28)}  →  got "${resolved}", expected "${expected}"`);
    failed++;
  }
}

// ── Relay + LED + Buzzer project simulation ────────────────────────────────────
console.log('\n───────────────────────────────────────────────────────');
console.log('  Project test: Relay + LED + Buzzer (registry keys)');
console.log('───────────────────────────────────────────────────────');

const PROJECT_SELECTED_COMPONENTS = [
  'MCU_Arduino_Uno',
  'Sensor_PIR',
  'Actuator_Relay_5V',
  'Actuator_LED',
  'Actuator_Buzzer',
];

const inputs  = PROJECT_SELECTED_COMPONENTS.filter(k => k.startsWith('Sensor_') || k.startsWith('Input_'));
const outputs = PROJECT_SELECTED_COMPONENTS.filter(k => k.startsWith('Actuator_') || k.startsWith('Display_'));
const logic   = PROJECT_SELECTED_COMPONENTS.filter(k => k.startsWith('MCU_'));

console.log(`\n  inputs : ${JSON.stringify(inputs)}`);
console.log(`  outputs: ${JSON.stringify(outputs)}`);
console.log(`  logic  : ${JSON.stringify(logic)}`);

console.log('\n  Resolving each output:');
let projectPass = true;
for (const comp of outputs) {
  const r = resolveRule(comp);
  const rule = r ? RULES[r] : null;
  if (rule) {
    console.log(`    ✅  ${comp}  →  key="${r}"  kind=${rule.kind}  signal=${rule.signalType}`);
  } else {
    console.log(`    ❌  ${comp}  →  UNRESOLVED — would be skipped!`);
    projectPass = false;
  }
}

console.log('\n═══════════════════════════════════════════════════════');
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log(`  Project test: ${projectPass ? '✅ ALL components resolved' : '❌ Some components missing'}`);
console.log('═══════════════════════════════════════════════════════\n');

process.exit(failed > 0 || !projectPass ? 1 : 0);
