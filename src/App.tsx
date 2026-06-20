import { useState, useCallback, memo, useEffect, lazy, Suspense } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SettingsProvider } from './context/SettingsContext';
import { ChatProvider, useChat } from './context/ChatContext';
import { Sidebar } from './components/Sidebar';
import { ChatWindow } from './components/ChatWindow';
import { ChatInput } from './components/ChatInput';
import { ShortcutsModal } from './components/ShortcutsModal';

// Lazy-load heavy hidden-feature components to shrink the initial bundle.
// These are only rendered when the user triggers them, so we defer their
// (and their dependencies') JS until they're needed. Suspense fallback is
// `null` because these all open as overlays/over full app — no layout shift.
const ResumeBuilder = lazy(() =>
  import('./components/ResumeBuilder').then(m => ({ default: m.ResumeBuilder })),
);
const AdminDashboard = lazy(() =>
  import('./components/AdminDashboard').then(m => ({ default: m.AdminDashboard })),
);
const InterviewPrep = lazy(() =>
  import('./components/InterviewPrep').then(m => ({ default: m.InterviewPrep })),
);
const KhmerCalendarConverter = lazy(() =>
  import('./components/KhmerCalendarConverter').then(m => ({ default: m.KhmerCalendarConverter })),
);
const MiniMode = lazy(() =>
  import('./components/MiniMode').then(m => ({ default: m.MiniMode })),
);
const ToolsHomeModal = lazy(() =>
  import('./components/ToolsHomeModal').then(m => ({ default: m.ToolsHomeModal })),
);

const AppInner = memo(function AppInner() {
  const { isStreaming, cancelStream, createNewChat, sendMessage } = useChat();
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showResumeBuilder, setShowResumeBuilder] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [showInterviewPrep, setShowInterviewPrep] = useState(false);
  const [showKhmerCalendarConverter, setShowKhmerCalendarConverter] = useState(false);
  const [showToolsHome, setShowToolsHome] = useState(false);
  const [miniMode, setMiniMode] = useState(() => {
    try { return localStorage.getItem('mini_mode_active') === 'true'; } catch { return false; }
  });

  useEffect(() => {
    try { localStorage.setItem('mini_mode_active', String(miniMode)); } catch { /* ignore */ }
  }, [miniMode]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey;
      // Ctrl/Cmd+N — new chat
      if (isMod && e.key === 'n') {
        e.preventDefault();
        createNewChat();
        return;
      }
      // Escape — cancel streaming or close prompt engineer
      if (e.key === 'Escape') {
        if (isStreaming) {
          cancelStream();
        } else {
          // no-op: Escape with nothing to dismiss
        }
        return;
      }
      // ? — show shortcuts modal (only when not typing in an input)
      if (e.key === '?' && !isStreaming) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag !== 'TEXTAREA' && tag !== 'INPUT') {
          setShowShortcuts(prev => !prev);
        }
        return;
      }
      // Ctrl/Cmd+M — toggle mini mode
      if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
        e.preventDefault();
        setMiniMode(prev => !prev);
        return;
      }
      // Ctrl+Shift+K — Khmer calendar converter
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'K') {
        e.preventDefault();
        setShowKhmerCalendarConverter(prev => !prev);
        return;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isStreaming, cancelStream, createNewChat, setShowShortcuts, setMiniMode]);

  // When mini mode activates, blur any focused element so keyboard doesn't interfere
  useEffect(() => {
    if (miniMode) {
      (document.activeElement as HTMLElement)?.blur?.();
    }
  }, [miniMode]);

  // Listen for chat:mini-mode event from ChatWindow button
  useEffect(() => {
    const handler = () => setMiniMode(prev => !prev);
    window.addEventListener('chat:mini-mode', handler);
    return () => window.removeEventListener('chat:mini-mode', handler);
  }, []);

  // Listen for resume:open event from Sidebar button
  useEffect(() => {
    const handler = () => setShowResumeBuilder(true);
    window.addEventListener('resume:open', handler);
    return () => window.removeEventListener('resume:open', handler);
  }, []);

  // Admin is intentionally hidden from the normal user UI.
  // Open it directly at /admin, or via the internal admin:open event.
  useEffect(() => {
    const openAdmin = () => setShowAdminDashboard(true);
    if (window.location.pathname === '/admin') openAdmin();
    const handler = () => openAdmin();
    window.addEventListener('admin:open', handler);
    return () => window.removeEventListener('admin:open', handler);
  }, []);

  // Listen for interview:open event from Sidebar button
  useEffect(() => {
    const handler = () => setShowInterviewPrep(true);
    window.addEventListener('interview:open', handler);
    return () => window.removeEventListener('interview:open', handler);
  }, []);

  // Listen for khmer-calendar:open event from Sidebar button
  useEffect(() => {
    const handler = () => setShowKhmerCalendarConverter(true);
    window.addEventListener('khmer-calendar:open', handler);
    return () => window.removeEventListener('khmer-calendar:open', handler);
  }, []);

  // Listen for tools:open event from ChatWindow home screen button
  useEffect(() => {
    const handler = () => setShowToolsHome(true);
    window.addEventListener('tools:open', handler);
    return () => window.removeEventListener('tools:open', handler);
  }, []);

  const lazyFallback = null;

  if (miniMode) {
    return (
      <Suspense fallback={lazyFallback}>
        <MiniMode onExit={() => setMiniMode(false)} />
      </Suspense>
    );
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
      <Suspense fallback={lazyFallback}>
        {showShortcuts && (
          <ShortcutsModal onClose={() => setShowShortcuts(false)} />
        )}
        {showResumeBuilder && (
          <ResumeBuilder onClose={() => setShowResumeBuilder(false)} />
        )}
        {showAdminDashboard && (
          <AdminDashboard onClose={() => {
            setShowAdminDashboard(false);
            if (window.location.pathname === '/admin') window.history.pushState(null, '', '/');
          }} />
        )}
        {showInterviewPrep && (
          <InterviewPrep
            onClose={() => setShowInterviewPrep(false)}
            onAskAI={(prompt) => { sendMessage(prompt); setShowInterviewPrep(false); }}
          />
        )}
        {showKhmerCalendarConverter && (
          <KhmerCalendarConverter onClose={() => setShowKhmerCalendarConverter(false)} />
        )}
        {showToolsHome && (
          <ToolsHomeModal onClose={() => setShowToolsHome(false)} />
        )}
      </Suspense>
    </div>
  );
});

const App = memo(function App() {
  const [errorBoundaryKey, setErrorBoundaryKey] = useState(0);
  const handleReset = useCallback(() => setErrorBoundaryKey(k => k + 1), []);

  return (
    <ErrorBoundary
      key={errorBoundaryKey}
      onReset={handleReset}
    >
      <SettingsProvider>
        <ChatProvider>
          <AppInner />
        </ChatProvider>
      </SettingsProvider>
    </ErrorBoundary>
  );
});

export default App;