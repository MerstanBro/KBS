import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#2e7d52", light: "#60ad7a", dark: "#005124" },
    secondary: { main: "#c2185b", light: "#fa5788", dark: "#8c0032" },
    background: { default: "#f4f7f4", paper: "#ffffff" },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: '"Roboto", "Segoe UI", sans-serif',
    h4: { fontWeight: 700 },
    h6: { fontWeight: 600 },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: "none", fontWeight: 600 },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { border: "1px solid rgba(46, 125, 82, 0.12)" },
      },
    },
  },
});

export default theme;
