import { useSettings } from './context/SettingsContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SettingsProvider } from './context/SettingsContext';
import { ChatProvider } from './context/ChatContext';
import { Sidebar } from './components/Sidebar';
import { ChatWindow } from './components/ChatWindow';
import { ChatInput } from './components/ChatInput';

function AppContent() {
  const { settings } = useSettings();
  const isDark = settings.theme === 'dark';

  return (
    <div className={`flex h-dvh md:h-screen overflow-hidden font-sans selection:bg-indigo-500/30 ${
      isDark ? 'bg-gray-950 text-gray-100' : 'bg-gray-50 text-gray-900'
    }`}>
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 relative overflow-hidden">
        <div className="flex-1 overflow-hidden">
          <ChatWindow />
        </div>
        <ChatInput />
      </main>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <SettingsProvider>
        <ChatProvider>
          <AppContent />
        </ChatProvider>
      </SettingsProvider>
    </ErrorBoundary>
  );
}

export default App;