import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';

const CONFIG = {
  enabled: process.env.GOOGLE_CALENDAR_SYNC_ENABLED === 'true',
  calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
  timezone: process.env.GOOGLE_CALENDAR_TIMEZONE || 'Asia/Kolkata',
  clientId: process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  refreshToken: process.env.GOOGLE_REFRESH_TOKEN || ''
};

const DATA_FILES = [
  path.join(process.cwd(), 'src', 'auto_parsed_deadlines.json'),
  path.join(process.cwd(), 'public', 'auto_parsed_deadlines.json')
];

function failWith(message) {
  console.error(`[Calendar Sync] ${message}`);
  process.exit(1);
}

function makeSyncKey(deadline) {
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

function buildCalendarEvent(deadline) {
  const parsed = new Date(deadline.dueDate);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const end = new Date(parsed.getTime() + 60 * 60 * 1000);

  return {
    summary: `${deadline.course || 'General Academic'}: ${deadline.title || 'Deadline'}`,
    description: deadline.description || 'Academic deadline synced by Syllabus Agent.',
    start: {
      dateTime: formatLocalDateTime(parsed),
      timeZone: CONFIG.timezone
    },
    end: {
      dateTime: formatLocalDateTime(end),
      timeZone: CONFIG.timezone
    },
    colorId: deadline.urgency === 'High' ? '11' : deadline.urgency === 'Medium' ? '5' : '10',
    extendedProperties: {
      private: {
        syllabusAgentKey: makeSyncKey(deadline)
      }
    }
  };
}

function readDeadlinesFromDisk() {
  const existingPath = DATA_FILES.find((p) => fs.existsSync(p));
  if (!existingPath) {
    failWith('No auto_parsed_deadlines.json found in src/ or public/.');
  }

  try {
    const raw = fs.readFileSync(existingPath, 'utf-8');
    const parsed = JSON.parse(raw);
    const deadlines = Array.isArray(parsed.deadlines) ? parsed.deadlines : [];
    return deadlines.filter((d) => d && d.status !== 'Completed');
  } catch (error) {
    failWith(`Could not read deadline data file: ${error.message}`);
  }
}

function createCalendarClient() {
  if (!CONFIG.enabled) {
    failWith('GOOGLE_CALENDAR_SYNC_ENABLED is not set to true in .env.');
  }

  if (!CONFIG.clientId || !CONFIG.clientSecret || !CONFIG.refreshToken) {
    failWith('Missing GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or GOOGLE_REFRESH_TOKEN in .env.');
  }

  const oauth2 = new google.auth.OAuth2(CONFIG.clientId, CONFIG.clientSecret);
  oauth2.setCredentials({ refresh_token: CONFIG.refreshToken });
  return google.calendar({ version: 'v3', auth: oauth2 });
}

async function upsertDeadline(calendar, deadline) {
  const key = makeSyncKey(deadline);
  const payload = buildCalendarEvent(deadline);

  if (!payload) {
    return { skipped: true, reason: 'invalid-date' };
  }

  const existing = await calendar.events.list({
    calendarId: CONFIG.calendarId,
    privateExtendedProperty: `syllabusAgentKey=${key}`,
    maxResults: 1,
    singleEvents: true
  });

  const event = existing.data.items?.[0];

  if (event?.id) {
    await calendar.events.patch({
      calendarId: CONFIG.calendarId,
      eventId: event.id,
      requestBody: payload
    });
    return { updated: true };
  }

  await calendar.events.insert({
    calendarId: CONFIG.calendarId,
    requestBody: payload
  });
  return { created: true };
}

async function run() {
  const deadlines = readDeadlinesFromDisk();
  if (deadlines.length === 0) {
    console.log('[Calendar Sync] No pending deadlines found to sync.');
    return;
  }

  const calendar = createCalendarClient();
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const deadline of deadlines) {
    try {
      const result = await upsertDeadline(calendar, deadline);
      if (result.created) created += 1;
      if (result.updated) updated += 1;
      if (result.skipped) skipped += 1;
    } catch (error) {
      skipped += 1;
      console.warn(`[Calendar Sync] Skipped "${deadline.title || 'Untitled'}": ${error.message}`);
    }
  }

  console.log(`[Calendar Sync] Done. Created: ${created}, Updated: ${updated}, Skipped: ${skipped}.`);
}

run().catch((error) => {
  failWith(error.message || 'Unknown sync failure.');
});
