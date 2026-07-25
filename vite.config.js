import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import fs from 'fs';
import path from 'path';
import { syncDeadlinesToGoogleCalendar } from './sync_all_deadlines_to_google_calendar.js';

function calendarApiPlugin() {
  return {
    name: 'calendar-api-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url === '/api/sync-calendar' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk.toString();
          });

          req.on('end', async () => {
            try {
              const payload = JSON.parse(body || '{}');
              const deadlinesToSync = Array.isArray(payload.deadlines)
                ? payload.deadlines
                : payload.deadline
                ? [payload.deadline]
                : [];

              if (deadlinesToSync.length === 0) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ error: 'No deadlines provided in payload' }));
              }

              // 1. Persist to public/auto_parsed_deadlines.json & src/auto_parsed_deadlines.json
              const publicPath = path.join(process.cwd(), 'public', 'auto_parsed_deadlines.json');
              const srcPath = path.join(process.cwd(), 'src', 'auto_parsed_deadlines.json');

              let fileData = { deadlines: [], ingestLogs: [] };
              if (fs.existsSync(publicPath)) {
                try {
                  fileData = JSON.parse(fs.readFileSync(publicPath, 'utf-8'));
                } catch {
                  // Fallback to empty
                }
              }

              const existingDeadlines = Array.isArray(fileData.deadlines) ? fileData.deadlines : [];
              const uniqueNew = deadlinesToSync.filter(
                (nd) =>
                  !existingDeadlines.some(
                    (ed) =>
                      ed.title.trim().toLowerCase() === nd.title.trim().toLowerCase() &&
                      ed.course.trim().toLowerCase() === nd.course.trim().toLowerCase()
                  )
              );

              fileData.deadlines = [...deadlinesToSync, ...existingDeadlines.filter(
                ed => !deadlinesToSync.some(nd => nd.id === ed.id || (nd.title === ed.title && nd.course === ed.course))
              )];

              // Add Ingestion Log
              const logEntry = {
                id: `log-web-${Date.now()}`,
                timestamp: new Date().toISOString(),
                source: 'Web Dashboard (Live Entry)',
                emailSubject: deadlinesToSync[0].title,
                status: 'Success',
                message: `Pushed ${deadlinesToSync.length} deadline(s) directly to Google Calendar.`
              };
              fileData.ingestLogs = [logEntry, ...(fileData.ingestLogs || [])];

              fs.writeFileSync(publicPath, JSON.stringify(fileData, null, 2), 'utf-8');
              fs.writeFileSync(srcPath, JSON.stringify(fileData, null, 2), 'utf-8');

              // 2. Sync directly to Google Calendar via API
              const syncResult = await syncDeadlinesToGoogleCalendar(deadlinesToSync);
              console.log(`[Vite API Server] Google Calendar Sync Result: Created ${syncResult.created}, Updated ${syncResult.updated}`);

              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  success: true,
                  synced: syncResult,
                  added: uniqueNew.length
                })
              );
            } catch (err) {
              console.error('[Vite API Server Error]', err);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }
        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), calendarApiPlugin()]
});
