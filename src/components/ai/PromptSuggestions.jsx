const SUGGESTIONS = [
  "What should I do today?",
  "Which deals are most likely to close?",
  "Give pipeline insights",
  "Write a follow-up email",
];

export default function PromptSuggestions({ onSelect, loading }) {
  return (
    <div className="copilot-suggestions">
      {SUGGESTIONS.map((prompt) => (
        <button
          key={prompt}
          type="button"
          className="copilot-prompt-btn"
          disabled={loading}
          onClick={() => onSelect(prompt)}
        >
          {prompt}
        </button>
      ))}
    </div>
  );
}
