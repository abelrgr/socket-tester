import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import { NavBar } from './components/layout/NavBar';
import { TesterPage } from './components/pages/TesterPage';
import { DocsPage } from './components/pages/DocsPage';
import { SharedConfigPage } from './components/pages/SharedConfigPage';
import { NotificationSystem } from './components/shared/NotificationSystem';
import { CommandPalette } from './components/layout/CommandPalette';
import { Footer } from './components/layout/Footer';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

function AppShell() {
  useKeyboardShortcuts();

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-surface-primary text-gray-100">
      <NavBar />
      <div className="flex flex-1 overflow-hidden">
        <Routes>
          <Route path="/" element={<TesterPage />} />
          <Route path="/docs" element={<DocsPage />} />
          <Route path="/share/:token" element={<SharedConfigPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <NotificationSystem />
      <CommandPalette />
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </ErrorBoundary>
  );
}
