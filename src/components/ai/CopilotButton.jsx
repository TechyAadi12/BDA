export default function CopilotButton({ open, onClick }) {
  return (
    <button
      type="button"
      className="copilot-fab"
      onClick={onClick}
      aria-label={open ? "Close AI Copilot" : "Open AI Copilot"}
    >
      ✨
    </button>
  );
}
