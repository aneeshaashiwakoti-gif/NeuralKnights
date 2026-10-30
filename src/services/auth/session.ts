import type { DemoUser } from '../../domain/types';

/**
 * Prototype session holder. Demonstration role switching only.
 * Token storage and refresh are UNRESOLVED until the backend auth contract is verified
 * (see INTEGRATION.md). Nothing here is a credential and nothing is sent to a server.
 */
const SESSION_KEY = 'aicte-smartflow:demo-session:v1';

export function readDemoSession(): string | null {
  try {
    return typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(SESSION_KEY) : null;
  } catch {
    return null;
  }
}

export function writeDemoSession(user: DemoUser | null): void {
  try {
    if (typeof sessionStorage === 'undefined') return;
    if (user) sessionStorage.setItem(SESSION_KEY, user.id);
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Storage unavailable: session is kept in memory only.
  }
}
