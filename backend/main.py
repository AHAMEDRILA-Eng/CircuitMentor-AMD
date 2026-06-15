from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Dict, Optional
from eil_validator import EILValidator
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import groq_llm
import local_circuit_engine
from local_circuit_engine import COMPONENT_KEYWORDS
import json
import asyncio
import uvicorn
import os
from fastapi.staticfiles import StaticFiles

limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="CircuitMentor EIL Pipeline")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Allow the Next.js frontend to call the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://circuit-mentor-omega.vercel.app"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static images folder
if not os.path.exists("images"):
    os.makedirs("images")
app.mount("/images", StaticFiles(directory="images"), name="images")

validator = EILValidator()

class CircuitProposal(BaseModel):
    mcu: str
    power_sources: List[str] = []
    components: List[str] = []
    connections: List[Dict[str, str]]

class QuizRequest(BaseModel):
    components: List[str]
    idea: Optional[str] = ""
    platform: Optional[str] = None
    experience_level: Optional[str] = "beginner"
    pin_assignments: Optional[dict] = {}
    system_logic: Optional[dict] = None

class InterviewRequest(BaseModel):
    history: List[Dict[str, str]]
    answer: str

class ChatRequest(BaseModel):
    phase: str
    context: dict
    message: str
    history: List[Dict[str, str]] = []

class IntentRequest(BaseModel):
    idea: str

class SystemLogicRequest(BaseModel):
    idea: str
    concept: dict

class GenerateRequest(BaseModel):
    idea: str
    platform: Optional[str] = None
    mcu: Optional[str] = None          # explicit MCU override from intake wizard
    components: Optional[List[str]] = None
    experience_level: Optional[str] = "beginner"


def _normalize_circuit(w: dict) -> dict:
    """Ensure EIL always receives a safe, complete shape."""
    return {
        "mcu": w.get("mcu"),
        "power_sources": w.get("power_sources", []),
        "components": w.get("components", []),
        "connections": w.get("connections", []),
    }



@app.post("/api/eil-validate")
async def validate_circuit(proposal: CircuitProposal):
    result = validator.validate_circuit(proposal.model_dump())
    return result


@app.get("/api/static-code")
async def get_static_code():
    # Deprecated: Static code endpoint is no longer used and returns a hardcoded .ino file.
    # Use /api/generate-circuit instead.
    return JSONResponse(status_code=404, content={"error": "Static code endpoint deprecated. Use /api/generate-circuit instead."})


@app.post("/api/iot-discovery")
@limiter.limit("20/minute")
async def iot_discovery(request: Request, body: IntentRequest):
    """
    Classifies intent as IoT and returns platform options.
    """
    services_path = os.path.join(os.path.dirname(__file__), "services.json")
    if not os.path.exists(services_path):
        return {"status": "ERROR", "message": "services.json not found"}

    with open(services_path, "r") as f:
        services_db = json.load(f)

    db_string = json.dumps(services_db, indent=2)

    try:
        result = groq_llm.discover_iot_platforms(body.idea, db_string)
    except Exception as e:
        return {"status": "LLM_ERROR", "phase": "IoT Discovery", "details": str(e)}

    return result


@app.post("/api/generate-concept")
async def generate_concept(request: IntentRequest):
    """
    Generates just the logical concept components without wiring.
    """
    supported_components = list(validator.components_db.keys())
    try:
        concept_blocks = groq_llm.get_concept_structure(request.idea, supported_components)
    except Exception as e:
        return {"status": "LLM_ERROR", "phase": "Concept Structuring", "details": str(e)}

    if isinstance(concept_blocks, dict) and "error" in concept_blocks:
        return {"status": "AI_ERROR", "phase": "Concept Structuring", "details": concept_blocks}
        
    return {
        "status": "SUCCESS",
        "concept": concept_blocks
    }


@app.post("/api/generate-project-explanation")
@limiter.limit("15/minute")
async def generate_project_explanation(request: Request, body: GenerateRequest):
    """
    Generates educational explanations for the project idea.
    """
    try:
        explanation = groq_llm.generate_project_explanation(
            idea=body.idea, 
            platform=body.platform, 
            components=body.components, 
            experience_level=body.experience_level
        )
    except Exception as e:
        return {"status": "LLM_ERROR", "phase": "Project Explanation", "details": str(e)}

    if isinstance(explanation, dict) and "error" in explanation:
        return {"status": "AI_ERROR", "phase": "Project Explanation", "details": explanation}

    return {
        "status": "SUCCESS",
        "explanation": explanation
    }


@app.post("/api/generate-system-logic")
@limiter.limit("15/minute")
async def generate_system_logic(request: Request, body: SystemLogicRequest):
    """
    Generates structured decision logic mapping out the flow of the design.
    """
    try:
        logic_data = groq_llm.generate_system_logic(body.idea, body.concept)
    except Exception as e:
        return {"status": "LLM_ERROR", "phase": "System Logic", "details": str(e)}

    if isinstance(logic_data, dict) and "error" in logic_data:
        return {"status": "AI_ERROR", "phase": "System Logic", "details": logic_data}

    return {
        "status": "SUCCESS",
        "logic": logic_data
    }

@app.post("/api/generate-circuit")
@limiter.limit("10/minute")
async def generate_pipeline(request: Request, body: GenerateRequest):
    """
    Offline Local Workflow v2 — Dynamic Pin Allocator:
    1) Local keyword parser → concept blocks
    2) Override MCU if platform/idea signals ESP32
    3) Dynamic pin allocator → conflict-free wiring
    4) Project-specific code generator (not generic .ino)
    """

    loop = asyncio.get_event_loop()

    # 1. Detect components from prompt (sync — run in thread pool)
    concept_blocks = await loop.run_in_executor(
        None, local_circuit_engine.detect_components, body.idea
    )

    # 2. Override MCU — check explicit mcu field first, then platform signals
    #    (intake wizard passes mcu='esp32'; IoT path passes platform='blynk' etc.)
    mcu_lower = (body.mcu or "").lower()
    platform_lower = (body.platform or "").lower()
    esp32_signals = ["esp32", "esp 32", "blynk", "virtual_blynk", "telegram",
                     "virtual_telegram", "nodemcu", "node mcu", "mqtt", "iot"]
    if "esp32" in mcu_lower or any(sig in platform_lower for sig in esp32_signals):
        concept_blocks["logic"] = ["MCU_ESP32"]


    # 3. Build conflict-free circuit with dynamic pin allocator
    wiring_circuit = local_circuit_engine.build_circuit(concept_blocks)

    # 4. Code generation is handled client-side by standaloneCodeBuilder.
    #    The LLM call here was removed (Bug 7) because the frontend always overrides
    #    the returned code with its own builder, making this a pure 5-10s wasted roundtrip.
    arduino_code = ""

    # 5. Build visual graph for frontend ReactFlow
    nodes = []
    inputs  = concept_blocks.get("inputs", [])
    logic   = concept_blocks.get("logic", [])
    outputs = concept_blocks.get("outputs", [])

    for i, comp in enumerate(inputs):
        nodes.append({"id": comp, "type": "input", "x": 100, "y": 100 + (i * 150)})
    for i, l in enumerate(logic):
        nodes.append({"id": l, "type": "logic", "x": 400, "y": 100 + (i * 150)})
    for i, c in enumerate(outputs):
        nodes.append({"id": c, "type": "output", "x": 700, "y": 100 + (i * 150)})

    visual_graph = {
        "nodes": nodes,
        "edges": wiring_circuit.get("connections", [])
    }

    # 5.5 Run EIL validation and collect real warnings
    eil_result = validator.validate_circuit(wiring_circuit)
    eil_warnings = eil_result.get('warnings', [])
    eil_errors = eil_result.get('errors', [])
    # If hard errors exist, set status to EIL_HARD_BLOCK
    if eil_errors:
        return {"status": "EIL_HARD_BLOCK", "errors": eil_errors, "warnings": eil_warnings}
    if "warnings" in wiring_circuit:
        for w in wiring_circuit["warnings"]:
            eil_warnings.append({
                "code": "HC_SR04_ESP32_5V_WARNING",
                "technical": w,
                "explanation": w,
                "fix": "Use a voltage divider (1kΩ + 2kΩ) on the ECHO line to protect the 3.3V GPIO pin."
            })

    return {
        "status": "SUCCESS",
        "concept": concept_blocks,
        "validated_circuit": wiring_circuit,
        "visual_graph": visual_graph,
        "eil_warnings": eil_warnings,
        "arduino_code": arduino_code
    }




@app.post("/api/generate-quiz")
@limiter.limit("10/minute")
async def get_quiz(request: Request, body: QuizRequest):
    # Always attempt Groq first for project-specific questions
    try:
        groq_questions = groq_llm.generate_mcq_quiz(
            body.components,
            idea=body.idea,
            platform=body.platform,
            experience_level=body.experience_level,
            pin_assignments=body.pin_assignments,
            system_logic=body.system_logic
        )

        
        # Groq's response_format={"type": "json_object"} forces a parent { "questions": [...] } dict
        q_list = []
        if isinstance(groq_questions, dict):
            q_list = groq_questions.get("questions", groq_questions.get("quiz", []))
        elif isinstance(groq_questions, list):
            q_list = groq_questions
            
        if len(q_list) >= 2:
            return {"status": "SUCCESS", "questions": q_list}
    except Exception as e:
        print(f"[Quiz] Groq failed: {e} — falling back to local bank")

    # Groq failed — fall back to local quiz_bank.json
    quiz_bank_path = os.path.join(os.path.dirname(__file__), "quiz_bank.json")
    local_questions = []
    try:
        with open(quiz_bank_path, "r") as f:
            bank = json.load(f)
        import random
        seen = set()
        for component in body.components:
            if component in bank:
                for q in bank[component]:
                    if q["question"] not in seen:
                        local_questions.append(q)
                        seen.add(q["question"])
        random.shuffle(local_questions)
        local_questions = local_questions[:5]
    except Exception as e:
        print(f"[Quiz] Local bank error: {e}")

    if local_questions:
        return {"status": "SUCCESS", "questions": local_questions}

    return {"status": "LLM_ERROR", "phase": "Quiz", "details": "No questions available"}


@app.post("/api/interview")
async def get_interview_feedback(request: InterviewRequest):
    try:
        return groq_llm.evaluate_interview_answer(request.history, request.answer)
    except Exception as e:
        return {"status": "LLM_ERROR", "phase": "Interview", "details": str(e)}

@app.post("/api/chat")
@limiter.limit("30/minute")
async def chat_with_mentor(request: Request, body: ChatRequest):
    try:
        return groq_llm.chat_with_mentor(
            phase=body.phase,
            context=body.context,
            message=body.message,
            history=body.history
        )
    except Exception as e:
        return {"status": "LLM_ERROR", "phase": "Chat", "details": str(e)}


@app.get("/api/components")
def get_components():
    return {"components": list(COMPONENT_KEYWORDS.keys())}


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
