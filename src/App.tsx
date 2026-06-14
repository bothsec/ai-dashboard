import { useState, useCallback, memo, useEffect } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthGate } from './components/AuthGate';
import { SettingsProvider } from './context/SettingsContext';
import { ChatProvider, useChat } from './context/ChatContext';
import { Sidebar } from './components/Sidebar';
import { ChatWindow } from './components/ChatWindow';
import { ChatInput } from './components/ChatInput';
import SketchCanvas from './components/SketchCanvas';

const AppInner = memo(function AppInner() {
  const [showSketch, setShowSketch] = useState(false);
  const { sendMessage, isStreaming, cancelStream, createNewChat } = useChat();

  // Listen for sketch:toggle from Sidebar button
  useEffect(() => {
    const handler = () => setShowSketch(prev => !prev);
    window.addEventListener('sketch:toggle', handler);
    return () => window.removeEventListener('sketch:toggle', handler);
  }, []);

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
      // Escape — cancel streaming or close sketch
      if (e.key === 'Escape') {
        if (isStreaming) {
          cancelStream();
        } else if (showSketch) {
          setShowSketch(false);
        } else {
          window.dispatchEvent(new CustomEvent('pe:close'));
        }
        return;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isStreaming, cancelStream, showSketch, createNewChat]);

  const handleAskAI = useCallback((sketchDataUrl: string) => {
    const prompt =
      'Here is a sketch. Please describe what it shows, and offer any helpful suggestions about it.\n\n' +
      `![sketch](${sketchDataUrl})`;
    sendMessage(prompt);
  }, [sendMessage]);

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

        {/* Drawing Canvas — shown when sketch mode is active */}
        {showSketch && (
          <div className="shrink-0 px-3 md:px-6 lg:px-12 py-2">
            <div className="max-w-3xl lg:max-w-2xl mx-auto">
              <SketchCanvas onAskAI={handleAskAI} disabled={isStreaming} />
            </div>
          </div>
        )}

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