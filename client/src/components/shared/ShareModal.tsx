import { useState, useEffect } from 'react';
import type { ConnectionConfig } from '../../types';
import { shareConfig } from '../../services/api';

interface ShareModalProps {
  config: ConnectionConfig;
  onClose: () => void;
}

export function ShareModal({ config, onClose }: ShareModalProps) {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    async function generate() {
      try {
        const res = await shareConfig({
          config: config as unknown as Record<string, unknown>,
        });
        const url = `${window.location.origin}/share/${res.data.token}`;
        setShareUrl(url);

        // Generate QR code (optional — if package available)
        try {
          const qrcode = await import('qrcode');
          const dataUrl = await qrcode.default.toDataURL(url, { width: 200, margin: 2 });
          setQrDataUrl(dataUrl);
        } catch {
          // QR code package not available — skip silently
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to generate share link');
      } finally {
        setLoading(false);
      }
    }
    void generate();
  }, [config]);

  const copyToClipboard = () => {
    if (!shareUrl) return;
    void navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
    >
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-surface-secondary border border-surface-border rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 id="share-modal-title" className="text-lg font-semibold text-gray-100">
            Share Configuration
          </h2>
          <button
            onClick={onClose}
            aria-label="Close share modal"
            className="p-1 rounded text-gray-400 hover:text-gray-100 hover:bg-surface-elevated transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Security notice */}
        <div
          role="alert"
          className="text-sm text-yellow-300 bg-yellow-400/10 border border-yellow-400/20 rounded-lg px-3 py-2 mb-4"
        >
          ⚠️ Credentials (passwords, tokens) have been stripped from the shared config.
        </div>

        {loading && (
          <div className="text-sm text-gray-400 text-center py-6" aria-live="polite">
            Generating share link…
          </div>
        )}

        {error && (
          <div role="alert" className="text-red-400 text-sm mb-3">
            {error}
          </div>
        )}

        {shareUrl && (
          <>
            <div className="flex gap-2 mb-4">
              <input
                readOnly
                value={shareUrl}
                className="input-field font-mono text-xs flex-1"
                aria-label="Share URL"
              />
              <button
                onClick={copyToClipboard}
                className="btn-secondary text-sm px-3 flex-shrink-0"
                aria-label={copied ? 'Link copied to clipboard' : 'Copy share link'}
              >
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>

            {qrDataUrl && (
              <div className="flex flex-col items-center gap-2 mt-4">
                <img
                  src={qrDataUrl}
                  alt="QR Code for the share link"
                  className="rounded-lg border border-surface-border"
                />
                <a
                  href={qrDataUrl}
                  download="share-qr.png"
                  className="text-xs text-brand hover:underline"
                >
                  Download QR Code
                </a>
              </div>
            )}

            <p className="text-xs text-gray-500 mt-4">
              This link expires in 7 days.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
