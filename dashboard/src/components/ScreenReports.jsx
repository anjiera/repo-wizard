import React from 'react';

export default function ScreenReports({
  reports,
  activeReport,
  setActiveReport,
  setScreen,
  setErrorMsg,
  safeSetTimeout
}) {
  return (
    <div className="w-full max-w-6xl glass-panel p-6 rounded-2xl shadow-xl flex flex-col md:flex-row gap-6 min-h-[500px] animate-fade-in relative pt-14">
      <button 
        type="button"
        onClick={() => {
          setScreen('landing');
          setActiveReport(null);
        }}
        className="absolute left-6 top-6 text-[#8b949e] hover:text-white transition flex items-center gap-1.5 text-xs font-semibold"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        <span>Back to Home</span>
      </button>

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
                      fetch(`/api/report-content?file=${encodeURIComponent(report)}`)
                        .then(res => {
                          if (!res.ok) throw new Error();
                          return res.json();
                        })
                        .then(data => {
                          setActiveReport({ name: report, content: data.content });
                        })
                        .catch(() => {
                          setErrorMsg('Failed to load report content.');
                          safeSetTimeout(() => setErrorMsg(''), 3000);
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
                  sandbox=""
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
  );
}
