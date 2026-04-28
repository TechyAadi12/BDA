import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import CopilotButton from "./components/ai/CopilotButton";
import CopilotDrawer from "./components/ai/CopilotDrawer";

const STAGES = ["New", "Contacted", "Qualified", "Closed"];

const monthlyRevenue = [
  { month: "Jan", amount: 34000 },
  { month: "Feb", amount: 47000 },
  { month: "Mar", amount: 59000 },
  { month: "Apr", amount: 73000 },
];

function currency(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function daysUntil(dateString) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateString);
  due.setHours(0, 0, 0, 0);
  const diff = due.getTime() - today.getTime();
  return Math.round(diff / 86400000);
}

function timeStamp() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function App() {
  const [leads, setLeads] = useState([]);
  const [form, setForm] = useState({
    company: "",
    contact: "",
    email: "",
    segment: "SMB",
    value: "",
    followUpDate: "",
  });
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "ai",
      text: "I can help you prioritize follow-ups, analyze pipeline health, and draft outreach.",
      timestamp: timeStamp(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messageContainerRef = useRef(null);

  useEffect(() => {
    async function loadLeads() {
      try {
        const response = await fetch("/data/leads.json");
        if (!response.ok) {
          throw new Error("Failed to load local leads data");
        }
        const data = await response.json();
        setLeads(data);
      } catch (error) {
        setMessages((prev) => [
          ...prev,
          {
            role: "ai",
            text: "I could not load local lead data. Please verify /data/leads.json.",
            timestamp: timeStamp(),
          },
        ]);
      }
    }

    loadLeads();
  }, []);

  useEffect(() => {
    if (!copilotOpen || !messageContainerRef.current) {
      return;
    }
    messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
  }, [messages, loading, copilotOpen]);

  const totals = useMemo(() => {
    const byStage = STAGES.reduce((acc, stage) => {
      acc[stage] = leads.filter((lead) => lead.stage === stage);
      return acc;
    }, {});

    const closedRevenue = byStage.Closed.reduce((sum, lead) => sum + lead.value, 0);
    const qualifiedRevenue = byStage.Qualified.reduce((sum, lead) => sum + lead.value, 0);
    const pipelineValue = leads.reduce((sum, lead) => sum + lead.value, 0);

    return {
      byStage,
      closedRevenue,
      qualifiedRevenue,
      pipelineValue,
      conversionRate:
        leads.length > 0 ? Math.round((byStage.Closed.length / leads.length) * 100) : 0,
    };
  }, [leads]);

  const segmentData = useMemo(() => {
    const map = new Map();
    leads.forEach((lead) => {
      const row = map.get(lead.segment) ?? { count: 0, revenue: 0 };
      row.count += 1;
      row.revenue += lead.value;
      map.set(lead.segment, row);
    });
    return [...map.entries()].map(([segment, data]) => ({ segment, ...data }));
  }, [leads]);

  const reminders = useMemo(() => {
    return leads
      .map((lead) => ({ ...lead, dueIn: daysUntil(lead.followUpDate) }))
      .filter((lead) => lead.dueIn <= 7)
      .sort((a, b) => a.dueIn - b.dueIn);
  }, [leads]);

  function moveLead(leadId, nextStage) {
    setLeads((prev) =>
      prev.map((lead) => (lead.id === leadId ? { ...lead, stage: nextStage } : lead))
    );
  }

  function updateForm(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function addLead(event) {
    event.preventDefault();
    if (!form.company || !form.contact || !form.email || !form.value || !form.followUpDate) {
      return;
    }

    const newLead = {
      id: String(leads.length + 1),
      company: form.company,
      contact: form.contact,
      email: form.email,
      stage: "New",
      segment: form.segment,
      value: Number(form.value),
      followUpDate: form.followUpDate,
    };

    setLeads((prev) => [newLead, ...prev]);
    setForm({
      company: "",
      contact: "",
      email: "",
      segment: "SMB",
      value: "",
      followUpDate: "",
    });
  }

  async function sendMessage(outboundMessage) {
    const trimmed = outboundMessage.trim();
    if (!trimmed || loading) {
      return;
    }

    const userMessage = { role: "user", text: trimmed, timestamp: timeStamp() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          leads,
        }),
      });

      if (!response.ok) {
        throw new Error("Copilot API request failed");
      }

      const data = await response.json();
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: data.reply || "I analyzed your leads and can help with next actions.",
          timestamp: timeStamp(),
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: "I could not reach /api/copilot. Please make sure the backend endpoint is running.",
          timestamp: timeStamp(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const companyNames = useMemo(() => leads.map((lead) => lead.company), [leads]);
  const maxRevenue = Math.max(...monthlyRevenue.map((item) => item.amount), 1);
  const copilotLayer =
    typeof document !== "undefined"
      ? createPortal(
          <>
            <CopilotButton open={copilotOpen} onClick={() => setCopilotOpen((prev) => !prev)} />
            <CopilotDrawer
              open={copilotOpen}
              input={input}
              loading={loading}
              messages={messages}
              onInputChange={(event) => setInput(event.target.value)}
              onPromptSelect={sendMessage}
              onClose={() => setCopilotOpen(false)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  sendMessage(input);
                }
              }}
              onSend={() => sendMessage(input)}
              messagesRef={messageContainerRef}
              companies={companyNames}
            />
          </>,
          document.body
        )
      : null;

  return (
    <>
      <main className="app">
        <header className="topbar">
        <div>
          <p className="eyebrow">Sales Forge</p>
          <h1>Sales CRM Dashboard</h1>
          <p className="subtext">Track leads, revenue, segments, and follow-ups in one place.</p>
        </div>
      </header>

      <section className="metrics">
        <article className="metric-card">
          <p>Total Pipeline</p>
          <h2>{currency(totals.pipelineValue)}</h2>
        </article>
        <article className="metric-card">
          <p>Closed Revenue</p>
          <h2>{currency(totals.closedRevenue)}</h2>
        </article>
        <article className="metric-card">
          <p>Qualified Forecast</p>
          <h2>{currency(totals.qualifiedRevenue)}</h2>
        </article>
        <article className="metric-card">
          <p>Conversion Rate</p>
          <h2>{totals.conversionRate}%</h2>
        </article>
      </section>

      <section className="layout-grid">
        <article className="panel panel-wide">
          <div className="panel-title-row">
            <h3>Lead Tracking Pipeline</h3>
            <p>Move each lead through New -&gt; Contacted -&gt; Qualified -&gt; Closed</p>
          </div>
          <div className="pipeline">
            {STAGES.map((stage, stageIndex) => (
              <div className="pipeline-stage" key={stage}>
                <div className="stage-header">
                  <h4>{stage}</h4>
                  <span>{totals.byStage[stage].length}</span>
                </div>
                <div className="lead-list">
                  {totals.byStage[stage].map((lead) => (
                    <article className="lead-card" key={lead.id}>
                      <p className="lead-company">{lead.company}</p>
                      <p className="lead-contact">{lead.contact}</p>
                      <p className="lead-meta">{currency(lead.value)}</p>
                      <p className="lead-meta">{lead.segment}</p>
                      <p className="lead-meta">Follow-up: {lead.followUpDate}</p>
                      {stageIndex < STAGES.length - 1 && (
                        <button
                          onClick={() => moveLead(lead.id, STAGES[stageIndex + 1])}
                          className="btn btn-next"
                        >
                          Move to {STAGES[stageIndex + 1]}
                        </button>
                      )}
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-title-row">
            <h3>Revenue Tracking</h3>
            <p>Month-over-month closed deal trend</p>
          </div>
          <div className="bars">
            {monthlyRevenue.map((item) => (
              <div className="bar-wrap" key={item.month}>
                <div
                  className="bar"
                  style={{ height: `${Math.round((item.amount / maxRevenue) * 100)}%` }}
                />
                <p className="bar-label">{item.month}</p>
                <p className="bar-value">{currency(item.amount)}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-title-row">
            <h3>Customer Segmentation</h3>
            <p>Segment size and value contribution</p>
          </div>
          <div className="segment-table">
            <div className="segment-row segment-head">
              <span>Segment</span>
              <span>Leads</span>
              <span>Revenue</span>
            </div>
            {segmentData.map((item) => (
              <div className="segment-row" key={item.segment}>
                <span>{item.segment}</span>
                <span>{item.count}</span>
                <span>{currency(item.revenue)}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-title-row">
            <h3>Follow-up Reminders</h3>
            <p>Overdue and upcoming follow-ups (next 7 days)</p>
          </div>
          <div className="reminder-list">
            {reminders.length === 0 && <p className="muted">No upcoming reminders.</p>}
            {reminders.map((lead) => (
              <div className="reminder-item" key={lead.id}>
                <div>
                  <p className="lead-company">{lead.company}</p>
                  <p className="lead-contact">{lead.contact}</p>
                </div>
                <span className={`badge ${lead.dueIn < 0 ? "badge-alert" : "badge-ok"}`}>
                  {lead.dueIn < 0
                    ? `${Math.abs(lead.dueIn)} day(s) overdue`
                    : lead.dueIn === 0
                    ? "Due today"
                    : `Due in ${lead.dueIn} day(s)`}
                </span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="panel">
        <div className="panel-title-row">
          <h3>Add New Lead</h3>
          <p>Quickly add incoming opportunities to the pipeline</p>
        </div>
        <form className="lead-form" onSubmit={addLead}>
          <input
            name="company"
            value={form.company}
            onChange={updateForm}
            placeholder="Company name"
            required
          />
          <input
            name="contact"
            value={form.contact}
            onChange={updateForm}
            placeholder="Contact person"
            required
          />
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={updateForm}
            placeholder="Work email"
            required
          />
          <select name="segment" value={form.segment} onChange={updateForm}>
            <option>SMB</option>
            <option>Mid-Market</option>
            <option>Enterprise</option>
            <option>Startup</option>
          </select>
          <input
            type="number"
            name="value"
            value={form.value}
            onChange={updateForm}
            min="0"
            placeholder="Potential deal value"
            required
          />
          <input
            type="date"
            name="followUpDate"
            value={form.followUpDate}
            onChange={updateForm}
            required
          />
          <button className="btn btn-primary" type="submit">
            Add Lead
          </button>
        </form>
      </section>

      </main>
      {copilotLayer}
    </>
  );
}

