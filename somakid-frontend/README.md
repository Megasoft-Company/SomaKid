# SOMAKID AI — Mobile Application

> Intelligent AI Tutor for Climate Education, Biodiversity Awareness, and Children's Resilience.

---

## Overview

SOMAKID AI is a mobile application that transforms nature into an interactive classroom. Using artificial intelligence, children can identify plants and animals, learn about climate change, and become environmental guardians.

Open-source solution dedicated to bridging the educational gap in vulnerable regions of the Democratic Republic of the Congo and beyond.

---

## Features

### 🌿 Biodiversity Explorer
- AI-powered species identification from camera photos
- Child-friendly descriptions and ecological information
- Fun facts and conservation tips
- Points and badges for discoveries

### 🌍 Climate Resilience Academy
- Gamified educational quizzes
- Multiple subjects: Biodiversity, Climate, Natural Disasters, Eco-Behaviors
- 5 difficulty levels adapting to the child's knowledge
- Progress tracking and achievements

### 🤖 SOMA AI Tutor
- Interactive chat with a friendly AI tutor
- Educational conversations about nature and climate
- Voice support for pre-reading children
- Multilingual support: French, Lingala, Swahili

### 📈 Child Progress Tracking
- Level progression system (Junior Explorer → Climate Guardian)
- Achievement badges
- Species discovery collection
- Learning statistics

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native / Expo SDK 53 |
| Language | TypeScript |
| Navigation | Expo Router |
| State Management | Zustand |
| HTTP Client | Axios |
| Animation | React Native Reanimated |
| Backend | SOMAKID AI Engine (FastAPI + Gemini AI) |

---

## Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI: `npm install -g expo-cli`
- Expo Go app installed on your mobile device

---

## Installation

```bash
# Clone the repository
git clone https://github.com/somakid/somakid-frontend.git
cd mobile-app

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your API endpoints
```

---

## Running the App

```bash
# Start the development server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios

# Run on web
npm run web
```

Scan the QR code with **Expo Go** (Android) or the **Camera app** (iOS).

---

## Project Structure

```
somakid-frontend/
├── app/
│   ├── _layout.tsx              # Root layout
│   └── (tabs)/
│       ├── _layout.tsx          # Tab navigation
│       ├── index.tsx            # Home screen
│       ├── explorer.tsx         # Biodiversity Explorer
│       ├── quiz.tsx             # Climate Academy
│       ├── chat.tsx             # SOMA Tutor
│       └── profil.tsx           # Child Profile
├── services/
│   └── api/
│       ├── client.ts            # HTTP client
│       ├── auth.service.ts      # Authentication
│       ├── vision.service.ts    # Image analysis
│       ├── quiz.service.ts      # Quiz
│       ├── chat.service.ts      # Chat
│       └── progression.service.ts
├── hooks/
│   ├── useAuth.ts
│   ├── useVision.ts
│   ├── useQuiz.ts
│   ├── useChat.ts
│   └── useProgression.ts
├── store/
│   ├── auth.store.ts
│   ├── chat.store.ts
│   └── quiz.store.ts
├── types/
│   ├── api.types.ts
│   └── domain.types.ts
└── constants/
    └── theme.ts
```

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `EXPO_PUBLIC_AI_ENGINE_URL` | AI Engine API URL | `http://localhost:8000` |
| `EXPO_PUBLIC_BACKEND_URL` | Backend API URL | `http://localhost:8080` |
| `EXPO_PUBLIC_APP_NAME` | Application name | `SOMAKID AI` |
| `EXPO_PUBLIC_DEFAULT_LANGUAGE` | Default language | `fr` |

---

## Building for Production

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure build
eas build:configure

# Build for Android
eas build --platform android --profile production

# Build for iOS
eas build --platform ios --profile production

# Submit to stores
eas submit --platform android
eas submit --platform ios
```

---

## Testing

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Formatting
npm run format

# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

---

## Supported Languages

| Code | Language | Status |
|---|---|---|
| `fr` | French | ✅ Complete |
| `ln` | Lingala | ✅ Complete |
| `sw` | Swahili | ✅ Complete |

---

## Assets

The `assets/images/` directory should contain the following image files:

- `icon.png` — App icon (1024×1024)
- `adaptive-icon.png` — Android adaptive icon
- `splash-icon.png` — Splash screen image
- `favicon.png` — Web favicon

---

## License

MIT License — See [LICENSE](https://github.com/pacomeissa/SomaKid/blob/main/LICENSE) file for details.

---

## Contact

**SOMAKID AI Team** — contact@somakid.ai

---

*Built with ❤️ for the children of Africa and the planet.*