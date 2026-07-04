import React from 'react';

export default function ThemeToggle({ darkMode, setDarkMode }) {
  return (
    <button 
      onClick={() => setDarkMode(!darkMode)}
      className="p-2 rounded-xl bg-brand-border/20 border border-brand-border hover:bg-brand-border/40 transition text-sm font-semibold flex items-center justify-center gap-1.5"
      aria-label="Toggle Theme"
    >
      {darkMode ? (
        <>
          <span className="text-yellow-400">☀️</span>
          <span className="text-xs text-[#8b949e] hover:text-white hidden sm:inline">Light</span>
        </>
      ) : (
        <>
          <span className="text-blue-400">🌙</span>
          <span className="text-xs text-[#57606a] hover:text-[#1f2328] hidden sm:inline">Dark</span>
        </>
      )}
    </button>
  );
}
