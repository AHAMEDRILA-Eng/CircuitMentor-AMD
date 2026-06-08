import axios from 'axios';

export const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL 
    ? process.env.NEXT_PUBLIC_API_URL.replace(/\/api$/, '') 
    : 'http://localhost:8000';

export const API_BASE_URL = `${BACKEND_URL}/api`;

const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: 60000,
    headers: {
        'Content-Type': 'application/json',
    },
});

export async function safePost<T>(url: string, body: any) {
    try {
        const res = await client.post<T>(url, body);
        return { ok: true, data: res.data };
    } catch (err: any) {
        const payload = err?.response?.data || {
            status: "NETWORK_ERROR",
            message: "Cannot reach server",
            details: err.message
        };
        return { ok: false, error: payload };
    }
}

export const api = {
    discoverIoT: (idea: string) => safePost<any>('/iot-discovery', { idea }),
    generateConcept: (idea: string) => safePost<any>('/generate-concept', { idea }),
    generateProjectExplanation: (idea: string, platform?: string, components?: string[], experienceLevel?: string) => safePost<any>('/generate-project-explanation', { idea, platform, components, experience_level: experienceLevel }),
    generateSystemLogic: (idea: string, concept: any) => safePost<any>('/generate-system-logic', { idea, concept }),
    generateCircuit: (idea: string, platform: string | undefined = undefined) =>
        safePost<any>('/generate-circuit', { idea, platform }),
    validateCircuit: (circuit: any) => safePost<any>('/eil-validate', { circuit }),
    generateQuiz: (
      components: string[],
      idea?: string,
      platform?: string,
      experienceLevel?: string,
      pinAssignments?: Record<string, number>,
      systemLogic?: object | null
    ) =>
      safePost<any>('/generate-quiz', {
        components,
        idea,
        platform,
        experience_level: experienceLevel,
        pin_assignments: pinAssignments ?? {},
        system_logic: systemLogic ?? null,
      }),
    evaluateInterview: (history: any[], answer: string) =>
        safePost<any>('/interview', { history, answer }),
    chat: (phase: string, context: object, message: string, history?: {role: string, content: string}[]) =>
        safePost<any>('/chat', { phase, context, message, history: history ?? [] }),

};

export default client;
