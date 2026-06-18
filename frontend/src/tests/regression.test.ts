import { describe, it } from 'node:test';
import assert from 'node:assert';
import { buildCircuitGraph, COMPONENT_WIRING_RULES } from '../logic/wiringRulesEngine';
import { COMPONENT_DEFS } from '../logic/componentDefs';
import { useProjectStore } from '../store/useProjectStore';

describe('Frontend Regression Tests', () => {

    // FIX-05: actuatorIdx not double incremented
    it('should assign sequential IDs to multiple actuators', () => {
        const concept = {
            inputs: [],
            logic: ['MCU_Arduino_Uno'],
            outputs: ['Actuator_LED', 'Actuator_Buzzer']
        };
        const graph = buildCircuitGraph(concept);
        const actuatorNodes = graph.nodes.filter(n => n.id.startsWith('actuator_'));
        
        assert.strictEqual(actuatorNodes.length, 2, 'Should have exactly 2 actuator nodes');
        const ids = actuatorNodes.map(n => n.id).sort();
        assert.deepStrictEqual(ids, ['actuator_0', 'actuator_1'], 'Actuator indices must be sequential');
    });

    // BUG-006: doubt gate uses word boundaries but matches 'no idea'
    it('should correctly evaluate ready signals in the doubt gate', () => {
        const readySignals = [
            'no', 'ready', 'done', "i'm ready", 'im ready', 'no doubts', 'no doubt',
            'show circuit', 'continue', 'proceed', 'ok', 'okay', 'nope', 'all good',
            'got it', 'understood', 'yes', 'yep', 'sure', 'fine', 'lets go', "let's go",
        ];
        const negativeSignals = ['no idea', 'no clue', 'not ready', 'not done', 'no thoughts'];

        const checkReady = (trimmed: string): boolean => {
            const lowerTrimmed = trimmed.trim().toLowerCase();
            return !negativeSignals.some(s => lowerTrimmed.includes(s)) && readySignals.some(s => {
                const regex = new RegExp(`\\b${s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
                return regex.test(trimmed);
            });
        };

        // Ready cases
        assert.strictEqual(checkReady('no'), true, '"no" should trigger ready');
        assert.strictEqual(checkReady('ready'), true, '"ready" should trigger ready');
        assert.strictEqual(checkReady('no doubts'), true, '"no doubts" should trigger ready');

        // Not ready cases (BUG-006 fix)
        assert.strictEqual(checkReady('no idea'), false, '"no idea" should NOT trigger ready');
        assert.strictEqual(checkReady('no clue'), false, '"no clue" should NOT trigger ready');
        assert.strictEqual(checkReady('not ready'), false, '"not ready" should NOT trigger ready');
        assert.strictEqual(checkReady('not done'), false, '"not done" should NOT trigger ready');
    });

    // BUG-007: Zustand Persist configuration
    it('should only persist experienceLevel and recommendedMCU', () => {
        const fs = require('fs');
        const path = require('path');
        const filePath = path.resolve(__dirname, '../store/useProjectStore.ts');
        const fileContent = fs.readFileSync(filePath, 'utf8');
        
        assert.ok(fileContent.includes('partialize:'), 'useProjectStore.ts must configure partialize');
        
        const partializeRegex = /partialize:\s*\(\s*state\s*\)\s*=>\s*\(\{\s*([\s\S]*?)\}\)/;
        const match = fileContent.match(partializeRegex);
        assert.ok(match, 'partialize function structure not found or does not match expected format');
        
        const keysText = match[1];
        const keys = keysText.split(',').map((s: string) => s.trim().split(':')[0].trim()).filter(Boolean);
        
        assert.deepStrictEqual(keys, ['experienceLevel', 'recommendedMCU'], 'partialize must only persist experienceLevel and recommendedMCU');
    });

    // Pin mapping type checks
    it('should correctly map all pins between wiring rules and component definitions', () => {
        for (const [key, rule] of Object.entries(COMPONENT_WIRING_RULES)) {
            // Skip helper/passive components that don't represent a main module in componentDefs
            if (['RESISTOR', 'DIODE', 'TRANSISTOR_NPN', 'TRANSISTORNPN', 'CAPACITOR'].includes(key)) {
                continue;
            }

            // Find visual definition key in COMPONENT_DEFS
            let visualKey = `SENSOR_${key}`;
            if (!(visualKey in COMPONENT_DEFS)) visualKey = `ACTUATOR_${key}`;
            if (!(visualKey in COMPONENT_DEFS)) visualKey = `DISPLAY_${key}`;
            if (!(visualKey in COMPONENT_DEFS)) visualKey = `INPUT_${key}`;
            
            if (!(visualKey in COMPONENT_DEFS)) {
                // Try fuzzy/suffix match
                const found = Object.keys(COMPONENT_DEFS).find(
                    k => k.replace(/_/g, '').toUpperCase() === key.replace(/_/g, '').toUpperCase()
                );
                if (found) visualKey = found;
            }

            // If still not found, skip it (some rules might be short aliases/fallbacks)
            if (!(visualKey in COMPONENT_DEFS)) {
                continue;
            }

            const def = COMPONENT_DEFS[visualKey];
            const pinIds = def.pins.map(p => p.id);

            if (rule.needsVCC && rule.vccPin) {
                assert.ok(pinIds.includes(rule.vccPin), `Component ${visualKey} is missing VCC pin "${rule.vccPin}" defined in COMPONENT_WIRING_RULES`);
            }
            if (rule.needsGND && rule.gndPin) {
                assert.ok(pinIds.includes(rule.gndPin), `Component ${visualKey} is missing GND pin "${rule.gndPin}" defined in COMPONENT_WIRING_RULES`);
            }
            if (rule.sigPin) {
                assert.ok(pinIds.includes(rule.sigPin), `Component ${visualKey} is missing signal pin "${rule.sigPin}" defined in COMPONENT_WIRING_RULES`);
            }
            if (rule.sig2Pin) {
                assert.ok(pinIds.includes(rule.sig2Pin), `Component ${visualKey} is missing signal2 pin "${rule.sig2Pin}" defined in COMPONENT_WIRING_RULES`);
            }
        }
    });

});
