import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useUIStore, THEMES } from '../../stores/uiStore';
import { AboutModal } from './AboutModal';

export function NavBar() {
  const { theme, setTheme, toggleSidebar, toggleCommandPalette } = useUIStore();
  const [themeOpen, setThemeOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  return (
    <>
    <header className="flex items-center justify-between h-14 px-4 bg-surface-secondary border-b border-surface-border flex-shrink-0">
      {/* Left: menu + logo */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
          className="p-1.5 rounded hover:bg-surface-elevated transition-colors [color:var(--color-text-secondary)] hover:[color:var(--color-text-primary)]"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
        <Link to="/" className="flex items-center gap-2 select-none">
          <span className="text-brand text-xl font-bold" aria-hidden="true">⚡</span>
          <span className="font-semibold tracking-tight [color:var(--color-text-primary)]">Socket Tester</span>
        </Link>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1">
        {/* Command Palette */}
        <button
          onClick={toggleCommandPalette}
          aria-label="Open command palette (Ctrl+K)"
          title="Command palette (Ctrl+K)"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded hover:bg-surface-elevated transition-colors text-sm [color:var(--color-text-secondary)] hover:[color:var(--color-text-primary)]"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <kbd className="hidden sm:inline text-xs bg-surface-primary px-1.5 py-0.5 rounded border border-surface-border [color:var(--color-text-secondary)]">
            Ctrl+K
          </kbd>
        </button>

        {/* About */}
        <button
          onClick={() => setAboutOpen(true)}
          className="px-2.5 py-1.5 text-sm transition-colors rounded hover:bg-surface-elevated [color:var(--color-text-secondary)] hover:[color:var(--color-text-primary)]"
        >
          About
        </button>

        {/* Docs */}
        <Link
          to="/docs"
          className="px-2.5 py-1.5 text-sm transition-colors rounded hover:bg-surface-elevated [color:var(--color-text-secondary)] hover:[color:var(--color-text-primary)]"
          aria-label="Documentation"
        >
          Docs
        </Link>

        {/* Theme selector */}
        <div className="relative">
          <button
            onClick={() => setThemeOpen((o) => !o)}
            aria-label={`Current theme: ${theme}. Click to change`}
            aria-haspopup="listbox"
            aria-expanded={themeOpen}
            className="p-1.5 rounded hover:bg-surface-elevated transition-colors [color:var(--color-text-secondary)] hover:[color:var(--color-text-primary)]"
          >
            {THEMES.find((t) => t.value === theme)?.icon ?? '🌙'}
          </button>

          {themeOpen && (
            <>
              <div
                className="fixed inset-0 z-20"
                onClick={() => setThemeOpen(false)}
                aria-hidden="true"
              />
              <ul
                role="listbox"
                aria-label="Select theme"
                className="absolute right-0 top-full mt-1 z-30 bg-surface-elevated border border-surface-border rounded-lg shadow-xl min-w-[160px] py-1 overflow-hidden"
              >
                {THEMES.map((t) => (
                  <li
                    key={t.value}
                    role="option"
                    aria-selected={theme === t.value}
                    onClick={() => {
                      setTheme(t.value);
                      setThemeOpen(false);
                    }}
                    className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer transition-colors ${
                      theme === t.value
                        ? '[color:var(--color-text-primary)] bg-brand/10'
                        : '[color:var(--color-text-primary)] hover:bg-surface-border'
                    }`}
                  >
                    <span aria-hidden="true">{t.icon}</span>
                    {t.label}
                    {theme === t.value && (
                      <span className="ml-auto text-brand" aria-hidden="true">✓</span>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </header>

    {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}
    </>
  );
}

