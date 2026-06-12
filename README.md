# AI Dashboard

A modern, multi-provider AI chat dashboard built with React, TypeScript, and Vite. Supports **OpenAI**, **Anthropic**, and **NVIDIA** (including Kimi models).

![AI Dashboard](https://via.placeholder.com/800x400?text=AI+Dashboard)

## Features

- 🤖 **Multi-Provider Support**: OpenAI, Anthropic, NVIDIA
- 🔒 **Secure**: API keys never exposed to browser; all requests proxy through server
- 🎨 **Beautiful UI**: Dark theme with markdown rendering and syntax highlighting
- 🔄 **Retry Logic**: Automatic retry with exponential backoff on failures
- ⚛️ **React 19**: Built with the latest React features
- 📦 **Code Splitting**: Optimized bundle with vendor and markdown chunks
- 🧪 **Tested**: Unit tests with Vitest

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
# Model Configuration (optional - defaults provided)
VITE_OPENAI_MODEL=gpt-4o
VITE_ANTHROPIC_MODEL=claude-3-5-sonnet-20240620
VITE_NVIDIA_MODEL=minimaxai/minimax-m2.7

# API Keys (server-side only - NOT exposed to browser)
NVIDIA_API_KEY=your-nvidia-api-key
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
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
│   ├── openaiService.ts
│   ├── anthropicService.ts
│   ├── nvidiaService.ts
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

## Supported Providers

### OpenAI
- Models: `gpt-4o`, `gpt-4-turbo`, `gpt-3.5-turbo`
- Endpoint: `/api/openai`

### Anthropic
- Models: `claude-3-5-sonnet-20240620`, `claude-3-opus-20240229`
- Endpoint: `/api/anthropic`

### NVIDIA
- Models: `minimaxai/minimax-m2.7`, `nvidia/llama-3.1-nemotron-70b-instruct`
- Endpoint: `/api/nvidia`

## Development

### Project Structure

The project uses Vite with React 19, TypeScript, and Tailwind CSS 4. The build is optimized with code splitting for better performance.

### Testing

```bash
# Run tests once
npm test

# Run tests in watch mode
npm run test:watch
```

## License

MIT