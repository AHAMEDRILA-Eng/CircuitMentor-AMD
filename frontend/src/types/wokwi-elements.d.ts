// Type declarations for @wokwi/elements Web Components
// These are custom HTML elements registered by the @wokwi/elements package

declare namespace JSX {
    interface IntrinsicElements {
        'wokwi-arduino-uno': React.HTMLAttributes<HTMLElement>;
        'wokwi-arduino-nano': React.HTMLAttributes<HTMLElement>;
        'wokwi-arduino-mega': React.HTMLAttributes<HTMLElement>;
        'wokwi-esp32-devkit-v1': React.HTMLAttributes<HTMLElement>;
        'wokwi-pir-motion-sensor': React.HTMLAttributes<HTMLElement>;
        'wokwi-dht22': React.HTMLAttributes<HTMLElement>;
        'wokwi-hc-sr04': React.HTMLAttributes<HTMLElement>;
        'wokwi-photoresistor-sensor': React.HTMLAttributes<HTMLElement>;
        'wokwi-flame-sensor': React.HTMLAttributes<HTMLElement>;
        'wokwi-gas-sensor': React.HTMLAttributes<HTMLElement>;
        'wokwi-big-sound-sensor': React.HTMLAttributes<HTMLElement>;
        'wokwi-small-sound-sensor': React.HTMLAttributes<HTMLElement>;
        'wokwi-ntc-temperature-sensor': React.HTMLAttributes<HTMLElement>;
        'wokwi-ir-receiver': React.HTMLAttributes<HTMLElement>;
        'wokwi-pushbutton': React.HTMLAttributes<HTMLElement>;
        'wokwi-pushbutton-6mm': React.HTMLAttributes<HTMLElement>;
        'wokwi-led': React.HTMLAttributes<HTMLElement> & { color?: string };
        'wokwi-rgb-led': React.HTMLAttributes<HTMLElement>;
        'wokwi-buzzer': React.HTMLAttributes<HTMLElement>;
        'wokwi-servo': React.HTMLAttributes<HTMLElement>;
        'wokwi-ks2e-m-dc5': React.HTMLAttributes<HTMLElement>;
        'wokwi-stepper-motor': React.HTMLAttributes<HTMLElement>;
        'wokwi-lcd1602': React.HTMLAttributes<HTMLElement>;
        'wokwi-lcd2004': React.HTMLAttributes<HTMLElement>;
        'wokwi-ssd1306': React.HTMLAttributes<HTMLElement>;
        'wokwi-7segment': React.HTMLAttributes<HTMLElement>;
        'wokwi-resistor': React.HTMLAttributes<HTMLElement>;
        'wokwi-potentiometer': React.HTMLAttributes<HTMLElement>;
        'wokwi-neopixel': React.HTMLAttributes<HTMLElement>;
        'wokwi-neopixel-matrix': React.HTMLAttributes<HTMLElement>;
        'wokwi-led-bar-graph': React.HTMLAttributes<HTMLElement>;
        'wokwi-led-ring': React.HTMLAttributes<HTMLElement>;
        'wokwi-servo': React.HTMLAttributes<HTMLElement>;
        'wokwi-mpu6050': React.HTMLAttributes<HTMLElement>;
        'wokwi-ds1307': React.HTMLAttributes<HTMLElement>;
        'wokwi-membrane-keypad': React.HTMLAttributes<HTMLElement>;
    }
}
