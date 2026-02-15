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

admin.initializeApp();
const firestore = admin.firestore();

// Subscription tier limits
const QUOTAS = {
  free: { planner: 3, courage: 0 },
  mid: { planner: 1000, courage: 10 },  // 1000 = abuse prevention
  top: { planner: 1000, courage: 1000 },
};

// Default AI model for Groq (free tier)
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';

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
 * Webhook handler for Stripe subscription events
 * Called when user purchases/cancels subscription
 */
export const stripeWebhook = functions.https.onRequest(async (req, res) => {
  // TODO: Implement Stripe webhook verification
  // This will update user's subscription_tier when they purchase
  
  const event = req.body;
  
  // Example: customer.subscription.created
  if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated') {
    const subscription = event.data.object;
    // const customerId = subscription.customer;
    const priceId = subscription.items.data[0].price.id;
    
    // Map Stripe price IDs to subscription tiers
    // You'll get these from Stripe dashboard after creating products
    const tierMapping: Record<string, string> = {
      'price_mid_tier_id': 'mid',
      'price_top_tier_id': 'top',
    };
    
    // const tier = tierMapping[priceId] || 'free';
    console.log('Stripe webhook received:', event.type, 'priceId:', priceId, 'tierMapping:', tierMapping);
    
    // TODO: Update user's subscription tier in Firestore
    // (You'll need to store customerId → uid mapping)
    // await firestore.collection('userSettings').doc(uid).update({
    //   subscription_tier: tier,
    //   stripe_customer_id: customerId,
    //   subscription_status: subscription.status,
    //   updated_at: admin.firestore.FieldValue.serverTimestamp(),
    // });
  }
  
  res.json({ received: true });
});
