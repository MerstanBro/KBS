import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Stack,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import type { MouseEvent } from "react";
import {
  addFlowerOrder,
  DEFAULT_FLOWER_COLOR,
  DEFAULT_FLOWER_TYPE,
  getPavilionSites,
  getSiteOrders,
  MIN_ORDER_QTY,
  pavilionColorCss,
  removeFlowerOrder,
  removePavilionSite,
  updateFlowerOrder,
  type Board,
} from "../../domain";
import { FlowerOrderRow } from "../components/FlowerOrderRow";

interface OrdersStepProps {
  board: Board;
  onChange: (board: Board) => void;
  onBack: () => void;
  onNext: () => void;
}

export function OrdersStep({ board, onChange, onBack, onNext }: OrdersStepProps) {
  const sites = getPavilionSites(board.pavilions);

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" gutterBottom>
          Configure flower orders
        </Typography>
        <Typography color="text.secondary">
          Each pavilion can request multiple flower types. Adjust quantities before running the solver.
        </Typography>
      </Box>

      {sites.length === 0 ? (
        <Box sx={{ p: 4, textAlign: "center", border: "1px dashed", borderColor: "divider", borderRadius: 2 }}>
          <Typography color="text.secondary">
            No pavilions yet. Go back and place at least one pavilion on the grid.
          </Typography>
        </Box>
      ) : (
        sites.map((site) => {
          const orders = getSiteOrders(board.pavilions, site.pid);

          return (
            <Accordion key={site.pid} defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Stack direction="row" spacing={2} alignItems="center" sx={{ width: "100%", pr: 2 }}>
                  <Box
                    sx={{
                      width: 14,
                      height: 14,
                      borderRadius: "50%",
                      bgcolor: pavilionColorCss(orders[0]?.color ?? DEFAULT_FLOWER_COLOR),
                    }}
                  />
                  <Typography sx={{ flexGrow: 1 }}>
                    Pavilion {site.pid} at ({site.x}, {site.y}) — {orders.length} order
                    {orders.length === 1 ? "" : "s"}
                  </Typography>
                  <Button
                    size="small"
                    color="error"
                    onClick={(e: MouseEvent<HTMLButtonElement>) => {
                      e.stopPropagation();
                      onChange(removePavilionSite(board, site.pid));
                    }}
                  >
                    Remove site
                  </Button>
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
                {board.pavilions
                  .map((order, index) => ({ order, index }))
                  .filter(({ order }) => order.pid === site.pid)
                  .map(({ order, index }) => (
                    <FlowerOrderRow
                      key={`${index}-${order.type}-${order.color}`}
                      order={order}
                      index={index}
                      onUpdate={(i, patch) => onChange(updateFlowerOrder(board, i, patch))}
                      onRemove={(i) => onChange(removeFlowerOrder(board, i))}
                    />
                  ))}
                <Button
                  startIcon={<AddIcon />}
                  onClick={() =>
                    onChange(addFlowerOrder(board, site.pid, DEFAULT_FLOWER_TYPE, DEFAULT_FLOWER_COLOR, MIN_ORDER_QTY))
                  }
                >
                  Add flower order
                </Button>
              </AccordionDetails>
            </Accordion>
          );
        })
      )}

      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
        <Button startIcon={<ArrowBackIcon />} onClick={onBack}>
          Back
        </Button>
        <Button variant="contained" endIcon={<ArrowForwardIcon />} onClick={onNext} disabled={sites.length === 0}>
          Next: Run Simulation
        </Button>
      </Box>
    </Stack>
  );
}
