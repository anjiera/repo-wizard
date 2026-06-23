import React, { useState, useEffect } from 'react';

export default function App() {
  const [screen, setScreen] = useState('landing'); // 'landing', 'picker', 'questionnaire', 'reports', 'running', 'success'
  const [targetPath, setTargetPath] = useState('');
  const [session, setSession] = useState({
    targetPath: '',
    status: 'paused',
    currentStep: 0,
    answers: {
      goals: 'greenfield',
      team: 'junior',
      budget: 'free',
      platforms: ['web'],
      frameworks: ['react'],
      testing: true,
      coverageThreshold: 80,
      compliance: []
    },
    sections: {
      context: { status: 'pending' },
      stack: { status: 'pending' },
      gates: { status: 'pending' },
      compliance: { status: 'pending' }
    }
  });

  const [reports, setReports] = useState([]);
  const [activeReport, setActiveReport] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [scanMessage, setScanMessage] = useState('');
  const [logs, setLogs] = useState([]);

  // Fetch reports on startup
  useEffect(() => {
    fetch('/api/reports')
      .then(res => res.json())
      .then(data => {
        if (data.reports) setReports(data.reports);
      })
      .catch(() => {});
  }, [screen]);

  // Handle Resume
  const handleResume = () => {
    fetch('/api/session')
      .then(res => {
        if (res.status === 304 || res.ok) return res.json();
        throw new Error('No active session found.');
      })
      .then(data => {
        setSession(data);
        setTargetPath(data.targetPath || '');
        setScreen('questionnaire');
      })
      .catch(err => {
        setErrorMsg(err.message);
        setTimeout(() => setErrorMsg(''), 3000);
      });
  };

  // Start new interview
  const handleStartNew = () => {
    setSession({
      targetPath: '',
      status: 'active',
      currentStep: 0,
      answers: {
        goals: 'greenfield',
        team: 'junior',
        budget: 'free',
        platforms: ['web'],
        frameworks: ['react'],
        testing: true,
        coverageThreshold: 80,
        compliance: []
      },
      sections: {
        context: { status: 'pending' },
        stack: { status: 'pending' },
        gates: { status: 'pending' },
        compliance: { status: 'pending' }
      }
    });
    setScreen('picker');
  };

  // Submit target codebase
  const handleTargetSubmit = (e) => {
    e.preventDefault();
    if (!targetPath.trim()) return;

    const updatedSession = {
      ...session,
      targetPath,
      status: 'active'
    };
    setSession(updatedSession);
    
    // Save session to backend
    fetch('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedSession)
    }).then(() => {
      setScreen('questionnaire');
    });
  };

  // Trigger immediate headless scan
  const handleHeadlessScan = (mode = 'full') => {
    if (!targetPath.trim()) {
      alert('Please enter a target path or Git URL.');
      return;
    }
    setScreen('running');
    setScanMessage('Sizing repository and scanning dependencies...');
    setLogs([]);

    const logList = [
      'Initializing scan thread...',
      'Sizing codebase: detected 124 files, ~12,400 LOC',
      'Scanning package manifests for dependencies...',
      'Running decoupled relevance sweep...',
      'Subagent: react-performance-pilot-agent returned High Relevance',
      'Subagent: state-sanitizer-agent returned High Relevance',
      'Subagent: privacy-guardian-agent returned Medium Relevance',
      'Subagent: compliance-pilot-agent returned Low Relevance (Bypassed)',
      'Generating abstract capability mapping...',
      'Deduplicating recommendations...',
      'Writing technical and executive summaries...',
      'Compiling markdown audits to HTML reports...'
    ];

    logList.forEach((log, idx) => {
      setTimeout(() => {
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${log}`]);
      }, idx * 600);
    });

    // Simulate backend call
    setTimeout(() => {
      fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetPath,
          status: 'completed',
          mode: mode === 'full' ? 'headless' : 'backlog'
        })
      }).then(() => {
        setScreen('success');
      });
    }, logList.length * 600 + 200);
  };

  // Stepper steps config
  const steps = [
    { id: 'context', title: 'Context & Goals', desc: 'Define your release environment and tooling budget.' },
    { id: 'stack', title: 'Technical Stack', desc: 'Verify target runtime, libraries, and frameworks.' },
    { id: 'gates', title: 'Verification Gates', desc: 'Configure testing coverage limits and commit hooks.' },
    { id: 'compliance', title: 'Compliance Triggers', desc: 'Identify regulatory and privacy requirements.' }
  ];

  const handleNextStep = (skip = false) => {
    const currentSectionId = steps[session.currentStep].id;
    const updatedSections = {
      ...session.sections,
      [currentSectionId]: { status: skip ? 'skipped' : 'completed' }
    };

    const nextStep = session.currentStep + 1;
    const isLastStep = nextStep >= steps.length;

    const updatedSession = {
      ...session,
      sections: updatedSections,
      currentStep: isLastStep ? session.currentStep : nextStep,
      status: isLastStep ? 'completed' : 'active'
    };

    setSession(updatedSession);

    // Save session
    fetch('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedSession)
    }).then(() => {
      if (isLastStep) {
        handleHeadlessScan('full');
      }
    });
  };

  return (
    <div className="bg-[#0b0f17] bg-gradient-brand min-h-screen text-[#e6edf3] p-6 flex flex-col items-center">
      {/* Header */}
      <header className="w-full max-w-6xl flex justify-between items-center py-6 border-b border-brand-border mb-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#2ea44f] flex items-center justify-center font-bold text-white text-xl">W</div>
          <span className="font-extrabold text-xl tracking-tight text-white">Repo Wizard Dashboard</span>
        </div>
        <div className="flex gap-4">
          <button 
            className="text-sm font-semibold hover:text-white text-[#8b949e] transition"
            onClick={() => setScreen('landing')}
          >
            Home
          </button>
          <button 
            className="text-sm font-semibold hover:text-white text-[#8b949e] transition"
            onClick={() => setScreen('reports')}
          >
            View Reports
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-4xl flex-grow flex flex-col justify-center items-center">
        {errorMsg && (
          <div className="w-full max-w-xl bg-red-950/50 border border-red-500/50 text-red-200 p-4 rounded-xl mb-6 text-center animate-fade-in">
            {errorMsg}
          </div>
        )}

        {/* 1. Landing Screen */}
        {screen === 'landing' && (
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
              <button 
                onClick={handleResume}
                className="w-full bg-[#30363d] hover:bg-[#8b949e]/20 text-[#c9d1d9] border border-brand-border font-semibold py-3 px-6 rounded-xl transition"
              >
                Resume Paused Session
              </button>
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
                View Existing Reports ({reports.length})
              </button>
            </div>
          </div>
        )}

        {/* 2. Target Codebase Picker */}
        {screen === 'picker' && (
          <div className="w-full max-w-xl glass-panel p-8 rounded-2xl shadow-xl animate-fade-in">
            <h2 className="text-2xl font-bold mb-6 text-white text-center">Select Target Codebase</h2>
            <form onSubmit={handleTargetSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-[#8b949e] mb-2">
                  Local Absolute Filepath or Remote Git URL
                </label>
                <input 
                  type="text" 
                  value={targetPath}
                  onChange={(e) => setTargetPath(e.target.value)}
                  placeholder="e.g. C:/Projects/my-app or https://github.com/..."
                  className="w-full bg-[#0d1117] border border-brand-border rounded-xl px-4 py-3 text-white placeholder-[#484f58] focus:outline-none focus:border-[#58a6ff] transition"
                  required
                />
              </div>

              <div className="flex gap-4">
                <button 
                  type="submit"
                  className="flex-1 bg-[#2ea44f] hover:bg-[#2c974b] text-white font-semibold py-3 rounded-xl transition shadow-lg"
                >
                  Configure & Audit
                </button>
                <button 
                  type="button"
                  onClick={() => handleHeadlessScan('full')}
                  className="flex-1 bg-[#58a6ff]/10 hover:bg-[#58a6ff]/20 text-[#58a6ff] border border-[#58a6ff]/30 font-semibold py-3 rounded-xl transition"
                >
                  Skip to Headless Scan
                </button>
              </div>
              
              <button 
                type="button"
                onClick={() => handleHeadlessScan('backlog')}
                className="w-full text-center text-xs text-[#8b949e] hover:text-white transition"
              >
                Direct Backlog Generation (No Scaffolding)
              </button>
            </form>
          </div>
        )}

        {/* 3. Questionnaire Stepper */}
        {screen === 'questionnaire' && (
          <div className="w-full max-w-2xl glass-panel p-8 rounded-2xl shadow-xl animate-fade-in">
            {/* Step Indicators */}
            <div className="flex justify-between items-center mb-8 border-b border-brand-border pb-4">
              {steps.map((step, idx) => (
                <div key={step.id} className="flex flex-col items-center flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm mb-2 transition ${
                    idx === session.currentStep 
                      ? 'bg-[#58a6ff] text-[#0d1117]' 
                      : idx < session.currentStep
                        ? 'bg-[#2ea44f] text-white'
                        : 'bg-[#30363d] text-[#8b949e]'
                  }`}>
                    {idx + 1}
                  </div>
                  <span className="text-[10px] uppercase font-bold text-[#8b949e] hidden sm:inline">{step.title}</span>
                </div>
              ))}
            </div>

            {/* Step Details */}
            <div className="mb-8">
              <h3 className="text-xl font-bold text-white mb-2">{steps[session.currentStep].title}</h3>
              <p className="text-sm text-[#8b949e] mb-6">{steps[session.currentStep].desc}</p>

              {/* Form Input fields dynamically rendered based on step */}
              {session.currentStep === 0 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-[#c9d1d9] mb-2">Project Phase</label>
                    <select 
                      value={session.answers.goals}
                      onChange={(e) => setSession({...session, answers: {...session.answers, goals: e.target.value}})}
                      className="w-full bg-[#0d1117] border border-brand-border rounded-xl px-4 py-3 text-white focus:outline-none"
                    >
                      <option value="greenfield">Greenfield (New Project)</option>
                      <option value="refactor">Brownfield (Legacy Codebase)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-[#c9d1d9] mb-2">Target Budget</label>
                    <select 
                      value={session.answers.budget}
                      onChange={(e) => setSession({...session, answers: {...session.answers, budget: e.target.value}})}
                      className="w-full bg-[#0d1117] border border-brand-border rounded-xl px-4 py-3 text-white focus:outline-none"
                    >
                      <option value="free">Free / Open Source Tools Only</option>
                      <option value="premium">Premium / Enterprise Tolerant</option>
                    </select>
                  </div>
                </div>
              )}

              {session.currentStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-[#c9d1d9] mb-2">Primary Language / Platform</label>
                    <select 
                      className="w-full bg-[#0d1117] border border-brand-border rounded-xl px-4 py-3 text-white focus:outline-none"
                    >
                      <option value="react">React / Node.js Workspace</option>
                      <option value="rust">Rust Cargo Crate</option>
                      <option value="dotnet">.NET Core C# App</option>
                      <option value="swift">Swift (iOS/macOS)</option>
                      <option value="unity">Unity (C# Game)</option>
                      <option value="godot">Godot (GDScript)</option>
                      <option value="cobol">COBOL Mainframe</option>
                    </select>
                  </div>
                </div>
              )}

              {session.currentStep === 2 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-[#c9d1d9]">Configure Test Coverage Gate</label>
                    <input 
                      type="checkbox" 
                      checked={session.answers.testing}
                      onChange={(e) => setSession({...session, answers: {...session.answers, testing: e.target.checked}})}
                      className="w-5 h-5 accent-[#2ea44f]"
                    />
                  </div>
                  {session.answers.testing && (
                    <div>
                      <label className="block text-sm text-[#8b949e] mb-2">Coverage Threshold (%)</label>
                      <input 
                        type="number" 
                        value={session.answers.coverageThreshold}
                        onChange={(e) => setSession({...session, answers: {...session.answers, coverageThreshold: parseInt(e.target.value) || 80}})}
                        className="w-full bg-[#0d1117] border border-brand-border rounded-xl px-4 py-3 text-white focus:outline-none"
                        min="0" max="100"
                      />
                    </div>
                  )}
                </div>
              )}

              {session.currentStep === 3 && (
                <div className="space-y-4">
                  <label className="block text-sm text-[#c9d1d9] mb-2">Required Framework Profiles</label>
                  <div className="grid grid-cols-2 gap-4">
                    {['GDPR', 'SOC 2', 'ISO 27001', 'HIPAA'].map(framework => (
                      <div key={framework} className="flex items-center gap-3 bg-[#0d1117] border border-brand-border p-4 rounded-xl">
                        <input 
                          type="checkbox" 
                          checked={session.answers.compliance.includes(framework)}
                          onChange={(e) => {
                            const newCompliance = e.target.checked
                              ? [...session.answers.compliance, framework]
                              : session.answers.compliance.filter(c => c !== framework);
                            setSession({...session, answers: {...session.answers, compliance: newCompliance}});
                          }}
                          className="w-5 h-5 accent-[#2ea44f]"
                        />
                        <span className="font-semibold text-white">{framework}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Stepper Buttons */}
            <div className="flex justify-between items-center gap-4">
              <button 
                type="button"
                onClick={() => setScreen('picker')}
                className="bg-[#30363d] hover:bg-[#8b949e]/20 text-[#c9d1d9] border border-brand-border font-semibold py-3 px-6 rounded-xl transition"
              >
                Back
              </button>
              <div className="flex gap-4">
                <button 
                  type="button"
                  onClick={() => handleNextStep(true)}
                  className="text-sm font-semibold text-[#8b949e] hover:text-white transition"
                >
                  Skip Section
                </button>
                <button 
                  type="button"
                  onClick={() => handleNextStep(false)}
                  className="bg-[#2ea44f] hover:bg-[#2c974b] text-white font-semibold py-3 px-6 rounded-xl transition shadow-lg"
                >
                  {session.currentStep === steps.length - 1 ? 'Finish & Run Scan' : 'Next Step'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 4. Headless Execution Loader */}
        {screen === 'running' && (
          <div className="w-full max-w-xl glass-panel p-8 rounded-2xl shadow-xl text-center space-y-6 animate-fade-in">
            <div className="w-16 h-16 border-4 border-[#2ea44f] border-t-transparent rounded-full animate-spin mx-auto"></div>
            <h2 className="text-2xl font-bold text-white">Running Codebase Scan</h2>
            <p className="text-[#8b949e] text-sm">{scanMessage}</p>
            
            {/* Real-time scanning log box */}
            <div className="bg-[#0d1117] border border-brand-border rounded-xl p-4 text-left font-mono text-xs text-[#2ea44f] h-48 overflow-y-auto space-y-1">
              {logs.map((log, i) => (
                <div key={i} className="leading-relaxed">{log}</div>
              ))}
              {logs.length === 0 && <div className="text-[#484f58]">Waiting for logs...</div>}
            </div>
          </div>
        )}

        {/* 5. Success Screen */}
        {screen === 'success' && (
          <div className="w-full max-w-md glass-panel p-8 rounded-2xl shadow-xl text-center space-y-6 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-[#2ea44f]/20 text-[#2ea44f] flex items-center justify-center text-4xl mx-auto">✓</div>
            <h2 className="text-3xl font-extrabold text-white">Scan Complete!</h2>
            <p className="text-[#8b949e] text-sm">
              All audits have completed successfully. Check the reports folder inside your codebase to see results.
            </p>
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
        )}

        {/* 6. Reports View Screen */}
        {screen === 'reports' && (
          <div className="w-full max-w-6xl glass-panel p-6 rounded-2xl shadow-xl flex flex-col md:flex-row gap-6 min-h-[500px] animate-fade-in">
            {/* Sidebar with report file listing */}
            <div className="w-full md:w-1/3 border-r border-brand-border pr-6 flex flex-col justify-between">
              <div>
                <h2 className="text-xl font-bold mb-4 text-white">Available Reports</h2>
                {reports.length === 0 ? (
                  <p className="text-sm text-[#8b949e]">No reports generated yet. Run a scan to generate reports.</p>
                ) : (
                  <ul className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                    {reports.map((report) => (
                      <li key={report}>
                        <button
                          onClick={() => {
                            fetch(`/api/report-content?file=${report}`)
                              .then(res => res.json())
                              .then(data => {
                                setActiveReport({ name: report, content: data.content });
                              })
                              .catch(() => {
                                setErrorMsg('Failed to load report content.');
                                setTimeout(() => setErrorMsg(''), 3000);
                              });
                          }}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition flex items-center gap-2 ${
                            activeReport?.name === report
                              ? 'bg-[#58a6ff]/20 text-[#58a6ff] border border-[#58a6ff]/30'
                              : 'bg-[#0d1117] hover:bg-[#8b949e]/10 text-[#c9d1d9] border border-brand-border'
                          }`}
                        >
                          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="truncate">{report}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              
              <button
                onClick={() => {
                  setScreen('landing');
                  setActiveReport(null);
                }}
                className="mt-6 w-full bg-[#30363d] hover:bg-[#8b949e]/20 text-[#c9d1d9] border border-brand-border font-semibold py-2.5 rounded-xl transition text-sm"
              >
                Back to Home
              </button>
            </div>

            {/* Main content display pane */}
            <div className="w-full md:w-2/3 flex flex-col min-h-[400px]">
              {activeReport ? (
                <div className="flex-grow flex flex-col">
                  <div className="flex justify-between items-center mb-4 pb-2 border-b border-brand-border">
                    <h3 className="font-bold text-white truncate text-sm">{activeReport.name}</h3>
                    {activeReport.name.endsWith('.html') && (
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-[#2ea44f]/20 text-[#2ea44f] border border-[#2ea44f]/30">HTML</span>
                    )}
                    {activeReport.name.endsWith('.md') && (
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-[#58a6ff]/20 text-[#58a6ff] border border-[#58a6ff]/30">Markdown</span>
                    )}
                  </div>
                  <div className="flex-grow bg-[#0d1117] border border-brand-border rounded-xl p-4 overflow-auto max-h-[500px]">
                    {activeReport.name.endsWith('.html') ? (
                      <iframe
                        srcDoc={activeReport.content}
                        title="Report Content"
                        className="w-full h-[400px] border-none bg-white rounded-lg"
                        sandbox="allow-same-origin"
                      />
                    ) : (
                      <pre className="text-xs font-mono text-[#c9d1d9] whitespace-pre-wrap leading-relaxed">
                        {activeReport.content}
                      </pre>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-grow flex flex-col items-center justify-center text-[#8b949e] border border-dashed border-brand-border rounded-xl p-8">
                  <svg className="w-12 h-12 mb-3 text-[#484f58]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7v12m0 0l-4-4m4 4l4-4m0 6V7m0 0l-4 4m4-4l4 4" />
                  </svg>
                  <p className="text-sm">Select a report from the sidebar to inspect its contents.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
