# Flower Delivery Planner

An interactive visualizer for a flower-delivery robot pathfinding problem. The backend runs an **Experta**-based A* search engine (Python/FastAPI), and the frontend is a **Preact + Vite** wizard that lets you configure the board, place orders, and watch the simulation stream live over WebSockets.

## Prerequisites

| Tool | Version |
|------|---------|
| [Python](https://www.python.org/downloads/) | 3.10+ recommended |
| [Node.js](https://nodejs.org/) | 18+ (includes npm) |

Verify your setup:

```bash
python --version
node --version
npm --version
```

## Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd KBS_final
```

### 2. Python backend

Create and activate a virtual environment (recommended):

```bash
# Windows (PowerShell)
python -m venv .venv
.venv\Scripts\Activate.ps1

# macOS / Linux
python -m venv .venv
source .venv/bin/activate
```

Install Python dependencies:

```bash
pip install -r requirements.txt
```

### 3. Node.js dependencies

Install root and frontend packages:

```bash
npm install
npm install --prefix frontend
```

## Running the project

### Development (recommended)

From the project root, start both the backend and frontend together:

```bash
npm run dev
```

This will:

- Start the FastAPI server at **http://127.0.0.1:8010**
- Start the Vite dev server at **http://localhost:5173**
- Proxy WebSocket traffic from the frontend (`/ws`) to the backend

Open **http://localhost:5173** in your browser to use the app.

> On Windows, `npm run dev` automatically frees ports `8010` and `5173` if they are already in use.

### Run backend or frontend separately

```bash
# Backend only (port 8010)
npm run dev:backend

# Frontend only (port 5173)
npm run dev:frontend
```

### Standalone Python engine (terminal)

Run the Experta engine without the web UI:

```bash
python main.py
```

## Using the app

The UI is a three-step wizard:

1. **Board layout** — Set grid size, warehouse position, robot start, and max load.
2. **Orders** — Add pavilions and flower orders.
3. **Simulation** — Run the solver and explore the search tree, solution playback, and live board animation.

The frontend sends board configuration to the backend over `ws://localhost:5173/ws/solve` (proxied to the FastAPI endpoint `/ws/solve`).

## Tests

Frontend unit tests (Vitest):

```bash
npm test
```

Type-check the frontend:

```bash
npm run typecheck --prefix frontend
```

## Production build

Build the frontend for static hosting:

```bash
npm run build
```

Output is written to `frontend/dist/`. The backend must still be run separately to serve the WebSocket API.

## Project structure

```
KBS_final/
├── engine.py          # Experta knowledge engine (A* search rules)
├── server.py          # FastAPI app + WebSocket endpoint
├── main.py            # CLI entry point for the engine
├── requirements.txt   # Python dependencies
├── package.json       # Root scripts (dev, test, build)
├── scripts/
│   └── free-ports.js  # Frees dev ports on Windows before startup
└── frontend/
    ├── src/
    │   ├── domain/    # Board model, solver payload, simulation logic
    │   └── ui/        # Preact components and wizard steps
    └── vite.config.ts # Dev server + WebSocket proxy
```

## API

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check (`{"status": "ok"}`) |
| `WS /ws/solve` | Accepts board JSON, streams engine events until `DONE` |

## Troubleshooting

**Port already in use**

- On Windows, run `npm run dev` — it attempts to free ports `8010` and `5173` automatically.
- On macOS/Linux, stop the process using the port or change the port in `package.json` and `frontend/vite.config.ts`.

**WebSocket connection fails**

- Ensure the backend is running on port `8010` before starting a simulation.
- Use the Vite dev server (`http://localhost:5173`), not the raw backend URL, so the `/ws` proxy is active.

**Python import errors**

- Confirm the virtual environment is activated and dependencies are installed: `pip install -r requirements.txt`.

**Frontend won't start**

- Reinstall dependencies: `npm install --prefix frontend`.
