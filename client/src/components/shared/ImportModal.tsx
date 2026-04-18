import { useState, useRef } from 'react';
import type { ConnectionConfig, Protocol } from '../../types';
import { useSavedConfigs } from '../../hooks/useSavedConfigs';

interface ImportModalProps {
  onClose: () => void;
}

interface PostmanItem {
  name?: string;
  request?: {
    url?: { raw?: string } | string;
  };
  item?: PostmanItem[]; // nested folders
}

interface PostmanCollection {
  info?: { name: string };
  item?: PostmanItem[];
}

function extractUrl(item: PostmanItem): string {
  const raw = item.request?.url;
  return typeof raw === 'string' ? raw : (raw?.raw ?? '');
}

function flattenPostmanItems(items: PostmanItem[]): PostmanItem[] {
  const result: PostmanItem[] = [];
  for (const item of items) {
    if (item.item) {
      result.push(...flattenPostmanItems(item.item));
    } else {
      result.push(item);
    }
  }
  return result;
}

function parseFile(
  text: string,
): Omit<ConnectionConfig, 'id' | 'createdAt' | 'updatedAt'>[] {
  const parsed = JSON.parse(text) as unknown;

  // Single .stconfig.json
  if (
    typeof parsed === 'object' &&
    parsed !== null &&
    'protocol' in parsed &&
    'config' in parsed
  ) {
    const single = parsed as ConnectionConfig;
    return [{ name: single.name ?? 'Imported', protocol: single.protocol, config: single.config }];
  }

  // Postman Collection v2.1
  const col = parsed as PostmanCollection;
  if (col.item) {
    const items = flattenPostmanItems(col.item);
    return items
      .map((item) => {
        const url = extractUrl(item);
        if (url.startsWith('ws://') || url.startsWith('wss://')) {
          return {
            name: item.name ?? url,
            protocol: 'websocket' as Protocol,
            config: { url },
          };
        }
        if (url.startsWith('http://') || url.startsWith('https://')) {
          return {
            name: item.name ?? url,
            protocol: 'socketio' as Protocol,
            config: { url },
          };
        }
        return null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }

  throw new Error(
    'Unrecognised format. Expected a .stconfig.json file or a Postman Collection v2.1.',
  );
}

export function ImportModal({ onClose }: ImportModalProps) {
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<
    Omit<ConnectionConfig, 'id' | 'createdAt' | 'updatedAt'>[]
  >([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { saveConfig } = useSavedConfigs();

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      try {
        const items = parseFile(text);
        setPreview(items);
        setSelected(new Set(items.map((_, i) => i)));
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not parse file');
        setPreview([]);
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const toggleSelect = (i: number, checked: boolean) => {
    const next = new Set(selected);
    if (checked) next.add(i);
    else next.delete(i);
    setSelected(next);
  };

  const handleImport = () => {
    preview.forEach((item, i) => {
      if (selected.has(i)) saveConfig(item);
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-modal-title"
    >
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-surface-secondary border border-surface-border rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 id="import-modal-title" className="text-lg font-semibold text-gray-100">
            Import Configuration
          </h2>
          <button
            onClick={onClose}
            aria-label="Close import modal"
            className="p-1 rounded text-gray-400 hover:text-gray-100 hover:bg-surface-elevated"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
          aria-label="Drop a .stconfig.json or Postman collection file here, or click to browse"
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors mb-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
            dragging
              ? 'border-brand bg-brand/10'
              : 'border-surface-border hover:border-brand/50'
          }`}
        >
          <p className="text-gray-400 text-sm">
            Drop a <code className="text-brand">.stconfig.json</code> or Postman
            Collection here
          </p>
          <p className="text-gray-600 text-xs mt-1">or click to browse</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.stconfig.json"
            className="hidden"
            aria-hidden="true"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) processFile(f);
            }}
          />
        </div>

        {error && (
          <p role="alert" className="text-red-400 text-sm mb-3">
            {error}
          </p>
        )}

        {preview.length > 0 && (
          <>
            <p className="text-xs text-gray-400 mb-2">
              Detected {preview.length} connection(s):
            </p>
            <ul className="space-y-1 mb-4 max-h-40 overflow-y-auto">
              {preview.map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    id={`import-item-${i}`}
                    checked={selected.has(i)}
                    onChange={(e) => toggleSelect(i, e.target.checked)}
                    className="rounded accent-brand"
                  />
                  <label
                    htmlFor={`import-item-${i}`}
                    className="flex-1 text-gray-200 cursor-pointer"
                  >
                    <span className="font-mono text-xs text-brand">{item.protocol}</span>
                    {' · '}
                    {item.name}
                  </label>
                </li>
              ))}
            </ul>
            <button
              onClick={handleImport}
              disabled={selected.size === 0}
              className="btn-primary w-full"
            >
              Import {selected.size} Connection{selected.size !== 1 ? 's' : ''}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
