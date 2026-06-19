import { useState, useCallback, memo, useEffect } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SettingsProvider } from './context/SettingsContext';
import { ChatProvider, useChat } from './context/ChatContext';
import { Sidebar } from './components/Sidebar';
import { ChatWindow } from './components/ChatWindow';
import { ChatInput } from './components/ChatInput';
import { ShortcutsModal } from './components/ShortcutsModal';
import { ResumeBuilder } from './components/ResumeBuilder';
import { AdminDashboard } from './components/AdminDashboard';
import { InterviewPrep } from './components/InterviewPrep';
import { KhmerCalendarConverter } from './components/KhmerCalendarConverter';
import { MiniMode } from './components/MiniMode';

const AppInner = memo(function AppInner() {
  const { isStreaming, cancelStream, createNewChat, sendMessage } = useChat();
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showResumeBuilder, setShowResumeBuilder] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [showInterviewPrep, setShowInterviewPrep] = useState(false);
  const [showKhmerCalendarConverter, setShowKhmerCalendarConverter] = useState(false);
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
          window.dispatchEvent(new CustomEvent('pe:close'));
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