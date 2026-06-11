import { Box, Chip, Paper, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import WarehouseIcon from "@mui/icons-material/Warehouse";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import LocalFloristIcon from "@mui/icons-material/LocalFlorist";
import type { KeyboardEvent } from "react";
import { pavilionAtCell } from "../../domain/board/queries";
import { PLACEMENT_MODES, type PlacementMode } from "../../domain/constants";
import { pavilionColor } from "../../domain/flowers";
import type { Board } from "../../domain/types";

interface BoardGridProps {
  board: Board;
  placementMode: PlacementMode;
  onPlacementModeChange: (mode: PlacementMode) => void;
  onCellClick: (x: number, y: number) => void;
}

export function BoardGrid({ board, placementMode, onPlacementModeChange, onCellClick }: BoardGridProps) {
  const { meta, pavilions } = board;
  const gridSize = meta.grid_size ?? 6;

  return (
    <Paper sx={{ p: 2.5, bgcolor: "background.paper" }}>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2, alignItems: "center" }}>
        <Typography variant="subtitle2" sx={{ mr: 1 }}>
          Placement tool
        </Typography>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={placementMode}
          onChange={(_, value: PlacementMode | null) => value && onPlacementModeChange(value)}
        >
          <ToggleButton value={PLACEMENT_MODES.WAREHOUSE}>
            <WarehouseIcon sx={{ mr: 0.5, fontSize: 18 }} /> Warehouse
          </ToggleButton>
          <ToggleButton value={PLACEMENT_MODES.ROBOT}>
            <SmartToyIcon sx={{ mr: 0.5, fontSize: 18 }} /> Robot
          </ToggleButton>
          <ToggleButton value={PLACEMENT_MODES.PAVILION}>
            <LocalFloristIcon sx={{ mr: 0.5, fontSize: 18 }} /> Pavilion
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
          gap: 1,
          maxWidth: 520,
          mx: "auto",
        }}
      >
        {Array.from({ length: gridSize }, (_, row) =>
          Array.from({ length: gridSize }, (_, col) => {
            const x = col + 1;
            const y = row + 1;
            const isWarehouse = meta.warehouse_x === x && meta.warehouse_y === y;
            const isRobot = meta.start_x === x && meta.start_y === y;
            const pavilion = pavilionAtCell(pavilions, x, y);
            const rgb = pavilion ? pavilionColor(pavilion.color) : null;

            return (
              <Box
                key={`${x}-${y}`}
                role="button"
                tabIndex={0}
                aria-label={`Cell ${x}, ${y}`}
                onClick={() => onCellClick(x, y)}
                onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => e.key === "Enter" && onCellClick(x, y)}
                sx={{
                  aspectRatio: "1",
                  borderRadius: 2,
                  border: "2px solid",
                  borderColor: isRobot ? "primary.main" : "divider",
                  bgcolor: isWarehouse ? "#d7b48a" : rgb ? `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.35)` : "grey.50",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "transform 0.15s ease, box-shadow 0.15s ease",
                  "&:hover": { transform: "scale(1.04)", boxShadow: 2 },
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  ({x},{y})
                </Typography>
                {isWarehouse ? <Chip size="small" label="WH" color="warning" /> : null}
                {isRobot ? <Chip size="small" label="Bot" color="primary" /> : null}
                {pavilion ? <Chip size="small" label={`P${pavilion.pid}`} /> : null}
              </Box>
            );
          }),
        )}
      </Box>
    </Paper>
  );
}
