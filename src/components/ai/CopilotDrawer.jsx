import ChatMessage from "./ChatMessage";
import PromptSuggestions from "./PromptSuggestions";

export default function CopilotDrawer({
  open,
  input,
  loading,
  messages,
  onInputChange,
  onPromptSelect,
  onClose,
  onKeyDown,
  onSend,
  messagesRef,
  companies,
}) {
  return (
    <>
      <div className={`copilot-overlay ${open ? "open" : ""}`} onClick={onClose} />
      <aside className={`copilot-drawer ${open ? "open" : ""}`}>
        <header className="copilot-header">
          <h3>AI Copilot</h3>
          <button type="button" className="copilot-close-btn" onClick={onClose} aria-label="Close">
            x
          </button>
        </header>

        <PromptSuggestions onSelect={onPromptSelect} loading={loading} />

        <div className="copilot-messages" ref={messagesRef}>
          {messages.map((message, idx) => (
            <ChatMessage
              key={`${message.role}-${idx}-${message.timestamp}`}
              role={message.role}
              text={message.text}
              timestamp={message.timestamp}
              companies={companies}
            />
          ))}
          {loading && (
            <article className="copilot-message copilot-ai">
              <p className="copilot-typing">
                AI is typing<span>.</span>
                <span>.</span>
                <span>.</span>
              </p>
            </article>
          )}
        </div>

        <div className="copilot-input-row">
          <input
            value={input}
            onChange={onInputChange}
            onKeyDown={onKeyDown}
            placeholder="Ask AI for CRM help..."
          />
          <button type="button" onClick={onSend} disabled={!input.trim() || loading}>
            Send
          </button>
        </div>
      </aside>
    </>
  );
}

