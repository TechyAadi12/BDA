# Sales CRM Dashboard with AI Copilot

A futuristic dark-themed Sales CRM Dashboard built with React + Vite, extended with an AI Copilot assistant for sales guidance, pipeline insights, and outreach drafting.

## Features

- Revenue tracking cards and monthly trend visualization
- Customer segmentation table (lead count + revenue by segment)
- Follow-up reminders with overdue/due-soon status badges
- Lead pipeline management:
- `New -> Contacted -> Qualified -> Closed`
- In-column lead cards with one-click stage progression
- Add New Lead form for quick pipeline updates
- AI Copilot chat assistant:
- Floating fixed toggle button (`✨`) at bottom-right
- Right-side sliding drawer (full-height)
- Suggested prompts for common sales tasks
- Chat input with Enter-to-send and send button validation
- Typing indicator and auto-scroll behavior
- Company-name highlighting in AI responses
- Message timestamps

## Tech Stack

- React 18
- Vite 5
- CSS (existing futuristic neon UI design)
- Local JSON data source (`public/data/leads.json`)

## Project Structure

```txt
src/
  App.jsx
  styles.css
  components/
    ai/
      CopilotButton.jsx
      CopilotDrawer.jsx
      ChatMessage.jsx
      PromptSuggestions.jsx
public/
  data/
    leads.json
vite.config.js
```

## Core Functionalities

1. Lead Data Loading
- On app load, leads are fetched from `GET /data/leads.json`.
- This data powers pipeline, segmentation, reminders, and AI context.

2. Pipeline and Metrics
- Pipeline value, closed revenue, qualified forecast, and conversion rate are computed from leads state.
- Stage columns render live counts and lead cards.

3. Add New Lead
- Form validates required fields.
- New leads are inserted into local React state with stage defaulted to `New`.

4. Follow-up Logic
- Reminder list computes `dueIn` days from `followUpDate`.
- Shows overdue, due today, and upcoming items.

5. AI Copilot UX
- Chat toggle and drawer are rendered via React portal to `document.body`.
- This keeps the assistant fixed and unaffected by dashboard scroll/layout transforms.
- Smooth drawer open/close animation with overlay.

## AI Integration

The dashboard includes a built-in AI Copilot request flow:

- Frontend sends `POST /api/copilot`
- Request body:

```json
{
  "message": "user input",
  "leads": []
}
```

- Response body:

```json
{
  "reply": "AI response"
}
```

### Chat Behavior

- User message is appended instantly.
- Loading state shows typing indicator.
- AI reply is appended when API returns.
- Message list auto-scrolls to the latest entry.
- Suggested prompt click auto-sends prompt text.

## API Endpoints

### 1) Leads JSON (static)
- Method: `GET`
- Path: `/data/leads.json`
- Source: `public/data/leads.json`
- Purpose: local lead datastore for dashboard and AI context.

### 2) Copilot API (Vite middleware)
- Method: `POST`
- Path: `/api/copilot`
- Implemented in: `vite.config.js`
- Purpose: returns contextual sales guidance from lead data.

### Sample cURL

```bash
curl -X POST http://localhost:5173/api/copilot \
  -H "Content-Type: application/json" \
  -d "{\"message\":\"Give pipeline insights\",\"leads\":[{\"company\":\"BrightPath Health\",\"stage\":\"Qualified\",\"value\":88000}]}"
```

## Setup and Run

1. Install dependencies

```bash
npm install
```

2. Start development server

```bash
npm run dev
```

3. Build for production

```bash
npm run build
```

4. Preview production build

```bash
npm run preview
```

## Notes

- No Redux is used; state is managed with React hooks.
- No MongoDB is required; local JSON is the primary data source.
- Current `/api/copilot` is a local middleware implementation for immediate functionality and can be replaced with an external AI backend later without changing chat UI contracts.
