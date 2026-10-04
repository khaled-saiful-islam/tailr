/**
 * Live events from the server (SSE). One connection per tab, opened by
 * `useLiveConnection` in the app shell. Features subscribe with `useLiveEvent`.
 *
 * Events are hints that something changed; handlers refetch real data, so a
 * dropped connection never loses state (EventSource reconnects on its own).
 */
import { useEffect, useRef } from "react";

export interface LiveEvent<T = Record<string, unknown>> {
  type: string;
  data: T;
  at: string;
}

type Listener = (event: LiveEvent) => void;

const listeners = new Map<string, Set<Listener>>();
const attached = new Set<string>();
let source: EventSource | null = null;
let connections = 0;

function attach(type: string): void {
  if (!source || attached.has(type)) return;
  attached.add(type);
  source.addEventListener(type, (message) => {
    let event: LiveEvent;
    try {
      event = JSON.parse((message as MessageEvent<string>).data) as LiveEvent;
    } catch {
      return;
    }
    listeners.get(type)?.forEach((listener) => listener(event));
  });
}

/** Keep the SSE connection open while the signed-in app is mounted. */
export function useLiveConnection(): void {
  useEffect(() => {
    connections += 1;
    if (!source && typeof EventSource !== "undefined") {
      source = new EventSource("/api/v1/events", { withCredentials: true });
      attached.clear();
      listeners.forEach((_, type) => attach(type));
    }
    return () => {
      connections -= 1;
      if (connections <= 0 && source) {
        source.close();
        source = null;
        attached.clear();
      }
    };
  }, []);
}

/** Run `handler` whenever the server announces an event of `type`. */
export function useLiveEvent<T = Record<string, unknown>>(
  type: string,
  handler: (event: LiveEvent<T>) => void,
): void {
  const latest = useRef(handler);
  useEffect(() => {
    latest.current = handler;
  });
  useEffect(() => {
    const listener: Listener = (event) => latest.current(event as LiveEvent<T>);
    const set = listeners.get(type) ?? new Set<Listener>();
    set.add(listener);
    listeners.set(type, set);
    attach(type);
    return () => {
      set.delete(listener);
    };
  }, [type]);
}
