import { useState } from "react";
import { ThemeProvider, CssBaseline } from "@mui/material";
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Tab,
  Tabs,
  Stack,
} from "@mui/material";
import { SignLanguage, Visibility, ModelTraining, Storefront } from "@mui/icons-material";
import theme from "./theme";
import RecognitionPage from "./pages/RecognitionPage";
import TrainingPage from "./pages/TrainingPage";
import MarketplacePage from "./pages/MarketplacePage";

function App() {
  const [tab, setTab] = useState(0);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: "100vh",
          backgroundColor: "#0a0a0a",
        }}
      >
        {/* App Bar */}
        <AppBar position="sticky" elevation={0}>
          <Toolbar sx={{ px: { xs: 2, md: 4 } }}>
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ flexGrow: 1 }}>
              <SignLanguage
                sx={{
                  fontSize: 32,
                  color: "#ffffff",
                }}
              />
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 800,
                  color: "#ffffff",
                  letterSpacing: "-0.02em",
                }}
              >
                ISL Translator
              </Typography>
            </Stack>

            <Tabs
              value={tab}
              onChange={(_, v) => setTab(v)}
              textColor="inherit"
              TabIndicatorProps={{
                sx: {
                  backgroundColor: "#ffffff",
                  height: 2,
                  borderRadius: 1,
                },
              }}
            >
              <Tab
                icon={<Visibility sx={{ fontSize: 20 }} />}
                iconPosition="start"
                label="Recognition"
                sx={{
                  minHeight: 64,
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  color: "text.secondary",
                  "&.Mui-selected": { color: "text.primary" },
                }}
              />
              <Tab
                icon={<ModelTraining sx={{ fontSize: 20 }} />}
                iconPosition="start"
                label="Training"
                sx={{
                  minHeight: 64,
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  color: "text.secondary",
                  "&.Mui-selected": { color: "text.primary" },
                }}
              />
              <Tab
                icon={<Storefront sx={{ fontSize: 20 }} />}
                iconPosition="start"
                label="Marketplace"
                sx={{
                  minHeight: 64,
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  color: "text.secondary",
                  "&.Mui-selected": { color: "text.primary" },
                }}
              />
            </Tabs>
          </Toolbar>
        </AppBar>

        {/* Page Content */}
        <Box sx={{ py: 2 }}>
          {tab === 0 && <RecognitionPage />}
          {tab === 1 && <TrainingPage />}
          {tab === 2 && <MarketplacePage />}
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;
