/**
 * ============================================================
 * componentDefs.ts — Shared Component Visual Definitions
 * ============================================================
 * Extracted from CircuitCanvas.tsx so both the schematic
 * ReactFlow view and the breadboard SVG view can resolve
 * component images, Wokwi tags, and pin positions from a
 * single source of truth.
 * ============================================================
 */

import type { CircuitNode } from './wiringRulesEngine';

// ── Wire colours (re-exported for consumers) ──────────────────────────────────
export const C = {
    VCC:    '#ef4444',
    GND:    '#94a3b8',
    SIGNAL: '#fbbf24',
    ANALOG: '#fb923c',
    PWM:    '#c084fc',
    DATA:   '#22d3ee',
    I2C:    '#60a5fa',
} as const;

// ── Types ─────────────────────────────────────────────────────────────────────
export interface PinDef { id: string; xPct: number; yPct: number; color: string; }

export interface CompDef {
    tag:        string;          // Wokwi custom element tag, or '' for image-based
    svgUrl?:    string;
    imageUrl?:  string;          // static image from backend or CDN
    isFritzing?: boolean;
    renderW:    number;
    renderH:    number;
    pins:       PinDef[];
    vccPin?:    string;
    gndPin?:    string;
    sigPin?:    string;
    compType?:  string;
}

// ── Component definitions ─────────────────────────────────────────────────────
export const COMPONENT_DEFS: Record<string, CompDef> = {
    // ── MCU ──────────────────────────────────────────────────────────────────
    MCU_ARDUINO_UNO: {
        tag: 'wokwi-arduino-uno', renderW: 274, renderH: 202,
        compType: 'mcu', isFritzing: false,
        pins: [
            { id: 'D0',    xPct: 255.5/274, yPct: 0.04, color: C.SIGNAL },
            { id: 'D1',    xPct: 246.0/274, yPct: 0.04, color: C.SIGNAL },
            { id: 'D2',    xPct: 236.5/274, yPct: 0.04, color: C.SIGNAL },
            { id: 'D3',    xPct: 227.0/274, yPct: 0.04, color: C.PWM },
            { id: 'D4',    xPct: 217.5/274, yPct: 0.04, color: C.SIGNAL },
            { id: 'D5',    xPct: 208.0/274, yPct: 0.04, color: C.PWM },
            { id: 'D6',    xPct: 198.5/274, yPct: 0.04, color: C.PWM },
            { id: 'D7',    xPct: 189.0/274, yPct: 0.04, color: C.SIGNAL },
            { id: 'D8',    xPct: 173.0/274, yPct: 0.04, color: C.SIGNAL },
            { id: 'D9',    xPct: 163.0/274, yPct: 0.04, color: C.PWM },
            { id: 'D10',   xPct: 153.5/274, yPct: 0.04, color: C.PWM },
            { id: 'D11',   xPct: 144.0/274, yPct: 0.04, color: C.PWM },
            { id: 'D12',   xPct: 134.5/274, yPct: 0.04, color: C.SIGNAL },
            { id: 'D13',   xPct: 125.0/274, yPct: 0.04, color: C.SIGNAL },
            { id: 'GND.3', xPct: 115.5/274, yPct: 0.04, color: C.GND },
            { id: 'AREF',  xPct: 106.0/274, yPct: 0.04, color: C.SIGNAL },
            { id: 'SDA',   xPct: 96.5/274,  yPct: 0.04, color: C.I2C },
            { id: 'SCL',   xPct: 87.0/274,  yPct: 0.04, color: C.I2C },
            { id: 'IOREF', xPct: 138.0/274, yPct: 0.96, color: C.VCC },
            { id: 'RESET', xPct: 147.5/274, yPct: 0.96, color: C.SIGNAL },
            { id: '3.3V',  xPct: 157.0/274, yPct: 0.96, color: C.VCC },
            { id: '5V',    xPct: 166.5/274, yPct: 0.96, color: C.VCC },
            { id: 'GND',   xPct: 176.0/274, yPct: 0.96, color: C.GND },
            { id: 'GND.1', xPct: 176.0/274, yPct: 0.96, color: C.GND },
            { id: 'GND.2', xPct: 185.5/274, yPct: 0.96, color: C.GND },
            { id: 'VIN',   xPct: 195.0/274, yPct: 0.96, color: C.VCC },
            { id: 'A0',    xPct: 208.0/274, yPct: 0.96, color: C.ANALOG },
            { id: 'A1',    xPct: 217.5/274, yPct: 0.96, color: C.ANALOG },
            { id: 'A2',    xPct: 227.0/274, yPct: 0.96, color: C.ANALOG },
            { id: 'A3',    xPct: 236.5/274, yPct: 0.96, color: C.ANALOG },
            { id: 'A4',    xPct: 246.0/274, yPct: 0.96, color: C.I2C },
            { id: 'A5',    xPct: 255.5/274, yPct: 0.96, color: C.I2C },
        ],
    },

    MCU_ESP32: {
        tag: '',
        imageUrl: '/images/esp32-devkit-v1.png',
        renderW: 240, renderH: 340,
        compType: 'mcu', isFritzing: false,
        pins: [
            // Left side pins (xPct: 5 / 107 = 0.047)
            { id: 'EN',       xPct: 0.047, yPct: 0.119, color: C.SIGNAL },
            { id: 'VP',       xPct: 0.047, yPct: 0.169, color: C.SIGNAL },
            { id: 'GPIO36',   xPct: 0.047, yPct: 0.169, color: C.SIGNAL },
            { id: 'VN',       xPct: 0.047, yPct: 0.219, color: C.SIGNAL },
            { id: 'GPIO39',   xPct: 0.047, yPct: 0.219, color: C.SIGNAL },
            { id: 'GPIO34',   xPct: 0.047, yPct: 0.264, color: C.SIGNAL },
            { id: 'GPIO35',   xPct: 0.047, yPct: 0.313, color: C.SIGNAL },
            { id: 'GPIO32',   xPct: 0.047, yPct: 0.359, color: C.SIGNAL },
            { id: 'GPIO33',   xPct: 0.047, yPct: 0.406, color: C.SIGNAL },
            { id: 'GPIO25',   xPct: 0.047, yPct: 0.454, color: C.SIGNAL },
            { id: 'GPIO26',   xPct: 0.047, yPct: 0.502, color: C.SIGNAL },
            { id: 'GPIO27',   xPct: 0.047, yPct: 0.551, color: C.SIGNAL },
            { id: 'GPIO14',   xPct: 0.047, yPct: 0.597, color: C.SIGNAL },
            { id: 'GPIO12',   xPct: 0.047, yPct: 0.649, color: C.SIGNAL },
            { id: 'GPIO13',   xPct: 0.047, yPct: 0.694, color: C.SIGNAL },
            { id: 'GND.2',    xPct: 0.047, yPct: 0.741, color: C.GND },
            { id: 'VIN',      xPct: 0.047, yPct: 0.789, color: C.VCC },
            { id: '5V',       xPct: 0.047, yPct: 0.789, color: C.VCC },

            // Right side pins (xPct: 101.3 / 107 = 0.947)
            { id: 'GPIO23',   xPct: 0.947, yPct: 0.119, color: C.SIGNAL },
            { id: 'GPIO22',   xPct: 0.947, yPct: 0.169, color: C.SIGNAL },
            { id: 'TX0',      xPct: 0.947, yPct: 0.219, color: C.SIGNAL },
            { id: 'GPIO1',    xPct: 0.947, yPct: 0.219, color: C.SIGNAL },
            { id: 'RX0',      xPct: 0.947, yPct: 0.264, color: C.SIGNAL },
            { id: 'GPIO3',    xPct: 0.947, yPct: 0.264, color: C.SIGNAL },
            { id: 'GPIO21',   xPct: 0.947, yPct: 0.313, color: C.SIGNAL },
            { id: 'GPIO19',   xPct: 0.947, yPct: 0.359, color: C.SIGNAL },
            { id: 'GPIO18',   xPct: 0.947, yPct: 0.406, color: C.SIGNAL },
            { id: 'GPIO5',    xPct: 0.947, yPct: 0.454, color: C.SIGNAL },
            { id: 'TX2',      xPct: 0.947, yPct: 0.502, color: C.SIGNAL },
            { id: 'GPIO17',   xPct: 0.947, yPct: 0.502, color: C.SIGNAL },
            { id: 'RX2',      xPct: 0.947, yPct: 0.551, color: C.SIGNAL },
            { id: 'GPIO16',   xPct: 0.947, yPct: 0.551, color: C.SIGNAL },
            { id: 'GPIO4',    xPct: 0.947, yPct: 0.597, color: C.SIGNAL },
            { id: 'GPIO2',    xPct: 0.947, yPct: 0.649, color: C.SIGNAL },
            { id: 'GPIO15',   xPct: 0.947, yPct: 0.694, color: C.SIGNAL },
            { id: 'GND.1',    xPct: 0.947, yPct: 0.741, color: C.GND },
            { id: 'GND',      xPct: 0.947, yPct: 0.741, color: C.GND },
            { id: '3V3',      xPct: 0.947, yPct: 0.789, color: C.VCC },
        ],
    },

    // ── Sensors ──────────────────────────────────────────────────────────────
    SENSOR_PIR: {
        tag: 'wokwi-pir-motion-sensor', renderW: 91, renderH: 92,
        compType: 'sensor', vccPin: 'VCC', gndPin: 'GND', sigPin: 'OUT',
        pins: [
            { id: 'VCC', xPct: 36.178/91,  yPct: 92/92, color: C.VCC },
            { id: 'OUT', xPct: 45.9175/91, yPct: 92/92, color: C.SIGNAL },
            { id: 'GND', xPct: 55.6415/91, yPct: 92/92, color: C.GND },
        ],
    },
    SENSOR_DHT11: {
        tag: '', renderW: 60, renderH: 86,
        imageUrl: '/images/dht11.svg',
        compType: 'sensor', vccPin: 'VCC', gndPin: 'GND', sigPin: 'SDA',
        pins: [
            { id: 'VCC', xPct: 0.2, yPct: 1, color: C.VCC },
            { id: 'SDA', xPct: 0.5, yPct: 1, color: C.SIGNAL },
            { id: 'GND', xPct: 0.8, yPct: 1, color: C.GND },
        ],
    },
    SENSOR_DHT22: {
        tag: 'wokwi-dht22', renderW: 57, renderH: 117,
        compType: 'sensor', vccPin: 'VCC', gndPin: 'GND', sigPin: 'SDA',
        pins: [
            { id: 'VCC', xPct: 0.2, yPct: 1, color: C.VCC },
            { id: 'SDA', xPct: 0.5, yPct: 1, color: C.SIGNAL },
            { id: 'NC',  xPct: 0.7, yPct: 1, color: C.SIGNAL },
            { id: 'GND', xPct: 0.8, yPct: 1, color: C.GND },
        ],
    },
    // Placeholder for heart rate sensor (MAX30102) — uses generic sensor image
    SENSOR_HEARTBEAT: {
        tag: '', renderW: 60, renderH: 60,
        imageUrl: '/images/Sensor_DHT11.svg',
        compType: 'sensor', vccPin: 'VCC', gndPin: 'GND', sigPin: 'SDA',
        pins: [
            { id: 'VCC', xPct: 0.2, yPct: 1, color: C.VCC },
            { id: 'SDA', xPct: 0.5, yPct: 1, color: C.SIGNAL },
            { id: 'GND', xPct: 0.8, yPct: 1, color: C.GND },
        ],
    },
    SENSOR_HC_SR04: {
        tag: 'wokwi-hc-sr04', renderW: 170, renderH: 95,
        compType: 'sensor', vccPin: 'VCC', gndPin: 'GND', sigPin: 'TRIG',
        pins: [
            { id: 'VCC',  xPct: 71.3/170,  yPct: 0.99, color: C.VCC },
            { id: 'TRIG', xPct: 81.3/170,  yPct: 0.99, color: C.SIGNAL },
            { id: 'ECHO', xPct: 91.3/170,  yPct: 0.99, color: C.SIGNAL },
            { id: 'GND',  xPct: 101.3/170, yPct: 0.99, color: C.GND },
        ],
    },
    SENSOR_LDR: {
        tag: 'wokwi-photoresistor-sensor', renderW: 174, renderH: 61,
        compType: 'sensor', vccPin: 'VCC', gndPin: 'GND', sigPin: 'AO',
        pins: [
            { id: 'VCC', xPct: 1, yPct: 16.0/61, color: C.VCC },
            { id: 'GND', xPct: 1, yPct: 26.0/61, color: C.GND },
            { id: 'DO',  xPct: 1, yPct: 35.8/61, color: C.SIGNAL },
            { id: 'AO',  xPct: 1, yPct: 45.5/61, color: C.ANALOG },
        ],
    },
    SENSOR_FLAME: {
        tag: 'wokwi-flame-sensor', renderW: 200, renderH: 61,
        compType: 'sensor', vccPin: 'VCC', gndPin: 'GND', sigPin: 'DOUT',
        pins: [
            { id: 'VCC',  xPct: 1, yPct: 14.6/61, color: C.VCC },
            { id: 'GND',  xPct: 1, yPct: 24.3/61, color: C.GND },
            { id: 'DOUT', xPct: 1, yPct: 34.0/61, color: C.SIGNAL },
            { id: 'AOUT', xPct: 1, yPct: 43.7/61, color: C.ANALOG },
        ],
    },
    SENSOR_MQ2: {
        tag: 'wokwi-gas-sensor', renderW: 137, renderH: 63,
        compType: 'sensor', vccPin: 'VCC', gndPin: 'GND', sigPin: 'DOUT',
        pins: [
            { id: 'AOUT', xPct: 1, yPct: 16.5/63, color: C.ANALOG },
            { id: 'DOUT', xPct: 1, yPct: 26.4/63, color: C.SIGNAL },
            { id: 'GND',  xPct: 1, yPct: 36.5/63, color: C.GND },
            { id: 'VCC',  xPct: 1, yPct: 46.2/63, color: C.VCC },
        ],
    },
    SENSOR_SOUND: {
        tag: 'wokwi-big-sound-sensor', renderW: 140, renderH: 50,
        compType: 'sensor', vccPin: 'VCC', gndPin: 'GND', sigPin: 'DOUT',
        pins: [
            { id: 'AOUT', xPct: 0, yPct: 11.0/50, color: C.ANALOG },
            { id: 'GND',  xPct: 0, yPct: 20.5/50, color: C.GND },
            { id: 'VCC',  xPct: 0, yPct: 30.5/50, color: C.VCC },
            { id: 'DOUT', xPct: 0, yPct: 40.5/50, color: C.SIGNAL },
        ],
    },
    SENSOR_TEMPERATURE_LM35: {
        tag: '', renderW: 50, renderH: 50,
        imageUrl: '/images/LM35.svg',
        compType: 'sensor', vccPin: 'VCC', gndPin: 'GND', sigPin: 'OUT',
        pins: [
            { id: 'VCC', xPct: 0.2, yPct: 1, color: C.VCC },
            { id: 'OUT', xPct: 0.5, yPct: 1, color: C.SIGNAL },
            { id: 'GND', xPct: 0.8, yPct: 1, color: C.GND },
        ],
    },
    SENSOR_SOIL_MOISTURE: {
        tag: '', renderW: 45, renderH: 120,
        imageUrl: '/images/soil%20moisture.svg',
        compType: 'sensor', vccPin: 'VCC', gndPin: 'GND', sigPin: 'AOUT',
        pins: [
            { id: 'VCC',  xPct: 0.2, yPct: 1, color: C.VCC },
            { id: 'GND',  xPct: 0.4, yPct: 1, color: C.GND },
            { id: 'DOUT', xPct: 0.6, yPct: 1, color: C.SIGNAL },
            { id: 'AOUT', xPct: 0.8, yPct: 1, color: C.ANALOG },
        ],
    },
    SENSOR_IR_OBSTACLE: {
        tag: '', renderW: 40, renderH: 130,
        imageUrl: '/images/IR_sensor.svg',
        compType: 'sensor', vccPin: 'VCC', gndPin: 'GND', sigPin: 'OUT',
        pins: [
            { id: 'VCC', xPct: 0.2, yPct: 1, color: C.VCC },
            { id: 'GND', xPct: 0.5, yPct: 1, color: C.GND },
            { id: 'OUT', xPct: 0.8, yPct: 1, color: C.SIGNAL },
        ],
    },
    SENSOR_RAIN: {
        tag: '', renderW: 45, renderH: 120,
        imageUrl: '/images/rain_sensor.svg',
        compType: 'sensor', vccPin: 'VCC', gndPin: 'GND', sigPin: 'AO',
        pins: [
            { id: 'VCC',  xPct: 0.2, yPct: 1, color: C.VCC },
            { id: 'GND',  xPct: 0.4, yPct: 1, color: C.GND },
            { id: 'DOUT', xPct: 0.6, yPct: 1, color: C.SIGNAL },
            { id: 'AO',   xPct: 0.8, yPct: 1, color: C.ANALOG },
        ],
    },

    // ── Inputs ───────────────────────────────────────────────────────────────
    INPUT_BUTTON: {
        tag: 'wokwi-pushbutton', renderW: 50, renderH: 50,
        compType: 'input', vccPin: '', gndPin: '2.L', sigPin: '1.L',
        pins: [
            { id: '1.L', xPct: 0.2, yPct: 1, color: C.SIGNAL },
            { id: '2.L', xPct: 0.8, yPct: 1, color: C.GND },
            { id: '1.R', xPct: 0.2, yPct: 0, color: C.SIGNAL },
            { id: '2.R', xPct: 0.8, yPct: 0, color: C.GND },
        ],
    },
    INPUT_POTENTIOMETER: {
        tag: 'wokwi-potentiometer', renderW: 80, renderH: 80,
        compType: 'input', vccPin: 'VCC', gndPin: 'GND', sigPin: 'SIG',
        pins: [
            { id: 'GND', xPct: 0.15, yPct: 1, color: C.GND },
            { id: 'SIG', xPct: 0.50, yPct: 1, color: C.ANALOG },
            { id: 'VCC', xPct: 0.85, yPct: 1, color: C.VCC },
        ],
    },

    // ── Actuators ────────────────────────────────────────────────────────────
    ACTUATOR_LED: {
        tag: 'wokwi-led', renderW: 40, renderH: 80,
        compType: 'actuator', vccPin: '', gndPin: 'C', sigPin: 'A',
        pins: [
            { id: 'A', xPct: 0.3, yPct: 1, color: C.SIGNAL },
            { id: 'C', xPct: 0.7, yPct: 1, color: C.GND },
        ],
    },
    ACTUATOR_BUZZER: {
        tag: 'wokwi-buzzer', renderW: 60, renderH: 60,
        compType: 'actuator', vccPin: '', gndPin: 'NEG', sigPin: 'POS',
        pins: [
            { id: 'POS', xPct: 0.3, yPct: 1, color: C.SIGNAL },
            { id: 'NEG', xPct: 0.7, yPct: 1, color: C.GND },
        ],
    },
    ACTUATOR_SERVO_SG90: {
        tag: 'wokwi-servo', renderW: 80, renderH: 100,
        compType: 'motor', vccPin: 'V+', gndPin: 'GND', sigPin: 'PWM',
        pins: [
            { id: 'GND', xPct: 0.2, yPct: 1, color: C.GND },
            { id: 'V+',  xPct: 0.5, yPct: 1, color: C.VCC },
            { id: 'PWM', xPct: 0.8, yPct: 1, color: C.PWM },
        ],
    },
    ACTUATOR_DC_MOTOR: {
        tag: '', renderW: 80, renderH: 37,
        imageUrl: '/images/dc_motor.svg',
        compType: 'motor', vccPin: '', gndPin: 'IN2', sigPin: 'IN1',
        pins: [
            { id: 'IN1', xPct: 0.3, yPct: 1, color: C.SIGNAL },
            { id: 'IN2', xPct: 0.7, yPct: 1, color: C.SIGNAL },
        ],
    },
    ACTUATOR_RELAY_5V: {
        tag: 'wokwi-ks2e-m-dc5', renderW: 100, renderH: 70,
        compType: 'actuator', vccPin: 'COIL1', gndPin: 'COIL2', sigPin: 'IN',
        pins: [
            { id: 'COIL1', xPct: 0, yPct: 0.25, color: C.VCC },
            { id: 'COIL2', xPct: 0, yPct: 0.75, color: C.GND },
            { id: 'IN',    xPct: 0, yPct: 0.50, color: C.SIGNAL },
        ],
    },
    ACTUATOR_WATER_PUMP: {
        tag: '', renderW: 80, renderH: 80,
        imageUrl: '/images/water_pump.svg',
        compType: 'actuator', vccPin: 'VCC', gndPin: 'GND', sigPin: 'IN1',
        pins: [
            { id: 'VCC', xPct: 0.2, yPct: 1, color: C.VCC },
            { id: 'GND', xPct: 0.4, yPct: 1, color: C.GND },
            { id: 'IN1', xPct: 0.6, yPct: 1, color: C.SIGNAL },
            { id: 'IN2', xPct: 0.8, yPct: 1, color: C.GND },
        ],
    },
    ACTUATOR_FAN: {
        tag: '', renderW: 80, renderH: 80,
        imageUrl: '/images/fan.svg',
        compType: 'actuator', vccPin: '', gndPin: 'IN2', sigPin: 'IN1',
        pins: [
            { id: 'IN1', xPct: 0.3, yPct: 1, color: C.SIGNAL },
            { id: 'IN2', xPct: 0.7, yPct: 1, color: C.SIGNAL },
        ],
    },

    // ── Displays ─────────────────────────────────────────────────────────────
    DISPLAY_OLED_SSD1306: {
        tag: '', renderW: 100, renderH: 100,
        imageUrl: '/images/display%20oled%20ssd1306.svg',
        compType: 'display', vccPin: 'VCC', gndPin: 'GND', sigPin: 'SDA',
        pins: [
            { id: 'GND', xPct: 0.2, yPct: 1, color: C.GND },
            { id: 'VCC', xPct: 0.4, yPct: 1, color: C.VCC },
            { id: 'SCL', xPct: 0.6, yPct: 1, color: C.I2C },
            { id: 'SDA', xPct: 0.8, yPct: 1, color: C.I2C },
        ],
    },
    DISPLAY_LCD_1602: {
        tag: '', renderW: 200, renderH: 90,
        imageUrl: '/images/lcd%20display.svg',
        compType: 'display', vccPin: 'VCC', gndPin: 'GND', sigPin: 'SDA',
        pins: [
            { id: 'GND', xPct: 0.085, yPct: 0.034, color: C.GND },
            { id: 'VCC', xPct: 0.117, yPct: 0.034, color: C.VCC },
            { id: 'SDA', xPct: 0.149, yPct: 0.034, color: C.I2C },
            { id: 'CLK', xPct: 0.180, yPct: 0.034, color: C.I2C },
        ],
    },
    DISPLAY_7SEGMENT: {
        tag: '', renderW: 100, renderH: 80,
        imageUrl: '/images/7segment.svg',
        compType: 'display', vccPin: 'VCC', gndPin: 'GND', sigPin: 'A',
        pins: [
            { id: 'VCC', xPct: 0.15, yPct: 1, color: C.VCC },
            { id: 'GND', xPct: 0.85, yPct: 1, color: C.GND },
            { id: 'A',   xPct: 0.30, yPct: 1, color: C.SIGNAL },
            { id: 'B',   xPct: 0.45, yPct: 1, color: C.SIGNAL },
            { id: 'C',   xPct: 0.60, yPct: 1, color: C.SIGNAL },
            { id: 'D',   xPct: 0.75, yPct: 1, color: C.SIGNAL },
        ],
    },

    // ── Helpers ──────────────────────────────────────────────────────────────
    BASIC_RESISTOR: {
        tag: 'wokwi-resistor', renderW: 80, renderH: 30,
        compType: 'basic',
        pins: [
            { id: '1', xPct: 0, yPct: 0.5, color: C.SIGNAL },
            { id: '2', xPct: 1, yPct: 0.5, color: C.SIGNAL },
        ],
    },
    BASIC_TRANSISTOR_NPN: {
        tag: 'wokwi-npn-transistor', renderW: 50, renderH: 60,
        compType: 'semiconductor',
        pins: [
            { id: 'C', xPct: 0.2, yPct: 1, color: C.VCC },
            { id: 'B', xPct: 0.5, yPct: 1, color: C.SIGNAL },
            { id: 'E', xPct: 0.8, yPct: 1, color: C.GND },
        ],
    },

    // ── Power / Drivers ───────────────────────────────────────────────────────
    POWER_9V_BATTERY: {
        tag: '', renderW: 80, renderH: 120,
        imageUrl: '/images/9v%20battery.svg',
        compType: 'power', vccPin: 'VCC', gndPin: 'GND',
        pins: [
            { id: 'VCC', xPct: 0.9, yPct: 0.2, color: C.VCC },
            { id: 'GND', xPct: 0.9, yPct: 0.4, color: C.GND },
        ],
    },
    DRIVER_L298N: {
        tag: '', renderW: 120, renderH: 120,
        imageUrl: '/images/Driver_L298N.svg',
        compType: 'actuator', vccPin: 'VCC', gndPin: 'GND', sigPin: 'IN1',
        pins: [
            { id: 'IN1', xPct: 0.2, yPct: 1, color: C.SIGNAL },
            { id: 'IN2', xPct: 0.4, yPct: 1, color: C.SIGNAL },
            { id: 'VCC', xPct: 0.6, yPct: 1, color: C.VCC },
            { id: 'GND', xPct: 0.8, yPct: 1, color: C.GND },
        ],
    },
};

// ── Keyword → canonical key mapping ──────────────────────────────────────────
export const KEYWORD_TO_COMP: Array<{ keywords: string[]; key: string }> = [
    { keywords: ['OLED', 'SSD1306', 'SSD_1306', '128X64', '0_96'], key: 'DISPLAY_OLED_SSD1306' },
    { keywords: ['LCD', '1602', 'LCD1602'],                         key: 'DISPLAY_LCD_1602' },
    { keywords: ['PIR', 'MOTION_SENSOR'],                           key: 'SENSOR_PIR' },
    { keywords: ['DHT11'],                                          key: 'SENSOR_DHT11' },
    { keywords: ['DHT22', 'DHT_22'],                                key: 'SENSOR_DHT22' },
    { keywords: ['LM35', 'TEMPERATURE'],                            key: 'SENSOR_TEMPERATURE_LM35' },
    { keywords: ['HC_SR04', 'HCSR04', 'HC04', 'ULTRASONIC'],       key: 'SENSOR_HC_SR04' },
    { keywords: ['LDR', 'PHOTORESISTOR', 'LIGHT_SENSOR'],          key: 'SENSOR_LDR' },
    { keywords: ['MQ2', 'MQ_2', 'GAS_SENSOR'],                     key: 'SENSOR_MQ2' },
    { keywords: ['FLAME', 'FIRE_SENSOR'],                           key: 'SENSOR_FLAME' },
    { keywords: ['SOUND', 'MIC', 'MICROPHONE'],                     key: 'SENSOR_SOUND' },
    { keywords: ['SOILMOISTURE', 'SOIL_MOISTURE', 'MOISTURE'],     key: 'SENSOR_SOIL_MOISTURE' },
    { keywords: ['IROBSTACLE', 'IR_OBSTACLE', 'INFRARED'],         key: 'SENSOR_IR_OBSTACLE' },
    { keywords: ['LED', 'DIODE', 'INDICATOR'],                      key: 'ACTUATOR_LED' },
    { keywords: ['BUZZER', 'BEEPER', 'ALARM'],                      key: 'ACTUATOR_BUZZER' },
    { keywords: ['SERVO', 'SG90'],                                  key: 'ACTUATOR_SERVO_SG90' },
    { keywords: ['MOTOR', 'FAN', 'DC_MOTOR'],                       key: 'ACTUATOR_DC_MOTOR' },
    { keywords: ['RELAY'],                                          key: 'ACTUATOR_RELAY_5V' },
    { keywords: ['L298N', 'DRIVER'],                                key: 'DRIVER_L298N' },
    { keywords: ['BUTTON', 'PUSHBUTTON', 'SWITCH'],                 key: 'INPUT_BUTTON' },
    { keywords: ['POTENTIOMETER', 'POT', 'KNOB'],                   key: 'INPUT_POTENTIOMETER' },
    { keywords: ['RESISTOR'],                                       key: 'BASIC_RESISTOR' },
    { keywords: ['WATER_PUMP', 'WATERPUMP', 'PUMP'],                key: 'ACTUATOR_WATER_PUMP' },
    { keywords: ['FAN', 'COOLING_FAN'],                              key: 'ACTUATOR_FAN' },
    { keywords: ['RAIN', 'RAIN_SENSOR', 'YL83'],                    key: 'SENSOR_RAIN' },
    { keywords: ['7SEG', '7SEGMENT', 'SEVEN_SEGMENT'],              key: 'DISPLAY_7SEGMENT' },
];

// ── Resolver ──────────────────────────────────────────────────────────────────
export function resolveDef(
    componentKey: string,
    kind: CircuitNode['kind'],
): { def: CompDef; nodeType: 'wokwi' | 'displayCard' | 'generic' } {
    const ck = componentKey.toUpperCase();

    // Helper: prefer 'wokwi' (image render) over 'displayCard' if imageUrl is set
    const pickNodeType = (d: CompDef): 'wokwi' | 'displayCard' | 'generic' => {
        if (d.tag) return 'wokwi';
        if (d.imageUrl) return 'wokwi';   // has SVG image → use WokwiNode <img> branch
        if (d.compType === 'display') return 'displayCard';
        return 'generic';
    };

    // 1. Exact match
    if (COMPONENT_DEFS[componentKey]) {
        const d = COMPONENT_DEFS[componentKey];
        return { def: d, nodeType: pickNodeType(d) };
    }

    // 2. Keyword match
    for (const { keywords, key } of KEYWORD_TO_COMP) {
        if (keywords.some(kw => ck.includes(kw)) && COMPONENT_DEFS[key]) {
            const d = COMPONENT_DEFS[key];
            return { def: d, nodeType: pickNodeType(d) };
        }
    }

    // 3. Substring fuzzy match
    const match = Object.keys(COMPONENT_DEFS).find(k => ck.includes(k) || k.includes(ck));
    if (match) {
        const d = COMPONENT_DEFS[match];
        return { def: d, nodeType: pickNodeType(d) };
    }

    // 4. Generic fallback
    const isI2CDisplay = kind === 'DISPLAY';
    const fallbackCompType = kind === 'SENSOR' ? 'sensor'
        : kind === 'ACTUATOR' ? 'actuator'
        : kind === 'DISPLAY'  ? 'display'
        : kind === 'HELPER'   ? 'basic'
        : 'unknown';
    const fallback: CompDef = {
        tag: '', renderW: 120, renderH: 70, compType: fallbackCompType,
        vccPin: 'VCC', gndPin: 'GND',
        sigPin: isI2CDisplay ? 'DATA' : 'OUT',
        pins: isI2CDisplay ? [
            { id: 'VIN',  xPct: 0.10, yPct: 1, color: C.VCC },
            { id: 'GND',  xPct: 0.30, yPct: 1, color: C.GND },
            { id: 'DATA', xPct: 0.55, yPct: 1, color: C.I2C },
            { id: 'CLK',  xPct: 0.80, yPct: 1, color: C.I2C },
        ] : [
            { id: 'VCC', xPct: 0.15, yPct: 1, color: C.VCC },
            { id: 'OUT', xPct: 0.50, yPct: 1, color: C.SIGNAL },
            { id: 'GND', xPct: 0.85, yPct: 1, color: C.GND },
        ],
    };
    const nt = fallback.compType === 'display' ? 'displayCard' : 'generic';
    return { def: fallback, nodeType: nt };
}
