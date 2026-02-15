# Mosaica Planner - Firebase Migration Guide

## ✅ What's Been Done

The app has been successfully migrated from Base44 to Firebase. Here's what was created:

### New Firebase Services (in `src/firebase/`)
- **config.ts** - Firebase initialization with your project credentials
- **auth.ts** - Authentication functions (sign up, sign in, logout, profile updates)
- **firestore.ts** - Database operations (Events, UserSettings CRUD)
- **storage.ts** - File upload to Firebase Storage
- **llm.ts** - OpenAI integration for AI features
- **index.ts** - Central export file

### Updated Components
- **AuthContext.jsx** - Now uses Firebase auth instead of Base44
- **AuthWrapper.jsx** - Uses Firebase authentication check
- **Layout.jsx** - Fetches user settings from Firestore
- **Home.jsx** - Uses Firestore for events, OpenAI for event parsing
- **Settings.jsx** - Uses Firestore for settings storage, Firebase Storage for uploads
- **CourageChat.jsx** - Uses OpenAI for conversation
- **NavigationTracker.jsx** - Removed Base44 logging (can add Firebase Analytics)

---

## ⚙️ Environment Setup

### Step 1: Add Your Credentials

Create a `.env.local` file in the root directory:

```bash
cp .env.local.example .env.local
```

Then edit `.env.local` and fill in your credentials:

```env
# Firebase Config (from Firebase Console → Project Settings → Your apps)
VITE_FIREBASE_API_KEY=your-api-key-here
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_FIREBASE_MEASUREMENT_ID=your-measurement-id

# OpenAI API Key (from https://platform.openai.com/api-keys)
VITE_OPENAI_API_KEY=sk-proj-your-key-here
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install:
- `firebase` - Firebase SDK
- `openai` - OpenAI SDK
- All other dependencies are already listed

### Step 3: Setup Firestore Database Rules

In Firebase Console, go to **Firestore Database** → **Rules** and replace with:

```firestore rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
    
    // Events collection
    match /events/{eventId} {
      allow read, write: if request.auth.uid == resource.data.user_id || 
                           request.auth.uid == request.resource.data.user_id;
    }
    
    // User Settings collection
    match /userSettings/{settingsId} {
      allow read, write: if request.auth.uid == resource.data.user_id || 
                          request.auth.uid == request.resource.data.user_id;
    }
    
    // Courage Chat collection
    match /courageChats/{chatId} {
      allow read, write: if request.auth.uid == resource.data.user_id || 
                          request.auth.uid == request.resource.data.user_id;
    }
  }
}
```

### Step 4: Setup Firebase Storage Rules

In Firebase Console, go to **Storage** → **Rules** and replace with:

```firebase rules
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow authenticated users to read/write their own files
    match /{userId}/{allPaths=**} {
      allow read, write: if request.auth.uid == userId;
    }
  }
}
```

### Step 5: Enable Authentication Methods

In Firebase Console → **Authentication** → **Sign-in method**, enable:
- ✅ Email/Password
- ✅ Google

---

## 🚀 Running the App

```bash
npm run dev
```

Then open `http://localhost:5173` in your browser.

---

## 📁 Database Schema

### Events Collection
```javascript
{
  id: string,           // Auto-generated Firestore ID
  user_id: string,      // Firebase Auth UID
  title: string,
  description: string,
  date: string,         // YYYY-MM-DD format
  start_time: string,   // HH:MM format (24-hour)
  end_time: string,     // HH:MM format
  category: string,     // work | personal | health | social | travel | other
  location: string,
  is_all_day: boolean,
  is_recurring: boolean,
  recurrence_rule: string,  // daily | weekly | biweekly | monthly | yearly
  recurrence_days: array,   // ["monday", "wednesday"] for weekly
  parent_event_id: string,  // For recurring events
  completed: boolean,
  missed: boolean,
  notes: string,
  original_input: string,
  created_at: string,   // ISO date
  updated_at: string    // ISO date
}
```

### UserSettings Collection
```javascript
{
  id: string,
  user_id: string,
  user_email: string,
  theme: string,              // light | dark | system
  language: string,           // en, es, fr, etc.
  time_format: string,        // 12h | 24h
  week_starts_on: string,     // sunday | monday
  default_event_duration: number,  // minutes
  notifications_enabled: boolean,
  default_category: string,
  created_at: string,
  updated_at: string
}
```

---

## 🔑 Key Changes from Base44

### Authentication
**Before:**
```js
base44.auth.me()
base44.auth.isAuthenticated()
base44.auth.logout()
```

**After:**
```js
import { useAuth } from '@/lib/AuthContext'
const { user, isAuthenticated, logout } = useAuth()
```

### Database
**Before:**
```js
base44.entities.Event.list()
base44.entities.Event.create(data)
base44.entities.UserSettings.filter({...})
```

**After:**
```js
import { eventService, userSettingsService } from '@/firebase/firestore'
await eventService.list('-date')
await eventService.create(data)
await userSettingsService.filter({...})
```

### LLM / AI
**Before:**
```js
base44.integrations.Core.InvokeLLM({ prompt, response_json_schema })
```

**After:**
```js
import { llmService } from '@/firebase/llm'
await llmService.invoke({ prompt, response_json_schema })
```

### File Upload
**Before:**
```js
base44.integrations.Core.UploadFile({ file })
```

**After:**
```js
import { storageService } from '@/firebase/storage'
await storageService.uploadFile(file, 'uploads')
```

---

## 🐛 Troubleshooting

### Firebase Config Not Loading
- Check `.env.local` exists in root directory
- Verify all `VITE_FIREBASE_*` variables are set correctly
- Make sure browser console shows no errors about missing env vars

### LLM / OpenAI Errors
- Ensure `VITE_OPENAI_API_KEY` is set and valid
- Check OpenAI account has API access enabled
- Verify you have sufficient credits/quota on OpenAI

### Firestore Authentication Errors
- Make sure Firestore rules are correctly configured
- Verify Firebase Authentication is enabled with Email/Password or Google
- Check user is logged in (check Firebase Console → Authentication)

### Storage Upload Fails
- Ensure Firebase Storage rules allow authenticated users
- Verify file size is reasonable (< 5MB)
- Check bucket name in Firebase Console

---

## 📊 NextSteps

Future enhancements:
- [ ] Add Firebase Analytics for page views
- [ ] Implement Firebase Cloud Functions for backend operations
- [ ] Add real-time Firestore listeners for instant updates
- [ ] Setup Firebase Hosting for deployment
- [ ] Add error tracking with Sentry
- [ ] Implement offline persistence with Firestore offline mode

---

## 📞 Support

If you encounter any issues:
1. Check the console for error messages
2. Verify all environment variables are set
3. Check Firestore/Storage rules in Firebase Console
4. Ensure authentication is properly configured

