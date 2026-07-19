/**
 * Microsoft Teams Announcement Watcher - Syllabus Extraction Agent
 * 
 * This background script automates the extraction of academic deadlines and syllabus schedules
 * directly from your university's Microsoft Teams channels using Microsoft Graph API and Gemini 2.5.
 * 
 * Dependencies:
 *   npm install @microsoft/microsoft-graph-client
 *   npm install @microsoft/microsoft-graph-auth (or @azure/identity)
 *   npm install @google/generative-ai
 *   npm install dotenv
 */

import 'dotenv/config';
import { Client } from '@microsoft/microsoft-graph-client';
import { ClientSecretCredential } from '@azure/identity';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials/index.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

// --- CONFIGURATION ---
const TEAMS_CONFIG = {
  tenantId: process.env.TEAMS_TENANT_ID || 'your-azure-tenant-id',
  clientId: process.env.TEAMS_CLIENT_ID || 'your-azure-client-id',
  clientSecret: process.env.TEAMS_CLIENT_SECRET || 'your-azure-client-secret',
  teamId: process.env.TEAMS_TEAM_ID || 'your-microsoft-team-id',
  channelId: process.env.TEAMS_CHANNEL_ID || 'your-channel-id',
  pollIntervalMinutes: 5,
};

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'your-gemini-api-key';
const DATA_FILE = path.join(process.cwd(), 'src', 'auto_parsed_deadlines.json');

// Ensure storage file directory exists
if (!fs.existsSync(path.dirname(DATA_FILE))) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
}

// Initialize Gemini Client
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const geminiModel = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  generationConfig: { responseMimeType: "application/json" }
});

// Initialize Microsoft Graph Client (Application Permission Flow)
function getGraphClient() {
  const credential = new ClientSecretCredential(
    TEAMS_CONFIG.tenantId,
    TEAMS_CONFIG.clientId,
    TEAMS_CONFIG.clientSecret
  );

  const authProvider = new TokenCredentialAuthenticationProvider(credential, {
    scopes: ['https://graph.microsoft.com/.default'],
  });

  return Client.initWithMiddleware({ authProvider });
}

// Load previously parsed message IDs to prevent duplicate scanning
function getProcessedMessageIds() {
  if (fs.existsSync(DATA_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
      return new Set(data.processedMessages || []);
    } catch {
      return new Set();
    }
  }
  return new Set();
}

// Append new deadlines and record message IDs as scanned
function saveExtractedDeadlines(newDeadlines, messageId) {
  let fileData = { processedMessages: [], deadlines: [] };
  if (fs.existsSync(DATA_FILE)) {
    try {
      fileData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    } catch {
      // Use defaults if corrupt
    }
  }

  fileData.processedMessages.push(messageId);
  fileData.deadlines = [...newDeadlines, ...fileData.deadlines];

  fs.writeFileSync(DATA_FILE, JSON.stringify(fileData, null, 2), 'utf-8');
  console.log(`[Database] Appended ${newDeadlines.length} new events to local sync file.`);
}

// Ask Gemini model to parse raw message body into structured JSON deadlines
async function parseMessageWithGemini(text) {
  const systemPrompt = `
You are a university academic poller agent. You parse raw Microsoft Teams channel messages to extract upcoming deadlines, quizzes, assignments, exam dates, or milestones.

Return a JSON array of events with the exact JSON keys shown below. If date details are missing, infer them from context.
Format Requirements:
- "course": Use standard course name (e.g. Computer Networks, Software Engineering, Database Systems) based on sender or text content.
- "title": Concise event title.
- "description": Explanation of the task and submission deliverables.
- "dueDate": Date formatted as "YYYY-MM-DDTHH:MM" local time.
- "urgency": "High", "Medium", or "Low" based on proximity and grade weight.
- "status": "Pending".

Example:
[
  {
    "course": "Distributed Systems",
    "title": "Assignment 2: Vector Clocks",
    "description": "Implement vector clock logging in Go. Submit via GitHub repository.",
    "dueDate": "2026-08-01T23:59",
    "urgency": "Medium",
    "status": "Pending"
  }
]
`;

  try {
    const result = await geminiModel.generateContent([
      systemPrompt,
      `Microsoft Teams Channel Message:\n"${text}"`
    ]);
    const responseText = result.response.text();
    return JSON.parse(responseText);
  } catch (err) {
    console.error(`[Gemini Agent] Error parsing Teams announcement:`, err.message);
    return [];
  }
}

// Core Watcher Loop
async function pollTeamsChannel() {
  console.log(`[MS Teams Watcher] Polling channel ${TEAMS_CONFIG.channelId} at ${new Date().toLocaleTimeString()}...`);
  
  try {
    const graphClient = getGraphClient();
    const processedIds = getProcessedMessageIds();

    // Query messages from the Microsoft Teams channel (Retrieves last 20 posts)
    const response = await graphClient
      .api(`/teams/${TEAMS_CONFIG.teamId}/channels/${TEAMS_CONFIG.channelId}/messages`)
      .top(20)
      .get();

    const messages = response.value || [];
    let newEventsCount = 0;

    for (const msg of messages) {
      // Skip if already processed or if the message content is empty
      if (processedIds.has(msg.id) || !msg.body || !msg.body.content) {
        continue;
      }

      const rawText = msg.body.content.replace(/<[^>]*>/g, ''); // Strip HTML tags
      console.log(`[New Post Detected] ID: ${msg.id} | Sender: ${msg.from?.user?.displayName || 'Instructor'}`);
      console.log(`[Text Body] "${rawText.substring(0, 100)}..."`);

      console.log(`[Agent Action] Analyzing text with Gemini 2.5 Flash...`);
      const extractedEvents = await parseMessageWithGemini(rawText);

      if (extractedEvents && extractedEvents.length > 0) {
        // Tag with extraction source metadata
        const taggedEvents = extractedEvents.map((evt, idx) => ({
          ...evt,
          id: `teams-auto-${msg.id}-${idx}`,
          extractedAt: new Date().toISOString()
        }));

        saveExtractedDeadlines(taggedEvents, msg.id);
        newEventsCount += taggedEvents.length;
      } else {
        // Mark message as processed even if no events found to avoid scanning again
        saveExtractedDeadlines([], msg.id);
      }
    }

    console.log(`[Poller Done] Finished loop. Synced ${newEventsCount} new deadlines.`);
  } catch (error) {
    console.error(`[Teams Error] Failed to poll Microsoft Teams feed:`, error.message);
    if (error.code === 'AuthenticationFailure') {
      console.error(`[AD Auth Tip] Verify Tenant ID, Client ID and Client Secret in your .env file.`);
    }
  }
}

// Start polling cycle
console.log('====================================================');
console.log('  Deadlines & Syllabus Ingestion Watcher Started    ');
console.log('====================================================');
pollTeamsChannel();
setInterval(pollTeamsChannel, TEAMS_CONFIG.pollIntervalMinutes * 60 * 1000);
