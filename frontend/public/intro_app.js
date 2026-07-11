// CircuitMentor Landing Page Logic

// --- PRESET DATA DATABASE ---
const PRESETS = {
    ultrasonic: {
        title: "Ultrasonic Distance Sensor with I2C LCD Display",
        mcu: "Arduino Uno R3",
        consoleLines: [
            "[INFO] Parsing prompt: 'Ultrasonic Distance Sensor with I2C LCD Display'",
            "[SUCCESS] local_circuit_engine: Found keywords ['ultrasonic', 'lcd', 'distance']",
            "[SUCCESS] Database Match: Loaded HC-SR04 & I2C LCD 1602 parameters",
            "[AUDIT] eil_validator: Auditing pin configurations...",
            "[AUDIT] eil_validator: HC-SR04 TRIG -> Arduino D7 (Safe Output)",
            "[AUDIT] eil_validator: HC-SR04 ECHO -> Arduino D8 (Safe Input)",
            "[AUDIT] eil_validator: I2C LCD SDA -> Arduino A4 (SDA hardware, Safe)",
            "[AUDIT] eil_validator: I2C LCD SCL -> Arduino A5 (SCL hardware, Safe)",
            "[SUCCESS] eil_validator: Audit PASSED. 0 voltage mismatch. I2C pull-ups validated.",
            "[INFO] wiringRulesEngine: Auto-routing I2C bus & sonar lines. 8 wire rails computed.",
            "[SUCCESS] Compilation complete in 7.4ms. Generated Arduino C++ Firmware."
        ],
        code: `// CircuitMentor Auto-Generated Code
// Project: Ultrasonic Distance Sensor with I2C LCD Display
// Validated by: eil_validator.py (PASS)

#include <Wire.h>
#include <LiquidCrystal_I2C.h>

const int TRIG_PIN = 7;       // HC-SR04 TRIG Pin connected to D7
const int ECHO_PIN = 8;       // HC-SR04 ECHO Pin connected to D8

LiquidCrystal_I2C lcd(0x27, 16, 2); // Address 0x27, 16 cols, 2 rows

void setup() {
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("CircuitMentor");
  lcd.setCursor(0, 1);
  lcd.print("Sonar Sensor: OK");
  Serial.begin(9600);
}

void loop() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  long duration = pulseIn(ECHO_PIN, HIGH);
  float distance = duration * 0.0343 / 2.0;

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Dist: ");
  lcd.print(distance);
  lcd.print(" cm");
  
  Serial.print("Distance: ");
  Serial.print(distance);
  Serial.println(" cm");
  delay(500);
}`,
        bom: [
            { qty: 1, name: "Arduino Uno R3", type: "Microcontroller", info: "Master Controller" },
            { qty: 1, name: "Ultrasonic Distance Sensor (HC-SR04)", type: "Input Sensor", info: "VCC to 5V, GND to GND, TRIG to D7, ECHO to D8" },
            { qty: 1, name: "1602 LCD Display (I2C Backpack)", type: "Output Display", info: "VCC to 5V, GND to GND, SDA to A4, SCL to A5" },
            { qty: 1, name: "Half-Size Breadboard", type: "Prototyping Board", info: "Power distribution & routing" },
            { qty: 12, name: "Male-to-Male Jumper Wires", type: "Connections", info: "Circuit interconnects" }
        ]
    },
    soil: {
        title: "IoT Soil Moisture Sensor with Submersible Pump & Blynk",
        mcu: "ESP32 DevKitC",
        consoleLines: [
            "[INFO] Parsing prompt: 'IoT Soil Moisture Sensor with Submersible Pump & Blynk'",
            "[SUCCESS] local_circuit_engine: Found keywords ['soil moisture', 'pump', 'blynk']",
            "[SUCCESS] Database Match: Loaded Soil Probe & 5V Mini Submersible Pump",
            "[AUDIT] eil_validator: Auditing pin configurations...",
            "[AUDIT] eil_validator: Soil Probe Analog Out -> ESP32 GPIO34 (ADC1, Safe)",
            "[WARNING] eil_validator: 5V Submersible Pump draws 150mA. GPIO cannot drive directly (max 12mA)!",
            "[RESOLVED] eil_validator: Injected BC547 NPN Transistor & 1N4007 flyback diode safety circuit.",
            "[SUCCESS] eil_validator: Audit PASSED. Transistor driver shields GPIO from motor spikes.",
            "[INFO] wiringRulesEngine: Routing ESP32 logic. 9 wire rails computed.",
            "[SUCCESS] Compilation complete in 9.2ms. Generated Blynk IoT Firmware."
        ],
        code: `// CircuitMentor Auto-Generated Code
// Project: IoT Soil Moisture Sensor with Submersible Pump & Blynk
// Validated by: eil_validator.py (PASS)

#define BLYNK_TEMPLATE_ID "TMPL_SOIL_01"
#define BLYNK_DEVICE_NAME "SmartIrrigation"

#include <WiFi.h>
#include <WiFiClient.h>
#include <BlynkSimpleEsp32.h>

char auth[] = "Your_Blynk_Auth_Token";
char ssid[] = "Your_WiFi_SSID";
char pass[] = "Your_WiFi_Password";

const int SOIL_PIN = 34;      // Analog soil probe connected to GPIO34
const int PUMP_GATE = 22;     // BC547 transistor base connected to GPIO22

BlynkTimer timer;

void checkSoil() {
  int moisture = analogRead(SOIL_PIN);
  float percent = (1.0 - ((float)moisture / 4095.0)) * 100.0;
  
  Blynk.virtualWrite(V0, percent); // Send data to Blynk App
  Serial.print("Soil Moisture: ");
  Serial.print(percent);
  Serial.println("%");

  if (percent < 30.0) { // Dry soil
    Blynk.virtualWrite(V1, 255); // Blynk LED indicator ON
    digitalWrite(PUMP_GATE, HIGH); // Turn on pump via transistor
    Serial.println("Pump status: ACTIVE");
  } else {
    Blynk.virtualWrite(V1, 0); // Blynk LED indicator OFF
    digitalWrite(PUMP_GATE, LOW);  // Turn off pump
    Serial.println("Pump status: IDLE");
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(PUMP_GATE, OUTPUT);
  Blynk.begin(auth, ssid, pass);
  timer.setInterval(2000L, checkSoil); // Check every 2 seconds
}

void loop() {
  Blynk.run();
  timer.run();
}`,
        bom: [
            { qty: 1, name: "ESP32 DevKitC", type: "Microcontroller (IoT)", info: "Runs Blynk connection & logic" },
            { qty: 1, name: "Soil Moisture Sensor (Resistive)", type: "Input Sensor", info: "VCC to 3.3V, GND to GND, OUT to GPIO34" },
            { qty: 1, name: "5V Submersible Mini Pump", type: "Output Motor", info: "Wired to 5V rail via Transistor" },
            { qty: 1, name: "BC547 NPN Transistor", type: "Safety switch", info: "Collector to Pump (-), Emitter to GND, Base to GPIO22" },
            { qty: 1, name: "1N4007 Diode", type: "Flyback protection", info: "Anode to Collector, Cathode to 5V rail" },
            { qty: 1, name: "Resistor 1kΩ", type: "Limit Resistor", info: "Connects GPIO22 to Transistor Base" },
            { qty: 1, name: "Full-Size Breadboard", type: "Prototyping Board", info: "Main circuit tracks" },
            { qty: 18, name: "Jumper Wires (M-M & M-F)", type: "Connections", info: "Sensor routing wires" }
        ]
    },
    light: {
        title: "Automated night light with LDR and RGB LED",
        mcu: "Arduino Uno R3",
        consoleLines: [
            "[INFO] Parsing prompt: 'Automated night light with LDR and RGB LED'",
            "[SUCCESS] local_circuit_engine: Found keywords ['night light', 'ldr', 'rgb led']",
            "[SUCCESS] Database Match: Loaded LDR photoresistor & RGB Common Cathode LED",
            "[AUDIT] eil_validator: Auditing pin configurations...",
            "[AUDIT] eil_validator: LDR voltage divider output -> Arduino A0 (Safe Analog Input)",
            "[AUDIT] eil_validator: RGB Red anode -> Arduino D9 (Requires 220Ω Resistor)",
            "[AUDIT] eil_validator: RGB Green anode -> Arduino D10 (Requires 220Ω Resistor)",
            "[AUDIT] eil_validator: RGB Blue anode -> Arduino D11 (Requires 220Ω Resistor)",
            "[SUCCESS] eil_validator: Audit PASSED. RGB current properly limited. Divider protection set.",
            "[INFO] wiringRulesEngine: Routing color arrays. 7 wire rails drawn.",
            "[SUCCESS] Compilation complete in 7.1ms. Generated RGB Light Firmware."
        ],
        code: `// CircuitMentor Auto-Generated Code
// Project: Automated night light with LDR and RGB LED
// Validated by: eil_validator.py (PASS)

const int LDR_PIN = A0;      // Photoresistor voltage divider connected to A0
const int RGB_RED = 9;       // PWM Red Pin D9 (via 220 Ohm resistor)
const int RGB_GREEN = 10;    // PWM Green Pin D10 (via 220 Ohm resistor)
const int RGB_BLUE = 11;     // PWM Blue Pin D11 (via 220 Ohm resistor)

void setup() {
  pinMode(RGB_RED, OUTPUT);
  pinMode(RGB_GREEN, OUTPUT);
  pinMode(RGB_BLUE, OUTPUT);
  pinMode(LDR_PIN, INPUT);
  Serial.begin(9600);
  Serial.println("CircuitMentor System Active: LDR Smart Light ready.");
}

void loop() {
  int ldrVal = analogRead(LDR_PIN);
  Serial.print("LDR light level: ");
  Serial.println(ldrVal);

  if (ldrVal < 400) { // Ambient dark
    // Turn on a soft purple ambient night light
    analogWrite(RGB_RED, 120);
    analogWrite(RGB_GREEN, 0);
    analogWrite(RGB_BLUE, 200);
    Serial.println("State: NIGHT - LED active");
  } else {
    // Ambient bright, turn off LED
    analogWrite(RGB_RED, 0);
    analogWrite(RGB_GREEN, 0);
    analogWrite(RGB_BLUE, 0);
    Serial.println("State: DAY - LED disabled");
  }
  delay(300);
}`,
        bom: [
            { qty: 1, name: "Arduino Uno R3", type: "Microcontroller", info: "Runs night light logic" },
            { qty: 1, name: "Photoresistor (LDR)", type: "Input Sensor", info: "One pin to 5V, other pin to A0 & 10kΩ GND divider" },
            { qty: 1, name: "RGB LED (Common Cathode)", type: "Output Display", info: "Cathode to GND. R, G, B pins to D9, D10, D11 via resistors" },
            { qty: 3, name: "Resistors 220Ω", type: "Limit Resistor", info: "Connected in series with R, G, B channels" },
            { qty: 1, name: "Resistor 10kΩ", type: "Divider Resistor", info: "Connects LDR/A0 node to ground" },
            { qty: 1, name: "Half-Size Breadboard", type: "Prototyping Board", info: "Component layout" },
            { qty: 10, name: "Jumper Wires", type: "Connections", info: "Interface cabling" }
        ]
    }
};

const IOT_GUIDES = {
    blynk: [
        "Create a free developer account at <strong>Blynk.cloud</strong>.",
        "Create a new Template named <em>SmartIrrigation</em> and set hardware to <strong>ESP32</strong>.",
        "Go to Datastreams. Add a Virtual Pin <strong>V0 (Analog / 0-100)</strong> for Moisture percent.",
        "Add a Virtual Pin <strong>V1 (Digital / 0-1)</strong> to display pump active state.",
        "Set up a Mobile Dashboard. Add a Gauge Widget bound to V0, and a LED Widget bound to V1.",
        "Copy your Blynk Device Auth Token from the web dashboard info panel.",
        "Paste the Auth Token into the ESP32 code template and flash the code."
    ],
    telegram: [
        "Open Telegram, search for <strong>@BotFather</strong>, and type <code>/newbot</code>.",
        "Name your bot (e.g. <em>CircuitMonitorBot</em>) and copy the generated <strong>HTTP API Token</strong>.",
        "Install the <code>UniversalTelegramBot</code> and <code>ArduinoJson</code> libraries in your Arduino IDE.",
        "Insert your Wi-Fi credentials and HTTP API Token into your compiled code.",
        "Upload the code to your ESP32. Open Telegram, start a chat with your bot, and send <code>/status</code>."
    ]
};

// --- INITIAL STATE ---
let activePreset = "ultrasonic";
let activeTab = "schematic";
let activeIot = "blynk";

// --- HERO THREE.JS VIEWPORT (THE COMPILER ENGINE) ---
let heroScene, heroCamera, heroRenderer, heroControls;
let compilerCube;
let particleSystem;
let compiledCircuitGroup = null;
let currentElectronPulses = [];

function initHero3D() {
    const container = document.getElementById('three-hero-canvas');
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene & Camera
    heroScene = new THREE.Scene();
    heroScene.background = new THREE.Color(0x03040c);
    
    // Zoomed in closer for details
    heroCamera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    heroCamera.position.set(0, 3.2, 5.0);

    // Renderer
    heroRenderer = new THREE.WebGLRenderer({ antialias: true });
    heroRenderer.setSize(width, height);
    heroRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(heroRenderer.domElement);

    // Controls
    heroControls = new THREE.OrbitControls(heroCamera, heroRenderer.domElement);
    heroControls.enableDamping = true;
    heroControls.dampingFactor = 0.05;
    heroControls.maxPolarAngle = Math.PI / 2.1; // Floor limit

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    heroScene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x00f3ff, 1.0);
    dirLight1.position.set(3, 5, 3);
    heroScene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xff007f, 0.4);
    dirLight2.position.set(-3, 5, -3);
    heroScene.add(dirLight2);

    // Create compilerCube
    const cubeGeo = new THREE.BoxGeometry(1.4, 1.4, 1.4);
    const cubeMat = new THREE.MeshStandardMaterial({
        color: 0x00f3ff,
        wireframe: true,
        transparent: true,
        opacity: 0.4
    });
    compilerCube = new THREE.Mesh(cubeGeo, cubeMat);
    compilerCube.position.set(0, 0, 0);
    heroScene.add(compilerCube);

    // Create particleSystem
    const particleGeo = new THREE.BufferGeometry();
    const particleCount = 200;
    const posArray = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i++) {
        posArray[i] = (Math.random() - 0.5) * 6;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const particleMat = new THREE.PointsMaterial({
        size: 0.03,
        color: 0x00f3ff,
        transparent: true,
        opacity: 0.7
    });
    particleSystem = new THREE.Points(particleGeo, particleMat);
    heroScene.add(particleSystem);

    // Add main circuit group
    const circuitGroup = new THREE.Group();
    heroScene.add(circuitGroup);

    // 1. Add Vertical Breadboard
    const breadboard = create3DBreadboard(true);
    circuitGroup.add(breadboard);

    // 2. Add Arduino Uno
    const mcu = create3DMCU(false);
    mcu.rotation.y = Math.PI / 2;
    mcu.position.set(-1.6, 0.12, 0);
    circuitGroup.add(mcu);

    // 3. Add Ultrasonic Sensor
    const sonar = create3DUltrasonicSensor();
    sonar.position.set(1.4, 0.12, -0.9);
    circuitGroup.add(sonar);

    // 4. Add LCD Display
    const lcd = create3DLCDDisplay();
    lcd.position.set(1.4, 0.12, 0.9);
    circuitGroup.add(lcd);

    // 5. Add static color-coded wires
    function drawStaticWire(start, end, colorHex) {
        const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
        mid.y += 0.8;
        const curve = new THREE.QuadraticBezierCurve3(start, end, mid);
        const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(24));
        const material = new THREE.LineBasicMaterial({ color: colorHex, linewidth: 2 });
        const wire = new THREE.Line(geometry, material);
        circuitGroup.add(wire);
    }

    // TRIG/ECHO Wires (Yellow)
    drawStaticWire(new THREE.Vector3(-1.6, 0.25, -0.4), new THREE.Vector3(0, 0.1, -0.9), 0xffd700); 
    drawStaticWire(new THREE.Vector3(-1.6, 0.25, -0.3), new THREE.Vector3(0, 0.1, -0.8), 0xffd700); 
    drawStaticWire(new THREE.Vector3(0, 0.1, -0.9), new THREE.Vector3(1.4, 0.2, -0.9), 0xffd700); 

    // SDA/SCL Wires (Cyan/Purple)
    drawStaticWire(new THREE.Vector3(-1.6, 0.25, 0.4), new THREE.Vector3(0, 0.1, 0.8), 0x00f3ff); 
    drawStaticWire(new THREE.Vector3(-1.6, 0.25, 0.5), new THREE.Vector3(0, 0.1, 0.9), 0xbd00ff); 
    drawStaticWire(new THREE.Vector3(0, 0.1, 0.8), new THREE.Vector3(1.4, 0.2, 0.9), 0x00f3ff); 

    // Power Wires (Red/Black)
    drawStaticWire(new THREE.Vector3(-1.6, 0.25, 0), new THREE.Vector3(-0.55, 0.1, 0), 0xff3333); // 5V
    drawStaticWire(new THREE.Vector3(-1.6, 0.25, 0.1), new THREE.Vector3(-0.65, 0.1, 0.1), 0x111111); // GND

    // Slow auto-rotation
    let angle = 0;

    // Resize handler
    window.addEventListener('resize', () => {
        const w = container.clientWidth;
        const h = container.clientHeight;
        heroCamera.aspect = w / h;
        heroCamera.updateProjectionMatrix();
        heroRenderer.setSize(w, h);
    });

    // Start render loop
    function animateHero() {
        requestAnimationFrame(animateHero);

        // Rotate scene slowly if user isn't dragging
        if (heroControls.state === -1) {
            circuitGroup.rotation.y = Math.sin(angle) * 0.15;
            angle += 0.005;
        }

        // Spin particle system and pulse compiler cube
        if (particleSystem) {
            particleSystem.rotation.y += 0.002;
            particleSystem.rotation.x += 0.001;
        }

        // Update electron pulses
        if (currentElectronPulses && currentElectronPulses.length > 0) {
            currentElectronPulses.forEach(p => {
                p.progress += p.speed;
                if (p.progress > 1) p.progress = 0;
                const pos = p.curve.getPointAt(p.progress);
                p.mesh.position.copy(pos);
            });
        }

        heroControls.update();
        heroRenderer.render(heroScene, heroCamera);
    }
    animateHero();
}

// Helper to procedural-generate 3D Microcontroller board
function create3DMCU(isESP = false) {
    const mcuGroup = new THREE.Group();
    
    // Main PCB board
    const boardGeo = new THREE.BoxGeometry(2.4, 0.1, 1.6);
    const boardMat = new THREE.MeshStandardMaterial({
        color: isESP ? 0x090a18 : 0x0c4826,
        roughness: 0.4,
        metalness: 0.2
    });
    const board = new THREE.Mesh(boardGeo, boardMat);
    mcuGroup.add(board);

    // Main controller chip
    const chipGeo = new THREE.BoxGeometry(0.7, 0.08, 0.7);
    const chipMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6 });
    const chip = new THREE.Mesh(chipGeo, chipMat);
    chip.position.set(-0.3, 0.08, 0);
    mcuGroup.add(chip);

    // Pins headers (black lines on sides)
    const pinGeo = new THREE.BoxGeometry(0.1, 0.15, 1.4);
    const pinMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.5 });
    
    const leftHeader = new THREE.Mesh(pinGeo, pinMat);
    leftHeader.position.set(-1.0, 0.08, 0);
    mcuGroup.add(leftHeader);

    const rightHeader = leftHeader.clone();
    rightHeader.position.set(1.0, 0.08, 0);
    mcuGroup.add(rightHeader);

    // Metal USB port
    const usbGeo = new THREE.BoxGeometry(0.5, 0.2, 0.4);
    const usbMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8, roughness: 0.2 });
    const usb = new THREE.Mesh(usbGeo, usbMat);
    usb.position.set(-1.15, 0.1, 0.4);
    mcuGroup.add(usb);

    return mcuGroup;
}

// Procedural 3D Breadboard
function create3DBreadboard(isVertical = true) {
    const bbGroup = new THREE.Group();
    
    // Breadboard base plate
    const baseGeo = isVertical ? new THREE.BoxGeometry(1.5, 0.15, 3.6) : new THREE.BoxGeometry(3.6, 0.15, 2.4);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0xeeeee4, roughness: 0.7 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    bbGroup.add(base);

    // Power rails (blue/red lines)
    const lineGeo = isVertical ? new THREE.BoxGeometry(0.02, 0.02, 3.4) : new THREE.BoxGeometry(3.4, 0.02, 0.05);
    const redMat = new THREE.MeshBasicMaterial({ color: 0xff3333 });
    const blueMat = new THREE.MeshBasicMaterial({ color: 0x3333ff });

    if (isVertical) {
        // Left Rails
        const redLineL = new THREE.Mesh(lineGeo, redMat);
        redLineL.position.set(-0.65, 0.08, 0);
        const blueLineL = new THREE.Mesh(lineGeo, blueMat);
        blueLineL.position.set(-0.55, 0.08, 0);
        bbGroup.add(redLineL, blueLineL);

        // Right Rails
        const redLineR = new THREE.Mesh(lineGeo, redMat);
        redLineR.position.set(0.55, 0.08, 0);
        const blueLineR = new THREE.Mesh(lineGeo, blueMat);
        blueLineR.position.set(0.65, 0.08, 0);
        bbGroup.add(redLineR, blueLineR);
    } else {
        const redLine = new THREE.Mesh(lineGeo, redMat);
        redLine.position.set(0, 0.08, 1.0);
        bbGroup.add(redLine);

        const blueLine = new THREE.Mesh(lineGeo, blueMat);
        blueLine.position.set(0, 0.08, 0.8);
        bbGroup.add(blueLine);
    }

    return bbGroup;
}

// Procedural 3D Ultrasonic Sensor (HC-SR04)
function create3DUltrasonicSensor() {
    const group = new THREE.Group();
    
    // Blue PCB
    const pcbGeo = new THREE.BoxGeometry(0.6, 0.06, 1.2);
    const pcbMat = new THREE.MeshStandardMaterial({ color: 0x163861, roughness: 0.5 });
    const pcb = new THREE.Mesh(pcbGeo, pcbMat);
    group.add(pcb);

    // Two cylindrical "eyes" (transducers) facing upwards
    const eyeGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.22, 16);
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8, roughness: 0.2 });
    
    const eye1 = new THREE.Mesh(eyeGeo, eyeMat);
    eye1.rotation.x = Math.PI / 2; // Face forward/upward
    eye1.position.set(0, 0.12, -0.25);
    
    const eye2 = eye1.clone();
    eye2.position.set(0, 0.12, 0.25);
    
    group.add(eye1, eye2);

    // Embellish eyes with mesh inside
    const meshGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.02, 16);
    const meshMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    
    const m1 = new THREE.Mesh(meshGeo, meshMat);
    m1.rotation.x = Math.PI / 2;
    m1.position.set(0, 0.23, -0.25);
    
    const m2 = m1.clone();
    m2.position.set(0, 0.23, 0.25);
    
    group.add(m1, m2);

    // Header pins
    const pinsGeo = new THREE.BoxGeometry(0.05, 0.15, 0.2);
    const pinsMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.9 });
    const pins = new THREE.Mesh(pinsGeo, pinsMat);
    pins.position.set(-0.32, 0, 0);
    group.add(pins);

    return group;
}

// Procedural 3D LCD Display (1602 LCD with I2C module)
function create3DLCDDisplay() {
    const group = new THREE.Group();

    // Dark backing PCB
    const pcbGeo = new THREE.BoxGeometry(0.6, 0.06, 1.4);
    const pcbMat = new THREE.MeshStandardMaterial({ color: 0x0c3311, roughness: 0.6 });
    const pcb = new THREE.Mesh(pcbGeo, pcbMat);
    group.add(pcb);

    // Green glowing LCD glass screen
    const screenGeo = new THREE.BoxGeometry(0.4, 0.08, 1.0);
    const screenMat = new THREE.MeshStandardMaterial({
        color: 0x39ff14,
        emissive: 0x1b6b0b,
        roughness: 0.2,
        metalness: 0.1
    });
    const screen = new THREE.Mesh(screenGeo, screenMat);
    screen.position.set(0, 0.05, 0);
    group.add(screen);

    // Small black character boxes mock lines
    const charGeo = new THREE.BoxGeometry(0.3, 0.02, 0.8);
    const charMat = new THREE.MeshBasicMaterial({ color: 0x002200 });
    const charOverlay = new THREE.Mesh(charGeo, charMat);
    charOverlay.position.set(0, 0.1, 0);
    group.add(charOverlay);

    return group;
}

// Trigger Compiler Action in Hero
function triggerCompilation() {
    const preset = PRESETS[activePreset];
    const select = document.getElementById('preset-select');
    const compileBtn = document.getElementById('compile-btn');
    const consoleStatus = document.getElementById('console-status');

    if (compileBtn) {
        compileBtn.disabled = true;
        compileBtn.innerHTML = "Validating... 🛡️";
    }
    if (consoleStatus) {
        consoleStatus.innerHTML = "";
    }

    // Clear old compilation artifacts if any
    if (compiledCircuitGroup) {
        heroScene.remove(compiledCircuitGroup);
        compiledCircuitGroup = null;
        currentElectronPulses.forEach(p => {
            if (p.mesh.parent) {
                p.mesh.parent.remove(p.mesh);
            } else {
                heroScene.remove(p.mesh);
            }
        });
        currentElectronPulses = [];
    }

    // 1. Swirl compilation particles furiously
    if (particleSystem) {
        gsap.to(particleSystem.rotation, { y: "+=12", x: "+=6", duration: 1.5, ease: "power2.inOut" });
    }
    
    // Scale down the glass box and scale back up representing the compiler pulsing
    if (compilerCube) {
        gsap.to(compilerCube.scale, { x: 0.8, y: 0.8, z: 0.8, duration: 0.3, yoyo: true, repeat: 1 });
    }

    // 2. Play console lines with typewriting effect
    let currentLine = 0;
    const outputContainer = document.querySelector('.console-output');
    if (outputContainer) {
        outputContainer.innerHTML = ""; // Clear log
    }

    function printNextLine() {
        if (currentLine < preset.consoleLines.length) {
            const lineStr = preset.consoleLines[currentLine];
            const span = document.createElement('span');
            span.className = "console-line";
            
            if (lineStr.includes("[SUCCESS]")) span.classList.add("line-green");
            else if (lineStr.includes("[AUDIT]")) span.classList.add("line-cyan");
            else if (lineStr.includes("[WARNING]")) span.classList.add("line-red");
            
            span.innerHTML = `&gt; ${lineStr}`;
            if (outputContainer) {
                outputContainer.appendChild(span);
                outputContainer.scrollTop = outputContainer.scrollHeight;
            }

            currentLine++;
            setTimeout(printNextLine, 120);
        } else {
            // Compilation completed
            if (compileBtn) {
                compileBtn.disabled = false;
                compileBtn.innerHTML = "Compile Circuit ⚡";
            }
            
            // Build the procedural 3D elements in 3D Space
            assembleCompiledCircuit(preset.mcu);
        }
    }
    setTimeout(printNextLine, 300);
}

// Assembles the virtual 3D microcontroller and components on compilation
function assembleCompiledCircuit(mcuName) {
    compiledCircuitGroup = new THREE.Group();
    compiledCircuitGroup.position.set(0, -3.5, 0); // Position below the cube
    compiledCircuitGroup.scale.set(0.1, 0.1, 0.1);
    heroScene.add(compiledCircuitGroup);

    // 1. Add Vertical Breadboard
    const breadboard = create3DBreadboard(true);
    compiledCircuitGroup.add(breadboard);

    // 2. Add Microcontroller (Arduino Uno / ESP32 oriented vertically)
    const isESP = mcuName.includes("ESP32");
    const mcu = create3DMCU(isESP);
    mcu.rotation.y = Math.PI / 2;
    mcu.position.set(-1.6, 0.12, 0);
    compiledCircuitGroup.add(mcu);

    // 3. Add Ultrasonic Sensor (HC-SR04) at top-right
    const sonar = create3DUltrasonicSensor();
    sonar.position.set(1.4, 0.12, -0.9);
    compiledCircuitGroup.add(sonar);

    // 4. Add LCD Display (1602 LCD) at bottom-right
    const lcd = create3DLCDDisplay();
    lcd.position.set(1.4, 0.12, 0.9);
    compiledCircuitGroup.add(lcd);

    // Animate entire group sliding down and camera repositioning
    if (compilerCube) {
        gsap.to(compilerCube.position, { y: 2.2, duration: 1.2, ease: "power2.out" });
        gsap.to(compilerCube.scale, { x: 0.6, y: 0.6, z: 0.6, duration: 1.2 });
    }
    gsap.to(compiledCircuitGroup.scale, { x: 1, y: 1, z: 1, duration: 1.2, ease: "back.out(1.2)" });
    gsap.to(compiledCircuitGroup.position, { y: -1.2, duration: 1.2, ease: "power2.out" });

    // 5. Connect wires with bezier splines and start electron flow
    // TRIG/ECHO Wires (Yellow)
    draw3DWire(new THREE.Vector3(-1.6, 0.25, -0.4), new THREE.Vector3(0, 0.1, -0.9), 0xffd700); 
    draw3DWire(new THREE.Vector3(-1.6, 0.25, -0.3), new THREE.Vector3(0, 0.1, -0.8), 0xffd700); 
    draw3DWire(new THREE.Vector3(0, 0.1, -0.9), new THREE.Vector3(1.4, 0.2, -0.9), 0xffd700); 

    // SDA/SCL Wires (Cyan/Purple)
    draw3DWire(new THREE.Vector3(-1.6, 0.25, 0.4), new THREE.Vector3(0, 0.1, 0.8), 0x00f3ff); 
    draw3DWire(new THREE.Vector3(-1.6, 0.25, 0.5), new THREE.Vector3(0, 0.1, 0.9), 0xbd00ff); 
    draw3DWire(new THREE.Vector3(0, 0.1, 0.8), new THREE.Vector3(1.4, 0.2, 0.9), 0x00f3ff); 

    // Power Wires (Red/Black)
    draw3DWire(new THREE.Vector3(-1.6, 0.25, 0), new THREE.Vector3(-0.55, 0.1, 0), 0xff3333); // 5V
    draw3DWire(new THREE.Vector3(-1.6, 0.25, 0.1), new THREE.Vector3(-0.65, 0.1, 0.1), 0x111111); // GND
}

// Helper to draw a glowing Bezier wire spline
function draw3DWire(start, end, colorHex) {
    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    mid.y += 0.8; // Droop height

    const curve = new THREE.QuadraticBezierCurve3(start, end, mid);
    const points = curve.getPoints(24);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: colorHex, linewidth: 2 });
    const wire = new THREE.Line(geometry, material);
    compiledCircuitGroup.add(wire);

    // Add glowing electron particle following it
    const sphereGeo = new THREE.SphereGeometry(0.04, 8, 8);
    const sphereMat = new THREE.MeshBasicMaterial({ color: colorHex });
    const pulseMesh = new THREE.Mesh(sphereGeo, sphereMat);
    compiledCircuitGroup.add(pulseMesh); // Add directly to compiledCircuitGroup!

    currentElectronPulses.push({
        curve: curve,
        mesh: pulseMesh,
        progress: Math.random(),
        speed: 0.015
    });
}


// --- SECOND WORKSPACE THREE.JS VIEWPORT (SPLIT SCREEN WORKSPACE) ---
let workspaceScene, workspaceCamera, workspaceRenderer, workspaceControls, workspaceMCU;

function initWorkspace3D() {
    const container = document.getElementById('three-workspace-canvas');
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene & Camera
    workspaceScene = new THREE.Scene();
    workspaceScene.background = new THREE.Color(0x020308);
    workspaceCamera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    workspaceCamera.position.set(0, 3, 5);

    // Renderer
    workspaceRenderer = new THREE.WebGLRenderer({ antialias: true });
    workspaceRenderer.setSize(width, height);
    workspaceRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(workspaceRenderer.domElement);

    // Controls
    workspaceControls = new THREE.OrbitControls(workspaceCamera, workspaceRenderer.domElement);
    workspaceControls.enableDamping = true;
    workspaceControls.dampingFactor = 0.05;
    workspaceControls.maxPolarAngle = Math.PI / 2.1; // Don't go below floor level

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    workspaceScene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x00f3ff, 1.0);
    dirLight.position.set(2, 6, 3);
    workspaceScene.add(dirLight);

    // Procedural Workspace Assets: Breadboard, Arduino, Sonar, LCD
    const breadboard = create3DBreadboard(true);
    workspaceScene.add(breadboard);

    workspaceMCU = create3DMCU(false);
    workspaceMCU.rotation.y = Math.PI / 2;
    workspaceMCU.position.set(-1.6, 0.12, 0);
    workspaceScene.add(workspaceMCU);

    const sonar = create3DUltrasonicSensor();
    sonar.position.set(1.4, 0.12, -0.9);
    workspaceScene.add(sonar);

    const lcd = create3DLCDDisplay();
    lcd.position.set(1.4, 0.12, 0.9);
    workspaceScene.add(lcd);

    // Add wires
    // TRIG/ECHO Wires (Yellow)
    drawWorkspaceWire(new THREE.Vector3(-1.6, 0.25, -0.4), new THREE.Vector3(0, 0.1, -0.9), 0xffd700); 
    drawWorkspaceWire(new THREE.Vector3(-1.6, 0.25, -0.3), new THREE.Vector3(0, 0.1, -0.8), 0xffd700); 
    drawWorkspaceWire(new THREE.Vector3(0, 0.1, -0.9), new THREE.Vector3(1.4, 0.2, -0.9), 0xffd700); 

    // SDA/SCL Wires (Cyan/Purple)
    drawWorkspaceWire(new THREE.Vector3(-1.6, 0.25, 0.4), new THREE.Vector3(0, 0.1, 0.8), 0x00f3ff); 
    drawWorkspaceWire(new THREE.Vector3(-1.6, 0.25, 0.5), new THREE.Vector3(0, 0.1, 0.9), 0xbd00ff); 
    drawWorkspaceWire(new THREE.Vector3(0, 0.1, 0.8), new THREE.Vector3(1.4, 0.2, 0.9), 0x00f3ff); 

    // Power Wires (Red/Black)
    drawWorkspaceWire(new THREE.Vector3(-1.6, 0.25, 0), new THREE.Vector3(-0.55, 0.1, 0), 0xff3333); // 5V
    drawWorkspaceWire(new THREE.Vector3(-1.6, 0.25, 0.1), new THREE.Vector3(-0.65, 0.1, 0.1), 0x111111); // GND

    // Resize handler
    window.addEventListener('resize', () => {
        const w = container.clientWidth;
        const h = container.clientHeight;
        workspaceCamera.aspect = w / h;
        workspaceCamera.updateProjectionMatrix();
        workspaceRenderer.setSize(w, h);
    });

    // Render loop
    function animateWorkspace() {
        requestAnimationFrame(animateWorkspace);
        workspaceControls.update();
        workspaceRenderer.render(workspaceScene, workspaceCamera);
    }
    animateWorkspace();
}

function drawWorkspaceWire(start, end, colorHex) {
    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    mid.y += 0.8;
    const curve = new THREE.QuadraticBezierCurve3(start, end, mid);
    const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(24));
    const material = new THREE.LineBasicMaterial({ color: colorHex, linewidth: 2 });
    const wire = new THREE.Line(geometry, material);
    workspaceScene.add(wire);
}

// Syncs workspace components when preset changes
function updateWorkspace3D(presetName) {
    if (!workspaceScene) return;

    // Remove old MCU
    workspaceScene.remove(workspaceMCU);

    // Add correct MCU based on preset
    const isESP = PRESETS[presetName].mcu.includes("ESP32");
    workspaceMCU = create3DMCU(isESP);
    workspaceMCU.rotation.y = Math.PI / 2; // Keep vertical!
    workspaceMCU.position.set(-1.6, 0.12, 0);
    workspaceMCU.scale.set(0.1, 0.1, 0.1);
    workspaceScene.add(workspaceMCU);

    // Entry scaling animation
    gsap.to(workspaceMCU.scale, { x: 1, y: 1, z: 1, duration: 0.6, ease: "back.out(1.5)" });
}


// --- INTERACTION WIDGETS & TAB EVENT LISTENERS ---

function setupUIInteractions() {
    // 1. Preset change listener
    const select = document.getElementById('preset-select');
    if (select) {
        select.addEventListener('change', (e) => {
            activePreset = e.target.value;
            triggerCompilation();
            updateWorkspaceTabsData();
            updateWorkspace3D(activePreset);
        });
    }

    // 2. Compilation button click
    const compileBtn = document.getElementById('compile-btn');
    if (compileBtn) {
        compileBtn.addEventListener('click', triggerCompilation);
    }

    // 3. Workspace tab buttons click
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            tabs.forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            
            activeTab = e.target.dataset.tab;
            
            const panes = document.querySelectorAll('.tab-pane');
            panes.forEach(pane => pane.classList.remove('active'));
            
            if (activeTab === "schematic") {
                document.getElementById('three-workspace-canvas').classList.add('active');
            } else if (activeTab === "code") {
                document.getElementById('workspace-code').classList.add('active');
            } else if (activeTab === "bom") {
                document.getElementById('workspace-bom').classList.add('active');
            }
        });
    });

    // 4. Pathway Mode Switch (Quick Build vs Learning Mode)
    const modeQuickBtn = document.getElementById('mode-quick');
    const modeLearningBtn = document.getElementById('mode-learning');
    const flowQuick = document.getElementById('workflow-quick');
    const flowLearning = document.getElementById('workflow-learning');

    if (modeQuickBtn && modeLearningBtn) {
        modeQuickBtn.addEventListener('click', () => {
            modeQuickBtn.classList.add('active');
            modeLearningBtn.classList.remove('active');
            flowQuick.classList.add('active');
            flowLearning.classList.remove('active');
            setupGSAPScroll(true); // Re-init scrolltrigger for quick mode
        });

        modeLearningBtn.addEventListener('click', () => {
            modeLearningBtn.classList.add('active');
            modeQuickBtn.classList.remove('active');
            flowLearning.classList.add('active');
            flowQuick.classList.remove('active');
            setupGSAPScroll(false); // Re-init scrolltrigger for learning mode
        });
    }

    // 5. IoT setup selector buttons click
    const iotBtns = document.querySelectorAll('.iot-btn');
    iotBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            iotBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            activeIot = e.target.dataset.iot;
            renderIotSteps();
        });
    });

    // 6. Interactive step card click zooms camera
    const stepCards = document.querySelectorAll('.step-card');
    stepCards.forEach(card => {
        card.addEventListener('click', (e) => {
            const stepNum = parseInt(card.dataset.step);
            focusWorkspaceCamera(stepNum);
            stepCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
        });
    });
}

// Renders the virtual IoT checklist steps dynamically
function renderIotSteps() {
    const container = document.getElementById('iot-steps-list');
    if (!container) return;
    
    container.innerHTML = "";
    const steps = IOT_GUIDES[activeIot];
    
    steps.forEach(step => {
        const li = document.createElement('li');
        li.innerHTML = step;
        container.appendChild(li);
    });
}

// Populates code editor & BOM table with the compiled preset
function updateWorkspaceTabsData() {
    const preset = PRESETS[activePreset];
    
    // Code block update
    const codeDisplay = document.getElementById('arduino-code-display');
    if (codeDisplay) {
        codeDisplay.textContent = preset.code;
    }

    // BOM table update
    const bomDisplay = document.getElementById('bom-display');
    if (bomDisplay) {
        bomDisplay.innerHTML = "";
        preset.bom.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${item.qty}x</strong></td>
                <td>${item.name}</td>
                <td><span class="file-name">${item.type}</span></td>
                <td>${item.info}</td>
            `;
            bomDisplay.appendChild(tr);
        });
    }
}


// --- GSAP CAMERA ANIMATIONS linked to Workspace steps ---

// Moves workspace camera depending on which tutorial step is clicked
function focusWorkspaceCamera(stepNum) {
    if (!workspaceCamera) return;

    // Define coordinates presets for camera angles
    const cameraAngles = {
        1: { px: 0, py: 3, pz: 5, rx: -0.5, ry: 0 },       // Overview
        2: { px: -0.6, py: 1.2, pz: 1.8, rx: -0.4, ry: -0.2 }, // Microcontroller focus
        3: { px: 0.8, py: 1.0, pz: 1.6, rx: -0.4, ry: 0.3 },  // Sensor/resistor focus
        4: { px: -1.0, py: 0.8, pz: 1.2, rx: -0.2, ry: -0.5 }  // USB upload flash focus
    };

    const target = cameraAngles[stepNum] || cameraAngles[1];

    // GSAP tween the camera and OrbitControls target
    gsap.to(workspaceCamera.position, {
        x: target.px,
        y: target.py,
        z: target.pz,
        duration: 1.2,
        ease: "power2.inOut",
        onUpdate: () => {
            workspaceCamera.lookAt(target.px + target.ry, 0, 0);
        }
    });
}

// Scroll-linked timeline utilizing GSAP ScrollTrigger
function setupGSAPScroll(isQuickMode) {
    // Register scrolltrigger extension
    gsap.registerPlugin(ScrollTrigger);

    // Create custom timeline binding scrolling depth to camera
    const flowId = isQuickMode ? "#workflow-quick" : "#workflow-learning";
    const steps = document.querySelectorAll(`${flowId} .step-card`);

    steps.forEach((step, idx) => {
        ScrollTrigger.create({
            trigger: step,
            start: "top 60%",
            end: "bottom 40%",
            onEnter: () => {
                steps.forEach(s => s.classList.remove('active'));
                step.classList.add('active');
                focusWorkspaceCamera(idx + 1);
            },
            onEnterBack: () => {
                steps.forEach(s => s.classList.remove('active'));
                step.classList.add('active');
                focusWorkspaceCamera(idx + 1);
            }
        });
    });
}


// --- COMPONENT LAB INTERACTIONS (GLTF-like rotations) ---
function initComponentLab() {
    const cards = document.querySelectorAll('.component-card');
    cards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            // Apply slight shake/scale using GSAP
            gsap.to(card, { scale: 1.03, duration: 0.3, ease: "power1.out" });
        });
        card.addEventListener('mouseleave', () => {
            gsap.to(card, { scale: 1.0, duration: 0.3, ease: "power1.in" });
        });
    });
}


// --- START APPLICATION ---
window.addEventListener('DOMContentLoaded', () => {
    initHero3D();
    initWorkspace3D();
    setupUIInteractions();
    renderIotSteps();
    updateWorkspaceTabsData();
    initComponentLab();
});

// --- STATE-CHANGING REDIRECT FUNCTION (POSTMESSAGE TRIGGER) ---
function startBuilding() {
  window.parent.postMessage({ action: 'startBuilding' }, '*');
}
