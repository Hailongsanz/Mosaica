# Mosaica Cloud Functions Setup

## Overview
Firebase Cloud Functions handle AI requests with quota enforcement based on subscription tiers.

## Subscription Tiers

| Tier | Price | Planner Requests | Courage Chat |
|------|-------|-----------------|--------------|
| Free | $0 | 3/month | ❌ Locked |
| Mid | $3.99/mo | Unlimited* | 10/month |
| Top | $4.99/mo | Unlimited* | Unlimited* |

*Soft cap at 1000/month to prevent abuse

## Installation

### 1. Install Firebase CLI
```bash
npm install -g firebase-tools
firebase login
```

### 2. Initialize Firebase Project
```bash
firebase use --add
# Select your Firebase project (from firebase config)
```

### 3. Install Functions Dependencies
```bash
cd functions
npm install
cd ..
```

### 4. Configure Environment Variables

Set your Groq API key as a Firebase Functions config variable:

```bash
firebase functions:config:set groq.api_key="YOUR_GROQ_API_KEY_HERE"
```

Or for local testing with emulator:
```bash
# Create functions/.env file
cd functions
echo "GROQ_API_KEY=your_groq_api_key_here" > .env
```

### 5. Deploy Functions

**Deploy to production:**
```bash
firebase deploy --only functions
```

**Test locally with emulator:**
```bash
npm run serve
# Functions will run on http://localhost:5001
```

## Local Development

The app automatically detects dev vs production:
- **Dev mode (`npm run dev`)**: Uses Vite proxy at `/api/*` (API keys in `.env.local`)
- **Production (`npm run build`)**: Calls Firebase Cloud Functions (API keys secured server-side)

## Usage in Code

Frontend automatically routes to correct endpoint:

```javascript
// Both dev and prod work identically
const result = await llmService.invoke({
  prompt: "Parse this: Meeting tomorrow at 3pm",
  feature: 'planner',  // or 'courage'
  provider: 'groq',
  response_json_schema: { /* ... */ }
});
```

## Quota Management

### Default Behavior
- New users start on **Free tier** (3 planner requests/month)
- Usage resets on 1st of each month (UTC)
- Firestore automatically tracks usage per user

### Upgrade Users Manually

```javascript
// Firebase Console > Firestore > userSettings > [userId]
{
  subscription_tier: "mid",  // or "top"
  usage: {
    planner_requests: 0,
    courage_uses: 0,
    reset_date: "2026-03-01T00:00:00.000Z"
  }
}
```

### Stripe Integration (TODO)

The `stripeWebhook` function is stubbed for future Stripe integration:
1. Create Stripe products ($3.99 Mid, $4.99 Top)
2. Get price IDs from Stripe dashboard
3. Update `tierMapping` in `functions/src/index.ts`
4. Configure Stripe webhook to call your Cloud Function URL
5. Implement customerId → userId mapping

## Testing

### Test Quota Enforcement

```javascript
// Call AI feature 4 times as free user
// 4th call should fail with "Free tier limit reached"

// Upgrade to mid tier in Firestore
// Call Courage Chat 11 times
// 11th call should fail with "Monthly Courage limit reached"
```

### Check Usage

Users can view their usage in Settings (TODO: implement UI):
```javascript
const userSettings = await userSettingsService.getForCurrentUser();
console.log(userSettings.usage);
// { planner_requests: 2, courage_uses: 0, reset_date: "2026-03-01..." }
```

## Monitoring

View Cloud Function logs:
```bash
firebase functions:log
```

Or in Firebase Console > Functions > Logs

## Cost Estimates

**Groq API:** Free tier (14,400 requests/day)
**Firebase Functions:** Free tier includes 2M invocations/month
**Expected cost:** $0/month for small user base

## Security

- API keys stored server-side (never exposed to client)
- Authentication required for all AI requests
- Rate limiting prevents abuse
- Firestore security rules should restrict `userSettings.subscription_tier` updates to admin only

## Deployment Checklist

- [ ] Set Groq API key: `firebase functions:config:set groq.api_key="..."`
- [ ] Deploy functions: `firebase deploy --only functions`
- [ ] Update Firestore security rules (prevent tier tampering)
- [ ] Build and deploy web app: `npm run build && firebase deploy --only hosting`
- [ ] Test free tier quota (3 requests then blocked)
- [ ] Test mid tier quota (unlimited planner, 10 courage)
- [ ] Set up Stripe webhook for subscription management
