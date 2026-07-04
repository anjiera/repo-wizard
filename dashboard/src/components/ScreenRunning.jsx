import React from 'react';

export default function ScreenRunning({
  screen,
  scanMessage,
  logContainerRef,
  logs,
  handleCancelScan,
  warnings,
  setSession,
  setScreen,
  session
}) {
  if (screen === 'running') {
    return (
      <div className="w-full max-w-xl glass-panel p-8 rounded-2xl shadow-xl text-center space-y-6 animate-fade-in">
        <div className="w-16 h-16 border-4 border-[#2ea44f] border-t-transparent rounded-full animate-spin mx-auto"></div>
        <h2 className="text-2xl font-bold text-white">Running Codebase Scan</h2>
        <p className="text-[#8b949e] text-sm">{scanMessage}</p>
        
        {/* Real-time scanning log box */}
        <div 
          ref={logContainerRef}
          className="bg-[#0d1117] border border-brand-border rounded-xl p-4 text-left font-mono text-xs text-[#2ea44f] h-48 overflow-y-auto space-y-1"
        >
          {logs.map((log, i) => (
            <div key={i} className="leading-relaxed">{log}</div>
          ))}
          {logs.length === 0 && <div className="text-[#484f58]">Waiting for logs...</div>}
        </div>

        {/* Cancel Scan Button */}
        <div className="pt-2">
          <button 
            type="button"
            onClick={handleCancelScan}
            className="bg-[#da3637] hover:bg-[#b92c2c] text-white font-semibold py-3 px-8 rounded-xl transition shadow-lg text-sm"
          >
            Cancel Scan
          </button>
        </div>
      </div>
    );
  }

  if (screen === 'success') {
    return (
      <div className="w-full max-w-md glass-panel p-8 rounded-2xl shadow-xl text-center space-y-6 animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-[#2ea44f]/20 text-[#2ea44f] flex items-center justify-center text-4xl mx-auto">✓</div>
        <h2 className="text-3xl font-extrabold text-white">Scan Complete!</h2>
        <p className="text-[#8b949e] text-sm">
          All audits have completed successfully. Check the reports folder inside your codebase to see results.
        </p>
        {warnings.length > 0 && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 text-left p-4 rounded-xl space-y-2 animate-fade-in text-xs">
            <div className="font-bold flex items-center gap-1.5 text-sm">
              <span>⚠️</span> Technical Stack Mismatches Detected
            </div>
            <ul className="list-disc pl-4 space-y-1 font-medium text-[#c9d1d9] mb-2">
              {warnings.map((warning, idx) => (
                <li key={idx}>{warning}</li>
              ))}
            </ul>
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => {
                  setSession({...session, currentStep: 1});
                  setScreen('questionnaire');
                }}
                className="bg-yellow-500/20 hover:bg-yellow-500/35 text-yellow-500 font-semibold py-1.5 px-3 rounded-lg transition text-[10px] uppercase tracking-wider cursor-pointer"
              >
                Adjust Technical Stack
              </button>
            </div>
          </div>
        )}
        <div className="flex gap-4">
          <button 
            onClick={() => setScreen('reports')}
            className="flex-1 bg-[#2ea44f] hover:bg-[#2c974b] text-white font-semibold py-3 rounded-xl transition shadow-lg"
          >
            View Audit Reports
          </button>
          <button 
            onClick={() => setScreen('landing')}
            className="flex-1 bg-[#30363d] hover:bg-[#8b949e]/20 text-[#c9d1d9] border border-brand-border font-semibold py-3 rounded-xl transition"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return null;
}
