import { useChat } from './hooks/useChat';
import ChatWindow from './components/ChatWindow';

export default function App() {
  const {
    messages,
    isLoading,
    error,
    persona,
    setPersona,
    sendMessage,
    retryLastMessage,
    dismissError,
    clearConversation,
    loadSampleConversation,
    exportTranscript,
  } = useChat();

  return (
    <ChatWindow
      messages={messages}
      isLoading={isLoading}
      error={error}
      persona={persona}
      onSelectPersona={setPersona}
      onSendMessage={sendMessage}
      onRetry={retryLastMessage}
      onDismissError={dismissError}
      onClearConversation={clearConversation}
      onLoadSample={loadSampleConversation}
      onExportTranscript={exportTranscript}
    />
  );
}
