# AI Dashboard

A modern AI chat dashboard built with React, TypeScript, and Vite. Supports multiple model providers with a beautiful dark-themed UI and markdown rendering.

![AI Dashboard](https://via.placeholder.com/800x400?text=AI+Dashboard)

## Features

- 🤖 **Multi-Provider Support**: OpenAI, Anthropic, and any OpenAI-compatible API
- 🔒 **Secure**: API keys never exposed to browser; all requests proxy through server
- 🎨 **Beautiful UI**: Dark theme with markdown rendering and syntax highlighting
- 🔄 **Retry Logic**: Automatic retry with exponential backoff on failures
- ⚛️ **React 19**: Built with the latest React features
- 📦 **Code Splitting**: Optimized bundle with vendor and markdown chunks
- 🔗 **URL Summarizer**: Instantly summarize any web page — just paste a URL and hit summarize

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd ai-dashboard

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:8080`

### Production Build

```bash
npm run build
npm run preview
```

## Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Model Configuration
VITE_API_MODEL=minimaxai/minimax-m2.7

# API Keys (server-side only — NOT exposed to browser)
AUTH_SECRET_TOKEN=your-secret-token
ALLOWED_ORIGINS=https://your-domain.com
```

### Security

- API keys are **never** sent to the browser
- All API requests go through server-side proxies that inject keys
- Security headers (CSP, X-Frame-Options, etc.) are enabled
- Rate limiting protects against abuse

## Architecture

```
src/
├── components/       # React components
│   ├── ChatWindow.tsx    # Main chat display
│   ├── ChatInput.tsx     # Message input
│   ├── Sidebar.tsx       # Chat list sidebar
│   └── ErrorBoundary.tsx # Error handling
├── context/          # React context
│   ├── ChatContext.tsx   # Chat state management
│   └── SettingsContext.tsx # Settings & provider config
├── services/         # API services
│   ├── chatService.ts    # Core chat service
│   └── retry.ts          # Retry logic
├── types/
│   └── chat.ts           # TypeScript types
└── App.tsx           # Root component
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm test` | Run tests |
| `npm run test:watch` | Run tests in watch mode |

## License

MIT