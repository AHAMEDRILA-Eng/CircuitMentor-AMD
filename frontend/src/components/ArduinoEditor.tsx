'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useProjectStore } from '@/store/useProjectStore';

const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

const ArduinoEditor = () => {
    const { arduinoCode } = useProjectStore();

    return (
        <div className="w-full h-full glass rounded-xl overflow-hidden flex flex-col" style={{ minHeight: '500px' }}>
            <div className="bg-[#161b22] px-4 py-2 border-b border-[#30363d] flex justify-between items-center">
                <span className="text-xs font-mono text-foreground font-bold italic">sketch_circuit_mentor.ino</span>
                <div className="flex gap-2 items-center">
                    <button
                        disabled={!arduinoCode}
                        onClick={() => navigator.clipboard.writeText(arduinoCode || '')}
                        className="text-[10px] px-2 py-0.5 rounded bg-[#30363d] hover:bg-[#3b4148] text-foreground/70 transition-colors uppercase font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        Copy
                    </button>
                    <button
                        disabled={!arduinoCode}
                        onClick={() => {
                            const blob = new Blob([arduinoCode || ''], { type: 'text/plain' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = 'sketch_circuit_mentor.ino';
                            a.click();
                            URL.revokeObjectURL(url);
                        }}
                        className="text-[10px] px-2 py-0.5 rounded bg-[#30363d] hover:bg-[#3b4148] text-foreground/70 transition-colors uppercase font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        Download
                    </button>
                    <div className="flex gap-2 ml-2">
                        <div className="w-2 h-2 rounded-full bg-red-500/50"></div>
                        <div className="w-2 h-2 rounded-full bg-yellow-500/50"></div>
                        <div className="w-2 h-2 rounded-full bg-green-500/50"></div>
                    </div>
                </div>
            </div>
            <div className="flex-1">
                <Editor
                    height="100%"
                    defaultLanguage="cpp"
                    theme="vs-dark"
                    value={arduinoCode || '// Generate a circuit to see the code here...'}
                    options={{
                        readOnly: true,
                        minimap: { enabled: false },
                        fontSize: 14,
                        scrollbar: {
                            vertical: 'hidden',
                            horizontal: 'hidden'
                        },
                        hideCursorInOverviewRuler: true,
                        lineNumbers: 'on',
                        folding: true,
                        glyphMargin: false,
                        lineDecorationsWidth: 10,
                        lineNumbersMinChars: 3,
                    }}
                />
            </div>
        </div>
    );
};

export default ArduinoEditor;
