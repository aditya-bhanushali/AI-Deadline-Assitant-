import 'dotenv/config';
import { google } from 'googleapis';

const CONFIG = {
  calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
  clientId: process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  refreshToken: process.env.GOOGLE_REFRESH_TOKEN || ''
};

function createCalendarClient() {
  if (!CONFIG.clientId || !CONFIG.clientSecret || !CONFIG.refreshToken) {
    console.error('Missing Google OAuth credentials in .env');
    process.exit(1);
  }

  const oauth2 = new google.auth.OAuth2(CONFIG.clientId, CONFIG.clientSecret);
  oauth2.setCredentials({ refresh_token: CONFIG.refreshToken });
  return google.calendar({ version: 'v3', auth: oauth2 });
}

async function deduplicateEvents() {
  console.log('[Calendar Deduplicator] Fetching events from Google Calendar...');
  const calendar = createCalendarClient();

  // Fetch events around current time (-30 days to +90 days)
  const now = new Date();
  const timeMin = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const timeMax = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();

  const response = await calendar.events.list({
    calendarId: CONFIG.calendarId,
    timeMin,
    timeMax,
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 250
  });

  const events = response.data.items || [];
  console.log(`[Calendar Deduplicator] Found ${events.length} total events in calendar between ${timeMin.slice(0, 10)} and ${timeMax.slice(0, 10)}.`);

  // Group events by normalized summary & start time
  const groups = new Map();

  for (const event of events) {
    if (!event.summary) continue;
    const startStr = event.start?.dateTime || event.start?.date || '';
    // Normalize summary e.g. "General Academic: Live Webinar..."
    const normSummary = event.summary.trim().toLowerCase();
    const groupKey = `${normSummary}|${startStr}`;

    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey).push(event);
  }

  let deletedCount = 0;

  for (const [key, group] of groups.entries()) {
    if (group.length > 1) {
      console.log(`\n[Duplicate Found] (${group.length} instances): "${group[0].summary}" at ${group[0].start?.dateTime || group[0].start?.date}`);

      // Sort group: prefer keeping the event with private syllabusAgentKey & custom colorId
      group.sort((a, b) => {
        const aHasKey = a.extendedProperties?.private?.syllabusAgentKey ? 1 : 0;
        const bHasKey = b.extendedProperties?.private?.syllabusAgentKey ? 1 : 0;
        if (aHasKey !== bHasKey) return bHasKey - aHasKey; // keep the one with key

        const aHasColor = a.colorId ? 1 : 0;
        const bHasColor = b.colorId ? 1 : 0;
        if (aHasColor !== bHasColor) return bHasColor - aHasColor; // keep the one with color

        // If equal, keep newer updated event
        return new Date(b.updated).getTime() - new Date(a.updated).getTime();
      });

      const keepEvent = group[0];
      const removeEvents = group.slice(1);

      console.log(`   -> KEEPING event: ID=${keepEvent.id}, colorId=${keepEvent.colorId || 'default (none)'}, syllabusAgentKey=${keepEvent.extendedProperties?.private?.syllabusAgentKey || 'none'}`);

      for (const dupe of removeEvents) {
        console.log(`   -> DELETING duplicate event: ID=${dupe.id}, colorId=${dupe.colorId || 'default (none)'}`);
        try {
          await calendar.events.delete({
            calendarId: CONFIG.calendarId,
            eventId: dupe.id
          });
          deletedCount++;
        } catch (err) {
          console.error(`      Failed to delete event ${dupe.id}: ${err.message}`);
        }
      }
    }
  }

  console.log(`\n[Calendar Deduplicator] Complete! Removed ${deletedCount} duplicate event(s).`);
}

deduplicateEvents().catch((err) => {
  console.error('[Calendar Deduplicator] Error:', err);
  process.exit(1);
});
