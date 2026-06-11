import { Component, createRef } from "preact";
import { Box, Button, Chip, Grid, Paper, Stack, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import p5 from "p5";
import {
  connectSimulation,
  SIMULATION_STATUS,
  type AnimationMove,
  type Board,
} from "../../domain";
import { createBoardSketch } from "../../visualization/boardSketch";
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
}

export class SimulationStep extends Component<SimulationStepProps, SimulationStepState> {
  canvasRef = createRef<HTMLDivElement>();
  animationQueue: AnimationMove[] = [];
  p5Instance: p5 | null = null;
  disconnectSimulation: (() => void) | null = null;

  constructor(props: SimulationStepProps) {
    super(props);
    this.state = {
      logs: [],
      running: false,
      status: SIMULATION_STATUS.READY,
      liveBoard: props.board,
    };
  }

  componentDidMount() {
    this.p5Instance = new p5(
      createBoardSketch({
        getBoard: () => this.state.liveBoard || this.props.board,
        getAnimationQueue: () => this.animationQueue,
        canvasParent: this.canvasRef.current,
      }),
    );
  }

  componentDidUpdate(prevProps: SimulationStepProps) {
    if (!this.state.running && prevProps.board !== this.props.board) {
      this.setState({ liveBoard: this.props.board });
    }
  }

  componentWillUnmount() {
    this.disconnect();
    this.p5Instance?.remove();
  }

  appendLog = (line: string) => {
    this.setState((prev) => ({ logs: [...prev.logs.slice(-400), line] }));
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
      status: SIMULATION_STATUS.CONNECTING,
      liveBoard: board,
    });

    this.disconnectSimulation = connectSimulation(board, {
      onLog: this.appendLog,
      onStatus: (status) => this.setState({ status }),
      onBoard: (liveBoard) => this.setState({ liveBoard }),
      onMove: (data) => {
        this.animationQueue.push({
          x: data.to_x,
          y: data.to_y,
          action: data.action,
          state: data.state,
        });
      },
      onDone: () => {
        this.setState({ running: false });
        this.disconnect();
      },
      onError: () => this.setState({ running: false }),
      onClose: () => {
        this.setState((prev) => ({
          running: false,
          status: prev.status === SIMULATION_STATUS.RUNNING ? SIMULATION_STATUS.DISCONNECTED : prev.status,
        }));
      },
    });
  };

  render() {
    const { onBack } = this.props;
    const { running, status, logs } = this.state;

    return (
      <Stack spacing={3}>
        <Box>
          <Typography variant="h5" gutterBottom>
            Run the solver
          </Typography>
          <Typography color="text.secondary">
            Watch the Experta engine search for an optimal delivery route in real time.
          </Typography>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} lg={7}>
            <Paper sx={{ p: 2, display: "flex", justifyContent: "center", bgcolor: "#f8fbf8" }}>
              <div ref={this.canvasRef} />
            </Paper>
          </Grid>

          <Grid item xs={12} lg={5}>
            <Paper sx={{ p: 2.5, height: "100%" }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <Chip
                  label={status}
                  color={running ? "primary" : status === SIMULATION_STATUS.COMPLETE ? "success" : "default"}
                />
              </Stack>

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
