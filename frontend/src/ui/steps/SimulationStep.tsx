import { Component, createRef } from "preact";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Grid,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import p5 from "p5";
import {
  connectSimulation,
  playbackPositionAt,
  simulatePlaybackAtStep,
  SIMULATION_STATUS,
  type Board,
  type GoalInfo,
  type PathCommand,
  type PlaybackState,
  type SearchTreeNode,
} from "../../domain";
import { createBoardSketch } from "../../visualization/boardSketch";
import { PavilionBoardOverlay } from "../components/simulation/PavilionBoardOverlay";
import { SimulationResultsTabs } from "../components/simulation/SimulationResultsTabs";
import { EngineLogPanel } from "../components/EngineLogPanel";

interface SimulationStepProps {
  board: Board;
  onBack: () => void;
}

interface SimulationStepState {
  logs: string[];
  running: boolean;
  status: string;
  liveBoard: Board;
  solved: boolean;
  goal: GoalInfo | null;
  searchTree: SearchTreeNode[];
  pathCommands: PathCommand[];
  totalCost: number;
  playbackIndex: number;
  selectedNodeId: number | null;
  resultsTab: number;
}

export class SimulationStep extends Component<SimulationStepProps, SimulationStepState> {
  canvasRef = createRef<HTMLDivElement>();
  animationQueue: Array<{ x: number; y: number; action: string; state: string; g_n: number; f_n: number }> = [];
  p5Instance: p5 | null = null;
  disconnectSimulation: (() => void) | null = null;

  constructor(props: SimulationStepProps) {
    super(props);
    this.state = {
      logs: [],
      running: false,
      status: SIMULATION_STATUS.READY,
      liveBoard: props.board,
      solved: false,
      goal: null,
      searchTree: [],
      pathCommands: [],
      totalCost: 0,
      playbackIndex: 0,
      selectedNodeId: null,
      resultsTab: 0,
    };
  }

  componentDidMount() {
    this.p5Instance = new p5(
      createBoardSketch({
        getBoard: () => this.state.liveBoard || this.props.board,
        getAnimationQueue: () => this.animationQueue,
        getPlayback: () => this.getPlaybackState(),
        canvasParent: this.canvasRef.current,
      }),
    );
  }

  componentDidUpdate(prevProps: SimulationStepProps) {
    if (!this.state.running && !this.state.solved && prevProps.board !== this.props.board) {
      this.setState({ liveBoard: this.props.board });
    }
  }

  componentWillUnmount() {
    this.disconnect();
    this.p5Instance?.remove();
  }

  getPlaybackState = (): PlaybackState | null => {
    const { solved, pathCommands, playbackIndex, searchTree, selectedNodeId, resultsTab, liveBoard } =
      this.state;
    if (!solved) return null;

    const board = liveBoard || this.props.board;
    const simulation = simulatePlaybackAtStep(board, pathCommands, playbackIndex);

    if (resultsTab === 1 && selectedNodeId != null) {
      const node = searchTree.find((entry) => entry.node_id === selectedNodeId);
      if (node) {
        return {
          x: node.robot_x,
          y: node.robot_y,
          action: `#${node.node_id} · ${node.last_action}`,
          highlightNodeId: node.node_id,
          pavilionOrders: simulation.pavilionOrders,
          robotInventory: simulation.robotInventory,
        };
      }
    }

    const frame = playbackPositionAt(pathCommands, playbackIndex);
    if (!frame) return null;
    return {
      x: frame.x,
      y: frame.y,
      action: frame.action,
      pavilionOrders: simulation.pavilionOrders,
      robotInventory: simulation.robotInventory,
    };
  };

  appendLog = (line: string) => {
    this.setState((prev) => ({ logs: [...prev.logs.slice(-600), line] }));
  };

  disconnect = () => {
    this.disconnectSimulation?.();
    this.disconnectSimulation = null;
  };

  startSimulation = () => {
    const { board } = this.props;
    this.disconnect();
    this.animationQueue = [];
    this.setState({
      logs: [],
      running: true,
      solved: false,
      status: SIMULATION_STATUS.CONNECTING,
      liveBoard: board,
      goal: null,
      searchTree: [],
      pathCommands: [],
      totalCost: 0,
      playbackIndex: 0,
      selectedNodeId: null,
      resultsTab: 0,
    });

    this.disconnectSimulation = connectSimulation(board, {
      onLog: this.appendLog,
      onStatus: (status) => this.setState({ status }),
      onBoard: (liveBoard) => this.setState({ liveBoard }),
      onGoal: (goal) => {
        this.setState({ goal, selectedNodeId: goal.node_id });
      },
      onSearchTree: (searchTree) => this.setState({ searchTree }),
      onPathCommand: (command) => {
        this.setState((prev) => ({
          pathCommands: [...prev.pathCommands, command],
        }));
      },
      onPathTrace: (_lines, totalCost) => {
        this.setState({ totalCost });
      },
      onMove: (data) => {
        if (!this.state.solved) {
          this.animationQueue.push({
            x: data.to_x,
            y: data.to_y,
            action: data.action,
            state: data.state,
            g_n: data.g_n,
            f_n: data.f_n,
          });
        }
      },
      onDone: () => {
        this.setState((prev) => ({
          running: false,
          solved: true,
          selectedNodeId: prev.selectedNodeId ?? prev.goal?.node_id ?? null,
        }));
        this.disconnect();
      },
      onError: () => this.setState({ running: false }),
      onClose: () => {
        this.setState((prev) => ({
          running: false,
          status:
            prev.status === SIMULATION_STATUS.RUNNING
              ? SIMULATION_STATUS.DISCONNECTED
              : prev.status,
        }));
      },
    });
  };

  render() {
    const { onBack } = this.props;
    const {
      running,
      status,
      logs,
      solved,
      goal,
      searchTree,
      pathCommands,
      totalCost,
      playbackIndex,
      selectedNodeId,
      resultsTab,
    } = this.state;

    return (
      <Stack spacing={3}>
        <Box>
          <Typography variant="h5" gutterBottom>
            {solved ? "Solution explorer" : "Run the solver"}
          </Typography>
          <Typography color="text.secondary">
            {solved
              ? "Scrub through every robot command, inspect the search tree, or review the engine log."
              : "Watch the Experta engine search for an optimal delivery route in real time."}
          </Typography>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} lg={5}>
            <Paper
              sx={{
                p: 2,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                bgcolor: "#f8fbf8",
                position: "sticky",
                top: 88,
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5, width: "100%" }}>
                <Chip
                  label={status}
                  color={
                    running ? "primary" : solved || status === SIMULATION_STATUS.COMPLETE ? "success" : "default"
                  }
                />
                {solved && goal ? (
                  <Chip variant="outlined" label={`g=${goal.g_n} · ${pathCommands.length} steps`} />
                ) : null}
              </Stack>
              <Box sx={{ position: "relative", display: "inline-block" }}>
                <div ref={this.canvasRef} />
                {solved ? (
                  <PavilionBoardOverlay
                    board={this.state.liveBoard || this.props.board}
                    pathCommands={pathCommands}
                    playbackIndex={playbackIndex}
                    enabled
                  />
                ) : null}
              </Box>
              {running ? (
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 2 }}>
                  <CircularProgress size={18} />
                  <Typography variant="body2" color="text.secondary">
                    Searching… {searchTree.length ? `${searchTree.length} nodes explored` : "waiting for tree"}
                  </Typography>
                </Stack>
              ) : null}
            </Paper>
          </Grid>

          <Grid item xs={12} lg={7}>
            {solved ? (
              <SimulationResultsTabs
                tab={resultsTab}
                onTabChange={(tab) => this.setState({ resultsTab: tab })}
                pathCommands={pathCommands}
                totalCost={totalCost || goal?.g_n || 0}
                playbackIndex={playbackIndex}
                onPlaybackIndexChange={(index) => this.setState({ playbackIndex: index })}
                searchTree={searchTree}
                selectedNodeId={selectedNodeId}
                onSelectNode={(nodeId) => this.setState({ selectedNodeId: nodeId })}
                goal={goal}
                logs={logs}
              />
            ) : (
              <Paper sx={{ p: 2.5, height: "100%" }}>
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  startIcon={<PlayArrowIcon />}
                  disabled={running}
                  onClick={this.startSimulation}
                  sx={{ mb: 2 }}
                >
                  {running ? "Running..." : "Run Simulation"}
                </Button>

                <Typography variant="subtitle2" gutterBottom>
                  Engine log
                </Typography>
                <EngineLogPanel logs={logs} />
              </Paper>
            )}
          </Grid>
        </Grid>

        <Box>
          <Button startIcon={<ArrowBackIcon />} onClick={onBack} disabled={running}>
            Back to orders
          </Button>
        </Box>
      </Stack>
    );
  }
}
