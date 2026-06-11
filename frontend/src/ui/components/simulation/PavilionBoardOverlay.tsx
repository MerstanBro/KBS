import {
  Box,
  Chip,
  LinearProgress,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import LocalFloristIcon from "@mui/icons-material/LocalFlorist";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import {
  BOARD_CELL_PX,
  buildPavilionSiteStates,
  gridCellOverlayRect,
  pavilionColorCss,
  playbackPositionAt,
  robotOverlayRect,
  simulatePlaybackAtStep,
  type Board,
  type PathCommand,
  type PavilionOrder,
  type PavilionSiteState,
  type RobotInventoryItem,
} from "../../../domain";

interface PavilionBoardOverlayProps {
  board: Board;
  pathCommands: PathCommand[];
  playbackIndex: number;
  enabled: boolean;
}

const tooltipSlotProps = {
  tooltip: {
    sx: {
      bgcolor: "background.paper",
      color: "text.primary",
      boxShadow: 4,
      border: "1px solid",
      borderColor: "divider",
      p: 1,
    },
  },
};

function PavilionTooltipContent({ site }: { site: PavilionSiteState }) {
  const progress = site.totalNeeded
    ? Math.round((site.totalDelivered / site.totalNeeded) * 100)
    : 0;

  return (
    <Box sx={{ p: 0.5, minWidth: 220, maxWidth: 280 }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
        <LocalFloristIcon fontSize="small" />
        <Typography variant="subtitle2">
          Pavilion {site.pid} ({site.x}, {site.y})
        </Typography>
        {site.complete ? <CheckCircleIcon color="success" fontSize="small" /> : null}
      </Stack>

      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
        <Chip
          size="small"
          color={site.complete ? "success" : "default"}
          label={`${site.totalDelivered}/${site.totalNeeded} delivered`}
        />
        <Typography variant="caption" color="text.secondary">
          {progress}%
        </Typography>
      </Stack>

      <LinearProgress
        variant="determinate"
        value={progress}
        color={site.complete ? "success" : "primary"}
        sx={{ mb: 1.5, height: 6, borderRadius: 99 }}
      />

      <Stack spacing={1}>
        {site.orders.map((order: PavilionOrder) => {
          const done = order.delivered >= order.needed;
          return (
            <Stack
              key={`${order.type}-${order.color}-${order.needed}`}
              direction="row"
              spacing={1}
              alignItems="center"
            >
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  bgcolor: pavilionColorCss(order.color),
                  border: "1px solid rgba(0,0,0,0.2)",
                  flexShrink: 0,
                }}
              />
              <Typography variant="body2" sx={{ flex: 1 }}>
                {order.type} · {order.color}
              </Typography>
              <Chip
                size="small"
                variant={done ? "filled" : "outlined"}
                color={done ? "success" : "default"}
                label={`${order.delivered}/${order.needed}`}
              />
            </Stack>
          );
        })}
      </Stack>
    </Box>
  );
}

function RobotTooltipContent({
  inventory,
  totalLoaded,
  maxLoad,
  position,
}: {
  inventory: RobotInventoryItem[];
  totalLoaded: number;
  maxLoad: number;
  position: { x: number; y: number };
}) {
  const fill = maxLoad ? Math.round((totalLoaded / maxLoad) * 100) : 0;

  return (
    <Box sx={{ p: 0.5, minWidth: 220, maxWidth: 280 }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
        <SmartToyIcon fontSize="small" color="primary" />
        <Typography variant="subtitle2">
          Robot cargo ({position.x}, {position.y})
        </Typography>
      </Stack>

      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
        <Chip
          size="small"
          color={totalLoaded >= maxLoad ? "warning" : "primary"}
          label={`${totalLoaded}/${maxLoad} loaded`}
        />
        <Typography variant="caption" color="text.secondary">
          {fill}% capacity
        </Typography>
      </Stack>

      <LinearProgress
        variant="determinate"
        value={fill}
        color={totalLoaded >= maxLoad ? "warning" : "primary"}
        sx={{ mb: 1.5, height: 6, borderRadius: 99 }}
      />

      {inventory.length ? (
        <Stack spacing={1}>
          {inventory.map((item) => (
            <Stack
              key={item.label}
              direction="row"
              spacing={1}
              alignItems="center"
            >
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  bgcolor: pavilionColorCss(item.color),
                  border: "1px solid rgba(0,0,0,0.2)",
                  flexShrink: 0,
                }}
              />
              <Typography variant="body2" sx={{ flex: 1 }}>
                {item.label}
              </Typography>
              <Chip size="small" variant="outlined" label={`×${item.count}`} />
            </Stack>
          ))}
        </Stack>
      ) : (
        <Typography variant="body2" color="text.secondary">
          Cargo bay is empty.
        </Typography>
      )}
    </Box>
  );
}

export function PavilionBoardOverlay({
  board,
  pathCommands,
  playbackIndex,
  enabled,
}: PavilionBoardOverlayProps) {
  if (!enabled) return null;

  const simulation = simulatePlaybackAtStep(board, pathCommands, playbackIndex);
  const sites = buildPavilionSiteStates(simulation.pavilionOrders);
  const robotFrame = playbackPositionAt(pathCommands, playbackIndex);
  const gridSize = board.meta.grid_size ?? 6;
  const canvasSize = gridSize * BOARD_CELL_PX;
  const robotRect = robotFrame ? robotOverlayRect(robotFrame.x, robotFrame.y) : null;

  return (
    <Box
      sx={{
        position: "absolute",
        inset: 0,
        width: canvasSize,
        height: canvasSize,
        pointerEvents: "none",
      }}
    >
      {sites.map((site: PavilionSiteState) => {
        const rect = gridCellOverlayRect(site.x, site.y);
        return (
          <Tooltip
            key={`${site.pid}-${site.x}-${site.y}`}
            title={<PavilionTooltipContent site={site} />}
            arrow
            placement="top"
            enterDelay={120}
            slotProps={tooltipSlotProps}
          >
            <Box
              sx={{
                position: "absolute",
                left: rect.left,
                top: rect.top,
                width: rect.width,
                height: rect.height,
                borderRadius: "50%",
                pointerEvents: "auto",
                cursor: "help",
                "&:hover": {
                  bgcolor: "rgba(46, 125, 82, 0.18)",
                  boxShadow: "0 0 0 2px rgba(46, 125, 82, 0.45)",
                },
              }}
            />
          </Tooltip>
        );
      })}

      {robotRect && robotFrame ? (
        <Tooltip
          title={
            <RobotTooltipContent
              inventory={simulation.robotInventory}
              totalLoaded={simulation.totalLoaded}
              maxLoad={simulation.maxLoad}
              position={robotFrame}
            />
          }
          arrow
          placement="right"
          enterDelay={120}
          slotProps={tooltipSlotProps}
        >
          <Box
            sx={{
              position: "absolute",
              left: robotRect.left,
              top: robotRect.top,
              width: robotRect.width,
              height: robotRect.height,
              borderRadius: "50%",
              pointerEvents: "auto",
              cursor: "help",
              "&:hover": {
                bgcolor: "rgba(46, 125, 82, 0.22)",
                boxShadow: "0 0 0 3px rgba(46, 125, 82, 0.55)",
              },
            }}
          />
        </Tooltip>
      ) : null}
    </Box>
  );
}
