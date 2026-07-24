# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.

## Auto-Sync Deadlines to Google Calendar

The email poller can now sync newly parsed deadlines to Google Calendar immediately after each new email is processed.

### 1) Add environment variables

In your `.env` file, configure:

```env
GOOGLE_CALENDAR_SYNC_ENABLED=true
GOOGLE_CALENDAR_ID=primary
GOOGLE_CALENDAR_TIMEZONE=Asia/Kolkata

GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
GOOGLE_REFRESH_TOKEN=your_google_refresh_token
```

Notes:
- `GOOGLE_CALENDAR_ID=primary` syncs to your main Google account calendar.
- The poller will skip Calendar sync if these credentials are missing.

### 2) Start the email poller

```bash
npm run poller:email
```

When a new email contains deadline data, the poller will:
- save it to `src/auto_parsed_deadlines.json` and `public/auto_parsed_deadlines.json`
- create/update the matching Google Calendar event automatically

### Sync all existing deadlines now

To push every current pending deadline to Google Calendar in one shot:

```bash
npm run calendar:sync:all
```
