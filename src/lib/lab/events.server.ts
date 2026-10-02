import { EventEmitter } from "node:events";
import type { LabStreamEvent } from "./stream-events";

// In-process publish/subscribe for live Support Lab updates. One app process
// serves the demo (see Dockerfile); scaling out would need a shared broker
// such as PostgreSQL LISTEN/NOTIFY instead of this emitter.

export type LabEvent = LabStreamEvent & { conversationId: string };

const globalBus = globalThis as typeof globalThis & {
  __supportLabEvents?: EventEmitter;
};
// Reuse one emitter across dev hot reloads.
const bus = (globalBus.__supportLabEvents ??= new EventEmitter());
bus.setMaxListeners(0);

export function publishLabEvent(event: LabEvent) {
  bus.emit(event.conversationId, event);
}

export function subscribeLabEvents(
  conversationId: string,
  listener: (event: LabEvent) => void,
) {
  bus.on(conversationId, listener);
  return () => {
    bus.off(conversationId, listener);
  };
}
