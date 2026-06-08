export type ComponentCategory =
    | "SENSOR"
    | "ACTUATOR"
    | "TIMER"
    | "MCU"
    | "PLATFORM"

export type SignalType =
    | "DIGITAL"
    | "ANALOG"
    | "DATA"
    | null

export interface ArduinoMeta {
    pinMode: "INPUT" | "OUTPUT" | "INPUT_PULLUP" | null
    readVar?: string          // exact variable name used in readSnippet e.g. "pirState"
    readSnippet?: string      // code to read the component's value into a variable
    writeSnippet?: string     // code to actuate the component
    helperFunctions?: string  // any extra function defs needed (e.g. pulseIn for HC-SR04)
}

export interface ComponentCapability {
    category: ComponentCategory
    signalType: SignalType
    producesCondition: boolean
    requiresThreshold: boolean
    friendlyCondition?: string   // human-readable UI label, e.g. "PIR detects motion"
    arduino: ArduinoMeta
}

export const COMPONENT_REGISTRY: Record<string, ComponentCapability> = {

    // ===== Sensors =====
    PIR: {
        category: "SENSOR",
        signalType: "DIGITAL",
        producesCondition: true,
        requiresThreshold: false,
        friendlyCondition: "PIR detects motion",
        arduino: {
            pinMode: "INPUT",
            readVar: "pirState",
            readSnippet: "int {VAR} = digitalRead({PIN});",
            writeSnippet: undefined,
            helperFunctions: undefined
        }
    },

    HC_SR04: {
        category: "SENSOR",
        signalType: "DATA",
        producesCondition: true,
        requiresThreshold: true,
        friendlyCondition: "Object is closer than threshold distance",
        arduino: {
            pinMode: null,
            readVar: "distance",
            readSnippet: "long {VAR} = readUltrasonic({TRIG}, {ECHO});",
            writeSnippet: undefined,
            helperFunctions: `long readUltrasonic(int trigPin, int echoPin) {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);
  long duration = pulseIn(echoPin, HIGH);
  return duration * 0.034 / 2;
}`
        }
    },

    DHT11: {
        category: "SENSOR",
        signalType: "DATA",
        producesCondition: true,
        requiresThreshold: true,
        friendlyCondition: "Temperature exceeds threshold",
        arduino: {
            pinMode: "INPUT",
            readVar: "temperature",
            readSnippet: "float {VAR} = dht.readTemperature();\n  float humidity = dht.readHumidity();",
            writeSnippet: undefined,
            helperFunctions: undefined
        }
    },

    SOIL_MOISTURE: {
        category: "SENSOR",
        signalType: "ANALOG",
        producesCondition: true,
        requiresThreshold: true,
        friendlyCondition: "Soil moisture is below threshold",
        arduino: {
            pinMode: "INPUT",
            readVar: "soilValue",
            readSnippet: "int {VAR} = analogRead({PIN});",
            writeSnippet: undefined,
            helperFunctions: undefined
        }
    },

    LDR: {
        category: "SENSOR",
        signalType: "ANALOG",
        producesCondition: true,
        requiresThreshold: true,
        friendlyCondition: "Light level is below threshold",
        arduino: {
            pinMode: "INPUT",
            readVar: "lightValue",
            readSnippet: "int {VAR} = analogRead({PIN});",
            writeSnippet: undefined,
            helperFunctions: undefined
        }
    },

    LM35: {
        category: "SENSOR",
        signalType: "ANALOG",
        producesCondition: true,
        requiresThreshold: true,
        friendlyCondition: "Temperature exceeds threshold",
        arduino: {
            pinMode: "INPUT",
            readVar: "temperatureValue",
            readSnippet: "float {VAR} = (analogRead({PIN}) * 5.0 * 100.0) / 1024.0;",
            writeSnippet: undefined,
            helperFunctions: undefined
        }
    },

    BUTTON: {
        category: "SENSOR",
        signalType: "DIGITAL",
        producesCondition: true,
        requiresThreshold: false,
        friendlyCondition: "Button is pressed",
        arduino: {
            pinMode: "INPUT_PULLUP",
            readVar: "buttonState",
            readSnippet: "int {VAR} = digitalRead({PIN});",
            writeSnippet: undefined,
            helperFunctions: undefined
        }
    },

    // ===== Actuators =====
    LED: {
        category: "ACTUATOR",
        signalType: null,
        producesCondition: false,
        requiresThreshold: false,
        arduino: {
            pinMode: "OUTPUT",
            readSnippet: undefined,
            writeSnippet: "digitalWrite({PIN}, HIGH);",
            helperFunctions: undefined
        }
    },

    MOTOR: {
        category: "ACTUATOR",
        signalType: null,
        producesCondition: false,
        requiresThreshold: false,
        arduino: {
            pinMode: "OUTPUT",
            readSnippet: undefined,
            writeSnippet: "digitalWrite({PIN}, HIGH);",
            helperFunctions: undefined
        }
    },

    BUZZER: {
        category: "ACTUATOR",
        signalType: null,
        producesCondition: false,
        requiresThreshold: false,
        arduino: {
            pinMode: "OUTPUT",
            readSnippet: undefined,
            writeSnippet: "digitalWrite({PIN}, HIGH);",
            helperFunctions: undefined
        }
    },

    SERVO: {
        category: "ACTUATOR",
        signalType: null,
        producesCondition: false,
        requiresThreshold: false,
        arduino: {
            pinMode: null, // Servo library handles pin
            readSnippet: undefined,
            writeSnippet: "servo.write(90);",
            helperFunctions: undefined
            // Requires #include <Servo.h>
        }
    },

    RELAY: {
        category: "ACTUATOR",
        signalType: null,
        producesCondition: false,
        requiresThreshold: false,
        arduino: {
            pinMode: "OUTPUT",
            readSnippet: undefined,
            writeSnippet: "digitalWrite({PIN}, LOW);", // Active LOW relay
            helperFunctions: undefined
        }
    },

    LCD: {
        category: "ACTUATOR",
        signalType: null,
        producesCondition: false,
        requiresThreshold: false,
        arduino: {
            pinMode: null, // I2C — no pinMode
            readSnippet: undefined,
            writeSnippet: 'lcd.clear();\n  lcd.setCursor(0,0);\n  lcd.print("ACTIVE");',
            helperFunctions: undefined
            // Requires #include <LiquidCrystal_I2C.h>
        }
    },

    // ===== Logic =====
    TIMER: {
        category: "TIMER",
        signalType: null,
        producesCondition: true,
        requiresThreshold: false,
        friendlyCondition: "Timer interval has elapsed",
        arduino: {
            pinMode: null,
            readVar: "currentMillis",
            readSnippet: "unsigned long {VAR} = millis();",
            writeSnippet: undefined,
            helperFunctions: undefined
        }
    },

    // ===== MCU =====
    ARDUINO: {
        category: "MCU",
        signalType: null,
        producesCondition: false,
        requiresThreshold: false,
        arduino: {
            pinMode: null,
            readSnippet: undefined,
            writeSnippet: undefined,
            helperFunctions: undefined
        }
    },

    ESP32: {
        category: "MCU",
        signalType: null,
        producesCondition: false,
        requiresThreshold: false,
        arduino: {
            pinMode: null,
            readSnippet: undefined,
            writeSnippet: undefined,
            helperFunctions: undefined
        }
    },

    // ===== Platform =====
    BLYNK: {
        category: "PLATFORM",
        signalType: null,
        producesCondition: false,
        requiresThreshold: false,
        arduino: {
            pinMode: null,
            readSnippet: undefined,
            writeSnippet: "Blynk.virtualWrite(V0, 1);",
            helperFunctions: undefined
        }
    }
}
