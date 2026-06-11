import {
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Slider,
  Typography,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  FLOWER_COLORS,
  FLOWER_TYPES,
  MAX_ORDER_QTY,
  MIN_ORDER_QTY,
} from "../../domain/constants";
import type { FlowerOrderPatch, PavilionOrder } from "../../domain/types";

interface FlowerOrderRowProps {
  order: PavilionOrder;
  index: number;
  onUpdate: (index: number, patch: FlowerOrderPatch) => void;
  onRemove: (index: number) => void;
}

export function FlowerOrderRow({ order, index, onUpdate, onRemove }: FlowerOrderRowProps) {
  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 1.5 }}>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} sm={4}>
          <FormControl fullWidth size="small">
            <InputLabel>Type</InputLabel>
            <Select
              label="Type"
              value={order.type}
              onChange={(e: SelectChangeEvent) => {
                const { value } = e.target as HTMLInputElement;
                onUpdate(index, { type: value });
              }}
            >
              {FLOWER_TYPES.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={4}>
          <FormControl fullWidth size="small">
            <InputLabel>Color</InputLabel>
            <Select
              label="Color"
              value={order.color}
              onChange={(e: SelectChangeEvent) => {
                const { value } = e.target as HTMLInputElement;
                onUpdate(index, { color: value });
              }}
            >
              {FLOWER_COLORS.map((color) => (
                <MenuItem key={color} value={color}>
                  {color}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={10} sm={3}>
          <Typography variant="caption">Needed: {order.needed}</Typography>
          <Slider
            size="small"
            value={order.needed}
            min={MIN_ORDER_QTY}
            max={MAX_ORDER_QTY}
            step={1}
            valueLabelDisplay="auto"
            onChange={(_, value) => onUpdate(index, { needed: value as number })}
          />
        </Grid>
        <Grid item xs={2} sm={1}>
          <IconButton color="error" aria-label="Remove order" onClick={() => onRemove(index)}>
            <DeleteIcon />
          </IconButton>
        </Grid>
      </Grid>
    </Paper>
  );
}
