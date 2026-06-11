import {
  AppBar,
  Box,
  Container,
  CssBaseline,
  Paper,
  Step,
  StepLabel,
  Stepper,
  Toolbar,
  Typography,
} from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import LocalFloristIcon from "@mui/icons-material/LocalFlorist";
import { useState } from "react";
import { createDefaultBoard, isBoardReadyForSimulation, WIZARD_STEPS, type Board } from "../domain";
import theme from "./theme";
import { BoardLayoutStep } from "./steps/BoardLayoutStep";
import { OrdersStep } from "./steps/OrdersStep";
import { SimulationStep } from "./steps/SimulationStep";

export function App() {
  const [activeStep, setActiveStep] = useState(0);
  const [board, setBoard] = useState<Board>(createDefaultBoard());

  const goNext = () => setActiveStep((step: number) => Math.min(step + 1, WIZARD_STEPS.length - 1));
  const goBack = () => setActiveStep((step: number) => Math.max(step - 1, 0));

  const handleNextFromOrders = () => {
    if (!isBoardReadyForSimulation(board)) return;
    goNext();
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar position="sticky" elevation={0} sx={{ bgcolor: "primary.main" }}>
        <Toolbar>
          <LocalFloristIcon sx={{ mr: 1.5 }} />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Flower Delivery Planner
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            Experta A* Visualizer
          </Typography>
        </Toolbar>
      </AppBar>

      <Box sx={{ bgcolor: "background.default", minHeight: "100vh", py: 4 }}>
        <Container maxWidth="lg">
          <Paper sx={{ p: { xs: 2, md: 3 }, mb: 3 }}>
            <Stepper activeStep={activeStep} alternativeLabel>
              {WIZARD_STEPS.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </Paper>

          <Paper sx={{ p: { xs: 2, md: 4 } }}>
            {activeStep === 0 ? <BoardLayoutStep board={board} onChange={setBoard} onNext={goNext} /> : null}
            {activeStep === 1 ? (
              <OrdersStep board={board} onChange={setBoard} onBack={goBack} onNext={handleNextFromOrders} />
            ) : null}
            {activeStep === 2 ? <SimulationStep board={board} onBack={goBack} /> : null}
          </Paper>
        </Container>
      </Box>
    </ThemeProvider>
  );
}
