### Routes

```
/api/v1
├── /ping (GET)             - health check
├── /auth
│	├── /login (POST)         - auth user
│	├── /signup (POST)        - create new user
│ ├── /logout (POST)        - logout
│ └── /google/callback (GET)  - callback for google auth 
├── /settings (GET)         - fetch settings
├── /settings (PATCH)       - save settings
├── /google
│   ├── /events (GET)       - fetch calendar events
│   ├── /calendars (GET)    - fetch calendar list
│   └── /auth-link (GET)    - get auth url
├── /ai (POST)              - generate summary with ai
└── /jira/worklog (POST)    - save worklog in Jira
```

### Development
* Run proxy for handling Google OAuth on localhost `ngrok http 5001` then copy `Forwarding` URL to the `.env` and to the Google Console for redirect uri

```bash
npm ci
cp .env.example .env # заміни "..."; невикористаний DATABASE_URL видали
docker compose up -d db
npm run start:dev
```

API: <http://localhost:5001/api/v2>

Checko api: `curl http://localhost:5001/api/v2/ping` → `pong`

## Check

```bash
npm run build
npm test -- --runInBand
npm run test:e2e -- --runInBand
```

Stop DB: `docker compose down`
