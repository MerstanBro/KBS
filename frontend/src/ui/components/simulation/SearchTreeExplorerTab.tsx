import { useMemo } from "preact/hooks";
import {
  Box,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import { getNodeNeighborhood } from "../../../domain";
import type { SearchTreeNode } from "../../../domain";
import { GenerationRow } from "./NodeDetailCard";

interface SearchTreeExplorerTabProps {
  nodes: SearchTreeNode[];
  selectedNodeId: number | null;
  onSelectNode: (nodeId: number) => void;
  goalNodeId?: number | null;
}

export function SearchTreeExplorerTab({
  nodes,
  selectedNodeId,
  onSelectNode,
  goalNodeId,
}: SearchTreeExplorerTabProps) {
  const selected = nodes.find((node) => node.node_id === selectedNodeId) ?? null;
  const generations = useMemo(
    () => (selectedNodeId != null ? getNodeNeighborhood(nodes, selectedNodeId, 2) : []),
    [nodes, selectedNodeId],
  );

  const options = useMemo(
    () => [...nodes].sort((a, b) => a.node_id - b.node_id),
    [nodes],
  );

  if (nodes.length === 0) {
    return (
      <Paper sx={{ p: 3, bgcolor: "grey.50" }}>
        <Typography color="text.secondary">No search tree received from the engine.</Typography>
      </Paper>
    );
  }

  return (
    <Stack spacing={2.5}>
      <Paper sx={{ p: 2.5 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
          <AccountTreeIcon color="primary" />
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6">Search tree explorer</Typography>
            <Typography variant="body2" color="text.secondary">
              Select any node to inspect two generations of ancestors and descendants.
            </Typography>
          </Box>
          {goalNodeId ? <Chip color="success" label={`Goal #${goalNodeId}`} /> : null}
          <Chip label={`${nodes.length} nodes`} variant="outlined" />
        </Stack>

        <FormControl fullWidth sx={{ maxWidth: 720 }}>
          <InputLabel id="tree-node-select-label">Jump to node</InputLabel>
          <Select
            labelId="tree-node-select-label"
            label="Jump to node"
            value={selectedNodeId ?? ""}
            onChange={(event: SelectChangeEvent<number | "">) => {
              const { value } = event.target as HTMLInputElement;
              if (value !== "") onSelectNode(Number(value));
            }}
          >
            {options.map((node) => (
              <MenuItem key={node.node_id} value={node.node_id}>
                #{node.node_id} · f={node.f_n} · {node.last_action.slice(0, 64)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Paper>

      {selected ? (
        <Paper
          sx={{
            p: 2.5,
            borderColor: "primary.main",
            bgcolor: "rgba(46, 125, 82, 0.06)",
          }}
        >
          <Typography variant="overline" color="primary.main">
            Focus node
          </Typography>
          <Typography variant="h6" sx={{ mt: 0.5 }}>
            #{selected.node_id} — {selected.last_action}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
            <Chip size="small" label={`parent #${selected.parent_id}`} />
            <Chip size="small" label={`g=${selected.g_n}`} />
            <Chip size="small" label={`f=${selected.f_n}`} />
            <Chip size="small" label={`(${selected.robot_x}, ${selected.robot_y})`} />
            <Chip size="small" label={selected.robot_state} />
            <Chip size="small" label={selected.status} />
          </Stack>
        </Paper>
      ) : null}

      <Stack spacing={2.5}>
        {generations.map((level) => (
          <GenerationRow
            key={level.offset}
            label={level.label}
            offset={level.offset}
            nodes={level.nodes}
            selectedNodeId={selectedNodeId}
            onSelectNode={onSelectNode}
          />
        ))}
      </Stack>
    </Stack>
  );
}
