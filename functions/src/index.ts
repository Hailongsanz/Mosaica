/**
 * Mosaica Cloud Functions
 *
 * AI request handler with quota enforcement based on subscription tiers:
 * - Free: 3 planner/month, 0 courage (locked)
 * - Mid ($3.99): unlimited planner*, 10 courage/month
 * - Top ($4.99): unlimited planner*, unlimited courage*
 *
 * *Soft cap at 1000/month to prevent abuse
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import Groq from 'groq-sdk';
import Stripe from 'stripe';

admin.initializeApp();
const firestore = admin.firestore();

// Subscription tier limits
const QUOTAS = {
  free: { planner: 20, courage: 0 },
  mid: { planner: 10000, courage: 10 },   // effectively unlimited
  top: { planner: 10000, courage: 10000 }, // effectively unlimited
};

// Default AI model for Groq (free tier)
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';

// Stripe helper — initialized lazily using functions config
function getStripe(): Stripe {
  const key = functions.config().stripe?.secret_key || process.env.STRIPE_SECRET_KEY || '';
  return new Stripe(key, { apiVersion: '2026-02-25.clover' });
}

interface AIRequestData {
  prompt: string;
  feature: 'planner' | 'courage';
  provider?: 'groq' | 'openai';
  response_json_schema?: Record<string, any>;
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

interface UserUsage {
  planner_requests: number;
  courage_uses: number;
  reset_date: string;
}

/**
 * Main AI request handler
 * Callable Cloud Function with authentication + quota enforcement
 */
export const callAI = functions.https.onCall(async (data: AIRequestData, context) => {
  // 1. Authentication check
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be signed in to use AI features.'
    );
  }

  const uid = context.auth.uid;
  const {
    prompt,
    feature,
    provider = 'groq',
    response_json_schema,
    temperature = 0.7,
    maxTokens = 2000,
    model,
  } = data;

  // Validate inputs
  if (!prompt || !feature) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Missing required fields: prompt and feature'
    );
  }

  if (!['planner', 'courage'].includes(feature)) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Feature must be "planner" or "courage"'
    );
  }

  try {
    // 2. Get user settings and subscription tier
    const userDoc = await firestore.collection('userSettings').doc(uid).get();

    if (!userDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'User settings not found. Please complete onboarding.'
      );
    }

    const userData = userDoc.data();
    const subscriptionTier = userData?.subscription_tier || 'free';
    let usage: UserUsage = userData?.usage || {
      planner_requests: 0,
      courage_uses: 0,
      reset_date: getNextMonthStart(),
    };

    // 3. Check if usage needs monthly reset
    const now = new Date();
    const resetDate = new Date(usage.reset_date);

    if (now >= resetDate) {
      // Reset usage counters for new month
      usage = {
        planner_requests: 0,
        courage_uses: 0,
        reset_date: getNextMonthStart(),
      };

      await firestore.collection('userSettings').doc(uid).update({
        usage,
        last_reset: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    // 4. Check quota based on tier and feature
    const quota = QUOTAS[subscriptionTier as keyof typeof QUOTAS] || QUOTAS.free;
    const usageKey = feature === 'planner' ? 'planner_requests' : 'courage_uses';
    const currentUsage = usage[usageKey];
    const limit = feature === 'planner' ? quota.planner : quota.courage;

    if (currentUsage >= limit) {
      // User has exceeded their quota
      if (subscriptionTier === 'free' && feature === 'courage') {
        throw new functions.https.HttpsError(
          'permission-denied',
          'Courage Chat requires a subscription. Upgrade to Mid or Top tier to unlock.'
        );
      } else if (subscriptionTier === 'free') {
        throw new functions.https.HttpsError(
          'resource-exhausted',
          `Free tier limit reached (${limit} planner requests/month). Upgrade to continue using AI features.`
        );
      } else if (subscriptionTier === 'mid' && feature === 'courage') {
        throw new functions.https.HttpsError(
          'resource-exhausted',
          `Monthly Courage Chat limit reached (${limit}/month). Upgrade to Top tier for unlimited access.`
        );
      } else {
        throw new functions.https.HttpsError(
          'resource-exhausted',
          `Monthly limit reached (${limit} requests). This prevents abuse. Contact support if you need more.`
        );
      }
    }

    // 5. Call AI provider (currently Groq, can add OpenAI later)
    let aiResponse;

    if (provider === 'groq') {
      const groqApiKey = functions.config().groq?.api_key || process.env.GROQ_API_KEY;

      if (!groqApiKey) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'AI service temporarily unavailable. Please try again later.'
        );
      }

      const groq = new Groq({ apiKey: groqApiKey });

      const systemPrompt = response_json_schema
        ? `You are a helpful assistant. Your response MUST be valid JSON that matches this schema:\n${JSON.stringify(
            response_json_schema,
            null,
            2
          )}\n\nRespond ONLY with valid JSON, no other text.`
        : 'You are a helpful assistant.';

      const completion = await groq.chat.completions.create({
        model: model || DEFAULT_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature,
        max_tokens: maxTokens,
      });

      const content = completion.choices[0]?.message?.content;

      if (!content) {
        throw new functions.https.HttpsError(
          'internal',
          'AI provider returned empty response'
        );
      }

      // Parse JSON if schema was provided
      if (response_json_schema) {
        try {
          // Strip markdown code fences if present (Groq often wraps JSON in ```json...```)
          let cleanedContent = content.trim();
          if (cleanedContent.startsWith('```')) {
            // Remove opening fence (```json or ```)
            cleanedContent = cleanedContent.replace(/^```(?:json)?\n?/, '');
            // Remove closing fence
            cleanedContent = cleanedContent.replace(/\n?```$/, '');
            cleanedContent = cleanedContent.trim();
          }

          aiResponse = JSON.parse(cleanedContent);
        } catch (parseError) {
          console.error('JSON parse error:', parseError, 'content:', content);
          aiResponse = { message: content };
        }
      } else {
        aiResponse = { message: content };
      }
    } else {
      throw new functions.https.HttpsError(
        'unimplemented',
        'Only Groq provider is currently supported'
      );
    }

    // 6. Increment usage counter atomically
    await firestore.collection('userSettings').doc(uid).update({
      [`usage.${usageKey}`]: admin.firestore.FieldValue.increment(1),
      last_ai_request: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 7. Return AI response with usage info
    return {
      ...aiResponse,
      _meta: {
        usage: currentUsage + 1,
        limit,
        tier: subscriptionTier,
        feature,
      },
    };
  } catch (error: any) {
    console.error('callAI error:', error);

    // Re-throw HttpsErrors
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    // Wrap unknown errors
    throw new functions.https.HttpsError(
      'internal',
      `AI request failed: ${error.message}`
    );
  }
});

/**
 * Get first day of next month at midnight UTC
 */
function getNextMonthStart(): string {
  const now = new Date();
  const nextMonth = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth() + 1,
    1,
    0, 0, 0, 0
  ));
  return nextMonth.toISOString();
}

/**
 * Create a Stripe Checkout Session for subscription upgrade
 * Returns the hosted checkout URL to redirect the user to
 */
export const createCheckoutSession = functions.https.onCall(async (
  data: { priceId: string; tier: 'mid' | 'top' },
  context
) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be signed in.');
  }

  const uid = context.auth.uid;
  const { priceId } = data;

  if (!priceId) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing priceId.');
  }

  try {
    const stripe = getStripe();
    const appUrl = functions.config().app?.url || 'http://localhost:5173';

    // Get or create Stripe customer
    const userDoc = await firestore.collection('userSettings').doc(uid).get();
    const userData = userDoc.data();
    let customerId: string = userData?.stripe_customer_id || '';

    if (!customerId) {
      // Look up user email from Firebase Auth
      const authUser = await admin.auth().getUser(uid);
      const customer = await stripe.customers.create({
        email: authUser.email,
        metadata: { uid },
      });
      customerId = customer.id;
      // Store the customer ID immediately
      await firestore.collection('userSettings').doc(uid).update({
        stripe_customer_id: customerId,
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/settings?upgrade=success`,
      cancel_url: `${appUrl}/settings`,
      allow_promotion_codes: true,
    });

    return { url: session.url };
  } catch (error: any) {
    console.error('createCheckoutSession error:', error);
    throw new functions.https.HttpsError('internal', `Checkout failed: ${error.message}`);
  }
});

/**
 * Create a Stripe Customer Portal session for subscription management
 * (cancel, upgrade/downgrade, update payment method)
 */
export const createPortalSession = functions.https.onCall(async (_data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be signed in.');
  }

  const uid = context.auth.uid;

  try {
    const stripe = getStripe();
    const appUrl = functions.config().app?.url || 'http://localhost:5173';

    const userDoc = await firestore.collection('userSettings').doc(uid).get();
    const customerId: string = userDoc.data()?.stripe_customer_id || '';

    if (!customerId) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'No subscription found. Please subscribe first.'
      );
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl}/settings`,
    });

    return { url: portalSession.url };
  } catch (error: any) {
    console.error('createPortalSession error:', error);
    if (error instanceof functions.https.HttpsError) throw error;
    throw new functions.https.HttpsError('internal', `Portal failed: ${error.message}`);
  }
});

/**
 * Webhook handler for Stripe subscription events
 * Called by Stripe when a user subscribes, upgrades, downgrades, or cancels
 *
 * Required Firebase Functions config:
 *   stripe.webhook_secret  — from Stripe Dashboard > Webhooks
 */
export const stripeWebhook = functions.https.onRequest(async (req, res) => {
  const stripe = getStripe();
  const webhookSecret = functions.config().stripe?.webhook_secret || process.env.STRIPE_WEBHOOK_SECRET || '';
  const sig = req.headers['stripe-signature'] as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  const midPriceId = functions.config().stripe?.mid_price_id || '';
  const topPriceId = functions.config().stripe?.top_price_id || '';
  const tierMapping: Record<string, string> = {
    [midPriceId]: 'mid',
    [topPriceId]: 'top',
  };

  try {
    if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated'
    ) {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      const priceId = subscription.items.data[0]?.price?.id || '';
      const tier = tierMapping[priceId] || 'free';

      const uid = await getUidFromCustomerId(stripe, customerId);
      if (uid) {
        await firestore.collection('userSettings').doc(uid).update({
          subscription_tier: tier,
          stripe_customer_id: customerId,
          subscription_status: subscription.status,
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`Updated ${uid} to tier "${tier}" (status: ${subscription.status})`);
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      const uid = await getUidFromCustomerId(stripe, customerId);
      if (uid) {
        await firestore.collection('userSettings').doc(uid).update({
          subscription_tier: 'free',
          subscription_status: 'canceled',
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`Downgraded ${uid} to free tier (subscription canceled)`);
      }
    }
  } catch (err: any) {
    console.error('Webhook handler error:', err.message);
    res.status(500).send('Internal error');
    return;
  }

  res.json({ received: true });
});

/**
 * Look up a Firebase UID from a Stripe customer ID
 * Uses the uid stored in customer metadata at creation time
 */
async function getUidFromCustomerId(stripe: Stripe, customerId: string): Promise<string | null> {
  try {
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted) return null;
    return (customer as Stripe.Customer).metadata?.uid || null;
  } catch (err) {
    console.error('getUidFromCustomerId error:', err);
    return null;
  }
}
