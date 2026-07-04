import React, { useState, useEffect, useRef } from 'react';
import ThemeToggle from './components/ThemeToggle';
import DirectoryBrowserModal from './components/DirectoryBrowserModal';
import ScreenLanding from './components/ScreenLanding';
import ScreenPicker from './components/ScreenPicker';
import ScreenQuestionnaire from './components/ScreenQuestionnaire';
import ScreenRunning from './components/ScreenRunning';
import ScreenReports from './components/ScreenReports';

import stepperConfig from './config/stepper-config.json';
const { complianceFrameworks, steps } = stepperConfig;



export default function App() {
  const [screen, setScreen] = useState('landing'); // 'landing', 'picker', 'questionnaire', 'reports', 'running', 'success'
  const timeoutsRef = useRef([]);
  const pollIntervalRef = useRef(null);
  const logContainerRef = useRef(null);

  const safeSetTimeout = (fn, delay) => {
    const id = setTimeout(() => {
      timeoutsRef.current = timeoutsRef.current.filter(tId => tId !== id);
      fn();
    }, delay);
    timeoutsRef.current.push(id);
    return id;
  };

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(clearTimeout);
    };
  }, []);
  const [darkMode, setDarkMode] = useState(() => {
    try {
      const saved = typeof localStorage !== 'undefined' && localStorage.getItem ? localStorage.getItem('theme') : null;
      return saved ? saved === 'dark' : true;
    } catch (e) {
      return true;
    }
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      try {
        if (typeof localStorage !== 'undefined' && localStorage.setItem) {
          localStorage.setItem('theme', 'dark');
        }
      } catch (e) {}
    } else {
      document.documentElement.classList.remove('dark');
      try {
        if (typeof localStorage !== 'undefined' && localStorage.setItem) {
          localStorage.setItem('theme', 'light');
        }
      } catch (e) {}
    }
  }, [darkMode]);

  const [targetPath, setTargetPath] = useState('');

  // Directory explorer state
  const [showBrowserModal, setShowBrowserModal] = useState(false);
  const [browserCurrentPath, setBrowserCurrentPath] = useState('');
  const [browserParentPath, setBrowserParentPath] = useState(null);
  const [browserDirectories, setBrowserDirectories] = useState([]);
  const [browserError, setBrowserError] = useState('');
  const [browserTargetField, setBrowserTargetField] = useState('targetPath'); // 'targetPath', 'reportPath', 'tosPath'

  const openDirectoryBrowser = (startPath = '', field = 'targetPath') => {
    setBrowserTargetField(field);
    setShowBrowserModal(true);
    setBrowserError('');
    fetchDirectories(startPath);
  };

  const fetchDirectories = (pathStr) => {
    setBrowserError('');
    fetch('/api/browse-directory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPath: pathStr })
    })
      .then(res => {
        if (!res.ok) {
          return res.json().then(data => {
            const errorObj = new Error(data.error || 'Failed to read directory.');
            errorObj.data = data;
            throw errorObj;
          });
        }
        return res.json();
      })
      .then(data => {
        setBrowserCurrentPath(data.currentPath);
        setBrowserParentPath(data.parentPath);
        setBrowserDirectories(data.directories);
      })
      .catch(err => {
        setBrowserError(err.message || 'Failed to read directory.');
        setBrowserDirectories([]);
        if (err.data) {
          if (err.data.currentPath !== undefined) setBrowserCurrentPath(err.data.currentPath);
          if (err.data.parentPath !== undefined) setBrowserParentPath(err.data.parentPath);
        } else {
          if (pathStr && pathStr !== 'drives') {
            const normalized = pathStr.replace(/\\/g, '/');
            if (/^[a-zA-Z]:\/?$/.test(normalized)) {
              setBrowserParentPath('drives');
            } else {
              const parts = normalized.split('/');
              if (parts.length > 1) {
                parts.pop();
                const parent = parts.join('/');
                setBrowserParentPath(parent || '/');
              } else {
                setBrowserParentPath(null);
              }
            }
            setBrowserCurrentPath(pathStr);
          }
        }
      });
  };

  const handleSelectFolder = () => {
    if (browserCurrentPath && browserCurrentPath !== 'drives') {
      if (browserTargetField === 'reportPath') {
        setSession(prev => ({ ...prev, reportPath: browserCurrentPath }));
      } else if (browserTargetField === 'tosPath') {
        setSession(prev => ({ ...prev, tosPath: browserCurrentPath }));
      } else {
        setTargetPath(browserCurrentPath);
      }
    }
    setShowBrowserModal(false);
  };
  const [session, setSession] = useState({
    targetPath: '',
    status: 'paused',
    currentStep: 0,
    redact: false,
    answers: {
      goals: 'greenfield',
      team: 'junior',
      budget: 'free',
      projectGoal: 'personal',
      expertiseLevel: 'intermediate',
      platforms: ['web'],
      frameworks: ['react'],
      testing: true,
      coverageThreshold: 80,
      compliance: []
    },
    sections: steps.reduce((acc, s) => {
      acc[s.id] = { status: 'pending' };
      return acc;
    }, {})
  });

  const [reports, setReports] = useState([]);
  const [activeReport, setActiveReport] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [scanMessage, setScanMessage] = useState('');
  const [logs, setLogs] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [hasSession, setHasSession] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [hasConsented, setHasConsented] = useState(false);
  const [tosHtml, setTosHtml] = useState('');
  const [customLanguage, setCustomLanguage] = useState('');
  const [customPlatform, setCustomPlatform] = useState('');
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Check consent status on startup
  useEffect(() => {
    fetch('/api/consent')
      .then(res => res.ok ? res.json() : { consented: false })
      .then(data => {
        setHasConsented(data.consented);
        if (!data.consented) {
          setScreen('consent');
          fetch('/api/tos')
            .then(res => res.ok ? res.json() : { html: '' })
            .then(tosData => {
              setTosHtml(tosData.html);
            });
        }
      })
      .catch(() => {
        setHasConsented(false);
        setScreen('consent');
      });
  }, []);

  // Fetch reports and active session state on startup/screen change
  useEffect(() => {
    if (!hasConsented && screen !== 'consent') {
      return;
    }
    // Clear active timeouts when screen changes to prevent background redirects/updates
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];

    let active = true;

    Promise.all([
      fetch('/api/reports')
        .then(res => res.ok ? res.json() : { reports: [] })
        .catch(() => ({ reports: [] })),
      fetch('/api/session')
        .then(res => res.ok)
        .catch(() => false)
    ]).then(([reportsData, sessionOk]) => {
      if (!active) return;
      
      const reportsList = reportsData.reports || [];
      setReports(reportsList);
      setHasSession(sessionOk);

      // Skip landing page on initial load if no session and no reports exist
      if (hasConsented && isInitialLoad && screen === 'landing' && !sessionOk && reportsList.length === 0) {
        setScreen('picker');
      }
      
      setIsInitialLoad(false);
    });

    return () => {
      active = false;
    };
  }, [screen, hasConsented]);

  // Poll real-time logs while running a scan
  useEffect(() => {
    if (screen === 'running') {
      const fetchLogs = () => {
        fetch('/api/scan-logs')
          .then(res => res.ok ? res.json() : { logs: [], isScanning: false })
          .then(data => {
            setLogs(data.logs || []);
            if (!data.isScanning) {
              if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
              }
              // Fetch latest session to see final status
              fetch('/api/session')
                .then(res => res.ok ? res.json() : null)
                .then(sess => {
                  if (sess) {
                    setSession(sess);
                    if (sess.status === 'completed') {
                      fetch('/api/analyze-target', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ targetPath: sess.targetPath })
                      })
                        .then(res => res.ok ? res.json() : { warnings: [] })
                        .then(data => {
                          setWarnings(data.warnings || []);
                          setScreen('success');
                        })
                        .catch(() => {
                          setWarnings([]);
                          setScreen('success');
                        });
                    } else {
                      setErrorMsg('Scan failed or was aborted.');
                      setScreen('landing');
                      safeSetTimeout(() => setErrorMsg(''), 4000);
                    }
                  }
                });
            }
          })
          .catch(err => {
            console.error('Failed to fetch scan logs:', err);
          });
      };

      fetchLogs();
      pollIntervalRef.current = setInterval(fetchLogs, 800);
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [screen]);

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // Handle Resume
  const handleResume = () => {
    fetch('/api/session')
      .then(res => {
        if (!res.ok) throw new Error('No active session found.');
        return res.json();
      })
      .then(data => {
        setSession(data);
        setTargetPath(data.targetPath || '');
        setScreen(prev => prev === 'landing' ? 'questionnaire' : prev);
      })
      .catch(err => {
        setErrorMsg(err.message || 'No active session found.');
        safeSetTimeout(() => setErrorMsg(''), 3000);
      });
  };

  // Start new interview
  const handleStartNew = () => {
    setSession({
      targetPath: '',
      status: 'active',
      currentStep: 0,
      redact: false,
      answers: {
        goals: 'greenfield',
        team: 'junior',
        budget: 'free',
        projectGoal: 'personal',
        expertiseLevel: 'intermediate',
        platforms: ['web'],
        frameworks: ['react'],
        testing: true,
        coverageThreshold: 80,
        compliance: []
      },
      sections: steps.reduce((acc, s) => {
        acc[s.id] = { status: 'pending' };
        return acc;
      }, {})
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
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to save session.');
        setScreen(prev => prev === 'picker' ? 'questionnaire' : prev);
      })
      .catch(err => {
        setErrorMsg(err.message || 'Failed to save session.');
        safeSetTimeout(() => setErrorMsg(''), 3000);
      });
  };

  // Trigger immediate headless scan
  const handleHeadlessScan = (mode = 'full') => {
    if (!targetPath.trim()) {
      alert('Please enter a target path or Git URL.');
      return;
    }
    // Clear any pending timeouts from previous actions/errors to avoid overlap
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];

    const updatedSession = {
      ...session,
      targetPath,
      mode: mode,
      status: 'active'
    };

    setSession(updatedSession);
    setScreen('running');
    setLogs(['[System] Initializing backend scan...']);
    setWarnings([]);
    setScanMessage('Sizing repository and running agents...');

    fetch('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedSession)
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to update session.');
        return fetch('/api/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
      })
      .then(res => {
        if (!res.ok) {
          return res.json().then(data => { throw new Error(data.error || 'Failed to start scan.'); });
        }
        return res.json();
      })
      .catch(err => {
        setErrorMsg(err.message || 'Failed to trigger codebase scan.');
        setScreen('landing');
        safeSetTimeout(() => setErrorMsg(''), 4000);
      });
  };

  const handleCancelScan = () => {
    fetch('/api/cancel-scan', {
      method: 'POST'
    })
      .then(res => {
        if (res.ok) {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          setScreen('landing');
          setErrorMsg('Scan cancelled successfully.');
          safeSetTimeout(() => setErrorMsg(''), 3000);
        }
      })
      .catch(err => {
        console.error('Failed to cancel scan:', err);
      });
  };



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
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to save step progress.');
        if (isLastStep) {
          handleHeadlessScan('full');
        }
      })
      .catch(err => {
        setErrorMsg(err.message || 'Failed to save step progress.');
        safeSetTimeout(() => setErrorMsg(''), 3000);
      });
  };

  const handlePrevStep = () => {
    if (session.currentStep > 0) {
      const updatedSession = {
        ...session,
        currentStep: session.currentStep - 1
      };
      setSession(updatedSession);
      
      // Save session step backward progress
      fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSession)
      })
        .catch(err => {
          setErrorMsg(err.message || 'Failed to save step progress.');
          safeSetTimeout(() => setErrorMsg(''), 3000);
        });
    } else {
      setScreen('picker');
    }
  };

  return (
    <div className="bg-gradient-brand min-h-screen text-[#e6edf3] p-6 flex flex-col items-center">
      {/* Header */}
      <header className="w-full max-w-6xl flex justify-between items-center py-6 border-b border-brand-border mb-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#2ea44f] flex flex-col items-center justify-center font-bold text-white select-none leading-none pt-0.5 shadow-[0_0_10px_rgba(46,164,79,0.3)]">
            <span className="text-[10px] font-black leading-none -mb-1 text-[#a5d6ff] select-none">^</span>
            <span className="text-lg font-black leading-none select-none">R</span>
          </div>
          <span className="font-extrabold text-xl tracking-tight text-white">Repo Wizard Dashboard</span>
        </div>
        <div className="flex items-center gap-6">
          {hasConsented && (
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
          )}
          
          {/* Theme Toggler */}
          <ThemeToggle darkMode={darkMode} setDarkMode={setDarkMode} />
        </div>
      </header>


      {/* Main Container */}
      <main className="w-full max-w-4xl flex-grow flex flex-col justify-center items-center">
        {errorMsg && (
          <div className="w-full max-w-xl bg-red-950/50 border border-red-500/50 text-red-200 p-4 rounded-xl mb-6 text-center animate-fade-in">
            {errorMsg}
          </div>
        )}

        {/* 0. Consent Screen */}
        {screen === 'consent' && (
          <div className="w-full max-w-xl glass-panel p-8 rounded-2xl shadow-xl animate-fade-in space-y-6">
            <h2 className="text-2xl font-bold mb-4 text-white text-center">Terms of Service & Developer Consent</h2>
            <div 
              className="bg-[#0d1117] border border-brand-border rounded-xl p-4 text-sm text-[#8b949e] h-60 overflow-y-auto space-y-4 leading-relaxed markdown-body"
              dangerouslySetInnerHTML={{ __html: tosHtml || '<p>Loading Terms of Service...</p>' }}
            />

            <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-brand-border/40">
              <button
                type="button"
                onClick={() => {
                  fetch('/api/consent', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ agreed: false })
                  })
                    .then(() => {
                      setHasConsented(false);
                      setErrorMsg('You must accept the terms to use the dashboard.');
                    });
                }}
                className="flex-1 bg-red-950/40 hover:bg-red-950/60 text-red-300 border border-red-500/30 font-semibold py-3 rounded-xl transition"
              >
                Decline
              </button>
              <button
                type="button"
                onClick={() => {
                  fetch('/api/consent', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ agreed: true, agreed_by: 'dev-user' })
                  })
                    .then(res => {
                      if (!res.ok) throw new Error('Failed to record consent.');
                      return res.json();
                    })
                    .then(() => {
                      setHasConsented(true);
                      setErrorMsg('');
                      setScreen('landing');
                    })
                    .catch(err => {
                      setErrorMsg(err.message || 'Failed to save consent.');
                    });
                }}
                className="flex-1 bg-[#2ea44f] hover:bg-[#2c974b] text-white font-semibold py-3 rounded-xl transition shadow-lg"
              >
                I Accept the Terms
              </button>
            </div>
          </div>
        )}

        {/* 1. Landing Screen */}
        {screen === 'landing' && (
          <ScreenLanding
            handleStartNew={handleStartNew}
            handleResume={handleResume}
            hasSession={hasSession}
            reportsCount={reports.length}
            setScreen={setScreen}
          />
        )}

        {/* 2. Target Codebase Picker */}
        {screen === 'picker' && (
          <ScreenPicker
            targetPath={targetPath}
            setTargetPath={setTargetPath}
            openDirectoryBrowser={openDirectoryBrowser}
            session={session}
            setSession={setSession}
            advancedOpen={advancedOpen}
            setAdvancedOpen={setAdvancedOpen}
            handleTargetSubmit={handleTargetSubmit}
            handleHeadlessScan={handleHeadlessScan}
            setScreen={setScreen}
          />
        )}

        {/* 3. Questionnaire Stepper */}
        {screen === 'questionnaire' && (
          <ScreenQuestionnaire
            steps={steps}
            complianceFrameworks={complianceFrameworks}
            session={session}
            setSession={setSession}
            customLanguage={customLanguage}
            setCustomLanguage={setCustomLanguage}
            customPlatform={customPlatform}
            setCustomPlatform={setCustomPlatform}
            handlePrevStep={handlePrevStep}
            handleNextStep={handleNextStep}
          />
        )}

        {/* 4. Running & Success Screens */}
        {(screen === 'running' || screen === 'success') && (
          <ScreenRunning
            screen={screen}
            scanMessage={scanMessage}
            logContainerRef={logContainerRef}
            logs={logs}
            handleCancelScan={handleCancelScan}
            warnings={warnings}
            setSession={setSession}
            setScreen={setScreen}
            session={session}
          />
        )}

        {/* 5. Reports View Screen */}
        {screen === 'reports' && (
          <ScreenReports
            reports={reports}
            activeReport={activeReport}
            setActiveReport={setActiveReport}
            setScreen={setScreen}
            setErrorMsg={setErrorMsg}
            safeSetTimeout={safeSetTimeout}
          />
        )}
      </main>

      {/* Directory Explorer Modal */}
      <DirectoryBrowserModal
        showBrowserModal={showBrowserModal}
        setShowBrowserModal={setShowBrowserModal}
        browserCurrentPath={browserCurrentPath}
        browserParentPath={browserParentPath}
        browserDirectories={browserDirectories}
        browserError={browserError}
        fetchDirectories={fetchDirectories}
        handleSelectFolder={handleSelectFolder}
      />
    </div>
  );
}

