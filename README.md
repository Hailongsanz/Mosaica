# Mosaica - AI-Powered Personal Planner

An intelligent calendar and event planning app powered by Firebase, OpenAI, Groq, and Anthropic. Plan your life in natural language.

## Quick Start

### Prerequisites

- Node.js 16+ and npm
- Firebase project (create at https://console.firebase.google.com)
- OpenAI API key (get from https://platform.openai.com/api-keys)

### Setup

1. **Clone/Setup the project:**
   ```bash
   npm install
   ```

2. **Configure Firebase & OpenAI:**
   ```bash
   cp .env.local.example .env.local
   ```
   Then edit `.env.local` with your Firebase config and OpenAI API key.

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Follow the Firebase Setup Guide:**
   See [FIREBASE_SETUP.md](FIREBASE_SETUP.md) for detailed configuration instructions.

## Features

- **AI Event Parsing** - Describe events in natural language, our AI understands and creates calendar events
- **Courage Chat** - Emotional intelligence companion integrated into your calendar
- **Smart Calendar** - Visual calendar view with conflict detection
- **Real-time Sync** - All changes sync instantly with Firebase
- **Profile Management** - Customize settings and upload profile pictures
- **Multi-language Support** - Support for 10+ languages (English, Spanish, French, German, Italian, Portuguese, Chinese, Japanese, Korean, Arabic)

## Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, shadcn/ui
- **Backend**: Firebase (Auth, Firestore, Storage)
- **AI**: OpenAI GPT-4, Groq, and Anthropic Claude for event parsing and Courage Chat
- **State**: React Query, React Router, Context API

## Project Structure

```
src/
├── firebase/          # Firebase services (auth, db, storage, llm)
├── pages/             # Page components (Home, Settings, Landing)
├── components/        # Reusable UI components
│   ├── planner/      # Planner-specific components
│   └── ui/           # shadcn/ui components
├── lib/              # Utilities and contexts
├── hooks/            # Custom React hooks
├── api/              # API layer (deprecated - use firebase/)
└── utils/            # Helper functions
```

## Documentation

- [Firebase Setup Guide](FIREBASE_SETUP.md) - Complete setup and configuration

## Available Scripts

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run preview    # Preview production build locally
npm run lint       # Run ESLint
npm run lint:fix   # Fix linting issues
npm run typecheck  # Type check JavaScript files
```

## Security & Privacy

- All user data is encrypted in transit (HTTPS/TLS)
- Firebase Security Rules restrict access to the user's own data
- No data is shared with third parties
- OpenAI API calls don't store your personal information

## License

MIT

## Contributing

Contributions welcome! Please feel free to submit a Pull Request.

---

**Need Help?** See [FIREBASE_SETUP.md](FIREBASE_SETUP.md) for troubleshooting guide.
