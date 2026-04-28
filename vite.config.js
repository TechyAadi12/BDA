import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

function buildCopilotReply(message, leads) {
  const normalized = (message || "").toLowerCase();
  const safeLeads = Array.isArray(leads) ? leads : [];

  if (safeLeads.length === 0) {
    return "No lead data found. Please add leads in /public/data/leads.json or through the Add New Lead form.";
  }

  const stageOrder = { New: 0, Contacted: 1, Qualified: 2, Closed: 3 };
  const activeDeals = safeLeads.filter((lead) => lead.stage !== "Closed");
  const sortedByValue = [...activeDeals].sort((a, b) => (b.value || 0) - (a.value || 0));
  const topDeals = sortedByValue.slice(0, 3);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcoming = safeLeads
    .map((lead) => {
      const due = new Date(lead.followUpDate);
      due.setHours(0, 0, 0, 0);
      const dueInDays = Math.round((due.getTime() - today.getTime()) / 86400000);
      return { ...lead, dueInDays };
    })
    .sort((a, b) => a.dueInDays - b.dueInDays);

  const stageCount = safeLeads.reduce((acc, lead) => {
    const key = lead.stage || "Unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const pipelineValue = safeLeads.reduce((sum, lead) => sum + (lead.value || 0), 0);
  const closedValue = safeLeads
    .filter((lead) => lead.stage === "Closed")
    .reduce((sum, lead) => sum + (lead.value || 0), 0);
  const qualifiedValue = safeLeads
    .filter((lead) => lead.stage === "Qualified")
    .reduce((sum, lead) => sum + (lead.value || 0), 0);

  if (normalized.includes("what should i do today") || normalized.includes("today")) {
    const urgent = upcoming.filter((lead) => lead.dueInDays <= 1).slice(0, 3);
    if (urgent.length === 0) {
      return "You are in a good spot today. Priority: advance 2 high-value Contacted deals to Qualified and draft 1 proactive follow-up for a New lead.";
    }
    const actionLines = urgent.map((lead) => {
      const timing =
        lead.dueInDays < 0
          ? `${Math.abs(lead.dueInDays)} day(s) overdue`
          : lead.dueInDays === 0
            ? "due today"
            : "due tomorrow";
      return `- Follow up ${lead.contact} at ${lead.company} (${timing}, ${formatCurrency(lead.value)})`;
    });
    return `Top actions for today:\n${actionLines.join("\n")}`;
  }

  if (normalized.includes("most likely to close") || normalized.includes("likely to close")) {
    const likely = [...safeLeads]
      .filter((lead) => lead.stage === "Qualified" || lead.stage === "Contacted")
      .sort((a, b) => {
        const byStage = (stageOrder[b.stage] || 0) - (stageOrder[a.stage] || 0);
        if (byStage !== 0) return byStage;
        return (b.value || 0) - (a.value || 0);
      })
      .slice(0, 3);

    if (likely.length === 0) {
      return "No Contacted or Qualified deals right now. Move New deals forward to improve close probability.";
    }

    return `Most likely to close next:\n${likely
      .map((lead) => `- ${lead.company} (${lead.stage}, ${formatCurrency(lead.value)})`)
      .join("\n")}`;
  }

  if (normalized.includes("pipeline insights") || normalized.includes("pipeline")) {
    return `Pipeline snapshot:
- Total pipeline: ${formatCurrency(pipelineValue)}
- Closed value: ${formatCurrency(closedValue)}
- Qualified value: ${formatCurrency(qualifiedValue)}
- Stage mix: New ${stageCount.New || 0}, Contacted ${stageCount.Contacted || 0}, Qualified ${stageCount.Qualified || 0}, Closed ${stageCount.Closed || 0}
Recommendation: Focus on converting top Qualified deals first, then clear overdue follow-ups to reduce slippage.`;
  }

  if (normalized.includes("follow-up email") || normalized.includes("write a follow-up")) {
    const bestDeal = topDeals[0] || safeLeads[0];
    return `Subject: Quick follow-up on next steps

Hi ${bestDeal.contact},

Great connecting with you about ${bestDeal.company}. I wanted to follow up and see if you had any questions as you evaluate next steps.

If helpful, I can send a concise rollout plan and timeline tailored to your team.

Would you be open to a 20-minute call this week?

Best,
Sales Team`;
  }

  return `I reviewed ${safeLeads.length} leads with ${formatCurrency(pipelineValue)} in pipeline value. Ask me for:
- what to do today
- likely-to-close deals
- pipeline insights
- a follow-up email draft`;
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: "copilot-api",
      configureServer(server) {
        server.middlewares.use("/api/copilot", (req, res) => {
          if (req.method !== "POST") {
            res.statusCode = 405;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "Method Not Allowed" }));
            return;
          }

          let body = "";
          req.on("data", (chunk) => {
            body += chunk;
          });

          req.on("end", () => {
            try {
              const payload = body ? JSON.parse(body) : {};
              const reply = buildCopilotReply(payload.message, payload.leads);
              res.statusCode = 200;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ reply }));
            } catch (error) {
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ reply: "Copilot temporarily unavailable." }));
            }
          });
        });
      },
    },
  ],
});
