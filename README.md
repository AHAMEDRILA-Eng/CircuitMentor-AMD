# CircuitMentor — AMD Hackathon Submission

> AI-powered electronics education platform — describe your idea, get a working circuit, code, and guided learning instantly.

**Powered by Fireworks AI running on AMD Instinct MI300X GPUs.**

---

## ✨ Features
- 🧠 **Natural Language → Circuit** — Describe your idea; get a validated circuit instantly
- ⚡ **AMD MI300X Inference** — Ultra-fast LLM inference via Fireworks AI API
- 🔍 **Image Scan** — Upload a photo of components; AI detects and builds the circuit
- 📐 **EIL Validator** — Electronics Intelligence Layer mathematically enforces electrical rules
- 🛠️ **Code Generation** — Auto-generates Arduino/ESP32 code with IoT platform support
- 🎓 **Interactive Quiz** — Teaches circuit concepts with component-level explanations

---
## 🚀 Quick Start

### Prerequisites
- Docker + Docker Compose
- Fireworks AI API key (free at fireworks.ai)
- Gemini API key (free at aistudio.google.com)

### Run with Docker

```bash
git clone https://github.com/AHAMEDRILA-Eng/CircuitMentor-AMD.git
cd CircuitMentor-AMD
cp backend/.env.example backend/.env
# Add your API keys to backend/.env
docker-compose up --build
```

Open http://localhost:3000

---

## 🔑 API Keys

| Key | Get it at |
|-----|-----------|
| `FIREWORKS_API_KEY` | fireworks.ai |
| `GEMINI_API_KEY` | aistudio.google.com |

---

## 🏗️ Stack

- **Frontend** — Next.js + TypeScript
- **Backend** — FastAPI + Python
- **AI Inference** — Fireworks AI (AMD MI300X)
- **Containerized** — Docker Compose

---

## 📄 License

MIT
