'use client';

import React, { useState, useEffect } from 'react';
import { useProjectStore } from '@/store/useProjectStore';
import { api } from '@/api/client';
import { CheckCircle2, XCircle, Loader2, ArrowRight, HelpCircle } from 'lucide-react';

interface QuizQuestion {
    question: string;
    options: string[];
    correct_answer: string;
    explanation: string;
}

export default function QuizPanel() {
    const { uiPhase, concept, dispatchPhase, setError, idea, selectedPlatform, experienceLevel, validatedCircuit } = useProjectStore();
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentAnswers, setCurrentAnswers] = useState<Record<number, string>>({});
    const [showResults, setShowResults] = useState(false);
    const [score, setScore] = useState(0);

    useEffect(() => {
        async function loadQuiz() {
            if (uiPhase !== 'QUIZ' || !concept) return;
            setLoading(true);
            const components = [...concept.inputs, ...concept.logic, ...concept.outputs];
            const PIN_DEFAULTS: Record<string, number> = {
              Sensor_PIR: 27, Sensor_DHT11: 26, Sensor_HC_SR04: 25,
              Sensor_LDR: 34, Sensor_MQ2_Gas: 35, Sensor_Soil_Moisture: 34,
              Sensor_Rain: 34, Sensor_Flame: 27, Sensor_Sound: 27,
              Sensor_IR_Obstacle: 27, Sensor_Heartbeat: 34, Sensor_Temperature_LM35: 34,
              Actuator_LED: 2, Actuator_Relay_5V: 13, Actuator_Buzzer: 14,
              Actuator_Servo_SG90: 15, Actuator_Water_Pump: 13,
            };
            const pinAssignments: Record<string, number> = {};
            components.forEach(k => { if (PIN_DEFAULTS[k]) pinAssignments[k] = PIN_DEFAULTS[k]; });
            
            const result = await api.generateQuiz(
              components,
              idea,
              selectedPlatform ?? undefined,
              experienceLevel ?? 'beginner',
              pinAssignments
            );
            if (result.ok) {
                const data = result.data;
                const normalized = Array.isArray(data)
                    ? data
                    : data.question
                        ? [{
                            question: data.question,
                            options: data.options,
                            correct_answer: data.options[data.correct_index],
                            explanation: data.explanation
                        }]
                        : data.quiz || [];
                setQuestions(normalized);
            } else {
                setError(result.error);
            }
            setLoading(false);
        }
        loadQuiz();
    }, [uiPhase, concept, setError, idea, selectedPlatform, experienceLevel, validatedCircuit]);

    const handleOptionSelect = (qIdx: number, option: string) => {
        if (showResults) return;
        setCurrentAnswers(prev => ({ ...prev, [qIdx]: option }));
    };

    const handleSubmit = () => {
        let corrected = 0;
        questions.forEach((q, idx) => {
            if (currentAnswers[idx] === q.correct_answer) {
                corrected++;
            }
        });
        setScore(corrected);
        setShowResults(true);
    };

    const handleContinue = () => {
        if (score === questions.length) {
            dispatchPhase('QUIZ_PASS');
        } else {
            // Retry
            setShowResults(false);
            setCurrentAnswers({});
            setScore(0);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
                <Loader2 className="animate-spin text-accent" size={48} />
                <p className="text-foreground/50 font-mono text-sm">Generating knowledge check...</p>
            </div>
        );
    }

    const allAnswered = Object.keys(currentAnswers).length === questions.length;
    const passed = score === questions.length;

    if (!questions.length && !loading) {
        return (
            <div className="text-center py-12 text-foreground/40">
                No quiz questions available.
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto w-full animate-in fade-in zoom-in-95 duration-500">
            <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-accent/10 border border-accent/20 rounded-full mb-4">
                    <HelpCircle size={14} className="text-accent" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-accent">Knowledge Check</span>
                </div>
                <h2 className="text-2xl font-black tracking-tight">
                    {showResults ? (passed ? '🎉 Excellent Understanding!' : '🧐 Not Quite Yet...') : 'Knowledge Challenge'}
                </h2>
                <p className="text-foreground/50 text-sm mt-2">
                    {showResults
                        ? (passed ? 'You are ready to proceed to the next stage.' : 'Review the explanations and try again to master these concepts.')
                        : 'Answer all questions corrective to unlock the next phase of your project.'}
                </p>
            </div>

            <div className="flex flex-col gap-6">
                {questions.map((q, idx) => (
                    <div key={idx} className={`glass p-6 rounded-xl border border-white/5 shadow-2xl transition-all ${showResults ? (currentAnswers[idx] === q.correct_answer ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5') : ''}`}>
                        <p className="font-bold text-sm mb-4">
                            <span className="text-accent mr-2">Q{idx + 1}.</span> {q.question}
                        </p>
                        <div className="grid grid-cols-1 gap-2">
                            {q.options.map((option, oIdx) => {
                                const isSelected = currentAnswers[idx] === option;
                                const isCorrect = option === q.correct_answer;
                                const showCorrect = showResults && isCorrect;
                                const showWrong = showResults && isSelected && !isCorrect;

                                return (
                                    <button
                                        key={oIdx}
                                        onClick={() => handleOptionSelect(idx, option)}
                                        disabled={showResults}
                                        className={`text-left p-3 rounded-xl border text-xs transition-all flex justify-between items-center ${showCorrect ? 'border-green-500 bg-green-500/20 text-green-400' :
                                            showWrong ? 'border-red-500 bg-red-500/20 text-red-400' :
                                                isSelected ? 'border-accent bg-accent/10 text-accent' :
                                                    'border-foreground/10 bg-foreground/5 hover:border-foreground/20'
                                            }`}
                                    >
                                        {option}
                                        {showCorrect && <CheckCircle2 size={16} />}
                                        {showWrong && <XCircle size={16} />}
                                    </button>
                                );
                            })}
                        </div>
                        {showResults && (
                            <div className="mt-4 p-3 bg-black/20 rounded-lg border border-foreground/5">
                                <p className="text-[11px] leading-relaxed italic text-foreground/60">
                                    <span className="font-bold text-foreground/80 not-italic">Why? </span> {q.explanation}
                                </p>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="mt-8 flex justify-center pb-12">
                {!showResults ? (
                    <button
                        onClick={handleSubmit}
                        disabled={!allAnswered}
                        className="bg-accent text-background px-10 py-3 rounded-xl font-bold hover:scale-105 active:scale-95 disabled:opacity-30 disabled:scale-100 transition-all shadow-lg shadow-accent/20"
                    >
                        Submit Answers
                    </button>
                ) : (
                    <button
                        onClick={handleContinue}
                        className={`px-10 py-3 rounded-xl font-bold hover:scale-105 active:scale-95 transition-all shadow-lg flex items-center gap-2 ${passed ? 'bg-accent text-background shadow-accent/20' : 'bg-foreground/10 text-foreground/60 shadow-black/20'
                            }`}
                    >
                        {passed ? 'Continue to Circuit' : 'Try Again'}
                        <ArrowRight size={18} />
                    </button>
                )}
            </div>
        </div>
    );
}
