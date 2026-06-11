import asyncio
import json
from queue import Empty, Queue
from threading import Thread

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from engine import FlowerDeliveryEngine

app = FastAPI(title="Flower Delivery Visualizer API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.websocket("/ws/solve")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        config_text = await websocket.receive_text()
        pretest_data = json.loads(config_text)

        q: Queue = Queue()
        engine = FlowerDeliveryEngine(message_queue=q, pretest_data=pretest_data, live_mode=True)
        thread = Thread(target=engine.startup, daemon=True)
        thread.start()

        while thread.is_alive() or not q.empty():
            try:
                msg = q.get_nowait()
                await websocket.send_json(msg)
                if msg.get("event") == "DONE":
                    break
                await asyncio.sleep(0.05)
            except Empty:
                await asyncio.sleep(0.05)

        thread.join(timeout=5.0)
    except WebSocketDisconnect:
        print("Client disconnected.")
