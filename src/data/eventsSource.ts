import rawEvents from "../../data/mock_events.json";
import { normalizeEvents, type NormalizeResult } from "./normalize";

/**
 * Simulated events API.
 *
 * The app ships frontend-only, but components shouldn't bake in that assumption —
 * they consume events through an async function that mirrors what a real
 * `GET /api/events` call would look like (latency + possible failure). Swapping
 * this for `fetch("/api/events")` later is a one-line change.
 */
export async function fetchEvents(signal?: AbortSignal): Promise<NormalizeResult> {
  await delay(450, signal); // surface skeleton/loading states
  // A real client would `await fetch(...)` and JSON-parse here.
  return normalizeEvents(rawEvents);
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException("Aborted", "AbortError"));
    const id = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(id);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });
}
