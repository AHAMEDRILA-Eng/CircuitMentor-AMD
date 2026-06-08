/**
 * ============================================================
 * componentTeachingData.ts — Rich Teaching Content per Component
 * ============================================================
 * Used by ComponentTeachingPanel to show deep, project-aware
 * teaching cards for every supported component.
 * ============================================================
 */

export interface TeachingCard {
  humanName: string;
  emoji: string;
  whatItIs: string;
  howItWorks: string;
  wiringEssentials: string;
  commonMistake: string;
  examinerQuestion: string;
}

export const TEACHING_DATA: Record<string, TeachingCard> = {

  // ── MCU ────────────────────────────────────────────────────

  MCU_Arduino_Uno: {
    humanName: 'Arduino Uno R3',
    emoji: '🧠',
    whatItIs: 'The brain of your circuit — a microcontroller board that runs your code and controls all connected components.',
    howItWorks: 'The ATmega328P chip executes your sketch line by line. It reads sensor values through its pins, processes logic, and sends signals to actuators — all running in a continuous loop.',
    wiringEssentials: '5V logic. Each GPIO can safely supply 20mA max. Analog pins A0-A5 read 0-5V. I2C uses A4 (SDA) and A5 (SCL).',
    commonMistake: 'Drawing more than 20mA from a single GPIO pin. This permanently damages the pin — always use a resistor with LEDs and a transistor/relay for motors.',
    examinerQuestion: 'Why can\'t you connect a motor directly to an Arduino GPIO pin?',
  },

  MCU_ESP32: {
    humanName: 'ESP32 DevKit V1',
    emoji: '📡',
    whatItIs: 'A powerful dual-core microcontroller with built-in Wi-Fi and Bluetooth — the standard choice for IoT projects.',
    howItWorks: 'Two 240MHz Xtensa cores run your code while a separate radio core handles Wi-Fi/Bluetooth. It connects to the internet and sends/receives data from platforms like Telegram and Blynk.',
    wiringEssentials: '3.3V logic only — NEVER connect 5V sensor signals directly. GPIO 34/35/36/39 are input-only (ADC1, safe with WiFi). I2C uses GPIO 21 (SDA) and GPIO 22 (SCL).',
    commonMistake: 'Using ADC2 pins (GPIO 0, 2, 4, 12-15, 25-27) for analog sensors when WiFi is active — ADC2 is disabled when WiFi runs. Always use ADC1 pins (GPIO 32-39).',
    examinerQuestion: 'Why can\'t you use GPIO 25 for an analog sensor when WiFi is enabled on ESP32?',
  },

  // ── Sensors ────────────────────────────────────────────────

  Sensor_PIR: {
    humanName: 'PIR Motion Sensor (HC-SR501)',
    emoji: '👁️',
    whatItIs: 'A passive infrared sensor that detects motion by sensing changes in infrared heat emitted by moving warm bodies.',
    howItWorks: 'A pyroelectric sensor behind a Fresnel lens detects IR heat changes across two zones. When a warm object moves between zones, the difference triggers a digital HIGH output on the OUT pin.',
    wiringEssentials: 'VCC → 5V, GND → GND, OUT → any digital GPIO. Output is 3.3V safe (compatible with ESP32 directly). Needs 30-60 second warm-up after power-on.',
    commonMistake: 'Testing immediately after power-on. The sensor needs up to 60 seconds to calibrate to room temperature. False triggers during this period are normal.',
    examinerQuestion: 'Why does a PIR sensor trigger randomly near an air conditioning vent?',
  },

  Sensor_DHT11: {
    humanName: 'DHT11 Temperature & Humidity Sensor',
    emoji: '🌡️',
    whatItIs: 'A digital sensor that measures both air temperature (0-50°C) and relative humidity (20-90%) in a single package.',
    howItWorks: 'A capacitive humidity element and NTC thermistor measure conditions. A built-in chip converts readings to a digital signal sent via a proprietary single-wire protocol to the microcontroller.',
    wiringEssentials: 'VCC → 3.3V or 5V, GND → GND, DATA → digital GPIO. Requires a 10kΩ pull-up resistor on DATA pin (many modules include this). Must wait 1-2 seconds between reads.',
    commonMistake: 'Not checking for NaN before using the reading. If read too fast or wiring is loose, dht.readTemperature() returns NaN. Always use: if (!isnan(temp)) before processing.',
    examinerQuestion: 'What happens if you call dht.readTemperature() every 100ms instead of every 2 seconds?',
  },

  Sensor_HC_SR04: {
    humanName: 'HC-SR04 Ultrasonic Distance Sensor',
    emoji: '📏',
    whatItIs: 'A sensor that measures distance to objects using ultrasonic sound pulses — like a bat\'s echolocation.',
    howItWorks: 'Sending a 10µs pulse to TRIG fires 8 bursts of 40kHz ultrasonic sound. The sound reflects off objects and returns. ECHO stays HIGH for the duration of the round trip. Distance = time × 0.034 / 2.',
    wiringEssentials: 'VCC → 5V, GND → GND, TRIG → digital output GPIO, ECHO → digital input GPIO. WARNING: ECHO outputs 5V — use a voltage divider (1kΩ + 2kΩ) before connecting to ESP32.',
    commonMistake: 'Connecting ECHO directly to ESP32 GPIO without a voltage divider. The 5V ECHO signal exceeds ESP32\'s 3.3V GPIO limit and can permanently damage the chip.',
    examinerQuestion: 'Why do we divide the pulse duration by 2 when calculating distance with HC-SR04?',
  },

  Sensor_LDR: {
    humanName: 'LDR Light Sensor (Photoresistor)',
    emoji: '☀️',
    whatItIs: 'A light-dependent resistor whose resistance changes dramatically with light intensity — from ~1kΩ in bright light to ~1MΩ in darkness.',
    howItWorks: 'Semiconductor material (cadmium sulfide) releases electrons when photons hit it, reducing resistance. Paired with a fixed 10kΩ resistor in a voltage divider, the junction voltage changes with light and is read by analogRead().',
    wiringEssentials: 'LDR has no polarity. One leg to 3.3V/5V, other leg to analog GPIO AND to 10kΩ resistor to GND. The analog pin reads the voltage at the LDR-resistor junction.',
    commonMistake: 'Swapping the LDR and 10kΩ resistor positions in the voltage divider — this inverts the reading (bright = max value instead of min). Check which end connects to VCC.',
    examinerQuestion: 'Why does an LDR need a fixed resistor to produce a readable output?',
  },

  Sensor_MQ2_Gas: {
    humanName: 'MQ-2 Gas & Smoke Sensor',
    emoji: '💨',
    whatItIs: 'A broad-spectrum combustible gas sensor that detects LPG, propane, methane, smoke, hydrogen, and alcohol vapour.',
    howItWorks: 'A tin dioxide (SnO2) sensing element on a heated coil changes resistance when combustible gases are present. The lower the resistance, the higher the gas concentration. An onboard comparator converts this to analog and digital outputs.',
    wiringEssentials: 'VCC → 5V supply rail (NOT a GPIO pin — draws 150mA), GND → GND, AO → analog GPIO (ADC1 on ESP32), DO → digital GPIO for threshold alert. Requires 20 second warm-up.',
    commonMistake: 'Powering from a GPIO pin. The heater draws 150mA which instantly destroys any GPIO pin (max 20-40mA). Always connect VCC to the 5V power rail.',
    examinerQuestion: 'Why does the MQ-2 sensor give inaccurate readings for the first 20 seconds after power-on?',
  },

  Sensor_Soil_Moisture: {
    humanName: 'Soil Moisture Sensor (YL-69)',
    emoji: '🪴',
    whatItIs: 'A resistive sensor that measures soil water content by detecting the electrical conductivity between two metal probes inserted in soil.',
    howItWorks: 'Wet soil conducts electricity between the probes, lowering resistance and output voltage. Dry soil is a poor conductor, giving high resistance and high output. An analog value from 0-4095 (ESP32) represents the moisture level.',
    wiringEssentials: 'VCC → 3.3V or 5V, GND → GND, AO → analog GPIO (ADC1 on ESP32). For longevity, power VCC from a GPIO output pin and only enable during readings to reduce electrolytic corrosion.',
    commonMistake: 'Leaving the sensor powered continuously in soil. Constant DC current causes electrolysis which corrodes the metal probes within days. Power it only during readings.',
    examinerQuestion: 'Why does wet soil give a LOW analog reading instead of a HIGH one on a soil moisture sensor?',
  },

  Sensor_Rain: {
    humanName: 'Rain Detection Sensor (YL-83)',
    emoji: '🌧️',
    whatItIs: 'A sensor that detects rainfall by measuring conductivity across exposed copper traces when water bridges them.',
    howItWorks: 'The probe board has a grid of interleaved copper tracks. Raindrops bridge adjacent tracks, completing a circuit and lowering resistance. The control board\'s LM393 comparator converts this to digital and analog outputs.',
    wiringEssentials: 'VCC → 3.3V or 5V, GND → GND, AO → analog GPIO, DO → digital GPIO. The probe board gets wet; the control board (with electronics) must stay dry and protected.',
    commonMistake: 'Exposing the control board (with the LM393 and potentiometer) to rain. Only the probe PCB is designed to get wet. Mount the control board in an enclosure.',
    examinerQuestion: 'Why does the rain sensor use a comparator (LM393) chip on its control board?',
  },

  Sensor_Flame: {
    humanName: 'Flame Detection Sensor',
    emoji: '🔥',
    whatItIs: 'An infrared sensor that detects flames by sensing the specific IR wavelength (760-1100nm) emitted by fire.',
    howItWorks: 'An IR photodiode tuned to flame wavelengths generates a small current when flame IR hits it. The onboard LM393 comparator compares this against a potentiometer threshold and outputs LOW when a flame is detected.',
    wiringEssentials: 'VCC → 3.3V or 5V, GND → GND, DO → digital GPIO. Active-LOW output: flame detected = LOW, no flame = HIGH. Detection angle is approximately 60°.',
    commonMistake: 'Placing the sensor where direct sunlight can hit it. Sunlight contains strong IR in the same wavelength range as flames, causing constant false triggers. Always shield from direct sun.',
    examinerQuestion: 'Why does a flame sensor sometimes trigger near a window on a sunny day?',
  },

  Sensor_Sound: {
    humanName: 'Sound Sensor (KY-038)',
    emoji: '🔊',
    whatItIs: 'A microphone-based sensor that detects sound levels and clap/noise events using a condenser microphone and LM393 comparator.',
    howItWorks: 'A condenser microphone converts sound pressure waves into a tiny voltage signal. The LM393 comparator amplifies this and compares it to a threshold set by the onboard potentiometer. AO gives raw sound level; DO gives a digital trigger.',
    wiringEssentials: 'VCC → 3.3V or 5V, GND → GND, AO → analog GPIO, DO → digital GPIO. Adjust the potentiometer to set DO trigger sensitivity. AO gives continuous sound level readings.',
    commonMistake: 'Using only the DO pin and expecting to measure sound volume. DO only gives HIGH/LOW above/below threshold. For sound level measurement, you must use the AO (analog) pin.',
    examinerQuestion: 'What is the difference between the AO and DO pins on the sound sensor module?',
  },

  Sensor_IR_Obstacle: {
    humanName: 'IR Obstacle Sensor',
    emoji: '🚧',
    whatItIs: 'A short-range infrared sensor that detects nearby objects by emitting IR light and detecting its reflection.',
    howItWorks: 'An IR LED emits infrared light. When an object is within range (2-30cm), reflected IR hits the IR receiver photodiode. The LM393 comparator triggers a LOW output when reflection is detected.',
    wiringEssentials: 'VCC → 3.3V or 5V, GND → GND, OUT → digital GPIO. Active-LOW: obstacle present = LOW. Potentiometer adjusts detection distance (2-30cm range).',
    commonMistake: 'Expecting it to detect black or very dark objects. Black surfaces absorb IR instead of reflecting it — the sensor cannot detect them even at close range. Use ultrasonic (HC-SR04) for dark surfaces.',
    examinerQuestion: 'Why does an IR obstacle sensor fail to detect a black object placed directly in front of it?',
  },

  Sensor_Heartbeat: {
    humanName: 'Pulse / Heartbeat Sensor',
    emoji: '❤️',
    whatItIs: 'A photoplethysmography (PPG) sensor that detects heartbeats by shining light through the fingertip and measuring blood volume changes.',
    howItWorks: 'A green or IR LED shines through the fingertip. Each heartbeat pumps more blood through the capillaries, absorbing more light. A photodiode detects these rhythmic intensity changes, producing a waveform that peaks with each beat.',
    wiringEssentials: 'VCC → 3.3V or 5V, GND → GND, Signal → analog GPIO (ADC1 on ESP32). Place finger gently on the sensor with consistent pressure. Shield from ambient light.',
    commonMistake: 'Moving the finger while reading. Even slight movement causes motion artifacts 10x larger than the heartbeat signal, making beat detection impossible. Keep completely still during measurement.',
    examinerQuestion: 'Why does finger movement cause such large errors in a pulse sensor reading?',
  },

  Sensor_Temperature_LM35: {
    humanName: 'LM35 Temperature Sensor',
    emoji: '🌡️',
    whatItIs: 'A precision analog temperature sensor that outputs a voltage linearly proportional to temperature — exactly 10mV per degree Celsius.',
    howItWorks: 'Internal bandgap circuitry produces a stable voltage that increases linearly with temperature. At 25°C it outputs 250mV. At 0°C it outputs 0V. No calibration needed — the relationship is factory-accurate.',
    wiringEssentials: 'VCC → 3.3V (on ESP32) or 5V (on Arduino), GND → GND, OUT → analog GPIO. Formula for ESP32: tempC = analogRead(pin) × (3.3 / 4095.0) × 100. Must power from 3.3V on ESP32 to avoid saturating ADC.',
    commonMistake: 'Powering LM35 from 5V when using with ESP32. At temperatures above 33°C, the output exceeds 3.3V and saturates the ESP32 ADC, giving wrong readings. Always use 3.3V supply with ESP32.',
    examinerQuestion: 'What voltage does the LM35 output at 30°C, and how do you convert that to a temperature reading on ESP32?',
  },

  // ── Actuators ──────────────────────────────────────────────

  Actuator_LED: {
    humanName: 'Standard LED',
    emoji: '💡',
    whatItIs: 'A Light Emitting Diode — a semiconductor that emits light when current flows through it in the correct direction.',
    howItWorks: 'When forward-biased (anode + to cathode -), electrons recombine with holes releasing energy as photons. Red LEDs emit at ~2V forward voltage, blue/white at ~3.2V. A series resistor limits current to safe levels.',
    wiringEssentials: 'Long leg (anode +) → GPIO via 220Ω resistor. Short leg (cathode -) → GND. Resistor value: R = (Vsupply - Vled) / 0.02. For ESP32: (3.3-2.0) / 0.02 = 65Ω minimum, use 220Ω for safety.',
    commonMistake: 'Connecting LED directly to GPIO without a resistor. Without 220Ω, current is limited only by the GPIO\'s ~25Ω internal resistance: I = (3.3-2.0)/25 = 52mA — destroying the GPIO pin instantly.',
    examinerQuestion: 'How do you calculate the correct resistor value for an LED connected to a 3.3V ESP32 GPIO pin?',
  },

  Actuator_Relay_5V: {
    humanName: '5V Relay Module (Songle)',
    emoji: '⚡',
    whatItIs: 'An electrically operated switch that uses a small 5V control signal to switch high-power devices (up to 250VAC/10A) completely isolated from the microcontroller.',
    howItWorks: 'A GPIO signal drives a transistor which energises an electromagnetic coil. The coil pulls a mechanical contact, closing or opening the high-power circuit. Optical or electrical isolation protects the MCU from mains voltage.',
    wiringEssentials: 'Module VCC → 5V supply, GND → GND, IN → GPIO. Most modules are ACTIVE-LOW: digitalWrite(pin, LOW) = relay ON. High-power connections on COM, NO (normally open), NC (normally closed) terminals.',
    commonMistake: 'Thinking HIGH turns the relay ON. Most relay modules are active-LOW — HIGH = OFF, LOW = ON. Always test with Serial.println to confirm state before connecting any load.',
    examinerQuestion: 'Why is a relay module described as "active-LOW" and what does that mean in your digitalWrite() calls?',
  },

  Actuator_Buzzer: {
    humanName: 'Active Buzzer',
    emoji: '🔔',
    whatItIs: 'An electromechanical sound component with a built-in oscillator that produces a fixed-frequency beep when DC power is applied.',
    howItWorks: 'An internal oscillator circuit drives a piezoelectric disc at a fixed frequency (~2kHz typically). Unlike passive buzzers, no external PWM signal is needed — just apply voltage and it beeps.',
    wiringEssentials: 'Positive leg (+) → GPIO, negative leg (-) → GND. Use digitalWrite(pin, HIGH) to beep. Max current ~30mA — within GPIO limits but a transistor switch is safer for continuous use.',
    commonMistake: 'Using tone() function with an active buzzer expecting different frequencies. Active buzzers ignore frequency — tone() only works with passive buzzers. For variable tones, you need a passive buzzer.',
    examinerQuestion: 'What is the difference between an active and passive buzzer, and which one requires the tone() function?',
  },

  Actuator_Servo_SG90: {
    humanName: 'SG90 Micro Servo Motor',
    emoji: '⚙️',
    whatItIs: 'A small positional motor that rotates to a precise angle (0-180°) using PWM signals — ideal for door locks, robot arms, and valve control.',
    howItWorks: 'An internal potentiometer tracks the shaft position. The control circuit compares desired position (from PWM pulse width) to actual position and drives the motor to close the gap. 1ms pulse = 0°, 1.5ms = 90°, 2ms = 180°.',
    wiringEssentials: 'Red wire → 5V supply (NOT ESP32 3.3V pin), Brown wire → GND, Orange wire → PWM-capable GPIO. Must use dedicated 5V supply for multiple servos — stall current can reach 650mA.',
    commonMistake: 'Powering from ESP32\'s 3.3V pin. The SG90 needs 4.8-6V and can draw 650mA under load. ESP32 3.3V pin can only supply ~300mA total. Use a separate 5V supply or power bank.',
    examinerQuestion: 'Why should a servo motor be powered from a separate 5V supply instead of the microcontroller\'s power pin?',
  },

  Actuator_Water_Pump: {
    humanName: 'Mini 5V Water Pump',
    emoji: '💧',
    whatItIs: 'A small submersible DC pump that moves water through tubing — used in automatic irrigation, aquarium filtration, and fluid control systems.',
    howItWorks: 'A DC motor spins an impeller inside the pump body, creating suction that draws water in and pushes it out through the outlet. Speed is fixed at rated voltage. A relay or transistor switch controls ON/OFF from the MCU.',
    wiringEssentials: 'Pump wires → relay NO and COM terminals. Relay controlled by GPIO. Pump VCC → 5V supply rail (NOT GPIO — draws 200-300mA). Always use a flyback diode across pump terminals to suppress voltage spikes.',
    commonMistake: 'Running the pump without water (dry running). Submersible pumps are cooled by water. Running dry for even 30 seconds overheats the motor windings and permanently destroys the pump.',
    examinerQuestion: 'Why must the water pump be connected through a relay instead of directly to a GPIO pin?',
  },

  // ── Displays ───────────────────────────────────────────────

  Display_OLED_SSD1306: {
    humanName: 'OLED Display (SSD1306 128×64)',
    emoji: '🖥️',
    whatItIs: 'A compact 0.96" graphical display with 128×64 pixels that communicates via I2C — capable of showing text, numbers, and simple graphics.',
    howItWorks: 'Each pixel is an organic LED that emits its own light — no backlight needed. The SSD1306 controller receives I2C commands and updates the pixel buffer. The Adafruit SSD1306 library handles all low-level communication.',
    wiringEssentials: 'VCC → 3.3V, GND → GND, SDA → GPIO 21 (ESP32) or A4 (Arduino), SCL → GPIO 22 (ESP32) or A5 (Arduino). I2C address is typically 0x3C. Multiple I2C devices share the same SDA/SCL bus.',
    commonMistake: 'Forgetting to call display.display() after drawing. The library draws to a buffer in RAM. Without display.display(), nothing appears on screen — all draw commands are invisible until you call it.',
    examinerQuestion: 'What I2C address does the SSD1306 OLED use, and how would you find it if the display isn\'t working?',
  },

  Display_LCD_16x2: {
    humanName: 'LCD 16×2 Display with I2C',
    emoji: '📟',
    whatItIs: 'A character display showing 2 rows of 16 characters, with an I2C backpack that reduces wiring from 16 pins to just 2 (SDA + SCL).',
    howItWorks: 'The HD44780 controller chip receives character codes and drives the liquid crystal pixels. The PCF8574 I2C backpack expands 2 I2C pins into the 8 parallel data pins the HD44780 needs.',
    wiringEssentials: 'VCC → 5V, GND → GND, SDA → A4/GPIO 21, SCL → A5/GPIO 22. I2C address is 0x27 or 0x3F (check with I2C scanner). Adjust backpack potentiometer for contrast if display is blank.',
    commonMistake: 'Blank display despite no code errors. Two causes: wrong I2C address in LiquidCrystal_I2C constructor, or contrast potentiometer not adjusted. Run I2C scanner and turn the potentiometer slowly.',
    examinerQuestion: 'Why does an LCD 16x2 with an I2C module only need 2 data wires instead of 16?',
  },

  // ── Inputs ─────────────────────────────────────────────────

  Input_Button: {
    humanName: 'Push Button (Tactile Switch)',
    emoji: '🔘',
    whatItIs: 'A momentary tactile switch that connects two circuit points when pressed and disconnects when released.',
    howItWorks: 'Pressing physically pushes metal contacts together, completing the circuit. When released, a spring separates the contacts. The microcontroller detects this as a voltage change on a GPIO pin.',
    wiringEssentials: 'One leg → GPIO (with INPUT_PULLUP mode), other leg → GND. INPUT_PULLUP activates internal resistor keeping pin HIGH. Pressed = LOW, Released = HIGH. No external resistor needed with INPUT_PULLUP.',
    commonMistake: 'Reading the button in loop() without debouncing. Metal contacts bounce 5-20 times in <10ms when pressed. One physical press registers as multiple presses. Add: delay(50) or use millis() debounce after detecting change.',
    examinerQuestion: 'What is button debouncing and why is it necessary in microcontroller projects?',
  },

  Input_Potentiometer: {
    humanName: 'Potentiometer (Variable Resistor)',
    emoji: '🎚️',
    whatItIs: 'A three-terminal variable resistor that provides an adjustable voltage output as the knob is turned — used for manual control of speed, brightness, or any analog parameter.',
    howItWorks: 'A resistive track runs between two outer terminals. A wiper (middle terminal) slides along the track as the knob turns, dividing the total resistance. This creates a voltage divider that outputs 0V to VCC proportionally.',
    wiringEssentials: 'Left outer pin → GND, Right outer pin → 3.3V (ESP32) or 5V (Arduino), Middle wiper pin → analog GPIO. analogRead() returns 0-4095 (ESP32) or 0-1023 (Arduino). Use map() to convert to desired range.',
    commonMistake: 'Connecting outer pins both to VCC or both to GND. The potentiometer only works as a voltage divider when one outer pin is at VCC and the other is at GND. Both to VCC = always maximum reading.',
    examinerQuestion: 'How do you convert a raw analogRead() value from a potentiometer to a percentage (0-100%)?',
  },
};
