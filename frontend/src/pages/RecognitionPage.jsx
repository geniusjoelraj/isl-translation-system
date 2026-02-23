import { useState, useRef, useCallback, useEffect } from "react";
import Webcam from "react-webcam";
import {
    Box,
    Card,
    CardContent,
    Typography,
    Chip,
    Stack,
    Alert,
    CircularProgress,
    Fade,
    Grow,
} from "@mui/material";
import {
    Videocam,
    FrontHand,
    SignLanguage,
} from "@mui/icons-material";
import { predictSign, getModelStatus } from "../api";

const CAPTURE_INTERVAL = 300; // ms between prediction frames

export default function RecognitionPage() {
    const webcamRef = useRef(null);
    const intervalRef = useRef(null);
    const [prediction, setPrediction] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [modelReady, setModelReady] = useState(null); // null = loading, true/false
    const [handsDetected, setHandsDetected] = useState(false);
    const [error, setError] = useState(null);

    // Check model status on mount
    useEffect(() => {
        getModelStatus()
            .then((data) => {
                setModelReady(data.model_loaded);
                if (!data.model_loaded) {
                    setError("No model loaded. Go to the Training tab to create one.");
                }
            })
            .catch(() => {
                setError("Cannot connect to backend. Make sure the Flask server is running on port 5000.");
                setModelReady(false);
            });
    }, []);

    const captureAndPredict = useCallback(async () => {
        if (!webcamRef.current || isProcessing) return;
        const screenshot = webcamRef.current.getScreenshot();
        if (!screenshot) return;

        setIsProcessing(true);
        try {
            const data = await predictSign(screenshot);
            if (data.error) {
                setError(data.error);
                return;
            }
            if (data.prediction) {
                setPrediction(data.prediction);
                setHandsDetected(true);
            } else {
                setHandsDetected(false);
                setPrediction(null);
            }
        } catch {
            // Silently handle fetch errors during live capture
        } finally {
            setIsProcessing(false);
        }
    }, [isProcessing]);

    // Start interval when model is ready
    useEffect(() => {
        if (modelReady) {
            intervalRef.current = setInterval(captureAndPredict, CAPTURE_INTERVAL);
        }
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [modelReady, captureAndPredict]);

    return (
        <Box
            sx={{
                maxWidth: 900,
                mx: "auto",
                px: 2,
                py: 4,
            }}
        >
            {/* Header */}
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
                <SignLanguage sx={{ fontSize: 36, color: "#ffffff" }} />
                <Typography variant="h4" sx={{ color: "text.primary" }}>
                    Live Recognition
                </Typography>
            </Stack>

            <Typography variant="body1" sx={{ color: "text.secondary", mb: 4 }}>
                Show hand signs to the webcam and see real-time predictions powered by
                your trained model.
            </Typography>

            {error && (
                <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
                    {error}
                </Alert>
            )}

            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "2fr 1fr" },
                    gap: 3,
                }}
            >
                {/* Webcam Feed */}
                <Card
                    sx={{
                        overflow: "hidden",
                        position: "relative",
                    }}
                >
                    <Box
                        sx={{
                            position: "relative",
                            width: "100%",
                            paddingTop: "75%", // 4:3 aspect ratio
                            backgroundColor: "#000",
                        }}
                    >
                        <Webcam
                            ref={webcamRef}
                            audio={false}
                            screenshotFormat="image/jpeg"
                            mirrored
                            style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                            }}
                            videoConstraints={{
                                width: 640,
                                height: 480,
                                facingMode: "user",
                            }}
                        />

                        {/* Prediction Overlay */}
                        {prediction && (
                            <Fade in>
                                <Box
                                    sx={{
                                        position: "absolute",
                                        bottom: 16,
                                        left: 16,
                                        right: 16,
                                        backgroundColor: "rgba(0, 0, 0, 0.85)",
                                        backdropFilter: "blur(12px)",
                                        borderRadius: 3,
                                        border: "1px solid #333",
                                        px: 3,
                                        py: 2,
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 2,
                                    }}
                                >
                                    <FrontHand sx={{ fontSize: 32, color: "#fff" }} />
                                    <Typography
                                        variant="h5"
                                        sx={{
                                            color: "#fff",
                                            fontWeight: 700,
                                            letterSpacing: "0.02em",
                                        }}
                                    >
                                        {prediction}
                                    </Typography>
                                </Box>
                            </Fade>
                        )}

                        {/* Processing indicator */}
                        {isProcessing && (
                            <Box
                                sx={{
                                    position: "absolute",
                                    top: 12,
                                    right: 12,
                                }}
                            >
                                <CircularProgress size={20} sx={{ color: "secondary.main" }} />
                            </Box>
                        )}

                        {/* Webcam status */}
                        <Box
                            sx={{
                                position: "absolute",
                                top: 12,
                                left: 12,
                            }}
                        >
                            <Chip
                                icon={<Videocam />}
                                label="LIVE"
                                size="small"
                                color={modelReady ? "success" : "default"}
                                sx={{ fontWeight: 700, fontSize: "0.7rem" }}
                            />
                        </Box>
                    </Box>
                </Card>

                {/* Status Panel */}
                <Stack spacing={2}>
                    <Card>
                        <CardContent>
                            <Typography
                                variant="overline"
                                sx={{ color: "text.secondary", letterSpacing: 1.5 }}
                            >
                                Detection Status
                            </Typography>
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1 }}>
                                <Box
                                    sx={{
                                        width: 10,
                                        height: 10,
                                        borderRadius: "50%",
                                        backgroundColor: handsDetected ? "success.main" : "text.secondary",
                                        boxShadow: "none",
                                        transition: "all 0.3s",
                                    }}
                                />
                                <Typography variant="body2" sx={{ color: "text.primary" }}>
                                    {handsDetected ? "Hands Detected" : "No Hands"}
                                </Typography>
                            </Stack>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent>
                            <Typography
                                variant="overline"
                                sx={{ color: "text.secondary", letterSpacing: 1.5 }}
                            >
                                Current Prediction
                            </Typography>
                            <Grow in={!!prediction} timeout={400}>
                                <Typography
                                    variant="h4"
                                    sx={{
                                        mt: 1,
                                        color: "#ffffff",
                                        fontWeight: 800,
                                    }}
                                >
                                    {prediction || "—"}
                                </Typography>
                            </Grow>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent>
                            <Typography
                                variant="overline"
                                sx={{ color: "text.secondary", letterSpacing: 1.5 }}
                            >
                                Model Status
                            </Typography>
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1 }}>
                                <Box
                                    sx={{
                                        width: 10,
                                        height: 10,
                                        borderRadius: "50%",
                                        backgroundColor: modelReady
                                            ? "success.main"
                                            : modelReady === null
                                                ? "warning.main"
                                                : "error.main",
                                        boxShadow: "none",
                                    }}
                                />
                                <Typography variant="body2" sx={{ color: "text.primary" }}>
                                    {modelReady
                                        ? "Model Loaded"
                                        : modelReady === null
                                            ? "Checking…"
                                            : "No Model"}
                                </Typography>
                            </Stack>
                        </CardContent>
                    </Card>

                    <Card sx={{ backgroundColor: "#1a1a1a" }}>
                        <CardContent>
                            <Typography variant="body2" sx={{ color: "text.secondary" }}>
                                💡 Show your hand signs clearly in good lighting. The model
                                predicts based on the hand landmarks detected by MediaPipe.
                            </Typography>
                        </CardContent>
                    </Card>
                </Stack>
            </Box>
        </Box>
    );
}
