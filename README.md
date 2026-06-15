# AI Dashboard

A clean, modern AI chat dashboard. Paste a URL to summarize it, chat with any OpenAI-compatible model, and manage conversations — all in a dark-themed UI.

Built with React 19 + TypeScript + Vite on the frontend, Express on the backend. API keys stay on the server.

## Features

- **Chat** — Streamed responses with markdown rendering and per-block copy buttons
- **URL Summarizer** — Paste any URL and hit summarize for an instant AI summary
- **Dark theme** — Violet accents, smooth animations, mobile-friendly
- **Secure** — All API keys are server-side only; nothing exposed to the browser
- **Persistent chats** — Conversations saved to localStorage
- **Retry logic** — Exponential backoff on transient failures

## Quick Start

```bash
npm install
npm run dev        # http://localhost:8080
```

## Production

```bash
npm run build
pm2 start ecosystem.config.cjs
```

## Environment

Create a `.env` in the project root:

```env
AUTH_SECRET_TOKEN=your-secret-token
ALLOWED_ORIGINS=https://your-domain.com
```

The dashboard itself requires no API key — it proxies requests to your configured backend models server-side.

## Project Structure

```
src/
├── components/
│   ├── ChatWindow.tsx      # Message list + streaming
│   ├── ChatInput.tsx        # Text input + URL summarize
│   ├── Sidebar.tsx          # Chat history
│   ├── PromptEngineer.tsx   # Prompt tuning helper
│   └── PromptLibrary.tsx    # Saved prompt templates
├── context/
│   ├── ChatContext.tsx      # Chat state
│   └── SettingsContext.tsx  # Theme + provider settings
└── services/
    ├── chatService.ts       # API proxy client
    └── retry.ts             # Retry with backoff

server/
├── index.js                 # Express server
├── routes/chat.js           # /api/chat, /api/summarize
└── services/
    └── chatService.js       # Server-side model calls
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/chat` | Send a message, stream the response |
| POST | `/api/summarize` | Summarize a URL |
| GET | `/api/models` | List available models |

## License

MIT