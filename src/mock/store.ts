import { SEED } from './seed';
import type { AuditEvent, DemoDataset, DemoUser } from '../domain/types';

/**
 * Shared in-memory demonstration state, persisted to localStorage so changes survive
 * reloads. This is a PROTOTYPE store: it is not a backend, not tamper-evident, and
 * not a source of regulatory truth. Services read/write through this module only.
 */
const STORAGE_KEY = 'aicte-smartflow:demo-state:v3';

type Listener = () => void;
const listeners = new Set<Listener>();

let state: DemoDataset = load();
let lastDataRefresh = loadLastDataRefresh();

function loadLastDataRefresh(): string {
  try {
    const stored = typeof localStorage !== 'undefined'
      ? localStorage.getItem('aicte-smartflow:last-data-refresh')
      : null;
    return stored && !Number.isNaN(Date.parse(stored)) ? stored : new Date().toISOString();
  } catch (error) {
    console.warn('Unable to read the last data refresh time.', error);
    return new Date().toISOString();
  }
}

function isDatasetShape(value: unknown): value is DemoDataset {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    ['institutions', 'users', 'applications', 'queries', 'observations', 'checklistItems', 'auditEvents', 'evcVisits', 'undertakings', 'documents', 'alerts'].every(
      (k) => Array.isArray(v[k]),
    ) &&
    typeof v.policy === 'object' &&
    typeof v.workflowEnabled === 'object' &&
    typeof v.workflowStagesEnabled === 'object'
  );
}

function load(): DemoDataset {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (isDatasetShape(parsed)) return parsed;
    }
  } catch {
    // Corrupt or unavailable storage: fall back to seed data.
  }
  return structuredClone(SEED);
}

/** Unique-enough demonstration IDs: prefix + count + short random suffix. */
export function nextId(prefix: string, existing: { id: string }[]): string {
  const n = existing.length + 1;
  return `${prefix}-${String(n).padStart(4, '0')}-${Math.random().toString(36).slice(2, 6)}`;
}

function persist(): void {
  lastDataRefresh = new Date().toISOString();
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      localStorage.setItem('aicte-smartflow:last-data-refresh', lastDataRefresh);
    }
  } catch (error) {
    console.warn('Unable to persist the application data store.', error);
  }
}

export function getState(): DemoDataset {
  return state;
}

export function getLastDataRefresh(): string {
  return lastDataRefresh;
}

export function setState(updater: (prev: DemoDataset) => DemoDataset): void {
  state = updater(state);
  persist();
  listeners.forEach((l) => l());
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function resetDemoData(): void {
  state = structuredClone(SEED);
  persist();
  listeners.forEach((l) => l());
}

export function findUser(userId: string): DemoUser | undefined {
  return state.users.find((u) => u.id === userId);
}

/**
 * Applies a mutation to a deep copy of the state and commits it in ONE step, so the
 * application, its queries/observations and the audit event change together or not at all.
 * The callback must be synchronous and must not throw after partially mutating the draft
 * (validate first, then mutate).
 */
export function transact(mutator: (draft: DemoDataset) => void): void {
  const draft = structuredClone(state);
  mutator(draft);
  state = draft;
  persist();
  listeners.forEach((l) => l());
}

/** Pushes an audit event onto a draft. Used inside `transact` only. */
export function pushAudit(draft: DemoDataset, event: Omit<AuditEvent, 'id' | 'timestamp'>): void {
  draft.auditEvents.unshift({ ...event, id: nextId('aud', draft.auditEvents), timestamp: new Date().toISOString() });
}
