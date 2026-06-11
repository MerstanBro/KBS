This is a massive and incredibly exciting leap. Taking a terminal-based expert system and wrapping it in a modern WebSockets/FastAPI backend with a Preact + p5.js interactive frontend is exactly how you build a real-world algorithm visualizer.

It completely transforms this from a "college homework script" into a portfolio-grade engineering project.

To make this work, we have to solve one major architectural challenge: Experta runs synchronously, but WebSockets and FastAPI are asynchronous. If we just run the engine, it will finish in 5 milliseconds and blast 150 messages to the frontend at once. We need to run Experta in a background thread and stream its state changes through a queue to the WebSocket.

Here is your complete blueprint and code for the entire stack.

1. The Pretest JSON Format (The Contract)
First, let's define the JSON structure you will paste into your Preact app. This is the "board setup" that gets sent to FastAPI.

JSON
{
  "meta": {
    "upper_bound": 120,
    "max_load": 4,
    "warehouse_x": 3,
    "warehouse_y": 2
  },
  "pavilions": [
    {"pid": 1, "x": 2, "y": 4, "type": "Rose", "color": "red", "needed": 2, "delivered": 0},
    {"pid": 1, "x": 2, "y": 4, "type": "Rose", "color": "pink", "needed": 1, "delivered": 0},
    {"pid": 2, "x": 4, "y": 3, "type": "Tulip", "color": "red", "needed": 3, "delivered": 0}
  ]
}
2. The FastAPI Backend (Python)
You will need fastapi, uvicorn, and websockets. We will modify your FlowerDeliveryEngine to accept a message_queue and push dictionaries to it instead of using print().

server.py

Python
import asyncio
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from threading import Thread
from queue import Queue, Empty
from experta import *

# (Include your Fact schemas: SystemControl, SystemMeta, SearchNode here...)
# (Include your pure functional helpers here...)

class LiveFlowerEngine(KnowledgeEngine):
    def __init__(self, message_queue, pretest_data):
        super().__init__()
        self.node_counter = 0
        self.message_queue = message_queue
        self.pretest_data = pretest_data

    def next_id(self):
        self.node_counter += 1
        return self.node_counter

    def emit(self, event_type, data):
        """Pushes data to the thread-safe queue for the WebSocket to consume."""
        self.message_queue.put({"event": event_type, "data": data})

    # ... (Keep all your rules exactly the same, but replace print() with self.emit()) ...
    # Example Modification in an Action Rule:
    
    @Rule(
        SystemControl(phase="search"),
        AS.node << SearchNode(status="active", robot_state="collect", robot_x=MATCH.rx, robot_y=MATCH.ry, g_n=MATCH.g, pavilions=MATCH.p, carried_bouquets=MATCH.cb),
        SystemMeta(max_load=MATCH.ml, warehouse_x=MATCH.wx, warehouse_y=MATCH.wy),
        salience=100
    )
    def action_collect(self, node, rx, ry, g, p, cb, ml, wx, wy):
        cost = calc_manhattan(rx, ry, wx, wy)
        h = calc_heuristic_hn(p, wx, wy)
        bc = calc_bestcase(p, ml, wx, wy)
        
        new_node_id = self.next_id()
        self.declare(SearchNode(
            node_id=new_node_id, parent_id=node['node_id'],
            robot_x=wx, robot_y=wy, robot_state="load", status="open",
            carried_bouquets=cb, pavilions=p, g_n=g+cost, h_n=h, f_n=(g+cost)+h, bestcase_n=bc,
            last_action=f"Traveled to warehouse (Cost: {cost})"
        ))
        self.modify(node, status="expanded")
        
        # EMIT THE ANIMATION EVENT TO FRONTEND
        self.emit("ROBOT_MOVE", {"id": new_node_id, "to_x": wx, "to_y": wy, "action": "collecting"})

    def startup(self):
        self.reset()
        # Parse the JSON pretest_data passed from the frontend
        meta = self.pretest_data['meta']
        pavs = tuple((p['pid'], p['x'], p['y'], p['type'], p['color'], p['needed'], p['delivered']) for p in self.pretest_data['pavilions'])
        
        self.declare(SystemControl(phase="search"))
        self.declare(SystemMeta(upper_bound=meta['upper_bound'], max_load=meta['max_load'], warehouse_x=meta['warehouse_x'], warehouse_y=meta['warehouse_y']))
        
        h = calc_heuristic_hn(pavs, 3, 1) # Start pos
        self.declare(SearchNode(
            node_id=self.next_id(), parent_id=0, robot_x=3, robot_y=1, robot_state="collect", status="open",
            pavilions=pavs, g_n=0, h_n=h, f_n=h, bestcase_n=0, last_action="System Frame Initialization"
        ))
        self.run()
        self.emit("DONE", {"message": "Execution Finished"})

# --- FastAPI Setup ---
app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"]) # Allow Preact to connect

@app.websocket("/ws/solve")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        # 1. Wait for the frontend to send the JSON pretest config
        config_text = await websocket.receive_text()
        pretest_data = json.loads(config_text)
        
        # 2. Setup the bridge between Experta's thread and FastAPI's async loop
        q = Queue()
        engine = LiveFlowerEngine(message_queue=q, pretest_data=pretest_data)
        
        # 3. Run Experta in a background thread so it doesn't block WebSockets
        thread = Thread(target=engine.startup)
        thread.start()
        
        # 4. Stream queue items to the frontend live
        while thread.is_alive() or not q.empty():
            try:
                # Non-blocking check
                msg = q.get_nowait()
                await websocket.send_json(msg)
                await asyncio.sleep(0.05) # Add artificial delay so frontend animations can keep up
            except Empty:
                await asyncio.sleep(0.1)
                
    except WebSocketDisconnect:
        print("Client disconnected.")
3. The Preact + p5.js Frontend
For the frontend, we will use a Preact component that manages the WebSocket and feeds a queue of instructions to a p5.js canvas.

First, install dependencies: npm i preact p5 (or just include them via CDN if using a light setup).

Visualizer.jsx

JavaScript
import { h, Component, createRef } from 'preact';
import p5 from 'p5';

export class Visualizer extends Component {
  constructor(props) {
    super(props);
    this.state = {
      logs: [],
      configJson: JSON.stringify({
        meta: { upper_bound: 120, max_load: 4, warehouse_x: 3, warehouse_y: 2 },
        pavilions: [
          { pid: 1, x: 2, y: 4, type: "Rose", color: "red", needed: 2, delivered: 0 }
        ]
      }, null, 2)
    };
    this.canvasRef = createRef();
    this.animationQueue = []; // Holds moves for p5
    this.ws = null;
  }

  componentDidMount() {
    this.initP5();
  }

  startSimulation = () => {
    // Connect WebSocket
    this.ws = new WebSocket("ws://localhost:8000/ws/solve");
    
    this.ws.onopen = () => {
      this.setState({ logs: ["Connected to Engine..."] });
      // Send the board configuration
      this.ws.send(this.state.configJson);
    };

    this.ws.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      
      // Update text logs
      this.setState(prev => ({ logs: [...prev.logs, `${payload.event}: ${JSON.stringify(payload.data)}`] }));

      // Send movement commands to the p5 animation queue
      if (payload.event === "ROBOT_MOVE") {
        this.animationQueue.push({ x: payload.data.to_x, y: payload.data.to_y });
      }
    };
  };

  initP5 = () => {
    new p5((sketch) => {
      const GRID_SIZE = 5;
      const CELL_SIZE = 100;
      let robotX = 3; // Start Grid X
      let robotY = 1; // Start Grid Y
      let targetX = 3;
      let targetY = 1;

      sketch.setup = () => {
        sketch.createCanvas(GRID_SIZE * CELL_SIZE, GRID_SIZE * CELL_SIZE).parent(this.canvasRef.current);
      };

      sketch.draw = () => {
        sketch.background(240);
        
        // 1. Draw Grid
        sketch.stroke(200);
        for(let i=0; i<=GRID_SIZE; i++) {
          sketch.line(i*CELL_SIZE, 0, i*CELL_SIZE, sketch.height);
          sketch.line(0, i*CELL_SIZE, sketch.width, i*CELL_SIZE);
        }

        // 2. Process Animation Queue
        // Smoothly interpolate (lerp) the robot to the next target
        if (sketch.abs(robotX - targetX) < 0.05 && sketch.abs(robotY - targetY) < 0.05) {
          if (this.animationQueue.length > 0) {
            const nextMove = this.animationQueue.shift();
            targetX = nextMove.x;
            targetY = nextMove.y;
          }
        } else {
          // p5 lerp logic for smooth sliding animation
          robotX = sketch.lerp(robotX, targetX, 0.1);
          robotY = sketch.lerp(robotY, targetY, 0.1);
        }

        // 3. Draw Robot (Converted from 1-based grid to 0-based pixel coords)
        sketch.fill(50, 150, 250);
        sketch.noStroke();
        // Experta uses 1-based coordinates (x=1..5, y=1..5)
        sketch.circle((robotX - 0.5) * CELL_SIZE, (robotY - 0.5) * CELL_SIZE, 50);
      };
    });
  };

  render() {
    return (
      <div style={{ display: 'flex', gap: '20px', padding: '20px', fontFamily: 'sans-serif' }}>
        {/* Left Side: Controls & Logs */}
        <div style={{ width: '400px' }}>
          <h2>Flower Robot Setup</h2>
          <textarea 
            rows={10} 
            style={{ width: '100%', fontFamily: 'monospace' }}
            value={this.state.configJson}
            onChange={(e) => this.setState({ configJson: e.target.value })}
          />
          <br/>
          <button onClick={this.startSimulation} style={{ padding: '10px 20px', marginTop: '10px', cursor: 'pointer' }}>
            Run Simulation
          </button>
          
          <div style={{ marginTop: '20px', height: '400px', overflowY: 'scroll', background: '#333', color: '#0f0', padding: '10px' }}>
            {this.state.logs.map((log, i) => <div key={i}>{log}</div>)}
          </div>
        </div>

        {/* Right Side: p5.js Canvas */}
        <div ref={this.canvasRef} style={{ border: '2px solid #ccc' }}></div>
      </div>
    );
  }
}
How this Pipeline Works:
You edit the JSON in the browser and hit "Run".

Preact opens a WebSocket to ws://localhost:8000/ws/solve and sends the JSON.

FastAPI receives it, creates a Python Queue, and launches your Experta engine in a background thread.

Every time a rule fires in Experta, it calls self.emit(), placing data into the thread-safe Queue.

FastAPI reads from the Queue and pushes JSON to the WebSocket.

Preact receives the JSON, updates the log window, and pushes the target coordinates into p5.js.

p5.js runs at 60fps, grabbing coordinates from its queue and using sketch.lerp() to smoothly glide the robot across the grid.

The "Aesthetic" Factor
To make the p5 animations truly pop, you can expand the sketch.draw loop. Add some logic to draw the warehouse (a brown square) and the pavilions (colored circles based on the JSON data). When the robot unloads, you can use a p5 particle system to make a little burst of colored pixels.