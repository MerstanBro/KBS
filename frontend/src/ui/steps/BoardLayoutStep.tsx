import { Box, Button, Grid, Paper, Slider, Stack, Typography } from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { useState } from "react";
import {
  applyPlacement,
  countPavilionSites,
  deriveSolverMeta,
  GRID_SIZE_MAX,
  GRID_SIZE_MIN,
  PLACEMENT_MODES,
  setGridSize,
  type Board,
  type PlacementMode,
} from "../../domain";
import { BoardGrid } from "../components/BoardGrid";

interface BoardLayoutStepProps {
  board: Board;
  onChange: (board: Board) => void;
  onNext: () => void;
}

export function BoardLayoutStep({ board, onChange, onNext }: BoardLayoutStepProps) {
  const [placementMode, setPlacementMode] = useState<PlacementMode>(PLACEMENT_MODES.WAREHOUSE);
  const derived = deriveSolverMeta(board);

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" gutterBottom>
          Set up the board
        </Typography>
        <Typography color="text.secondary">
          Choose a placement tool, then click the grid to position the warehouse, robot start, and pavilions.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Board summary
            </Typography>

            <Stack spacing={1.5} sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Max load and cost bound are computed automatically when you run the solver.
              </Typography>
              <Typography variant="body2">
                Robot capacity (max load): <strong>{derived.max_load}</strong>
              </Typography>
              <Typography variant="body2">
                Pruning upper bound: <strong>{derived.upper_bound}</strong>
              </Typography>
            </Stack>

            <Typography gutterBottom sx={{ mt: 2 }}>
              Grid size: {board.meta.grid_size}
            </Typography>
            <Slider
              value={board.meta.grid_size}
              min={GRID_SIZE_MIN}
              max={GRID_SIZE_MAX}
              step={1}
              marks
              valueLabelDisplay="auto"
              onChange={(_, value) => onChange(setGridSize(board, value as number))}
            />

            <Stack spacing={1} sx={{ mt: 3 }}>
              <Typography variant="body2">
                Warehouse: ({board.meta.warehouse_x}, {board.meta.warehouse_y})
              </Typography>
              <Typography variant="body2">
                Robot start: ({board.meta.start_x}, {board.meta.start_y})
              </Typography>
              <Typography variant="body2">Pavilions placed: {countPavilionSites(board.pavilions)}</Typography>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} md={7}>
          <BoardGrid
            board={board}
            placementMode={placementMode}
            onPlacementModeChange={setPlacementMode}
            onCellClick={(x, y) => onChange(applyPlacement(board, placementMode, x, y))}
          />
        </Grid>
      </Grid>

      <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
        <Button variant="contained" size="large" endIcon={<ArrowForwardIcon />} onClick={onNext}>
          Next: Flower Orders
        </Button>
      </Box>
    </Stack>
  );
}
