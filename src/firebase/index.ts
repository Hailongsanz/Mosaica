// Firebase configuration
export { auth, db, storage, default as app } from './config';

// Authentication service
export * from './auth';

// Firestore service
export { eventService, userSettingsService } from './firestore';
export type { Event, UserSettings } from './firestore';

// Storage service
export { storageService } from './storage';
export type { UploadResult } from './storage';

// LLM service
export { llmService } from './llm';
export type { LLMResponse, LLMOptions } from './llm';
