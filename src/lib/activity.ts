// Sale-staff activity tracking (see supabase/migrations/0006_activity_tracking.sql).
//
// Events are buffered in memory and posted in batches straight to PostgREST under
// the "own_insert_activity" RLS policy — there is no Edge Function in this path.
// A function would only buy a server-set user_id and timestamp, which the
// activity_events BEFORE INSERT trigger already does, and it could not tell a
// real click from a scripted one either.

import { demoStore } from './demoStore';
import { isDemoMode, supabase, supabaseAnonKey, supabaseUrl } from './supabase';
import type { ActivityEventType } from './types';

/** A row on its way to activity_events; `id` is assigned by the database. */
export interface PendingEvent {
  user_id: string;
  occurred_at: string;
  event_type: ActivityEventType;
  university_id: string | null;
  detail: string;
  result_count: number | null;
}

const FLUSH_AFTER_MS = 10_000;
const FLUSH_AT_COUNT = 20;
/** An offline tab must not grow without bound; oldest events are dropped. */
const MAX_BUFFERED = 200;

let buffer: PendingEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

// The unload flush needs the token synchronously, so it is cached rather than
// awaited from getSession(). Supabase JWTs expire hourly, which is why
// TOKEN_REFRESHED matters as much as SIGNED_IN here.
let token: string | null = null;
let userId: string | null = null;
let initialised = false;

/**
 * Start caching the session and register the flush-on-leave listeners.
 * Called once from AuthContext; safe to call again.
 */
export function initActivity(): void {
  if (initialised || isDemoMode || !supabase) return;
  initialised = true;

  void supabase.auth.getSession().then(({ data }) => {
    token = data.session?.access_token ?? null;
    userId = data.session?.user.id ?? null;
  });

  supabase.auth.onAuthStateChange((_event, session) => {
    token = session?.access_token ?? null;
    userId = session?.user.id ?? null;
  });

  // visibilitychange covers tab close, tab switch, minimise and mobile
  // backgrounding; pagehide covers iOS Safari and bfcache restores.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flushActivity();
  });
  window.addEventListener('pagehide', () => void flushActivity());
}

interface TrackOptions {
  universityId?: string | null;
  detail?: string;
  resultCount?: number | null;
}

/** Queue one semantic action. Never throws — tracking must not break the app. */
export function trackEvent(type: ActivityEventType, opts: TrackOptions = {}): void {
  const row: PendingEvent = {
    // Overwritten by the trigger in live mode; sent anyway so the payload is
    // self-describing and stays correct if the trigger is ever dropped.
    user_id: userId ?? '',
    occurred_at: new Date().toISOString(),
    event_type: type,
    university_id: opts.universityId ?? null,
    detail: (opts.detail ?? '').slice(0, 120),
    result_count: opts.resultCount ?? null,
  };

  if (isDemoMode) {
    demoStore.recordActivityEvents([row]);
    return;
  }

  buffer.push(row);
  if (buffer.length > MAX_BUFFERED) buffer = buffer.slice(-MAX_BUFFERED);

  if (buffer.length >= FLUSH_AT_COUNT) {
    void flushActivity();
    return;
  }
  // Armed on the first event only, so an idle tab schedules nothing.
  if (!flushTimer) flushTimer = setTimeout(() => void flushActivity(), FLUSH_AFTER_MS);
}

/** Send everything buffered. Failures drop the batch — this is telemetry. */
export async function flushActivity(): Promise<void> {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (isDemoMode || buffer.length === 0) return;
  if (!token || !userId) return; // signed out mid-session; nothing to attribute

  const rows = buffer.map((row) => ({ ...row, user_id: userId! }));
  buffer = [];

  try {
    await fetch(`${supabaseUrl}/rest/v1/activity_events`, {
      method: 'POST',
      keepalive: true, // survives the page going away, unlike a normal fetch
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        // Load-bearing: asking PostgREST for the inserted rows back would need a
        // select policy sale users must not have, and the insert would fail.
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(rows),
    });
  } catch (err) {
    console.warn('activity flush failed:', err);
  }
}
