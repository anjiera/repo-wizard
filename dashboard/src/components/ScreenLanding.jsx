import React from 'react';

export default function ScreenLanding({
  handleStartNew,
  handleResume,
  hasSession,
  reportsCount,
  setScreen
}) {
  return (
    <div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
      <div className="glass-panel p-8 rounded-2xl shadow-xl flex flex-col justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-4 text-white">Start New Alignment Audit</h2>
          <p className="text-[#8b949e] mb-6 text-sm leading-relaxed">
            Analyze a new codebase, configure custom security rules, select testing packages, and execute subagent scaffolding.
          </p>
        </div>
        <button 
          onClick={handleStartNew}
          className="w-full bg-[#2ea44f] hover:bg-[#2c974b] text-white font-semibold py-3 px-6 rounded-xl transition shadow-lg"
        >
          Start New Interview
        </button>
      </div>

      <div className="glass-panel p-8 rounded-2xl shadow-xl flex flex-col justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-4 text-white">Resume Previous Setup</h2>
          <p className="text-[#8b949e] mb-6 text-sm leading-relaxed">
            Retrieve on-disk alignment sessions and resume from where the survey was paused.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <button 
            onClick={handleResume}
            disabled={!hasSession}
            className={`w-full font-semibold py-3 px-6 rounded-xl transition border ${
              hasSession 
                ? 'bg-[#1f6feb]/20 hover:bg-[#1f6feb]/30 text-[#58a6ff] border-[#1f6feb] shadow-[0_0_15px_rgba(31,111,235,0.1)]' 
                : 'bg-[#161b22] text-[#484f58] border-[#30363d] cursor-not-allowed opacity-50'
            }`}
          >
            Resume Paused Session
          </button>
          <p className="text-xs text-center text-[#8b949e] mt-1 select-none">
            {hasSession 
              ? '✓ Active session found on disk.' 
              : 'ⓘ No active session found (.repo-wizard/session.json).'
            }
          </p>
        </div>
      </div>

      <div className="glass-panel p-8 rounded-2xl shadow-xl flex flex-col justify-between md:col-span-2">
        <div>
          <h2 className="text-2xl font-bold mb-4 text-white">View Compiled Reports</h2>
          <p className="text-[#8b949e] mb-6 text-sm leading-relaxed">
            Browse and open completed full audit reports, executive summaries, and backlog configurations.
          </p>
        </div>
        <button 
          onClick={() => setScreen('reports')}
          className="w-full bg-[#30363d] hover:bg-[#8b949e]/20 text-[#c9d1d9] border border-brand-border font-semibold py-3 px-6 rounded-xl transition"
        >
          View Existing Reports ({reportsCount})
        </button>
      </div>
    </div>
  );
}
