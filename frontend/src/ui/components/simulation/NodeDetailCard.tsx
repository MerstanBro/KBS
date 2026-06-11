import {
  Box,
  Chip,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { statusColor } from "../../../domain";
import type { SearchTreeNode } from "../../../domain";

interface NodeDetailCardProps {
  node: SearchTreeNode;
  selected?: boolean;
  onSelect?: (nodeId: number) => void;
  compact?: boolean;
}

export function NodeDetailCard({ node, selected, onSelect, compact }: NodeDetailCardProps) {
  return (
    <Paper
      onClick={() => onSelect?.(node.node_id)}
      sx={{
        p: compact ? 1.25 : 1.75,
        cursor: onSelect ? "pointer" : "default",
        bgcolor: selected ? "rgba(46, 125, 82, 0.12)" : "background.paper",
        borderColor: selected ? "primary.main" : "divider",
        borderWidth: selected ? 2 : 1,
        transition: "all 0.15s ease",
        "&:hover": onSelect
          ? { borderColor: "primary.light", transform: "translateY(-1px)" }
          : undefined,
      }}
    >
      <Stack spacing={0.75}>
        <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
          <Typography variant="subtitle2" color="primary.main">
            #{node.node_id}
          </Typography>
          <Chip size="small" label={node.status} color={statusColor(node.status)} />
          <Chip size="small" variant="outlined" label={node.robot_state} />
        </Stack>

        {!compact ? (
          <Typography variant="body2" color="text.secondary" sx={{ minHeight: 36 }}>
            {node.last_action}
          </Typography>
        ) : null}

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Chip size="small" variant="outlined" label={`pos (${node.robot_x},${node.robot_y})`} />
          <Chip size="small" variant="outlined" label={`g=${node.g_n}`} />
          <Chip size="small" variant="outlined" label={`f=${node.f_n}`} />
          {node.h_n != null ? (
            <Chip size="small" variant="outlined" label={`h=${node.h_n}`} />
          ) : null}
          <Chip size="small" variant="outlined" label={`parent #${node.parent_id}`} />
        </Stack>
      </Stack>
    </Paper>
  );
}

interface GenerationRowProps {
  label: string;
  offset: number;
  nodes: SearchTreeNode[];
  selectedNodeId: number | null;
  onSelectNode: (nodeId: number) => void;
}

export function GenerationRow({ label, offset, nodes, selectedNodeId, onSelectNode }: GenerationRowProps) {
  return (
    <Box>
      <Typography
        variant="overline"
        sx={{
          color: offset === 0 ? "primary.main" : "text.secondary",
          fontWeight: offset === 0 ? 700 : 600,
          letterSpacing: 1.2,
        }}
      >
        {label}
      </Typography>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 1.25,
          mt: 1,
          minHeight: nodes.length ? undefined : 56,
        }}
      >
        {nodes.length ? (
          nodes.map((node) => (
            <NodeDetailCard
              key={node.node_id}
              node={node}
              selected={node.node_id === selectedNodeId}
              onSelect={onSelectNode}
              compact={nodes.length > 2}
            />
          ))
        ) : (
          <Paper sx={{ p: 2, bgcolor: "grey.50", borderStyle: "dashed" }}>
            <Typography variant="body2" color="text.disabled">
              No nodes at this generation
            </Typography>
          </Paper>
        )}
      </Box>
    </Box>
  );
}
