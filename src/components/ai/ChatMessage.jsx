function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightCompanies(text, companies) {
  if (!text || companies.length === 0) {
    return text;
  }

  const validCompanies = companies
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
    .map((company) => escapeRegex(company));

  if (validCompanies.length === 0) {
    return text;
  }

  const matcher = new RegExp(`(${validCompanies.join("|")})`, "gi");
  const parts = text.split(matcher);

  return parts.map((part, index) => {
    const isCompany = companies.some((company) => company.toLowerCase() === part.toLowerCase());
    if (!isCompany) {
      return <span key={`${part}-${index}`}>{part}</span>;
    }

    return (
      <mark className="copilot-company-highlight" key={`${part}-${index}`}>
        {part}
      </mark>
    );
  });
}

export default function ChatMessage({ role, text, timestamp, companies }) {
  const isUser = role === "user";

  return (
    <article className={`copilot-message ${isUser ? "copilot-user" : "copilot-ai"}`}>
      <p>{isUser ? text : highlightCompanies(text, companies)}</p>
      {timestamp && <span className="copilot-time">{timestamp}</span>}
    </article>
  );
}
