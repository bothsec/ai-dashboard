import { useState, useCallback, memo, useEffect } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthGate } from './components/AuthGate';
import { SettingsProvider } from './context/SettingsContext';
import { ChatProvider, useChat } from './context/ChatContext';
import { Sidebar } from './components/Sidebar';
import { ChatWindow } from './components/ChatWindow';
import { ChatInput } from './components/ChatInput';
import { ShortcutsModal } from './components/ShortcutsModal';

const AppInner = memo(function AppInner() {
  const { isStreaming, cancelStream, createNewChat } = useChat();
  const [showShortcuts, setShowShortcuts] = useState(false);

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
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isStreaming, cancelStream, createNewChat, setShowShortcuts]);

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
  const handleReset = useCallback(() => setErrorBoundaryKey(k => k + 1), []);

  return (
    <AuthGate>
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
    </AuthGate>
  );
});

export default App;