import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import {
  Box,
  Button,
  Chip,
  IconButton,
  LinearProgress,
  Paper,
  Slider,
  Stack,
  Typography,
} from "@mui/material";
import FastForwardIcon from "@mui/icons-material/FastForward";
import FastRewindIcon from "@mui/icons-material/FastRewind";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import SkipPreviousIcon from "@mui/icons-material/SkipPrevious";
import type { PathCommand } from "../../../domain/types";

interface SolutionPlaybackTabProps {
  commands: PathCommand[];
  totalCost: number;
  playbackIndex: number;
  onPlaybackIndexChange: (index: number) => void;
}

export function SolutionPlaybackTab({
  commands,
  totalCost,
  playbackIndex,
  onPlaybackIndexChange,
}: SolutionPlaybackTabProps) {
  const [playing, setPlaying] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const current = commands[playbackIndex];

  useEffect(() => {
    if (!playing || commands.length === 0) return undefined;
    const timer = window.setInterval(() => {
      onPlaybackIndexChange(
        playbackIndex >= commands.length - 1 ? 0 : playbackIndex + 1,
      );
    }, 650);
    return () => window.clearInterval(timer);
  }, [playing, playbackIndex, commands.length, onPlaybackIndexChange]);

  useEffect(() => {
    const container = listRef.current;
    const active = container?.querySelector(`[data-step="${playbackIndex}"]`);
    active?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [playbackIndex]);

  const progress = commands.length ? ((playbackIndex + 1) / commands.length) * 100 : 0;

  const commandIcon = useMemo(() => {
    if (!current) return "🤖";
    if (current.command.includes("load")) return "📦";
    if (current.command.includes("unload")) return "🌸";
    if (current.command.includes("move")) return "➡️";
    if (current.command.includes("dispatch")) return "🚀";
    return "🤖";
  }, [current]);

  if (commands.length === 0) {
    return (
      <Paper sx={{ p: 3, bgcolor: "grey.50" }}>
        <Typography color="text.secondary">No command trace received from the engine.</Typography>
      </Paper>
    );
  }

  return (
    <Stack spacing={2.5}>
      <Paper
        sx={{
          p: 2.5,
          background: "linear-gradient(135deg, rgba(46,125,82,0.12) 0%, rgba(255,255,255,1) 60%)",
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1}>
          <Box>
            <Typography variant="overline" color="primary.main">
              Step {playbackIndex + 1} of {commands.length}
            </Typography>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 0.5 }}>
              <Typography variant="h4">{commandIcon}</Typography>
              <Box>
                <Typography variant="h6">{current?.command}</Typography>
                {current?.detail ? (
                  <Typography variant="body1" color="text.secondary">
                    {current.detail}
                  </Typography>
                ) : null}
              </Box>
            </Stack>
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Chip color="primary" label={`g = ${current?.g ?? 0}`} />
            <Chip variant="outlined" label={`+${current?.stepCost ?? 0} this step`} />
            <Chip variant="outlined" label={`total ${totalCost}`} />
            {current?.state ? <Chip variant="outlined" label={current.state} /> : null}
            <Chip variant="outlined" label={`pos (${current?.pos.x}, ${current?.pos.y})`} />
          </Stack>
        </Stack>

        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{ mt: 2, height: 8, borderRadius: 99, bgcolor: "rgba(46,125,82,0.12)" }}
        />

        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 2 }}>
          <IconButton onClick={() => onPlaybackIndexChange(0)} aria-label="First step">
            <FastRewindIcon />
          </IconButton>
          <IconButton
            onClick={() => onPlaybackIndexChange(Math.max(0, playbackIndex - 1))}
            aria-label="Previous step"
          >
            <SkipPreviousIcon />
          </IconButton>
          <IconButton
            color="primary"
            onClick={() => setPlaying((value) => !value)}
            aria-label={playing ? "Pause" : "Play"}
            sx={{ bgcolor: "primary.main", color: "white", "&:hover": { bgcolor: "primary.dark" } }}
          >
            {playing ? <PauseIcon /> : <PlayArrowIcon />}
          </IconButton>
          <IconButton
            onClick={() => onPlaybackIndexChange(Math.min(commands.length - 1, playbackIndex + 1))}
            aria-label="Next step"
          >
            <SkipNextIcon />
          </IconButton>
          <IconButton
            onClick={() => onPlaybackIndexChange(commands.length - 1)}
            aria-label="Last step"
          >
            <FastForwardIcon />
          </IconButton>
          <Box sx={{ flex: 1, px: 2 }}>
            <Slider
              size="small"
              min={0}
              max={Math.max(0, commands.length - 1)}
              value={playbackIndex}
              onChange={(_, value) => {
                setPlaying(false);
                onPlaybackIndexChange(value as number);
              }}
              valueLabelDisplay="auto"
              valueLabelFormat={(value) => value + 1}
            />
          </Box>
        </Stack>
      </Paper>

      <Paper sx={{ p: 1.5, maxHeight: 420, overflow: "auto" }} ref={listRef}>
        <Stack spacing={0.75}>
          {commands.map((cmd, index) => {
            const active = index === playbackIndex;
            return (
              <Button
                key={`${cmd.step}-${index}-${cmd.line}`}
                data-step={index}
                fullWidth
                onClick={() => {
                  setPlaying(false);
                  onPlaybackIndexChange(index);
                }}
                sx={{
                  justifyContent: "flex-start",
                  textAlign: "left",
                  py: 1.25,
                  px: 1.5,
                  borderRadius: 2,
                  bgcolor: active ? "rgba(46, 125, 82, 0.14)" : "transparent",
                  border: active ? "1px solid" : "1px solid transparent",
                  borderColor: active ? "primary.main" : "transparent",
                }}
              >
                <Stack direction="row" spacing={1.5} alignItems="center" width="100%">
                  <Chip
                    size="small"
                    label={index + 1}
                    color={active ? "primary" : "default"}
                    sx={{ minWidth: 36 }}
                  />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" noWrap sx={{ fontWeight: active ? 700 : 500 }}>
                      {cmd.command}
                      {cmd.detail ? ` · ${cmd.detail}` : ""}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      ({cmd.pos.x},{cmd.pos.y}) · +{cmd.stepCost} · g={cmd.g}
                    </Typography>
                  </Box>
                </Stack>
              </Button>
            );
          })}
        </Stack>
      </Paper>
    </Stack>
  );
}
