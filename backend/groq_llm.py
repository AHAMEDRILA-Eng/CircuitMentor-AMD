import os
import json
from groq import Groq
from dotenv import load_dotenv
import jsonschema

# Load environment variables from .env file
load_dotenv()

API_KEY = os.environ.get("GROQ_API_KEY")
if not API_KEY:
    raise RuntimeError("GROQ_API_KEY is not set in environment variables.")
API_KEY = API_KEY.strip()

client = Groq(api_key=API_KEY)

# Optional second API key for load balancing / rate limits separated by task
API_KEY_2 = os.environ.get("GROQ_API_KEY_2")
if API_KEY_2:
    API_KEY_2 = API_KEY_2.strip()
    client2 = Groq(api_key=API_KEY_2)
else:
    client2 = client # Fallback to original key if key 2 isn't set


MODEL_NAME = "llama-3.1-8b-instant"

# ==========================================
# Schema Definitions
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
# Helper
# ==========================================

def _chat_json(system_prompt: str, user_prompt: str, temperature=0.1, validate_schema=None):
    try:
        response = client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            model=MODEL_NAME,
            temperature=temperature,
            response_format={"type": "json_object"}
        )
        raw = response.choices[0].message.content
        data = json.loads(raw)

        if validate_schema:
            jsonschema.validate(instance=data, schema=validate_schema)

        return data
    except Exception as e:
        err_str = str(e)
        if "429" in err_str or "rate_limit" in err_str.lower():
            return {"error": "rate_limit_exceeded", "details": "Groq API rate limit reached. Please wait 30 seconds and try again."}
        return {"error": "llm_call_failed", "details": err_str}

# ==========================================
# Phase 0: IoT Discovery & Recommendation
# ==========================================

def discover_iot_platforms(user_prompt: str, service_details: str) -> dict:
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
    return _chat_json(system_prompt, user_prompt, temperature=0.1, validate_schema=DISCOVERY_SCHEMA)

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
    return _chat_json(system_prompt, user_prompt, temperature=0.1, validate_schema=CONCEPT_SCHEMA)

def generate_project_explanation(idea: str, platform: str = None, components: list = None, experience_level: str = "beginner") -> dict:
    platform_context = f"IoT Platform: {platform}" if platform else "Standalone hardware project (no IoT platform)"
    components_context = ""
    if components:
        inputs  = [c for c in components if "Sensor" in c or "Input" in c]
        outputs = [c for c in components if "Actuator" in c or "Display" in c]
        mcu     = [c for c in components if "MCU" in c]
        def fmt(key): return key.replace("Sensor_","").replace("Actuator_","").replace("Input_","").replace("Display_","").replace("MCU_","").replace("_"," ")
        components_context = f"""
Confirmed components in this project:
- Microcontroller: {', '.join(fmt(c) for c in mcu) or 'Not specified'}
- Sensors/Inputs: {', '.join(fmt(c) for c in inputs) or 'None'}
- Outputs/Actuators: {', '.join(fmt(c) for c in outputs) or 'None'}
- Platform: {platform_context}
"""

    level_instruction = {
        "beginner":    "Use simple analogies. Avoid jargon. Explain every technical term you use. Assume the student has never built a circuit before.",
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
4. The signal_flow_summary must trace the signal path from sensor pin → MCU GPIO → processing → output pin, explaining briefly what happens at each step in a storytelling format.
5. The real_world_use_case must be a specific, concrete example (not "this can be used in many applications")
6. Tone: friendly, encouraging, like a lab mentor not a textbook

You MUST output ONLY valid JSON matching this exact schema — no markdown, no extra text:
{{
  "problem_statement": "What problem this project solves, with a relatable analogy specific to the components used.",
  "real_world_use_case": "One specific real-world deployment example using these exact components.",
  "working_principle": "Step-by-step explanation of how the actual components work together in this project.",
  "power_flow_summary": "Where power enters, voltage levels used, current concerns, and why any drivers/relays are needed.",
  "signal_flow_summary": "Detailed narrative (3-4 sentences) explaining the journey of the signal from the physical environment, through the sensor, into the MCU for processing, and out to the actuator."
}}"""

    return _chat_json(system_prompt, idea, temperature=0.3, validate_schema=PROJECT_EXPLANATION_SCHEMA)

def generate_system_logic(idea: str, concept: dict) -> dict:
    def fmt(key): return key.replace("Sensor_","").replace("Actuator_","").replace("Input_","").replace("Display_","").replace("MCU_","").replace("_"," ")

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
2. WHY those specific conditions were chosen (not just what happens)
3. WHAT HAPPENS if a sensor fails or gives an unexpected reading (edge case awareness)

Project components:
{components_str}

Rules:
1. Use human-readable sensor names (e.g. "PIR sensor" not "Sensor_PIR")
2. Each logic_block description must explain WHY this logic was designed this way — a student must be able to justify it to an examiner
3. Include at least one edge case or failure condition in the logic blocks (e.g. "if sensor returns -1 / NaN")
4. The pseudo_code must be readable Arduino-style code (3-10 lines) showing the actual loop logic with real variable names
5. Conditions must use realistic variable names that match what analogRead() / digitalRead() would produce

You MUST output ONLY valid JSON — no markdown, no extra text:
{{
  "logic_blocks": [
    {{
      "description": "Friendly explanation of what this logic block does AND why it was designed this way.",
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

    return _chat_json(system_prompt, idea, temperature=0.2, validate_schema=SYSTEM_LOGIC_SCHEMA)

# ==========================================
# Phase 2: Circuit Generator
# ==========================================

def generate_circuit_wiring(confirmed_blocks: dict, component_details: str, previous_errors: str = None) -> dict:
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
        user_prompt = f"Generate the initial wiring JSON using these confirmed blocks:\n{json.dumps(confirmed_blocks)}"

    return _chat_json(system_prompt, user_prompt, temperature=0.1, validate_schema=WIRING_SCHEMA)

# ==========================================
# Phase 3: MCQ Quiz
# ==========================================

def generate_mcq_quiz(
    components: list,
    idea: str = "",
    platform: str = None,
    experience_level: str = "beginner",
    pin_assignments: dict = {},
    system_logic: dict = None   # NEW — the actual IF/THEN decision logic
) -> list:

    def fmt(key):
        return key.replace("Sensor_","").replace("Actuator_","").replace("Input_","").replace("Display_","").replace("MCU_","").replace("_"," ")

    inputs  = [fmt(c) for c in components if "Sensor" in c or "Input" in c]
    outputs = [fmt(c) for c in components if "Actuator" in c or "Display" in c]
    mcu     = [fmt(c) for c in components if "MCU" in c]

    pin_context = ""
    if pin_assignments:
        pin_lines = [f"  - {fmt(k)}: GPIO {v}" for k, v in pin_assignments.items()]
        pin_context = "EXACT pin assignments in this circuit:\n" + "\n".join(pin_lines)

    platform_context = f"IoT Platform: {platform}" if platform else "Standalone project (no IoT platform)"

    # Build logic context from system_logic if available
    logic_context = ""
    if system_logic:
        blocks = system_logic.get("logic_blocks", [])
        pseudo = system_logic.get("pseudo_code", "")
        if blocks:
            block_lines = []
            for b in blocks[:3]:  # max 3 blocks to stay within token limit
                cond = b.get("condition", {})
                cond_str = f"IF {cond.get('if', '')}"
                if cond.get("and"):
                    cond_str += f" AND {cond['and']}"
                actions = ", ".join(b.get("actions", []))
                block_lines.append(f"  - {cond_str} → {actions}")
            logic_context = "ACTUAL circuit logic (what this circuit does step by step):\n" + "\n".join(block_lines)
        if pseudo:
            logic_context += f"\n\nActual pseudo-code loop:\n{pseudo[:400]}"

    level_instruction = {
        "beginner": (
            "Questions must be about THIS specific project's wiring and behaviour — not generic definitions.\n"
            "Focus on: what happens when a sensor triggers, which component is connected to which pin, "
            "what the relay/buzzer does when a condition is met.\n"
            "Avoid: ADC theory, interrupt handling, advanced debugging.\n"
            "Example: 'In your motion alarm, when the PIR at GPIO 27 goes HIGH, what does the relay at GPIO 13 do?'"
        ),
        "some": (
            "Questions must challenge someone who knows basic Arduino but hasn't built this exact circuit.\n"
            "Focus on: why specific pins were chosen, voltage compatibility, signal flow, active-LOW vs active-HIGH, "
            "consequences of a wrong connection in THIS circuit.\n"
            "Example: 'In your circuit, why is a relay used between the ESP32 and the motor instead of a direct connection?'"
        ),
        "comfortable": (
            "Questions must challenge an experienced builder — ask about failure modes and design decisions.\n"
            "Focus on: what breaks if a component value changes, edge cases in the logic, "
            "protection circuits, what happens during power interruption.\n"
            "Example: 'What happens to the relay state in your circuit if the ESP32 resets mid-operation?'"
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

1. NEVER ask "What is a [component]?" or "What does a [component] do?" — the student already knows this.
2. EVERY question must be about THIS circuit's specific behaviour, wiring decisions, or failure modes.
   Good: "In your circuit, when the soil moisture sensor reads below threshold, what happens to the water pump relay?"
   Bad: "What is a relay?"
3. Use the EXACT GPIO pin numbers from the pin assignments above in at least 2 questions.
4. One question must describe a real danger or failure mode specific to THIS wiring.
5. Wrong options must be plausible to someone who built the circuit but didn't fully understand it.
6. If system logic is provided, at least one question must be about the IF/THEN conditions in that logic.

Output ONLY a valid JSON array of exactly 4 objects — no markdown, no extra text:
[
  {{
    "question": "In your [project name], when [specific condition from their circuit]...",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_answer": "exact text of correct option",
    "explanation": "why this is correct in context of THIS project's actual wiring"
  }}
]"""

    user_prompt = (
        f"Generate 4 viva-style questions about this student's specific project: {idea}. "
        f"Use the exact pin numbers and logic conditions provided. "
        f"DO NOT ask generic component definition questions."
    )
    return _chat_json(system_prompt, user_prompt, temperature=0.5, validate_schema=None)

# ==========================================
# Phase 4: Interview Mode
# ==========================================

def evaluate_interview_answer(history: list, user_answer: str) -> dict:
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
            messages=messages,
            model=MODEL_NAME,
            temperature=0.7,
            response_format={"type": "json_object"}
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

def generate_arduino_code(circuit_json: dict, idea: str, platform: str = None) -> str:
    # Using small fast model specifically trained against exact prompts for low logic error
    model = "llama-3.1-8b-instant"

    system_prompt = """You are an expert Arduino developer. Always include #include libraries, define pin constants, and use the standard void setup() and void loop() structure. Ensure syntax is compatible with the Arduino IDE (C++). If a specific library is needed, name it clearly in a comment."""

    # Parse out the explicit connections so we can guide the model perfectly
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
        response = client2.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            model=model,
            temperature=0.1
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"// CODE_GENERATION_ERROR: {e}"


# ==========================================
# Mentor Chat / Copilot
# ==========================================

def chat_with_mentor(phase: str, context: dict, message: str, history: list = []) -> dict:

    idea             = context.get('idea', '')
    components       = context.get('selectedComponents', [])
    platform         = context.get('selectedPlatform', '')
    experience_level = context.get('experienceLevel', 'beginner')
    system_logic     = context.get('systemLogicSummary', '')
    arduino_code     = context.get('arduinoCodeSnapshot', '')

    def fmt(key):
        return key.replace("Sensor_","").replace("Actuator_","").replace("Input_","").replace("Display_","").replace("MCU_","").replace("_"," ")

    components_str = ', '.join(fmt(c) for c in components) if components else 'not specified'

    # -- DISCOVERY_CHAT: free-form onboarding conversation ---------------------
    if phase == 'DISCOVERY_CHAT':
        system_prompt = (
            "You are Circuit Mentor -- a warm, encouraging electronics mentor helping a student discover what project to build.\n\n"
            "YOUR GOAL: Through natural conversation, understand what the student wants to build, then confirm a clear project idea with them.\n\n"
            "HOW TO BEHAVE:\n"
            "- Be conversational, warm, and encouraging -- like a helpful senior student, not a formal tutor\n"
            "- Ask ONE focused follow-up question at a time to learn more (purpose, experience, what they've seen)\n"
            "- If the student is lost, suggest 2-3 specific project ideas that fit what they told you\n"
            "- When you have enough context (project type + rough goal), confirm the idea using [IDEA: ...] tags\n"
            "- Keep responses under 4 sentences -- short and natural\n\n"
            "WHEN TO LOCK AN IDEA:\n"
            "- Only when the student has named or agreed to a specific project\n"
            "- Examples of lockable ideas: 'PIR motion alarm with relay', 'soil moisture monitor with LCD', 'temperature fan controller'\n"
            "- Do NOT lock vague inputs like 'something cool' or 'electronics project'\n\n"
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

            # Extract idea if mentor included the tag
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

    # -- QUIZ_WRONG_ANSWER: contextual explanation when student picks wrong -----
    if phase == 'QUIZ_WRONG_ANSWER':
        system_prompt = (
            f"You are Circuit Mentor -- an encouraging electronics tutor helping a student understand why they got a quiz question wrong.\n\n"
            f"PROJECT CONTEXT:\n"
            f"- Project: {idea}\n"
            f"- Components: {components_str}\n"
            f"- Platform: {platform or 'Standalone'}\n"
            f"- Experience level: {experience_level}\n"
            + (f"- System logic: {system_logic}\n" if system_logic else "")
            + "\nYOUR TASK: Explain why the correct answer is right, using THIS student's actual circuit context.\n"
            "Rules:\n"
            "- Be encouraging, not condescending\n"
            "- Reference the actual project components and GPIO pins where relevant\n"
            "- Keep it to 4 sentences max -- clear and specific\n"
            "- Do not just repeat the explanation word-for-word -- add real context from their project"
        )

        messages_payload = [{"role": "system", "content": system_prompt}]
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
            return {"response": f"The correct answer is right because the explanation says: {message}"}

    # -- DOUBT_GATE: free Q&A between quiz pass and circuit reveal -------------
    if phase == 'DOUBT_GATE':
        system_prompt = (
            f"You are Circuit Mentor -- a knowledgeable electronics tutor answering last-minute doubts before showing a student their circuit diagram.\n\n"
            f"PROJECT CONTEXT:\n"
            f"- Project: {idea}\n"
            f"- Components: {components_str}\n"
            f"- Platform: {platform or 'Standalone'}\n"
            f"- Experience level: {experience_level}\n"
            + (f"- System logic: {system_logic}\n" if system_logic else "")
            + "\nRules:\n"
            "- Answer ONLY the specific doubt asked -- don't lecture\n"
            "- Keep answers under 3 sentences -- short and clear\n"
            "- Reference the actual project components where possible\n"
            "- After answering, end with: 'Anything else, or are you ready to see the circuit?'\n"
            "- If they say they're ready or have no more doubts, reply with exactly: 'READY_FOR_CIRCUIT'"
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
            reply = response.choices[0].message.content.strip()
            return {"response": reply}
        except Exception as e:
            return {"response": "Anything else, or are you ready to see the circuit?"}

    # -- All other phases: existing tutor prompt --------------------------------

    phase_instructions = {
        'IDEA_EXPLANATION':   'Student is reviewing the project concept. Help them understand WHY this project works, real-world applications, and how components relate to the problem.',
        'COMPONENT_TEACHING': 'Student is learning about their specific components. Explain how each component works physically, its voltage/pin requirements, and common mistakes.',
        'SYSTEM_LOGIC_VIEW':  'Student is studying the decision logic. Explain conditions, actions, and why this specific logic was chosen for their project.',
        'CODE_REVIEW':        'Student is reviewing their generated code. Explain any line, function, or concept. Never regenerate code -- only explain what is already there.',
        'COMPLETED':          'Student has completed the project. Help with revision, troubleshooting, extensions, or viva preparation.',
    }.get(phase, 'Help the student understand their electronics project.')

    system_prompt = (
        f"You are Circuit Mentor -- a friendly, knowledgeable electronics tutor helping a student build and understand their specific hardware project.\n\n"
        f"PROJECT CONTEXT (use this in every answer):\n"
        f"- Project idea: {idea}\n"
        f"- Components: {components_str}\n"
        f"- IoT Platform: {platform or 'Standalone (no IoT)'}\n"
        f"- Experience level: {experience_level}\n"
        + (f"- System logic: {system_logic}\n" if system_logic else "")
        + ("- Arduino code is available for explanation (read-only)\n" if arduino_code else "")
        + f"\nCURRENT PHASE: {phase}\n"
        f"YOUR ROLE IN THIS PHASE: {phase_instructions}\n\n"
        f"STRICT RULES:\n"
        f"1. Every answer must reference the student's ACTUAL project -- never give generic answers\n"
        f"2. Never generate, modify, or suggest changes to Arduino code -- only explain it\n"
        f"3. Keep answers concise -- 2 to 4 sentences per point maximum\n"
        f"4. Use the student's experience level to calibrate language:\n"
        f"   - beginner: simple analogies, no jargon\n"
        f"   - some: moderate technical language\n"
        f"   - comfortable: precise technical terms\n"
        f"5. If asked something outside electronics/this project, politely redirect\n"
        f"6. Always end with one follow-up question to deepen understanding"
    )

    messages = [{"role": "system", "content": system_prompt}]
    messages += history
    messages.append({"role": "user", "content": message})

    try:
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=messages,
            temperature=0.5,
            max_tokens=400,
        )
        reply = response.choices[0].message.content.strip()
        return {"response": reply}
    except Exception as e:
        return {"response": "I'm having a brief connection issue. Could you ask that again in a moment?"}
