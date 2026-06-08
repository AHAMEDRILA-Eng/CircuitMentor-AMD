'use client';

import { Download, CheckCircle2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CircuitCanvas from '@/components/CircuitCanvas';
import ArduinoEditor from '@/components/ArduinoEditor';
import { ReactFlowProvider } from 'reactflow';
import { useProjectStore } from '@/store/useProjectStore';

interface CompletedWorkspaceLayoutProps {
  circuitImageUrl?: string;
  onDownloadCircuit?: () => void;
  onDownloadCode?: () => void;
  onCopyCode?: () => void;
}

export function CompletedWorkspaceLayout({
  circuitImageUrl,
  onDownloadCircuit,
  onDownloadCode,
  onCopyCode
}: CompletedWorkspaceLayoutProps) {
  const { arduinoCode } = useProjectStore();

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="max-w-[1800px] mx-auto">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-white">
                Project Complete!
              </h1>
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/20 border border-green-400/30">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span className="text-sm text-green-300 font-medium">Unlocked</span>
              </div>
            </div>
            <p className="text-blue-200/80">
              Your circuit and code are ready to download and use
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={onDownloadCircuit}
              variant="outline"
              className="bg-white/10 border-white/20 hover:bg-white/20 text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Circuit
            </Button>
            <Button
              onClick={onDownloadCode}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Code
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-220px)]">
          <div className="backdrop-blur-lg bg-white/10 border border-white/20 rounded-2xl p-6 shadow-xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Circuit Diagram</h2>
              <Button
                size="sm"
                variant="ghost"
                onClick={onDownloadCircuit}
                className="text-blue-300 hover:text-blue-200 hover:bg-white/10"
              >
                <Download className="w-4 h-4 mr-2" />
                Save
              </Button>
            </div>

            <div className="flex-1 rounded-xl bg-white/5 border border-white/10 overflow-hidden relative min-h-[400px]">
              <ReactFlowProvider>
                <div style={{ height: '100%', width: '100%' }}>
                  <CircuitCanvas />
                </div>
              </ReactFlowProvider>
            </div>
          </div>

          <div className="backdrop-blur-lg bg-white/10 border border-white/20 rounded-2xl p-6 shadow-xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Arduino Code</h2>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onCopyCode}
                  className="text-blue-300 hover:text-blue-200 hover:bg-white/10"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onDownloadCode}
                  className="text-blue-300 hover:text-blue-200 hover:bg-white/10"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Save
                </Button>
              </div>
            </div>

            <div className="flex-1 rounded-xl bg-slate-950/80 border border-white/10 overflow-hidden relative min-h-[300px]">
              <div className="w-full h-full">
                <ArduinoEditor />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 backdrop-blur-lg bg-green-500/10 border border-green-400/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-green-300 font-semibold mb-1">
                Success! Your project is complete
              </h3>
              <p className="text-green-200/80 text-sm">
                You&apos;ve successfully completed all learning phases. You can now download your circuit diagram and Arduino code to start building your project.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
