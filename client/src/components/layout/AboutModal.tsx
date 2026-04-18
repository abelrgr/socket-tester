import { useEffect } from 'react';

interface AboutModalProps {
  onClose: () => void;
}

export function AboutModal({ onClose }: AboutModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative w-full max-w-md bg-surface-secondary border border-surface-border rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
          <div className="flex items-center gap-2">
            <span className="text-brand text-xl" aria-hidden="true">⚡</span>
            <h2 id="about-title" className="font-semibold text-lg [color:var(--color-text-primary)]">
              Socket Tester
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close about dialog"
            className="p-1.5 rounded hover:bg-surface-elevated transition-colors [color:var(--color-text-secondary)] hover:[color:var(--color-text-primary)]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* Description */}
          <p className="text-sm [color:var(--color-text-secondary)] leading-relaxed">
            Universal Socket Testing Platform — a Postman-like browser app for testing{' '}
            <span className="text-brand font-medium">WebSocket</span>,{' '}
            <span className="text-brand font-medium">Socket.io</span>,{' '}
            <span className="text-brand font-medium">MQTT</span>, and{' '}
            <span className="text-brand font-medium">AMQP</span> connections in real time.
          </p>

          {/* Features */}
          <ul className="text-sm [color:var(--color-text-secondary)] space-y-1.5">
            {[
              'Multi-protocol support: WS, Socket.io, MQTT, AMQP',
              'Real-time message logs with filtering',
              'Session management & config sharing via URL',
              'Performance monitoring & latency stats',
              'Network diagnostics & connection health',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="text-brand mt-0.5" aria-hidden="true">✓</span>
                {item}
              </li>
            ))}
          </ul>

          {/* Tech stack */}
          <div className="pt-1 border-t border-surface-border">
            <p className="text-xs [color:var(--color-text-secondary)] mb-2 font-medium uppercase tracking-wide">
              Built with
            </p>
            <div className="flex flex-wrap gap-2">
              {['NestJS', 'React', 'Tailwind CSS', 'Socket.io', 'TypeScript'].map((tech) => (
                <span
                  key={tech}
                  className="px-2 py-0.5 text-xs rounded-md bg-surface-elevated border border-surface-border [color:var(--color-text-secondary)]"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-surface-border bg-surface-primary/50">
          <p className="text-xs [color:var(--color-text-secondary)]">
            © {new Date().getFullYear()} Abel Gallo Ruiz
          </p>
          <div className="flex items-center gap-3">
            <a
              href="https://github.com/abelrgr"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub profile"
              className="flex items-center gap-1.5 text-xs [color:var(--color-text-secondary)] hover:[color:var(--color-text-primary)] transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.929.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
              </svg>
              GitHub
            </a>
            <a
              href="https://www.linkedin.com/in/abel-gallo-ruiz/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn profile"
              className="flex items-center gap-1.5 text-xs [color:var(--color-text-secondary)] hover:[color:var(--color-text-primary)] transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
              LinkedIn
            </a>
            <a
              href="https://abelgalloruiz.me"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs [color:var(--color-text-secondary)] hover:[color:var(--color-text-primary)] transition-colors"
            >
              abelgalloruiz.me
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
