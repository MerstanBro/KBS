import type { ComponentChildren } from "preact";
import {
  Box,
  Paper,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import ListAltIcon from "@mui/icons-material/ListAlt";
import RouteIcon from "@mui/icons-material/Route";
import type { GoalInfo, PathCommand, SearchTreeNode } from "../../../domain/types";
import { EngineLogPanel } from "../EngineLogPanel";
import { SearchTreeExplorerTab } from "./SearchTreeExplorerTab";
import { SolutionPlaybackTab } from "./SolutionPlaybackTab";

interface SimulationResultsTabsProps {
  tab: number;
  onTabChange: (tab: number) => void;
  pathCommands: PathCommand[];
  totalCost: number;
  playbackIndex: number;
  onPlaybackIndexChange: (index: number) => void;
  searchTree: SearchTreeNode[];
  selectedNodeId: number | null;
  onSelectNode: (nodeId: number) => void;
  goal: GoalInfo | null;
  logs: string[];
}

function TabPanel({ active, children }: { active: boolean; children: ComponentChildren }) {
  return active ? <Box sx={{ pt: 2 }}>{children}</Box> : null;
}

export function SimulationResultsTabs({
  tab,
  onTabChange,
  pathCommands,
  totalCost,
  playbackIndex,
  onPlaybackIndexChange,
  searchTree,
  selectedNodeId,
  onSelectNode,
  goal,
  logs,
}: SimulationResultsTabsProps) {
  return (
    <Paper sx={{ overflow: "hidden" }}>
      <Box sx={{ px: 2, pt: 1.5, bgcolor: "rgba(46, 125, 82, 0.06)" }}>
        <Typography variant="h6" sx={{ mb: 0.5 }}>
          Solution found
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {goal
            ? `Optimal path at node #${goal.node_id} with g=${goal.g_n}, f=${goal.f_n}`
            : "Explore the command trace, search tree, and engine log."}
        </Typography>
        <Tabs
          value={tab}
          onChange={(_, value) => onTabChange(value as number)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab icon={<RouteIcon />} iconPosition="start" label="Solution playback" />
          <Tab icon={<AccountTreeIcon />} iconPosition="start" label="Search tree" />
          <Tab icon={<ListAltIcon />} iconPosition="start" label="Engine log" />
        </Tabs>
      </Box>

      <Box sx={{ p: 2.5 }}>
        <TabPanel active={tab === 0}>
          <SolutionPlaybackTab
            commands={pathCommands}
            totalCost={totalCost}
            playbackIndex={playbackIndex}
            onPlaybackIndexChange={onPlaybackIndexChange}
          />
        </TabPanel>
        <TabPanel active={tab === 1}>
          <SearchTreeExplorerTab
            nodes={searchTree}
            selectedNodeId={selectedNodeId}
            onSelectNode={onSelectNode}
            goalNodeId={goal?.node_id}
          />
        </TabPanel>
        <TabPanel active={tab === 2}>
          <EngineLogPanel logs={logs} />
        </TabPanel>
      </Box>
    </Paper>
  );
}
