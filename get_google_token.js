import 'dotenv/config';
import { google } from 'googleapis';
import http from 'http';
import url from 'url';
import fs from 'fs';
import path from 'path';

const clientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || '').trim();
const redirectUri = 'http://localhost:3000/oauth2callback';

if (!clientId || !clientSecret) {
  console.error('[OAuth Helper] Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in .env!');
  console.error('Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env first.');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: ['https://www.googleapis.com/auth/calendar']
});

console.log('\n================================================================');
console.log('  GOOGLE CALENDAR OAUTH AUTHORIZATION HELPER ');
console.log('================================================================');
console.log('Please open the following link in your browser to grant consent:\n');
console.log(authUrl);
console.log('\nListening for callback on http://localhost:3000/oauth2callback ...\n');

const server = http.createServer(async (req, res) => {
  try {
    const reqUrl = new url.URL(req.url, 'http://localhost:3000');
    const code = reqUrl.searchParams.get('code');
    if (code) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<h2>OAuth Authorization Successful!</h2><p>You can close this tab and return to the terminal.</p>');
      
      const { tokens } = await oauth2Client.getToken(code);
      if (tokens.refresh_token) {
        console.log('\n[OAuth Success] Received GOOGLE_REFRESH_TOKEN!');
        
        // Update .env file automatically
        const envPath = path.join(process.cwd(), '.env');
        let envContent = fs.readFileSync(envPath, 'utf-8');
        envContent = envContent.replace(/GOOGLE_REFRESH_TOKEN=.*/, `GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
        fs.writeFileSync(envPath, envContent, 'utf-8');
        
        console.log('[OAuth Success] GOOGLE_REFRESH_TOKEN updated in .env!');
      } else {
        console.warn('[OAuth Warning] Refresh token was not returned. Ensure prompt=consent was used.');
      }
      
      setTimeout(() => {
        server.close();
        process.exit(0);
      }, 1000);
    }
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/html' });
    res.end(`<h2>Authorization Error</h2><p>${err.message}</p>`);
    server.close();
    process.exit(1);
  }
}).listen(3000);
