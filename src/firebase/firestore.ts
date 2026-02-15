import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  QueryConstraint,
  Timestamp,
  addDoc,
  waitForPendingWrites,
} from 'firebase/firestore';
import { db } from './config';
import { auth } from './config';

// Event type
export interface Event {
  id?: string;
  user_id?: string;
  title: string;
  description?: string;
  date: string;
  start_time?: string;
  end_time?: string;
  category?: string;
  location?: string;
  is_all_day?: boolean;
  is_recurring?: boolean;
  recurrence_rule?: string;
  recurrence_days?: string[];
  parent_event_id?: string;
  completed?: boolean;
  missed?: boolean;
  notes?: string;
  original_input?: string;
  created_at?: string;
  updated_at?: string;
}

// UserSettings type
export interface UserSettings {
  id?: string;
  user_email: string;
  user_id?: string;
  theme?: string;
  language?: string;
  time_format?: string;
  week_starts_on?: string;
  default_event_duration?: number;
  notifications_enabled?: boolean;
  reminder_time?: number;
  default_category?: string;
  ai_provider?: string;
  subscription_tier?: 'free' | 'mid' | 'top';
  usage?: {
    planner_requests: number;
    courage_uses: number;
    reset_date: string;
  };
  stripe_customer_id?: string;
  subscription_status?: string;
  last_reset?: string;
  last_ai_request?: string;
  personalizations?: Array<{
    id: string;
    text: string;
    enabled: boolean;
    created_at: string;
  }>;
  created_at?: string;
  updated_at?: string;
}

// Courage chat message type
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

// Saved Courage chat type
export interface CourageChat {
  id?: string;
  user_id?: string;
  title: string;
  messages: ChatMessage[];
  created_at?: string;
  updated_at?: string;
}

// Event CRUD operations
export const eventService = {
  // Create event
  async create(eventData: Event): Promise<Event> {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const eventToSave = {
      ...eventData,
      user_id: user.uid,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const docRef = await addDoc(collection(db, 'events'), eventToSave);

    // Wait for Firestore to confirm the write on the server
    await waitForPendingWrites(db);

    return { ...eventData, id: docRef.id, user_id: user.uid };
  },

  // Get all events for current user (sorted by date)
  async list(sortBy: string = 'date'): Promise<Event[]> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      const q = query(
        collection(db, 'events'),
        where('user_id', '==', user.uid)
      );
      const querySnapshot = await getDocs(q);

      const events = querySnapshot.docs.map((doc) => {
        return {
          id: doc.id,
          ...doc.data(),
        } as Event;
      });

      // Sort client-side
      events.sort((a, b) => {
        const dateA = a.date || '';
        const dateB = b.date || '';
        if (sortBy === '-date') {
          return dateB.localeCompare(dateA);
        }
        return dateA.localeCompare(dateB);
      });

      return events;
    } catch (error) {
      console.error('eventService.list error:', error);
      throw error;
    }
  },

  // Get event by ID
  async get(eventId: string): Promise<Event | null> {
    const docRef = doc(db, 'events', eventId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return null;

    return {
      id: docSnap.id,
      ...docSnap.data(),
    } as Event;
  },

  // Update event
  async update(eventId: string, data: Partial<Event>): Promise<void> {
    const docRef = doc(db, 'events', eventId);
    await updateDoc(docRef, {
      ...data,
      updated_at: new Date().toISOString(),
    });
  },

  // Delete event
  async delete(eventId: string): Promise<void> {
    await deleteDoc(doc(db, 'events', eventId));
  },

  // Filter events by criteria
  async filter(criteria: Record<string, any>): Promise<Event[]> {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const constraints: QueryConstraint[] = [where('user_id', '==', user.uid)];

    // Add custom filters
    for (const [key, value] of Object.entries(criteria)) {
      if (key !== 'user_id') {
        constraints.push(where(key, '==', value));
      }
    }

    const q = query(collection(db, 'events'), ...constraints);
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as Event));
  },
};

// Helper: Get first day of next month at midnight UTC
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

// UserSettings CRUD operations
export const userSettingsService = {
  // Create or update settings
  async create(settingsData: UserSettings): Promise<UserSettings> {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const docRef = await addDoc(collection(db, 'userSettings'), {
      ...settingsData,
      user_id: user.uid,
      user_email: settingsData.user_email || user.email,
      subscription_tier: settingsData.subscription_tier || 'free',
      usage: settingsData.usage || {
        planner_requests: 0,
        courage_uses: 0,
        reset_date: getNextMonthStart(),
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    return { ...settingsData, id: docRef.id, user_id: user.uid };
  },

  // Get settings by ID
  async get(settingsId: string): Promise<UserSettings | null> {
    const docRef = doc(db, 'userSettings', settingsId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return null;

    return {
      id: docSnap.id,
      ...docSnap.data(),
    } as UserSettings;
  },

  // Get settings for current user
  async getForCurrentUser(): Promise<UserSettings | null> {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const q = query(
      collection(db, 'userSettings'),
      where('user_id', '==', user.uid)
    );
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) return null;

    const doc = querySnapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    } as UserSettings;
  },

  // Update settings
  async update(settingsId: string, data: Partial<UserSettings>): Promise<void> {
    const docRef = doc(db, 'userSettings', settingsId);
    await updateDoc(docRef, {
      ...data,
      updated_at: new Date().toISOString(),
    });
  },

  // Delete settings
  async delete(settingsId: string): Promise<void> {
    await deleteDoc(doc(db, 'userSettings', settingsId));
  },

  // Filter settings
  async filter(criteria: Record<string, any>): Promise<UserSettings[]> {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const constraints: QueryConstraint[] = [
      where('user_id', '==', user.uid),
    ];

    for (const [key, value] of Object.entries(criteria)) {
      if (key !== 'user_id') {
        constraints.push(where(key, '==', value));
      }
    }

    const q = query(collection(db, 'userSettings'), ...constraints);
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as UserSettings));
  },
};

// Courage Chat CRUD operations
export const courageChatService = {
  async create(chatData: CourageChat): Promise<CourageChat> {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const docRef = await addDoc(collection(db, 'courageChats'), {
      ...chatData,
      user_id: user.uid,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    return { ...chatData, id: docRef.id, user_id: user.uid };
  },

  async list(): Promise<CourageChat[]> {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const q = query(
      collection(db, 'courageChats'),
      where('user_id', '==', user.uid)
    );
    const querySnapshot = await getDocs(q);

    const chats = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as CourageChat));

    chats.sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''));
    return chats;
  },

  async update(chatId: string, data: Partial<CourageChat>): Promise<void> {
    const docRef = doc(db, 'courageChats', chatId);
    await updateDoc(docRef, {
      ...data,
      updated_at: new Date().toISOString(),
    });
  },

  async delete(chatId: string): Promise<void> {
    await deleteDoc(doc(db, 'courageChats', chatId));
  },
};
