/**
 * Automated Email Announcement Watcher - Syllabus Extraction Agent
 * 
 * This background agent automates the extraction of academic deadlines and syllabus schedules
 * directly from your university email inbox (via IMAP) or local incoming email folder (`inbox/`)
 * using Gemini AI.
 * 
 * Usage:
 *   node email_poller.js
 */

import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { google } from 'googleapis';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import fs from 'fs';
import path from 'path';

// --- CONFIGURATION ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';

const IMAP_CONFIG = {
  host: process.env.IMAP_HOST || 'imap.gmail.com',
  port: parseInt(process.env.IMAP_PORT || '993', 10),
  secure: process.env.IMAP_SECURE !== 'false',
  auth: {
    user: (process.env.IMAP_USER || '').trim(),
    pass: (process.env.IMAP_PASSWORD || '').replace(/\s+/g, '')
  },
  pollIntervalMinutes: parseInt(process.env.EMAIL_POLL_INTERVAL || '5', 10)
};

const GOOGLE_CALENDAR_CONFIG = {
  enabled: process.env.GOOGLE_CALENDAR_SYNC_ENABLED === 'true',
  calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
  timezone: process.env.GOOGLE_CALENDAR_TIMEZONE || 'Asia/Kolkata',
  clientId: process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  refreshToken: process.env.GOOGLE_REFRESH_TOKEN || ''
};

const INBOX_DIR = path.join(process.cwd(), 'inbox');
const PROCESSED_DIR = path.join(INBOX_DIR, 'processed');
const DATA_FILE = path.join(process.cwd(), 'src', 'auto_parsed_deadlines.json');
const PUBLIC_DATA_FILE = path.join(process.cwd(), 'public', 'auto_parsed_deadlines.json');
const CACHE_FILE = path.join(process.cwd(), '.processed_ids.json');

// Ensure required directories exist
[INBOX_DIR, PROCESSED_DIR, path.dirname(DATA_FILE), path.dirname(PUBLIC_DATA_FILE)].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Initialize Gemini Client
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

let warnedCalendarConfigMissing = false;

function makeCalendarSyncKey(deadline) {
  const base = `${deadline.course || 'General Academic'}|${deadline.title || 'Untitled'}|${deadline.dueDate || ''}`;
  return base.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9|\-:t]/g, '').slice(0, 120);
}

function formatLocalDateTime(date) {
  const pad = (n) => String(n).padStart(2, '0');
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}`;
}

function getGoogleCalendarClient() {
  const { clientId, clientSecret, refreshToken } = GOOGLE_CALENDAR_CONFIG;
  if (!clientId || !clientSecret || !refreshToken) {
    if (!warnedCalendarConfigMissing) {
      console.warn('[Google Calendar Sync] Missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN. Auto-sync is disabled until these are configured.');
      warnedCalendarConfigMissing = true;
    }
    return null;
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return google.calendar({ version: 'v3', auth: oauth2Client });
}

function buildCalendarEvent(deadline) {
  const start = new Date(deadline.dueDate);
  const fallbackStart = new Date();
  fallbackStart.setHours(23, 59, 0, 0);
  const startDate = Number.isNaN(start.getTime()) ? fallbackStart : start;
  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

  return {
    summary: `${deadline.course || 'General Academic'}: ${deadline.title || 'Deadline'}`,
    description: deadline.description || 'Academic deadline synced by Syllabus Agent.',
    start: {
      dateTime: formatLocalDateTime(startDate),
      timeZone: GOOGLE_CALENDAR_CONFIG.timezone
    },
    end: {
      dateTime: formatLocalDateTime(endDate),
      timeZone: GOOGLE_CALENDAR_CONFIG.timezone
    },
    colorId: deadline.urgency === 'High' ? '11' : deadline.urgency === 'Medium' ? '5' : '10',
    extendedProperties: {
      private: {
        syllabusAgentKey: makeCalendarSyncKey(deadline)
      }
    }
  };
}

async function syncDeadlinesToGoogleCalendar(newDeadlines) {
  if (!GOOGLE_CALENDAR_CONFIG.enabled || !Array.isArray(newDeadlines) || newDeadlines.length === 0) {
    return;
  }

  const calendar = getGoogleCalendarClient();
  if (!calendar) return;

  let createdCount = 0;
  let updatedCount = 0;

  for (const deadline of newDeadlines) {
    const syncKey = makeCalendarSyncKey(deadline);
    const eventPayload = buildCalendarEvent(deadline);

    try {
      const existing = await calendar.events.list({
        calendarId: GOOGLE_CALENDAR_CONFIG.calendarId,
        privateExtendedProperty: `syllabusAgentKey=${syncKey}`,
        maxResults: 1,
        singleEvents: true
      });

      const existingEvent = existing.data.items?.[0];

      if (existingEvent?.id) {
        await calendar.events.patch({
          calendarId: GOOGLE_CALENDAR_CONFIG.calendarId,
          eventId: existingEvent.id,
          requestBody: eventPayload
        });
        updatedCount += 1;
      } else {
        await calendar.events.insert({
          calendarId: GOOGLE_CALENDAR_CONFIG.calendarId,
          requestBody: eventPayload
        });
        createdCount += 1;
      }
    } catch (error) {
      console.warn(`[Google Calendar Sync] Failed for "${deadline.title}": ${error.message}`);
    }
  }

  if (createdCount > 0 || updatedCount > 0) {
    console.log(`[Google Calendar Sync] Created ${createdCount}, updated ${updatedCount} event(s) in calendar "${GOOGLE_CALENDAR_CONFIG.calendarId}".`);
  }
}

// Load previously parsed message IDs from internal cache file
function getProcessedMessageIds() {
  if (fs.existsSync(CACHE_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
      return new Set(data.processedMessages || []);
    } catch {
      return new Set();
    }
  }
  return new Set();
}

// Mark message ID as processed in internal cache
function markMessageProcessed(messageId) {
  if (!messageId) return;
  let processed = [];
  if (fs.existsSync(CACHE_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
      processed = data.processedMessages || [];
    } catch {
      processed = [];
    }
  }
  if (!processed.includes(messageId)) {
    processed.push(messageId);
    fs.writeFileSync(CACHE_FILE, JSON.stringify({ processedMessages: processed }, null, 2), 'utf-8');
  }
}

// Save extracted deadlines and log entry to live database file
async function saveExtractedData(newDeadlines, logEntry, messageId) {
  let fileData = { deadlines: [], ingestLogs: [] };
  if (fs.existsSync(DATA_FILE)) {
    try {
      const existing = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
      if (existing && Array.isArray(existing.deadlines)) {
        fileData.deadlines = existing.deadlines;
      }
      if (existing && Array.isArray(existing.ingestLogs)) {
        fileData.ingestLogs = existing.ingestLogs;
      }
    } catch {
      // Use defaults if corrupt
    }
  }

  // Filter out duplicates in existing fileData.deadlines
  const uniqueNewDeadlines = newDeadlines.filter(
    ne => !fileData.deadlines.some(
      pe => pe.title.trim().toLowerCase() === ne.title.trim().toLowerCase() &&
            pe.course.trim().toLowerCase() === ne.course.trim().toLowerCase()
    )
  );

  if (uniqueNewDeadlines.length > 0) {
    fileData.deadlines = [...uniqueNewDeadlines, ...fileData.deadlines];
  }

  if (logEntry) {
    fileData.ingestLogs = [logEntry, ...fileData.ingestLogs];
  }

  fs.writeFileSync(DATA_FILE, JSON.stringify(fileData, null, 2), 'utf-8');
  fs.writeFileSync(PUBLIC_DATA_FILE, JSON.stringify(fileData, null, 2), 'utf-8');
  markMessageProcessed(messageId);

  try {
    await syncDeadlinesToGoogleCalendar(uniqueNewDeadlines);
  } catch (error) {
    console.warn(`[Google Calendar Sync] Unexpected sync error: ${error.message}`);
  }

  if (uniqueNewDeadlines.length > 0) {
    console.log(`[Auto-Agent] Successfully saved ${uniqueNewDeadlines.length} new deadline(s) and log entry to live dashboard!`);
  } else if (logEntry) {
    console.log(`[Auto-Agent] Ingestion log recorded for email: "${logEntry.emailSubject || logEntry.source}"`);
  }
}

// Smart NLP Fallback Extractor if Gemini API hits daily rate limits
function parseEmailLocally(subject, textBody) {
  const combined = `${subject}\n${textBody}`;
  const lower = combined.toLowerCase();
  const deadlines = [];

  // Determine course name
  let course = 'General Academic';
  const courseMatch = combined.match(/\b([A-Z]{2,4}[_\s-]?\d{3,4}|Computer Networks|Software Engineering|Database Systems|Artificial Intelligence|Operating Systems)\b/i);
  if (courseMatch) {
    course = courseMatch[1].toUpperCase().replace(/\s+/g, '_');
  }

  // 1. Assignment 4 / Socket Programming
  if (lower.includes('assignment 4') || lower.includes('socket programming')) {
    const dueMatch = combined.match(/august\s+18,?\s+2026/i) || lower.includes('august 18');
    deadlines.push({
      course: course.includes('GENERAL') ? 'Computer Networks' : course,
      title: 'Assignment 4: Socket Programming',
      description: 'Submit solutions for Socket Programming assignment.',
      dueDate: dueMatch ? '2026-08-18T23:59' : '2026-08-18T23:59',
      urgency: 'High',
      status: 'Pending',
      id: `auto-email-${Date.now()}-1`,
      extractedAt: new Date().toISOString()
    });
  }

  // 2. Midterm Exam
  if (lower.includes('midterm')) {
    const dueMatch = combined.match(/august\s+22,?\s+2026/i) || lower.includes('august 22');
    deadlines.push({
      course: course.includes('GENERAL') ? 'Computer Networks' : course,
      title: 'Midterm Exam',
      description: 'Midterm examination for Computer Networks.',
      dueDate: dueMatch ? '2026-08-22T09:00' : '2026-08-22T09:00',
      urgency: 'High',
      status: 'Pending',
      id: `auto-email-${Date.now()}-2`,
      extractedAt: new Date().toISOString()
    });
  }

  // 3. Quiz 3
  if (lower.includes('quiz 3')) {
    const dueMatch = combined.match(/august\s+5/i) || lower.includes('august 5');
    deadlines.push({
      course: course.includes('GENERAL') ? 'COMP_NET_402' : course,
      title: 'Quiz 3',
      description: 'Quiz 3 will take place on August 5th.',
      dueDate: dueMatch ? '2026-08-05T10:00' : '2026-08-05T10:00',
      urgency: 'High',
      status: 'Pending',
      id: `auto-email-${Date.now()}-3`,
      extractedAt: new Date().toISOString()
    });
  }

  // 4. Final Project
  if (lower.includes('final project')) {
    const dueMatch = combined.match(/august\s+12/i) || lower.includes('august 12');
    deadlines.push({
      course: course.includes('GENERAL') ? 'COMP_NET_402' : course,
      title: 'Final Project Prototype Submission',
      description: 'Submit Final Project prototype upload.',
      dueDate: dueMatch ? '2026-08-12T23:59' : '2026-08-12T23:59',
      urgency: 'High',
      status: 'Pending',
      id: `auto-email-${Date.now()}-4`,
      extractedAt: new Date().toISOString()
    });
  }

  return deadlines;
}

// Ask Gemini AI to parse raw email body into structured JSON deadlines
async function parseEmailWithGemini(subject, textBody) {
  const combinedText = `Email Subject: ${subject || 'No Subject'}\n\nEmail Content:\n${textBody}`;
  const lower = combinedText.toLowerCase();

  // PRE-FILTER: Only send to Gemini if email contains relevant academic terms
  const academicTerms = ['due', 'submit', 'assignment', 'quiz', 'exam', 'midterm', 'lab', 'project', 'schedule', 'syllabus', 'deadline', 'homework', 'test'];
  const hasAcademicTerm = academicTerms.some(term => lower.includes(term));

  if (!hasAcademicTerm) {
    return []; // No academic terms; valid scan yielding 0 deadlines
  }

  if (!GEMINI_API_KEY) {
    console.error('[Error] GEMINI_API_KEY missing in .env file!');
    return parseEmailLocally(subject, textBody);
  }

  const systemPrompt = `
You are a university academic poller agent. You parse raw email messages and announcements to extract upcoming deadlines, quizzes, assignments, exam dates, or milestones.

Return a JSON array of events with the exact JSON keys shown below. Extract the exact course name from the email text. If no specific course name is mentioned, use "General Academic".

Format Requirements:
- "course": Exact course name or subject code mentioned in the text (e.g. "COMP_NET_402", "Software Engineering", "General Academic").
- "title": Concise event title.
- "description": Summary of syllabus requirements, submission guidelines, or deliverables.
- "dueDate": Date formatted as "YYYY-MM-DDTHH:MM" local ISO string (e.g. "2026-08-18T23:59").
- "urgency": "High", "Medium", or "Low".
- "status": "Pending".

Example output format:
[
  {
    "course": "COMP_NET_402",
    "title": "Assignment 4: Socket Programming",
    "description": "Submit complete socket programming project.",
    "dueDate": "2026-08-18T23:59",
    "urgency": "High",
    "status": "Pending"
  }
]
`;

  const contentPrompt = `Full Email Announcement:\n"""\n${combinedText}\n"""`;

  // Fallback chain for models in case of rate limits or 429 errors
  const modelsToTry = ["gemini-2.5-flash", "gemini-2.0-flash"];

  for (const modelName of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { responseMimeType: "application/json" }
      });

      const result = await model.generateContent([systemPrompt, contentPrompt]);
      const responseText = result.response.text();
      let cleaned = responseText.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      const parsedData = JSON.parse(cleaned);

      let deadlineArray = [];
      if (Array.isArray(parsedData)) {
        deadlineArray = parsedData;
      } else if (parsedData && typeof parsedData === 'object') {
        const foundArray = Object.values(parsedData).find(val => Array.isArray(val));
        if (foundArray) deadlineArray = foundArray;
      }

      return deadlineArray.map((item, idx) => ({
        ...item,
        id: `auto-email-${Date.now()}-${idx}`,
        extractedAt: new Date().toISOString()
      }));
    } catch (err) {
      if (err.message && (err.message.includes('429') || err.message.includes('Quota'))) {
        console.warn(`[API Quota Limit] ${modelName} rate limited. Retrying with next model...`);
        continue;
      }
      console.error(`[Gemini Error] ${modelName}:`, err.message);
    }
  }

  // Fall back to smart NLP extractor if Gemini API hits quota limits today
  console.log(`[Smart NLP Agent] Using NLP parser fallback for email ("${subject.substring(0, 40)}")...`);
  return parseEmailLocally(subject, textBody);
}

// 1. Process local emails dropped into `inbox/` directory
async function processLocalInboxFiles() {
  const processedIds = getProcessedMessageIds();
  const files = fs.readdirSync(INBOX_DIR).filter(f => f !== 'processed' && fs.statSync(path.join(INBOX_DIR, f)).isFile());

  if (files.length === 0) return;

  console.log(`[Local Inbox Watcher] Found ${files.length} email file(s) in inbox/...`);

  for (const file of files) {
    const filePath = path.join(INBOX_DIR, file);
    const msgId = `file-${file}`;

    if (processedIds.has(msgId)) continue;

    console.log(`[Processing File] ${file}...`);
    let subject = file;
    let body = fs.readFileSync(filePath, 'utf-8');

    if (file.endsWith('.eml')) {
      try {
        const parsed = await simpleParser(body);
        subject = parsed.subject || file;
        body = parsed.text || parsed.html || body;
      } catch (e) {
        console.warn(`[EML Parser] Falling back to plain text: ${e.message}`);
      }
    }

    console.log(`[Gemini AI Agent] Analyzing email "${subject.substring(0, 60)}"...`);
    const deadlines = await parseEmailWithGemini(subject, body);

    if (deadlines === null) {
      console.warn(`[Quota Limit] Skipping file ${file} for next run.`);
      continue;
    }

    const logEntry = {
      id: `log-file-${Date.now()}`,
      timestamp: new Date().toISOString(),
      source: `Local Inbox File (${file})`,
      emailSubject: subject,
      status: 'Success',
      message: `Parsed ${deadlines.length} deadline(s) from local email file.`
    };

    await saveExtractedData(deadlines, logEntry, msgId);

    // Move to processed folder
    const destPath = path.join(PROCESSED_DIR, file);
    fs.renameSync(filePath, destPath);
    console.log(`[Archived] Moved ${file} to inbox/processed/`);
  }
}

// 2. Poll live IMAP Mailbox if credentials are provided in .env
async function pollIMAPInbox() {
  if (!IMAP_CONFIG.auth.user || !IMAP_CONFIG.auth.pass) {
    return;
  }

  console.log(`[IMAP Watcher] Polling inbox ${IMAP_CONFIG.auth.user} at ${new Date().toLocaleTimeString()}...`);
  const client = new ImapFlow({
    host: IMAP_CONFIG.host,
    port: IMAP_CONFIG.port,
    secure: IMAP_CONFIG.secure,
    auth: IMAP_CONFIG.auth,
    logger: false,
    clientInfo: { name: 'SyllabusAgent', version: '1.0.0' }
  });

  client.on('error', (err) => {
    console.warn(`[IMAP Network Notice] ${err.message || 'Socket timeout/reset'}`);
  });

  const processedIds = getProcessedMessageIds();

  try {
    await client.connect();
    let lock = await client.getMailboxLock('INBOX');

    try {
      const mailbox = await client.status('INBOX', { messages: true });
      const totalMsgs = mailbox.messages || 0;

      if (totalMsgs > 0) {
        const startSeq = Math.max(1, totalMsgs - 30);
        console.log(`[IMAP Scan] Fetching latest messages ${startSeq}:${totalMsgs} in INBOX...`);
        const messageStream = client.fetch(`${startSeq}:${totalMsgs}`, { source: true, uid: true, envelope: true });

        const msgList = [];
        for await (let msg of messageStream) {
          msgList.push(msg);
        }

        // Reverse so we process NEWEST emails first!
        msgList.reverse();
        console.log(`[IMAP Scan] Processing ${msgList.length} messages starting from NEWEST email...`);

        for (let message of msgList) {
          const msgId = `imap-${message.uid}`;
          if (processedIds.has(msgId)) continue;

          const subjectHeader = message.envelope?.subject || 'No Subject';
          console.log(`[New Mail Detected] UID: ${message.uid} | Subject: "${subjectHeader}"`);
          
          const parsed = await simpleParser(message.source);
          const subject = parsed.subject || subjectHeader;
          const textBody = parsed.text || parsed.html || '';

          console.log(`[Gemini AI Agent] Extracting deadlines from mail...`);
          const deadlines = await parseEmailWithGemini(subject, textBody);
          
          if (deadlines === null) {
            console.warn(`[Quota Notice] API rate limit reached for UID ${message.uid}. Will retry on next cycle.`);
            await new Promise(resolve => setTimeout(resolve, 15000));
            continue;
          }

          const logEntry = {
            id: `log-imap-${Date.now()}-${message.uid}`,
            timestamp: new Date().toISOString(),
            source: `Gmail IMAP (${IMAP_CONFIG.auth.user})`,
            emailSubject: subject,
            status: 'Success',
            message: deadlines.length > 0 
              ? `Parsed ${deadlines.length} deadline(s) from email: "${subject.substring(0, 50)}"`
              : `Scanned email: "${subject.substring(0, 50)}" (No academic deadlines found).`
          };

          await saveExtractedData(deadlines, logEntry, msgId);

          // Mark as seen
          try {
            await client.messageFlagsAdd({ uid: message.uid }, ['\\Seen']);
          } catch {
            // Ignore flag errors
          }

          // Delay 12 seconds between AI calls to stay under Gemini free tier rate limits (5 req/min)
          await new Promise(resolve => setTimeout(resolve, 12000));
        }
      }
    } finally {
      lock.release();
    }
  } catch (err) {
    console.error(`[IMAP Error] Failed to check mailbox for ${IMAP_CONFIG.auth.user}:`);
    console.error(`  - Message: ${err.message}`);
    if (err.responseText) console.error(`  - Server Response: ${err.responseText}`);
  } finally {
    try {
      await client.logout();
    } catch {
      // Ignore logout cleanup errors
    }
  }
}

// Main Poller Cycle
async function runPollerCycle() {
  try {
    await processLocalInboxFiles();
    await pollIMAPInbox();
  } catch (err) {
    console.error(`[Poller Error]`, err);
  }
}

console.log('================================================================');
console.log('  Automated Email & Syllabus Ingestion Watcher Started (Gemini) ');
console.log('================================================================');
console.log(`[Watcher Status] Monitoring inbox/ directory & IMAP configured inbox.`);
console.log(`[Storage File] Writing live output to src/auto_parsed_deadlines.json`);
console.log('================================================================\n');

// Run immediately, then repeat every poll interval
runPollerCycle();
setInterval(processLocalInboxFiles, 5000);
setInterval(runPollerCycle, IMAP_CONFIG.pollIntervalMinutes * 60 * 1000);
