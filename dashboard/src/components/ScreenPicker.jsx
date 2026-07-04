import React from 'react';

export default function ScreenPicker({
  targetPath,
  setTargetPath,
  openDirectoryBrowser,
  session,
  setSession,
  advancedOpen,
  setAdvancedOpen,
  handleTargetSubmit,
  handleHeadlessScan,
  setScreen
}) {
  return (
    <div className="w-full max-w-xl glass-panel p-8 rounded-2xl shadow-xl animate-fade-in relative pt-12">
      <button 
        type="button"
        onClick={() => setScreen('landing')}
        className="absolute left-6 top-6 text-[#8b949e] hover:text-white transition flex items-center gap-1.5 text-xs font-semibold"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        <span>Back</span>
      </button>
      <h2 className="text-2xl font-bold mb-6 text-white text-center">Select Target Codebase</h2>
      <form onSubmit={handleTargetSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-[#8b949e] mb-2">
            Local Absolute Filepath or Remote Git URL
          </label>
          <div className="flex gap-2">
            <input 
              type="text" 
              value={targetPath}
              onChange={(e) => setTargetPath(e.target.value)}
              placeholder="e.g. C:/Projects/my-app or https://github.com/..."
              className="flex-1 bg-[#0d1117] border border-brand-border rounded-xl px-4 py-3 text-white placeholder-[#484f58] focus:outline-none focus:border-[#58a6ff] transition"
              required
            />
            <button
              type="button"
              onClick={() => openDirectoryBrowser(targetPath)}
              className="bg-[#30363d] hover:bg-[#8b949e]/20 text-[#c9d1d9] border border-brand-border px-4 rounded-xl transition font-semibold text-sm flex items-center justify-center gap-1.5"
            >
              <span>Browse...</span>
            </button>
          </div>
        </div>

        {/* Advanced Settings Accordion */}
        <div className="border border-brand-border rounded-xl bg-[#0d1117]/25 overflow-hidden transition-all duration-300">
          <button
            type="button"
            onClick={() => setAdvancedOpen(!advancedOpen)}
            className="w-full flex justify-between items-center px-4 py-3 text-sm font-semibold text-[#8b949e] hover:text-white transition focus:outline-none"
          >
            <span>Advanced Settings</span>
            <span className={`transform transition-transform duration-200 ${advancedOpen ? 'rotate-90' : ''}`}>▸</span>
          </button>
          
          {advancedOpen && (
            <div className="px-4 pb-4 border-t border-brand-border/40 pt-4 space-y-4 animate-fade-in text-left">
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox"
                  id="redactCheckbox"
                  checked={session.redact || false}
                  onChange={(e) => setSession({ ...session, redact: e.target.checked })}
                  className="w-4 h-4 rounded bg-[#0d1117] border border-brand-border text-[#58a6ff] focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
                <label htmlFor="redactCheckbox" className="text-sm font-medium text-[#8b949e] cursor-pointer select-none hover:text-white transition">
                  Anonymize Reports (Scrub absolute paths, repository names, and Git URL details)
                </label>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#8b949e]">
                  Report Output Path
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={session.reportPath || ''}
                    onChange={(e) => setSession({ ...session, reportPath: e.target.value })}
                    placeholder="Default: wizard install directory"
                    className="flex-1 bg-[#0d1117] border border-brand-border rounded-xl px-3 py-2 text-sm text-white placeholder-[#484f58] focus:outline-none focus:border-[#58a6ff] transition"
                  />
                  <button
                    type="button"
                    onClick={() => openDirectoryBrowser(session.reportPath || '', 'reportPath')}
                    className="bg-[#30363d] hover:bg-[#8b949e]/20 text-[#c9d1d9] border border-brand-border px-3 rounded-xl transition font-semibold text-xs flex items-center justify-center"
                  >
                    Browse...
                  </button>
                </div>
                <p className="text-[10px] text-[#8b949e]">Where .repo-wizard/ folder will be created. Leave blank for default.</p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#8b949e]">
                  TOS File Directory
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={session.tosPath || ''}
                    onChange={(e) => setSession({ ...session, tosPath: e.target.value })}
                    placeholder="Default: .repo-wizard/ folder"
                    className="flex-1 bg-[#0d1117] border border-brand-border rounded-xl px-3 py-2 text-sm text-white placeholder-[#484f58] focus:outline-none focus:border-[#58a6ff] transition"
                  />
                  <button
                    type="button"
                    onClick={() => openDirectoryBrowser(session.tosPath || '', 'tosPath')}
                    className="bg-[#30363d] hover:bg-[#8b949e]/20 text-[#c9d1d9] border border-brand-border px-3 rounded-xl transition font-semibold text-xs flex items-center justify-center"
                  >
                    Browse...
                  </button>
                </div>
                <p className="text-[10px] text-[#8b949e]">Where .tos_agreed will be looked up. Leave blank for default.</p>
              </div>
            </div>
          )}
        </div>

        {/* Option A: Interactive Wizard */}
        <div className="border-t border-brand-border/40 pt-5">
          <h3 className="text-xs font-bold text-[#8b949e] mb-2 uppercase tracking-wider">Option A: Interactive Setup</h3>
          <p className="text-xs text-[#8b949e] mb-3">
            Highly recommended. Customize rules, select testing packages, and review all configurations before writing changes.
          </p>
          <button 
            type="submit"
            className="w-full bg-[#2ea44f] hover:bg-[#2c974b] text-white font-semibold py-3 rounded-xl transition shadow-lg flex items-center justify-center gap-2"
          >
            <span>Configure & Audit</span>
            <span className="text-xs opacity-75 font-normal">(Press Enter to Submit)</span>
          </button>
        </div>

        {/* Option B: Automated Headless Scan */}
        <div className="border-t border-brand-border/40 pt-5 space-y-4">
          <h3 className="text-xs font-bold text-[#8b949e] mb-1 uppercase tracking-wider">Option B: Headless Scan Modes</h3>
          <p className="text-xs text-[#8b949e] mb-3">
            Audit immediately using best-guess rules and bypass the step-by-step questionnaire.
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Headless Scan */}
            <div className="flex flex-col justify-between p-4 rounded-xl border border-brand-border bg-[#0d1117]/30 hover:border-[#58a6ff]/30 transition group">
              <div className="mb-3">
                <h4 className="text-xs font-bold text-[#58a6ff] mb-1">Generate Reports</h4>
                <p className="text-[11px] text-[#8b949e] leading-normal">
                  Audits the codebase to generate comprehensive markdown and HTML assessment reports.
                </p>
              </div>
              <button 
                type="button"
                onClick={() => handleHeadlessScan('full')}
                className="w-full bg-[#58a6ff]/10 hover:bg-[#58a6ff]/20 text-[#58a6ff] border border-[#58a6ff]/30 font-semibold py-2 px-3 rounded-lg text-xs transition"
              >
                Generate Reports
              </button>
            </div>

            {/* Read-only Backlog Generation */}
            <div className="flex flex-col justify-between p-4 rounded-xl border border-brand-border bg-[#0d1117]/30 hover:border-purple-500/30 transition group">
              <div className="mb-3">
                <h4 className="text-xs font-bold text-purple-400 mb-1">Generate Reports & Backlog</h4>
                <p className="text-[11px] text-[#8b949e] leading-normal">
                  Audits the codebase to generate assessment reports alongside a prioritized task backlog CSV.
                </p>
              </div>
              <button 
                type="button"
                onClick={() => handleHeadlessScan('backlog')}
                className="w-full bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold py-2 px-3 rounded-lg text-xs transition"
              >
                Generate Reports & Backlog
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
