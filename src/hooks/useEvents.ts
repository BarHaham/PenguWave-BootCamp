import { useCallback, useEffect, useState } from "react";
import type { SecurityEvent } from "../types";
import { fetchEvents } from "../data/eventsSource";

type Status = "loading" | "success" | "error";

interface EventsState {
  status: Status;
  events: SecurityEvent[];
  dropped: number; // count of unusable records the API returned
  error: string | null;
  reload: () => void;
}

/**
 * Loads and owns the events collection. Exposes an explicit status machine so
 * the UI can render skeletons, an error state with retry, and empty states —
 * none of which the original page (which imported the JSON synchronously) could
 * do.
 */
export function useEvents(): EventsState {
  const [status, setStatus] = useState<Status>("loading");
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [dropped, setDropped] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    // Resetting to a loading state on (re)load is the intended behavior for a
    // data-fetching effect; the lint rule's cascading-render concern doesn't
    // apply to a one-shot fetch lifecycle.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatus("loading");
    setError(null);

    fetchEvents(controller.signal)
      .then((result) => {
        setEvents(result.events);
        setDropped(result.dropped);
        setStatus("success");
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Failed to load events");
        setStatus("error");
      });

    return () => controller.abort();
  }, [reloadKey]);

  return { status, events, dropped, error, reload };
}
