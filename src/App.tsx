import { SettingsProvider } from './context/SettingsContext';
import { ChatProvider } from './context/ChatContext';
import { Sidebar } from './components/Sidebar';
import { ChatWindow } from './components/ChatWindow';
import { ChatInput } from './components/ChatInput';

function App() {
  return (
    <SettingsProvider>
      <ChatProvider>
        <div className="flex h-screen bg-gray-950 text-gray-100 overflow-hidden font-sans selection:bg-indigo-500/30">
          <Sidebar />
          <main className="flex-1 flex flex-col min-w-0 relative">
            <ChatWindow />
            <ChatInput />
          </main>
        </div>
      </ChatProvider>
    </SettingsProvider>
  );
}

export default App;
