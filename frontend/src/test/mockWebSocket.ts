import { vi, type Mock } from "vitest";
import type { EngineEvent } from "../domain/types";

type WebSocketHandler = ((event: Event) => void) | null;

export class MockWebSocket {
  static OPEN = 1;
  static instances: MockWebSocket[] = [];

  url: string;
  readyState = 0;
  onopen: WebSocketHandler = null;
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  onerror: WebSocketHandler = null;
  onclose: WebSocketHandler = null;
  send: Mock;
  close: Mock;

  constructor(url: string) {
    this.url = url;
    this.send = vi.fn();
    this.close = vi.fn();
    MockWebSocket.instances.push(this);
  }

  static reset() {
    MockWebSocket.instances = [];
  }

  static latest(): MockWebSocket {
    const socket = MockWebSocket.instances.at(-1);
    if (!socket) throw new Error("No mock websocket instance");
    return socket;
  }

  open() {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.(new Event("open"));
  }

  emitMessage(payload: EngineEvent) {
    this.onmessage?.({ data: JSON.stringify(payload) } as MessageEvent<string>);
  }

  emitError() {
    this.onerror?.(new Event("error"));
  }

  emitClose() {
    this.onclose?.(new Event("close"));
  }
}

export function installMockWebSocket() {
  MockWebSocket.reset();
  vi.stubGlobal("WebSocket", MockWebSocket);
}
