import { Box, Typography } from "@mui/material";

interface EngineLogPanelProps {
  logs: string[];
}

export function EngineLogPanel({ logs }: EngineLogPanelProps) {
  return (
    <Box
      sx={{
        height: 360,
        overflowY: "auto",
        bgcolor: "#1b2420",
        color: "#b9f6ca",
        p: 1.5,
        borderRadius: 2,
        fontFamily: "monospace",
        fontSize: 12,
      }}
    >
      {logs.length === 0 ? <Typography variant="body2">Logs will appear here...</Typography> : null}
      {logs.map((log, i) => (
        <div key={i}>{log}</div>
      ))}
    </Box>
  );
}
