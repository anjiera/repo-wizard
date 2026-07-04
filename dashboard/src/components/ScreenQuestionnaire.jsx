import React from 'react';

export default function ScreenQuestionnaire({
  steps,
  complianceFrameworks,
  session,
  setSession,
  customLanguage,
  setCustomLanguage,
  customPlatform,
  setCustomPlatform,
  handlePrevStep,
  handleNextStep
}) {
  return (
    <div className="w-full max-w-2xl glass-panel p-8 rounded-2xl shadow-xl animate-fade-in relative pt-12">
      <button 
        type="button"
        onClick={handlePrevStep}
        className="absolute left-6 top-6 text-[#8b949e] hover:text-white transition flex items-center gap-1.5 text-xs font-semibold"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        <span>Back</span>
      </button>

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
            <div>
              <label className="block text-sm text-[#c9d1d9] mb-2">Project Goal / Standard</label>
              <select 
                value={session.answers.projectGoal || 'personal'}
                onChange={(e) => setSession({...session, answers: {...session.answers, projectGoal: e.target.value}})}
                className="w-full bg-[#0d1117] border border-brand-border rounded-xl px-4 py-3 text-white focus:outline-none"
              >
                <option value="personal">Personal / Hobbyist</option>
                <option value="release">Product Release</option>
                <option value="enterprise">Enterprise Grade</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-[#c9d1d9] mb-2">Developer Expertise Level</label>
              <select 
                value={session.answers.expertiseLevel || 'intermediate'}
                onChange={(e) => setSession({...session, answers: {...session.answers, expertiseLevel: e.target.value}})}
                className="w-full bg-[#0d1117] border border-brand-border rounded-xl px-4 py-3 text-white focus:outline-none"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced / Expert</option>
              </select>
            </div>
          </div>
        )}

        {session.currentStep === 1 && (
          <div className="space-y-6">
            {/* Languages / Frameworks Section */}
            <div>
              <h4 className="text-sm font-bold text-[#c9d1d9] mb-3 border-b border-brand-border/40 pb-1.5 uppercase tracking-wider text-xs">Languages & Frameworks</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { label: 'React / Node.js', value: 'react' },
                  { label: 'Rust (Cargo)', value: 'rust' },
                  { label: '.NET Core (C#)', value: 'dotnet' },
                  { label: 'Swift', value: 'swift' },
                  { label: 'Unity (C#)', value: 'unity' },
                  { label: 'Godot (GDScript)', value: 'godot' },
                  { label: 'COBOL', value: 'cobol' },
                  { label: 'PHP', value: 'php' }
                ].map((item) => {
                  const isChecked = (session.answers.frameworks || []).includes(item.value);
                  return (
                    <label key={item.value} className="flex items-center gap-2.5 bg-[#0d1117]/50 border border-brand-border/60 p-3 rounded-xl cursor-pointer hover:border-brand-border transition">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          const arr = session.answers.frameworks || [];
                          const newArr = isChecked ? arr.filter(x => x !== item.value) : [...arr, item.value];
                          setSession({
                            ...session,
                            answers: { ...session.answers, frameworks: newArr }
                          });
                        }}
                        className="w-4 h-4 accent-[#2ea44f]"
                      />
                      <span className="text-xs text-[#c9d1d9] font-medium">{item.label}</span>
                    </label>
                  );
                })}

                {/* Custom Language Checkbox */}
                <label className="flex items-center gap-2.5 bg-[#0d1117]/50 border border-brand-border/60 p-3 rounded-xl cursor-pointer hover:border-brand-border transition">
                  <input
                    type="checkbox"
                    checked={(session.answers.frameworks || []).includes('other')}
                    onChange={() => {
                      const arr = session.answers.frameworks || [];
                      const isChecked = arr.includes('other');
                      let newArr = isChecked ? arr.filter(x => x !== 'other') : [...arr, 'other'];
                      if (isChecked) {
                        newArr = newArr.filter(x => x !== customLanguage);
                      } else if (customLanguage.trim()) {
                        newArr = [...newArr, customLanguage.trim()];
                      }
                      setSession({
                        ...session,
                        answers: { ...session.answers, frameworks: newArr }
                      });
                    }}
                    className="w-4 h-4 accent-[#2ea44f]"
                  />
                  <span className="text-xs text-[#c9d1d9] font-medium">Other</span>
                </label>
              </div>

              {(session.answers.frameworks || []).includes('other') && (
                <div className="mt-3">
                  <input
                    type="text"
                    value={customLanguage}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustomLanguage(val);
                      const arr = session.answers.frameworks || [];
                      let newArr = arr.filter(x => x !== customLanguage && x !== 'other');
                      if (val.trim()) {
                        newArr = [...newArr, 'other', val.trim()];
                      } else {
                        newArr = [...newArr, 'other'];
                      }
                      setSession({
                        ...session,
                        answers: { ...session.answers, frameworks: newArr }
                      });
                    }}
                    placeholder="Specify other languages/frameworks (comma-separated)..."
                    className="w-full bg-[#0d1117] border border-brand-border rounded-xl px-4 py-2.5 text-xs text-white placeholder-[#484f58] focus:outline-none focus:border-[#58a6ff] transition"
                  />
                </div>
              )}
            </div>

            {/* Platforms Section */}
            <div>
              <h4 className="text-sm font-bold text-[#c9d1d9] mb-3 border-b border-brand-border/40 pb-1.5 uppercase tracking-wider text-xs">Target Platforms</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { label: 'Windows', value: 'windows' },
                  { label: 'iPhone / iOS', value: 'iphone' },
                  { label: 'Nintendo Switch 2', value: 'switch2' },
                  { label: 'Web', value: 'web' },
                  { label: 'Firmware', value: 'firmware' },
                  { label: 'macOS', value: 'macos' },
                  { label: 'Linux', value: 'linux' },
                  { label: 'Android', value: 'android' }
                ].map((item) => {
                  const isChecked = (session.answers.platforms || []).includes(item.value);
                  return (
                    <label key={item.value} className="flex items-center gap-2.5 bg-[#0d1117]/50 border border-brand-border/60 p-3 rounded-xl cursor-pointer hover:border-brand-border transition">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          const arr = session.answers.platforms || [];
                          const newArr = isChecked ? arr.filter(x => x !== item.value) : [...arr, item.value];
                          setSession({
                            ...session,
                            answers: { ...session.answers, platforms: newArr }
                          });
                        }}
                        className="w-4 h-4 accent-[#2ea44f]"
                      />
                      <span className="text-xs text-[#c9d1d9] font-medium">{item.label}</span>
                    </label>
                  );
                })}

                {/* Custom Platform Checkbox */}
                <label className="flex items-center gap-2.5 bg-[#0d1117]/50 border border-brand-border/60 p-3 rounded-xl cursor-pointer hover:border-brand-border transition">
                  <input
                    type="checkbox"
                    checked={(session.answers.platforms || []).includes('other')}
                    onChange={() => {
                      const arr = session.answers.platforms || [];
                      const isChecked = arr.includes('other');
                      let newArr = isChecked ? arr.filter(x => x !== 'other') : [...arr, 'other'];
                      if (isChecked) {
                        newArr = newArr.filter(x => x !== customPlatform);
                      } else if (customPlatform.trim()) {
                        newArr = [...newArr, customPlatform.trim()];
                      }
                      setSession({
                        ...session,
                        answers: { ...session.answers, platforms: newArr }
                      });
                    }}
                    className="w-4 h-4 accent-[#2ea44f]"
                  />
                  <span className="text-xs text-[#c9d1d9] font-medium">Other</span>
                </label>
              </div>

              {(session.answers.platforms || []).includes('other') && (
                <div className="mt-3">
                  <input
                    type="text"
                    value={customPlatform}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustomPlatform(val);
                      const arr = session.answers.platforms || [];
                      let newArr = arr.filter(x => x !== customPlatform && x !== 'other');
                      if (val.trim()) {
                        newArr = [...newArr, 'other', val.trim()];
                      } else {
                        newArr = [...newArr, 'other'];
                      }
                      setSession({
                        ...session,
                        answers: { ...session.answers, platforms: newArr }
                      });
                    }}
                    placeholder="Specify other platforms (comma-separated)..."
                    className="w-full bg-[#0d1117] border border-brand-border rounded-xl px-4 py-2.5 text-xs text-white placeholder-[#484f58] focus:outline-none focus:border-[#58a6ff] transition"
                  />
                </div>
              )}
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
              <div className="space-y-3">
                <label className="block text-sm text-[#8b949e] mb-1">Coverage Threshold (%)</label>
                <div className="flex items-center gap-4 bg-[#0d1117]/30 border border-brand-border/60 p-4 rounded-xl">
                  <input 
                    type="range" 
                    min="0" 
                    max="100"
                    value={session.answers.coverageThreshold}
                    onChange={(e) => setSession({...session, answers: {...session.answers, coverageThreshold: parseInt(e.target.value) || 0}})}
                    className="flex-grow h-2 rounded-lg appearance-none cursor-pointer accent-[#2ea44f]"
                    style={{
                      background: `linear-gradient(to right, #2ea44f 0%, #2ea44f ${session.answers.coverageThreshold}%, #161b22 ${session.answers.coverageThreshold}%, #161b22 100%)`
                    }}
                  />
                  <input 
                    type="number" 
                    min="0" 
                    max="100"
                    value={session.answers.coverageThreshold}
                    onChange={(e) => {
                      let val = parseInt(e.target.value);
                      if (isNaN(val)) val = 0;
                      val = Math.max(0, Math.min(100, val));
                      setSession({...session, answers: {...session.answers, coverageThreshold: val}});
                    }}
                    className="w-20 text-center bg-[#0d1117] border border-brand-border rounded-xl py-2 px-3 text-white focus:outline-none focus:border-[#58a6ff] transition font-semibold"
                  />
                </div>
                {session.answers.coverageThreshold === 100 && (
                  <p className="text-xs text-yellow-500 font-medium leading-normal bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 animate-fade-in">
                    ⚠️ Warning: Setting a 100% coverage threshold is a target threshold and does not guarantee complete absence of defects or absolute software safety.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {session.currentStep === 3 && (
          <div className="space-y-4">
            <label className="block text-sm text-[#c9d1d9] mb-2">Required Framework Profiles</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {complianceFrameworks.map(fw => (
                <div key={fw.id} className="relative flex items-center gap-3 bg-[#0d1117] border border-brand-border p-4 rounded-xl transition-all duration-200 hover:border-[#30363d]">
                  <input 
                    type="checkbox" 
                    id={`compliance-${fw.id}`}
                    checked={session.answers.compliance.includes(fw.id)}
                    onChange={(e) => {
                      const newCompliance = e.target.checked
                        ? [...session.answers.compliance, fw.id]
                        : session.answers.compliance.filter(c => c !== fw.id);
                      setSession({...session, answers: {...session.answers, compliance: newCompliance}});
                    }}
                    className="w-5 h-5 accent-[#2ea44f] cursor-pointer rounded border-[#30363d] focus:ring-0 focus:ring-offset-0"
                  />
                  <label htmlFor={`compliance-${fw.id}`} className="flex flex-col cursor-pointer select-none pr-8">
                    <span className="font-semibold text-white text-sm">{fw.id}</span>
                    <span className="text-xs text-[#8b949e]">{fw.description}</span>
                  </label>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center cursor-help text-[#8b949e] hover:text-white group">
                    <span className="text-[10px] w-4.5 h-4.5 flex items-center justify-center bg-[#161b22] rounded-full border border-brand-border font-bold">i</span>
                    <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-[#161b22] text-[#c9d1d9] text-xs rounded-xl border border-brand-border opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 shadow-2xl z-50 leading-normal font-normal">
                      {fw.hint}
                    </div>
                  </div>
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
          onClick={handlePrevStep}
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
  );
}
