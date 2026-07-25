# AI-Powered Academic Deadline & Syllabus Assistant
## Executive Project Overview & Technical Brief for Evaluation

---

### 1. Project Overview & Objective
Students frequently miss academic deadlines because course announcements are scattered across multiple platforms—emails, Microsoft Teams, and group messaging apps. 

This project is an **AI-driven Autonomous Ingestion Agent** that:
1. **Monitors and parses incoming communication** from university emails (Gmail IMAP) and Microsoft Teams channels.
2. **Extracts structured deadline data** (Course, Title, Description, Due Date/Time, Urgency Level) using **Google Gemini AI**.
3. **Synchronizes directly with Google Calendar** using OAuth2 API integration with dynamic urgency color-coding.
4. **Provides a Modern Web Dashboard** built with React to view, filter, track, and export academic schedules.

---

### 2. AI Model Details
* **Model Used**: **Google Gemini 2.5 Flash** (`gemini-2.5-flash` via `@google/generative-ai` SDK).
* **Role in System**: 
  - **Structured Entity Extraction**: Converts raw, unstructured text (e.g., casual professor emails, chat announcements, syllabi) into strict JSON schema arrays without manual regex rules.
  - **Temporal Reasoning**: Interprets relative time references (e.g., *"due next Wednesday before midnight"* or *"submissions close in 3 days"*) into standardized ISO timestamp format (`YYYY-MM-THH:mm`).
  - **Urgency Classification**: Categorizes deadlines into **High** (Exams/Major Projects), **Medium** (Quizzes/Briefings), and **Low** (Webinars/Optional tasks) based on content context.

---

### 3. Core Architecture & System Workflow

```
[ Gmail IMAP / MS Teams ] ──> [ Node.js Polling Engines ] ──> [ Gemini 2.5 Flash AI ]
                                                                        │ (Structured JSON)
                                                                        ▼
[ Google Calendar API ] <── [ Live OAuth2 Sync Engine ] <── [ Local Data Store ]
        │                                                               │
        ▼                                                               ▼
[ Auto Color-Coded Events ]                                 [ React + Vite Dashboard ]
```

---

### 4. Key Files & Repository Map

| File Path | Description & Role |
| :--- | :--- |
| **`email_poller.js`** | **Automated Email Engine**: Connects to Gmail via `imapflow`, fetches latest incoming emails (tracked via internal message IDs in `.processed_ids.json`), sends body text to Gemini 2.5 Flash, extracts deadlines, and auto-pushes them to Google Calendar. |
| **`teams_poller.js`** | **MS Teams Engine**: Uses Microsoft Graph API to poll channel announcements and process them via Gemini. |
| **`sync_all_deadlines_to_google_calendar.js`** | **Google Calendar Sync Script**: Bulk upserts parsed deadlines into Google Calendar using OAuth2 credentials. Assigns `colorId` by urgency (Red = High, Yellow = Medium, Green = Low). |
| **`deduplicate_google_calendar.js`** | **Calendar Cleanup Tool**: Connects to Google Calendar API to scan, identify, and delete duplicate calendar entries (e.g., manual `.ics` imports vs live API events). |
| **`get_google_token.js`** | **OAuth2 Authentication Helper**: Handles Google OAuth2 flow to generate and refresh access tokens for Google Calendar API. |
| **`src/App.jsx`** | **Frontend Application**: Main React 19 single-page dashboard featuring academic metrics, urgency distribution, interactive deadline filters, log viewer, and manual parsing console. |
| **`src/geminiService.js`** | **Client-side Gemini Service**: Allows manual parsing of user-pasted text directly inside the web UI using Gemini AI. |
| **`public/auto_parsed_deadlines.json`** | **Central Data Store**: Persists extracted deadlines and ingestion logs for the React frontend and poller scripts. |
| **`.env`** | **Environment Credentials**: Stores API keys safely (Gemini API key, IMAP credentials, MS Teams tokens, Google OAuth2 client IDs). |

---

### 5. Summary Highlights for Presentation to Professor
1. **End-to-End Automation**: From unread inbox email to live color-coded Google Calendar notification without human manual entry.
2. **Robust Deduplication**: Uses private metadata keys (`syllabusAgentKey`) to prevent double-booking or duplicate calendar creation.
3. **Structured AI Output**: Uses Gemini's `responseMimeType: "application/json"` parameter to enforce zero-error JSON schema responses.
4. **Multi-Source Ready**: Extensible architecture supporting Gmail IMAP, MS Teams Graph API, and manual text copy-pasting.
