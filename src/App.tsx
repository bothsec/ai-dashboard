import { useState, useCallback, memo, useEffect } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthGate } from './components/AuthGate';
import { SettingsProvider } from './context/SettingsContext';
import { ChatProvider, useChat } from './context/ChatContext';
import { Sidebar } from './components/Sidebar';
import { ChatWindow } from './components/ChatWindow';
import { ChatInput } from './components/ChatInput';
import { ShortcutsModal } from './components/ShortcutsModal';
import { MiniMode } from './components/MiniMode';
import AdminDashboard from './components/AdminDashboard';
import { AuthContext } from './context/AuthContext';

const AppInner = memo(function AppInner({ isAdmin }: { isAdmin: boolean }) {
  const { isStreaming, cancelStream, createNewChat } = useChat();
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [miniMode, setMiniMode] = useState(() => {
    try { return localStorage.getItem('mini_mode_active') === 'true'; } catch { return false; }
  });
  const [isAdminView, setIsAdminView] = useState(() => window.location.pathname === '/admin');

  // Global keyboard shortcuts — must stay before any conditional return
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey;
      if (isMod && e.key === 'n') {
        e.preventDefault();
        createNewChat();
        return;
      }
      if (e.key === 'Escape') {
        if (isStreaming) {
          cancelStream();
        } else {
          window.dispatchEvent(new CustomEvent('pe:close'));
        }
        return;
      }
      if (e.key === '?' && !isStreaming) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag !== 'TEXTAREA' && tag !== 'INPUT') {
          setShowShortcuts(prev => !prev);
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
        e.preventDefault();
        setMiniMode(prev => !prev);
        return;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isStreaming, cancelStream, createNewChat]);

  // Mini mode — blur focused element
  useEffect(() => {
    if (miniMode) {
      (document.activeElement as HTMLElement)?.blur?.();
    }
  }, [miniMode]);

  // Listen for chat:mini-mode event
  useEffect(() => {
    const handler = () => setMiniMode(prev => !prev);
    window.addEventListener('chat:mini-mode', handler);
    return () => window.removeEventListener('chat:mini-mode', handler);
  }, []);

  useEffect(() => {
    try { localStorage.setItem('mini_mode_active', String(miniMode)); } catch { /* ignore */ }
  }, [miniMode]);

  useEffect(() => {
    const onPop = () => setIsAdminView(window.location.pathname === '/admin');
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Admin route guard — after all hooks
  if (isAdminView) {
    if (!isAdmin) return <div className="h-full flex items-center justify-center text-gray-400">Access denied — admin only</div>;
    return <AdminDashboard />;
  }

  if (miniMode) {
    return <MiniMode onExit={() => setMiniMode(false)} />;
  }

  return (
    <div className="flex h-dvh md:h-screen overflow-hidden font-sans selection:bg-indigo-500/30">
      <ErrorBoundary
        fallback={
          <div className="w-80 h-screen flex items-center justify-center bg-gray-900 text-gray-400">
            Sidebar error
          </div>
        }
      >
        <Sidebar />
      </ErrorBoundary>
      <main className="flex-1 flex flex-col min-w-0 relative overflow-hidden">
        <div className="flex-1 overflow-hidden">
          <ChatWindow />
        </div>

        <ErrorBoundary
          fallback={
            <div className="shrink-0 px-3 md:px-6 lg:px-12 py-2 md:py-3 lg:py-4 bg-white/50">
              <div className="max-w-3xl lg:max-w-2xl mx-auto h-12 bg-gray-100 rounded-full animate-pulse" />
            </div>
          }
        >
          <ChatInput />
        </ErrorBoundary>
      </main>
      {showShortcuts && (
        <ShortcutsModal onClose={() => setShowShortcuts(false)} />
      )}
    </div>
  );
});

const App = memo(function App() {
  const [errorBoundaryKey, setErrorBoundaryKey] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const handleReset = useCallback(() => setErrorBoundaryKey(k => k + 1), []);

  // Fetch isAdmin on mount
  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.isAdmin) setIsAdmin(true); })
      .catch(() => {});
  }, []);

  return (
    <AuthContext.Provider value={{ isAdmin }}>
      <AuthGate>
        <ErrorBoundary
          key={errorBoundaryKey}
          onReset={handleReset}
        >
          <SettingsProvider>
            <ChatProvider>
              <AppInner isAdmin={isAdmin} />
            </ChatProvider>
          </SettingsProvider>
        </ErrorBoundary>
      </AuthGate>
    </AuthContext.Provider>
  );
});

export default App;