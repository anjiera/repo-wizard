import React from 'react';

export default function DirectoryBrowserModal({
  showBrowserModal,
  setShowBrowserModal,
  browserCurrentPath,
  browserParentPath,
  browserDirectories,
  browserError,
  fetchDirectories,
  handleSelectFolder
}) {
  if (!showBrowserModal) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#0b0f17]/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-xl glass-panel p-6 rounded-2xl shadow-2xl flex flex-col h-[500px]">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-white">Browse Directories</h3>
          <button
            type="button"
            onClick={() => setShowBrowserModal(false)}
            className="text-[#8b949e] hover:text-white transition text-lg leading-none"
          >
            &times;
          </button>
        </div>

        {/* Current Path Indicator */}
        <div className="bg-[#0d1117] border border-brand-border rounded-xl p-3 mb-4 flex items-center justify-between gap-2 overflow-hidden">
          <span className="text-xs font-mono text-emerald-400 truncate select-all" title={browserCurrentPath}>
            {browserCurrentPath === 'drives' ? 'Drives Selection' : browserCurrentPath || 'Loading...'}
          </span>
          {browserParentPath && (
            <button
              type="button"
              onClick={() => fetchDirectories(browserParentPath)}
              className="bg-[#30363d] hover:bg-[#8b949e]/20 text-[#c9d1d9] border border-brand-border px-3 py-1 rounded-lg text-xs transition font-semibold flex items-center gap-1 leading-none shrink-0"
            >
              <span>↑ Up</span>
            </button>
          )}
        </div>

        {/* Error warning */}
        {browserError && (
          <div className="bg-red-950/40 border border-red-500/30 text-red-200 text-xs p-3 rounded-xl mb-4 text-center">
            {browserError}
            {browserParentPath && (
              <button
                type="button"
                onClick={() => fetchDirectories(browserParentPath)}
                className="underline block mx-auto mt-1 hover:text-white"
              >
                Go back to parent
              </button>
            )}
          </div>
        )}

        {/* Directories List */}
        <div className="flex-1 min-h-0 overflow-y-auto bg-[#0d1117]/30 border border-brand-border/60 rounded-xl p-2 mb-4 space-y-1">
          {browserDirectories.length === 0 ? (
            <div className="text-center text-xs text-[#8b949e] py-10">
              No folders found or inaccessible.
            </div>
          ) : (
            browserDirectories.map(dir => (
              <button
                key={dir}
                type="button"
                onClick={() => {
                  const nextPath = browserCurrentPath === 'drives' ? dir : `${browserCurrentPath}/${dir}`;
                  fetchDirectories(nextPath);
                }}
                className="w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-brand-border/20 text-[#c9d1d9] hover:text-white transition text-xs font-medium"
              >
                <span className="text-base select-none">📁</span>
                <span className="truncate">{dir}</span>
              </button>
            ))
          )}
        </div>

        {/* Actions Footer */}
        <div className="flex gap-3 justify-end pt-2 border-t border-brand-border/40">
          <button
            type="button"
            onClick={() => setShowBrowserModal(false)}
            className="bg-[#30363d] hover:bg-[#8b949e]/20 text-[#c9d1d9] border border-brand-border font-semibold py-2.5 px-5 rounded-xl transition text-xs"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={browserCurrentPath === 'drives' || !browserCurrentPath}
            onClick={handleSelectFolder}
            className="bg-[#2ea44f] hover:bg-[#2c974b] disabled:bg-[#30363d] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-5 rounded-xl transition shadow-lg text-xs"
          >
            Select Folder
          </button>
        </div>
      </div>
    </div>
  );
}
