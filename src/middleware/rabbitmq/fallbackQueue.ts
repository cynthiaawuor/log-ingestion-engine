import type { EnrichedLog } from "../../enricher/enricher.js";

const fallbackQueue: EnrichedLog[] = [];

export function addToFallbackQueue(log: EnrichedLog) {
  fallbackQueue.push(log);

  console.warn(
    `Log stored in fallback queue. Queue size: ${fallbackQueue.length}`,
  );
}

export function getFallbackQueue() {
  return fallbackQueue;
}

export function removeFromFallbackQueue() {
  return fallbackQueue.shift();
}
