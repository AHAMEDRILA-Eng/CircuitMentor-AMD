import os
import re
import json
from openai import OpenAI
from dotenv import load_dotenv
import jsonschema

# Load environment variables from .env file
load_dotenv()

# ── Fireworks AI client (OpenAI-compatible API) ────────────────────────────────
# Powered by AMD Instinct MI300X GPUs via AMD Developer Cloud
FIREWORKS_API_KEY = os.environ.get("FIREWORKS_API_KEY")
if not FIREWORKS_API_KEY:
    import warnings
    warnings.warn("FIREWORKS_API_KEY not set — Fireworks AI features disabled")
    client = None
    client2 = None
else:
    FIREWORKS_API_KEY = FIREWORKS_API_KEY.strip()
    client = OpenAI(
        api_key=FIREWORKS_API_KEY,
        base_url="https://api.fireworks.ai/inference/v1",
    )
    client2 = client  # Single key (Fireworks handles load balancing internally)

# ── Model — Llama 3.1 8B on AMD GPU cloud via Fireworks ───────────────────────
MODEL_NAME = "accounts/fireworks/models/llama-v3p1-8b-instruct"
# Optional: upgrade to 70B for richer project explanations
MODEL_70B  = "accounts/fireworks/models/llama-v3p1-70b-instruct"


# ── Input Sanitization (Prompt Injection Defence) ──────────────────────────────
def sanitize_input(text: str, max_length: int = 500) -> str:
    """Strip prompt-injection patterns and enforce length limit."""
    if not text:
        return ""
    text = text[:max_length]
    flags = re.IGNORECASE | re.DOTALL
    text = re.sub(r'ignore.*?instructions',   '', text, flags=flags)
    text = re.sub(r'system.*?prompt',         '', text, flags=flags)
    text = re.sub(r'bypass.*?rules',          '', text, flags=flags)
    text = re.sub(r'disregard.*?previous',    '', text, flags=flags)
    text = re.sub(r'forget.*?instructions',   '', text, flags=flags)
    return text.strip()


# ==========================================
# Schema Definitions (unchanged from groq_llm.py)
# ==========================================

DISCOVERY_SCHEMA = {
    "type": "object",
    "properties": {
        "is_iot": {"type": "boolean"},
        "platforms": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "string"},
                    "name": {"type": "string"},
                    "description": {"type": "string"},
                    "difficulty": {"type": "string"},
                    "supports_simulation": {"type": "boolean"},
                    "setup_steps": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["id", "name", "description", "difficulty", "supports_simulation", "setup_steps"]
            }
        },
        "system_architecture": {"type": "string"}
    },
    "required": ["is_iot", "platforms", "system_architecture"]
}

CONCEPT_SCHEMA = {
    "type": "object",
    "properties": {
        "inputs": {"type": "array", "items": {"type": "string"}},
        "logic": {"type": "array", "items": {"type": "string"}},
        "outputs": {"type": "array", "items": {"type": "string"}}
    },
    "required": ["inputs", "logic", "outputs"]
}

PROJECT_EXPLANATION_SCHEMA = {
    "type": "object",
    "properties": {
        "problem_statement": {"type": "string"},
        "real_world_use_case": {"type": "string"},
        "working_principle": {"type": "string"},
        "power_flow_summary": {"type": "string"},
        "signal_flow_summary": {"type": "string"}
    },
    "required": ["problem_statement", "real_world_use_case", "working_principle", "power_flow_summary", "signal_flow_summary"]
}

SYSTEM_LOGIC_SCHEMA = {
    "type": "object",
    "properties": {
        "logic_blocks": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "description": {"type": "string"},
                    "condition": {
                        "type": "object",
                        "properties": {
                            "if": {"type": "string"},
                            "and": {"type": "string"},
                            "or": {"type": "string"}
                        },
                        "required": ["if"],
                        "additionalProperties": True
                    },
                    "actions": {
                        "type": "array",
                        "items": {"type": "string"}
                    }
                },
                "required": ["description", "condition", "actions"]
            }
        },
        "pseudo_code": {"type": "string"}
    },
    "required": ["logic_blocks", "pseudo_code"]
}

QUIZ_SCHEMA = {
    "type": "object",
    "properties": {
        "question": {"type": "string"},
        "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
        "correct_index": {"type": "integer", "minimum": 0, "maximum": 3},
        "explanation": {"type": "string"}
    },
    "required": ["question", "options", "correct_index", "explanation"]
}

INTERVIEW_SCHEMA = {
    "type": "object",
    "properties": {
        "feedback": {"type": "string"},
        "is_correct": {"type": "boolean"},
        "next_question": {"type": "string"}
    },
    "required": ["feedback", "is_correct", "next_question"]
}

WIRING_SCHEMA = {
    "type": "object",
    "properties": {
        "mcu": {"type": "string"},
        "power_sources": {"type": "array", "items": {"type": "string"}},
        "components": {"type": "array", "items": {"type": "string"}},
        "connections": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "from": {"type": "string"},
                    "to": {"type": "string"}
                },
                "required": ["from", "to"]
            }
        }
    },
    "required": ["mcu", "power_sources", "components", "connections"]
}


# ==========================================
# Core Helper — Fireworks AI JSON call
# ==========================================

def _chat_json(system_prompt: str, user_prompt: str, temperature=0.1,
               validate_schema=None, use_70b=False):
    """
    Call Fireworks AI (AMD GPU cloud) and return parsed JSON.
    Fireworks AI is OpenAI API-compatible — same interface, AMD hardware.
    """
    if client is None:
        return {"error": "Fireworks AI not configured — set FIREWORKS_API_KEY in .env"}

    model = MODEL_70B if use_70b else MODEL_NAME

    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_prompt}
            ],
            temperature=temperature,
            response_format={"type": "json_object"},
        )
        raw = response.choices[0].message.content
        data = json.loads(raw)

        if validate_schema:
            jsonschema.validate(instance=data, schema=validate_schema)

        return data

    except Exception as e:
        err_str = str(e)
        if "429" in err_str or "rate_limit" in err_str.lower():
            return {
                "error": "rate_limit_exceeded",
                "details": "Fireworks AI rate limit reached. Please wait and try again."
            }
        return {"error": "llm_call_failed", "details": err_str}


# ==========================================
# Phase 0: IoT Discovery & Recommendation
# ==========================================

def discover_iot_platforms(user_prompt: str, service_details: str) -> dict:
    user_prompt = sanitize_input(user_prompt, 500)
    system_prompt = f"""You are an IoT System Architect.
Analyze the user's idea. Determine if it requires IoT (Wireless/Internet connectivity).
Recommend appropriate platforms from the provided service registry.
You MUST output ONLY valid JSON matching this exact schema:
{{
  "is_iot": true/false,
  "platforms": [
    {{
      "id": "Service_ID",
      "name": "Platform Name",
      "description": "Why this fits",
      "difficulty": "Easy/Moderate",
      "supports_simulation": true/false,
      "setup_steps": ["Step 1", "Step 2"]
    }}
  ],
  "system_architecture": "A 1-2 sentence explanation of the full IoT flow (Device -> WiFi -> Cloud -> Action)."
}}
Available Platforms:
{service_details}
"""
    return _chat_json(system_prompt, user_prompt, temperature=0.1,
                      validate_schema=DISCOVERY_SCHEMA)


# ==========================================
# Phase 1: Concept Structurer
# ==========================================

def get_concept_structure(user_prompt: str, supported_components: list) -> dict:
    system_prompt = f"""You are a Circuit Concept Structurer.
Analyze the user's idea and break it down into functional blocks.
You MUST output ONLY valid JSON matching this exact schema:
{{
  "inputs": ["list of input components"],
  "logic": ["list of mcu/processing components"],
  "outputs": ["list of output/actuator components"]
}}
No markdown, no explanations, no extra text.
Supported components to choose from: {', '.join(supported_components)}
"""
    return _chat_json(system_prompt, user_prompt, temperature=0.1,
                      validate_schema=CONCEPT_SCHEMA)


def generate_project_explanation(idea: str, platform: str = None,
                                  components: list = None,
                                  experience_level: str = "beginner") -> dict:
    idea = sanitize_input(idea, 500)
    platform_context = (f"IoT Platform: {platform}" if platform
                        else "Standalone hardware project (no IoT platform)")
    components_context = ""
    if components:
        inputs  = [c for c in components if "Sensor" in c or "Input" in c]
        outputs = [c for c in components if "Actuator" in c or "Display" in c]
        mcu     = [c for c in components if "MCU" in c]
        def fmt(key):
            return (key.replace("Sensor_","").replace("Actuator_","")
                       .replace("Input_","").replace("Display_","")
                       .replace("MCU_","").replace("_"," "))
        components_context = f"""
Confirmed components in this project:
- Microcontroller: {', '.join(fmt(c) for c in mcu) or 'Not specified'}
- Sensors/Inputs: {', '.join(fmt(c) for c in inputs) or 'None'}
- Outputs/Actuators: {', '.join(fmt(c) for c in outputs) or 'None'}
- Platform: {platform_context}
"""

    level_instruction = {
        "beginner":    "Use simple analogies. Avoid jargon. Explain every technical term. Assume student has never built a circuit.",
        "some":        "Use moderate technical language. Brief analogies where helpful. Student knows basic Arduino.",
        "comfortable": "Use precise technical language. Skip basic analogies. Student builds projects regularly."
    }.get(experience_level, "Use simple analogies suitable for a beginner.")

    system_prompt = f"""You are CircuitMentor, an electronics mentor for students building real hardware projects.
Your job is to explain this specific project in a way that prepares the student for their viva examination.

Experience level of this student: {experience_level.upper()}
Instruction: {level_instruction}

{components_context}

Rules:
1. Every explanation must reference the ACTUAL components listed above — never be generic
2. The working_principle must explain how the specific sensors interact with the specific actuators
3. The power_flow_summary must mention voltage levels (3.3V vs 5V), current concerns, and why a relay or transistor might be needed
4. The signal_flow_summary must trace the signal path from sensor pin → MCU GPIO → processing → output pin
5. The real_world_use_case must be a specific, concrete example
6. Tone: friendly, encouraging, like a lab mentor not a textbook

You MUST output ONLY valid JSON — no markdown, no extra text:
{{
  "problem_statement": "What problem this project solves, with a relatable analogy.",
  "real_world_use_case": "One specific real-world deployment example using these exact components.",
  "working_principle": "Step-by-step explanation of how the actual components work together.",
  "power_flow_summary": "Where power enters, voltage levels used, current concerns.",
  "signal_flow_summary": "Detailed narrative explaining the signal journey from sensor to actuator."
}}"""

    # Use 70B model for richer explanations (better quality, still on AMD GPU cloud)
    return _chat_json(system_prompt, idea, temperature=0.3,
                      validate_schema=PROJECT_EXPLANATION_SCHEMA, use_70b=False)


def generate_system_logic(idea: str, concept: dict) -> dict:
    idea = sanitize_input(idea, 500)
    def fmt(key):
        return (key.replace("Sensor_","").replace("Actuator_","")
                   .replace("Input_","").replace("Display_","")
                   .replace("MCU_","").replace("_"," "))

    inputs  = [fmt(c) for c in concept.get('inputs', [])]
    outputs = [fmt(c) for c in concept.get('outputs', [])]
    logic   = [fmt(c) for c in concept.get('logic', [])]

    components_str = f"""
Microcontroller: {', '.join(logic) or 'Not specified'}
Sensors / Inputs: {', '.join(inputs) or 'None'}
Actuators / Outputs: {', '.join(outputs) or 'None'}
"""

    system_prompt = f"""You are CircuitMentor, an electronics mentor preparing a student for their project viva.

Your job is to generate the decision logic for this specific project so the student understands:
1. WHAT conditions trigger actions (the if/and/or logic)
2. WHY those specific conditions were chosen
3. WHAT HAPPENS if a sensor fails or gives an unexpected reading

Project components:
{components_str}

Rules:
1. Use human-readable sensor names (e.g. "PIR sensor" not "Sensor_PIR")
2. Each logic_block description must explain WHY this logic was designed this way
3. Include at least one edge case or failure condition in the logic blocks
4. The pseudo_code must be readable Arduino-style code (3-10 lines)
5. Conditions must use realistic variable names

You MUST output ONLY valid JSON — no markdown, no extra text:
{{
  "logic_blocks": [
    {{
      "description": "Friendly explanation of what this logic block does AND why.",
      "condition": {{
        "if": "pirState == HIGH",
        "and": "distance < 50"
      }},
      "actions": [
        "Turn relay ON to activate alarm",
        "Send Telegram alert message"
      ]
    }}
  ],
  "pseudo_code": "void loop() {{\\n  int pirState = digitalRead(PIR_PIN);\\n  if (pirState == HIGH) {{\\n    digitalWrite(RELAY_PIN, LOW);\\n  }}\\n}}"
}}"""

    return _chat_json(system_prompt, idea, temperature=0.2,
                      validate_schema=SYSTEM_LOGIC_SCHEMA)


# ==========================================
# Phase 2: Circuit Generator
# ==========================================

def generate_circuit_wiring(confirmed_blocks: dict, component_details: str,
                             previous_errors: str = None) -> dict:
    system_prompt = f"""You are a Circuit Wiring Generator.
Generate a wiring netlist JSON for the confirmed components.
You MUST output ONLY valid JSON matching this exact schema:
{{
  "mcu": "MCU_ID",
  "power_sources": ["PowerSource_ID"],
  "components": ["Component_ID1", "Component_ID2"],
  "connections": [
    {{"from": "Component_ID.pin", "to": "MCU_ID.pin"}}
  ]
}}
No markdown, no explanations.
Here are the exact physical details and valid IDs of the components:
{component_details}
"""
    if previous_errors:
        user_prompt = f"""Your previous circuit was REJECTED by the Electronics Intelligence Layer (EIL).
Fix the circuit based on these strict electrical rules and errors:
{previous_errors}

Confirmed Blocks:
{json.dumps(confirmed_blocks)}
"""
    else:
        user_prompt = (f"Generate the initial wiring JSON using these confirmed blocks:\n"
                       f"{json.dumps(confirmed_blocks)}")

    return _chat_json(system_prompt, user_prompt, temperature=0.1,
                      validate_schema=WIRING_SCHEMA)


# ==========================================
# Phase 3: MCQ Quiz
# ==========================================

def generate_mcq_quiz(
    components: list,
    idea: str = "",
    platform: str = None,
    experience_level: str = "beginner",
    pin_assignments: dict = {},
    system_logic: dict = None
) -> list:
    idea = sanitize_input(idea, 500)

    def fmt(key):
        return (key.replace("Sensor_","").replace("Actuator_","")
                   .replace("Input_","").replace("Display_","")
                   .replace("MCU_","").replace("_"," "))

    inputs  = [fmt(c) for c in components if "Sensor" in c or "Input" in c]
    outputs = [fmt(c) for c in components if "Actuator" in c or "Display" in c]
    mcu     = [fmt(c) for c in components if "MCU" in c]

    pin_context = ""
    if pin_assignments:
        pin_lines = [f"  - {fmt(k)}: GPIO {v}" for k, v in pin_assignments.items()]
        pin_context = "EXACT pin assignments in this circuit:\n" + "\n".join(pin_lines)

    platform_context = (f"IoT Platform: {platform}" if platform
                        else "Standalone project (no IoT platform)")

    logic_context = ""
    if system_logic:
        blocks = system_logic.get("logic_blocks", [])
        pseudo = system_logic.get("pseudo_code", "")
        if blocks:
            block_lines = []
            for b in blocks[:3]:
                cond = b.get("condition", {})
                cond_str = f"IF {cond.get('if', '')}"
                if cond.get("and"):
                    cond_str += f" AND {cond['and']}"
                actions = ", ".join(b.get("actions", []))
                block_lines.append(f"  - {cond_str} → {actions}")
            logic_context = "ACTUAL circuit logic:\n" + "\n".join(block_lines)
        if pseudo:
            logic_context += f"\n\nActual pseudo-code loop:\n{pseudo[:400]}"

    level_instruction = {
        "beginner": (
            "Questions must be about THIS specific project's wiring and behaviour — not generic definitions.\n"
            "Focus on: what happens when a sensor triggers, which pin, what the relay/buzzer does.\n"
            "Example: 'In your motion alarm, when the PIR at GPIO 27 goes HIGH, what does the relay do?'"
        ),
        "some": (
            "Questions must challenge someone who knows basic Arduino but hasn't built this circuit.\n"
            "Focus on: why specific pins were chosen, voltage compatibility, signal flow, active-LOW vs active-HIGH.\n"
            "Example: 'In your circuit, why is a relay used between the ESP32 and the motor?'"
        ),
        "comfortable": (
            "Questions must challenge an experienced builder — ask about failure modes and design decisions.\n"
            "Focus on: what breaks if a component value changes, edge cases, protection circuits.\n"
            "Example: 'What happens to the relay state if the ESP32 resets mid-operation?'"
        ),
    }.get(experience_level, "Test understanding of this specific project's wiring and behaviour.")

    system_prompt = f"""You are CircuitMentor — an electronics viva examiner generating questions for a student who just BUILT this specific circuit.

PROJECT: {idea or "Electronics project"}
Microcontroller: {', '.join(mcu) or 'ESP32'}
Sensors/Inputs: {', '.join(inputs) or 'None'}
Actuators/Outputs: {', '.join(outputs) or 'None'}
{platform_context}
{pin_context}
{logic_context}

Student experience level: {experience_level.upper()}
Difficulty instruction: {level_instruction}

Generate EXACTLY 4 multiple choice questions. CRITICAL RULES:
1. NEVER ask "What is a [component]?" — student already knows this.
2. EVERY question must be about THIS circuit's specific behaviour, wiring decisions, or failure modes.
3. Use the EXACT GPIO pin numbers from pin assignments in at least 2 questions.
4. One question must describe a real danger or failure mode specific to THIS wiring.
5. Wrong options must be plausible to someone who built the circuit but didn't fully understand it.
6. If system logic is provided, at least one question must be about the IF/THEN conditions.

Output ONLY a valid JSON array of exactly 4 objects — no markdown, no extra text:
[
  {{
    "question": "In your [project name], when [specific condition]...",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_index": 0,
    "explanation": "why this is correct in context of THIS project's actual wiring"
  }}
]"""

    user_prompt = (
        f"Generate 4 viva-style questions about this student's specific project: {idea}. "
        f"Use the exact pin numbers and logic conditions provided. "
        f"DO NOT ask generic component definition questions."
    )
    return _chat_json(system_prompt, user_prompt, temperature=0.5,
                      validate_schema=QUIZ_SCHEMA)


# ==========================================
# Phase 4: Interview Mode
# ==========================================

def evaluate_interview_answer(history: list, user_answer: str) -> dict:
    if client is None:
        return {"error": "Fireworks AI not configured"}
    system_prompt = """You are a strict Electronics Professor conducting a project Viva (Interview).
Evaluate the student's answer for technical accuracy.
Provide constructive feedback, indicate if they are correct, and ask ONE challenging follow-up question.
Output ONLY valid JSON matching this schema:
{
  "feedback": "Your technical feedback here",
  "is_correct": true/false,
  "next_question": "Next challenging question"
}
"""
    messages = [{"role": "system", "content": system_prompt}]
    for msg in history:
        messages.append(msg)
    messages.append({"role": "user", "content": user_answer})

    try:
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=messages,
            temperature=0.7,
            response_format={"type": "json_object"},
        )
        raw = response.choices[0].message.content
        data = json.loads(raw)
        jsonschema.validate(instance=data, schema=INTERVIEW_SCHEMA)
        return data
    except Exception as e:
        return {"error": "interview_evaluation_failed", "details": str(e)}


# ==========================================
# Phase 5: Arduino Code Generator
# ==========================================

def generate_arduino_code(circuit_json: dict, idea: str,
                           platform: str = None) -> str:
    if client is None:
        return "// ERROR: Fireworks AI not configured — set FIREWORKS_API_KEY in .env"

    system_prompt = """You are an expert Arduino developer. Always include #include libraries, define pin constants, and use the standard void setup() and void loop() structure. Ensure syntax is compatible with the Arduino IDE (C++). If a specific library is needed, name it clearly in a comment."""

    wiring_instructions = []
    connections = circuit_json.get("connections", [])
    for conn in connections:
        src = conn.get("from", "")
        tgt = conn.get("to", "")
        if "MCU" in src and "VCC" not in tgt and "GND" not in tgt:
            wiring_instructions.append(f"{tgt} is connected to {src}")
        elif "MCU" in tgt and "VCC" not in src and "GND" not in src:
            wiring_instructions.append(f"{src} is connected to {tgt}")

    pin_list_str = "\n".join(wiring_instructions) if wiring_instructions else "None explicit"

    user_prompt = (
        f"Original User Idea / Goal: {idea}\n\n"
        f"Target Platform: {platform if platform else 'Standalone Arduino'}\n\n"
        f"Hardware Setup (CRITICAL - YOU MUST USE EXACTLY THESE PINS):\n{pin_list_str}\n\n"
        f"Full Wiring Netlist Reference:\n{json.dumps(circuit_json, indent=2)}\n\n"
        f"Write the Arduino code for the idea using the exact hardware setup above. "
        f"Do not use blocking delay() for loops. Output ONLY the code, no markdown backticks, no extra text."
    )

    try:
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_prompt}
            ],
            temperature=0.1,
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"// CODE_GENERATION_ERROR: {e}"


# ==========================================
# Mentor Chat / Copilot
# ==========================================

def chat_with_mentor(phase: str, context: dict, message: str,
                     history: list = None) -> dict:
    if client is None:
        return {"error": "Fireworks AI not configured"}
    if history is None:
        history = []

    message = sanitize_input(message, 1000)

    idea              = context.get('idea') or context.get('project') or ''
    components        = context.get('selectedComponents') or context.get('components') or []
    platform          = context.get('selectedPlatform') or context.get('platform') or ''
    experience_level  = context.get('experienceLevel') or context.get('experience_level') or 'beginner'
    system_logic      = context.get('systemLogicSummary') or context.get('system_logic') or ''
    current_component = context.get('currentComponent') or context.get('current_component') or ''

    mcu = context.get('mcu') or context.get('recommendedMCU') or 'Arduino Uno'
    if mcu.startswith("MCU_"):
        mcu = mcu.replace("MCU_", "").replace("_", " ")

    def fmt(key):
        return (key.replace("Sensor_","").replace("Actuator_","")
                   .replace("Input_","").replace("Display_","")
                   .replace("MCU_","").replace("_"," "))

    components_str = ', '.join(fmt(c) for c in components) if components else 'not specified'

    # -- DISCOVERY_CHAT -----------------------------------------------------------
    if phase == 'DISCOVERY_CHAT':
        system_prompt = (
            "You are Circuit Mentor -- a warm, encouraging electronics mentor helping a student discover what project to build.\n\n"
            "YOUR GOAL: Through natural conversation, understand what the student wants to build, then confirm a clear project idea.\n\n"
            "HOW TO BEHAVE:\n"
            "- Be conversational, warm, and encouraging -- like a helpful senior student, not a formal tutor\n"
            "- Ask ONE focused follow-up question at a time\n"
            "- If the student is lost, suggest 2-3 specific project ideas\n"
            "- When you have enough context, confirm the idea using [IDEA: ...] tags\n"
            "- Keep responses under 4 sentences -- short and natural\n\n"
            "WHEN TO LOCK AN IDEA:\n"
            "- Only when the student has named or agreed to a specific project\n"
            "- Examples: 'PIR motion alarm with relay', 'soil moisture monitor with LCD'\n"
            "- Do NOT lock vague inputs like 'something cool'\n\n"
            "IDEA EXTRACTION FORMAT:\n"
            "When ready to lock the idea, include exactly this at the END of your message:\n"
            "[IDEA: <clear project description in 5-10 words>]\n\n"
            "Stay focused on electronics projects. Politely redirect anything off-topic."
        )

        messages_payload = [{"role": "system", "content": system_prompt}]
        messages_payload += history
        messages_payload.append({"role": "user", "content": message})

        try:
            response = client.chat.completions.create(
                model=MODEL_NAME,
                messages=messages_payload,
                temperature=0.6,
                max_tokens=300,
            )
            reply = response.choices[0].message.content.strip()

            extracted_idea = None
            if '[IDEA:' in reply and ']' in reply:
                start = reply.index('[IDEA:') + 6
                end = reply.index(']', start)
                extracted_idea = reply[start:end].strip()
                reply = reply[:reply.index('[IDEA:')].strip()

            result = {"response": reply}
            if extracted_idea:
                result["extracted_idea"] = extracted_idea
            return result

        except Exception as e:
            return {"response": "Sorry, I'm having a moment. Could you tell me more about what you want to build?"}

    # -- QUIZ_WRONG_ANSWER --------------------------------------------------------
    if phase == 'QUIZ_WRONG_ANSWER':
        system_prompt = (
            f"You are Circuit Mentor -- an encouraging electronics tutor explaining why a student got a quiz question wrong.\n\n"
            f"PROJECT CONTEXT:\n"
            f"- Project: {idea}\n"
            f"- Components: {components_str}\n"
            f"- Platform: {platform or 'Standalone'}\n"
            f"- Experience level: {experience_level}\n"
            + (f"- System logic: {system_logic}\n" if system_logic else "")
            + "\nRules:\n"
            "- Be encouraging, not condescending\n"
            "- Reference actual project components and GPIO pins where relevant\n"
            "- Keep it to 4 sentences max\n"
            "- Do not just repeat the explanation — add real context from their project"
        )
        messages_payload = [{"role": "system", "content": system_prompt},
                            {"role": "user", "content": message}]
        try:
            response = client.chat.completions.create(
                model=MODEL_NAME,
                messages=messages_payload,
                temperature=0.4,
                max_tokens=200,
            )
            return {"response": response.choices[0].message.content.strip()}
        except Exception as e:
            return {"response": f"The correct answer is right because: {message}"}

    # -- DOUBT_GATE ---------------------------------------------------------------
    if phase == 'DOUBT_GATE':
        system_prompt = (
            f"You are Circuit Mentor -- a knowledgeable electronics tutor answering last-minute doubts.\n\n"
            f"PROJECT CONTEXT:\n"
            f"- Project: {idea}\n"
            f"- Components: {components_str}\n"
            f"- Platform: {platform or 'Standalone'}\n"
            f"- Experience level: {experience_level}\n"
            + (f"- System logic: {system_logic}\n" if system_logic else "")
            + "\nRules:\n"
            "- Answer ONLY the specific doubt asked\n"
            "- Keep answers under 3 sentences\n"
            "- Reference the actual project components where possible\n"
            "- After answering, end with: 'Anything else, or are you ready to see the circuit?'\n"
            "- If they say they're ready, reply with exactly: 'READY_FOR_CIRCUIT'"
        )
        messages_payload = [{"role": "system", "content": system_prompt}]
        messages_payload += history
        messages_payload.append({"role": "user", "content": message})
        try:
            response = client.chat.completions.create(
                model=MODEL_NAME,
                messages=messages_payload,
                temperature=0.4,
                max_tokens=200,
            )
            return {"response": response.choices[0].message.content.strip()}
        except Exception as e:
            return {"response": "Anything else, or are you ready to see the circuit?"}

    # -- All other phases ---------------------------------------------------------
    phase_instructions = {
        'IDEA_EXPLANATION':   'Student is reviewing the project concept. Help them understand WHY this project works, real-world applications, and how components relate to the problem.',
        'COMPONENT_TEACHING': 'Student is learning about their specific components. Explain how each component works physically, its voltage/pin requirements, and common mistakes.',
        'SYSTEM_LOGIC_VIEW':  'Student is studying the decision logic. Explain conditions, actions, and why this specific logic was chosen for their project.',
        'CODE_REVIEW':        'Student is reviewing their generated code. Explain any line, function, or concept. Never regenerate code -- only explain what is already there.',
        'COMPLETED':          'Student has completed the project. Help with revision, troubleshooting, extensions, or viva preparation.',
    }.get(phase, 'Help the student understand their electronics project.')

    comp_context = f", learning about {current_component}" if current_component else ""
    mcu_family = "Arduino" if "arduino" in mcu.lower() else mcu
    system_prompt = (
        f"You are CircuitMentor AI, helping a student build a {idea}.\n"
        f"They are currently on the {phase} phase{comp_context}.\n"
        f"The student is using {mcu} as the microcontroller.\n"
        f"Their components are: {components_str}.\n"
        f"Do not say they are not using {mcu_family} — they are.\n"
        f"Answer their questions helpfully. On QUIZ phase, give hints only — never reveal direct answers.\n"
        f"Keep responses concise and student-friendly."
    )

    messages_list = [{"role": "system", "content": system_prompt}]
    messages_list += history
    messages_list.append({"role": "user", "content": message})

    try:
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=messages_list,
            temperature=0.5,
            max_tokens=400,
        )
        return {"response": response.choices[0].message.content.strip()}
    except Exception as e:
        return {"response": "I'm having a brief connection issue. Could you ask that again in a moment?"}
