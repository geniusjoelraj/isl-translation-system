import { useState, useRef, useCallback, useEffect } from "react";
import Webcam from "react-webcam";
import {
    Box,
    Card,
    CardContent,
    Typography,
    TextField,
    Button,
    Stack,
    Chip,
    Alert,
    Snackbar,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    LinearProgress,
    IconButton,
    Tooltip,
    Divider,
    Fade,
} from "@mui/material";
import {
    CameraAlt,
    ModelTraining,
    DeleteOutline,
    AddAPhoto,
    FolderOpen,
    Refresh,
    CheckCircle,
    WarningAmber,
    Storage,
    PlayArrow,
    Publish,
} from "@mui/icons-material";
import {
    captureImage,
    trainModel,
    getLabels,
    deleteLabel,
    getModelStatus,
    listModels,
    activateModel,
    deleteModelById,
    publishModel,
    unpublishModel,
} from "../api";

export default function TrainingPage() {
    const webcamRef = useRef(null);
    const [label, setLabel] = useState("");
    const [labels, setLabels] = useState([]);
    const [captureCount, setCaptureCount] = useState(0);
    const [isCapturing, setIsCapturing] = useState(false);
    const [burstActive, setBurstActive] = useState(false);
    const [trainDialogOpen, setTrainDialogOpen] = useState(false);
    const [isTraining, setIsTraining] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
    const [modelInfo, setModelInfo] = useState(null);
    const [models, setModels] = useState([]);
    const [modelName, setModelName] = useState("");
    const burstIntervalRef = useRef(null);

    const fetchLabels = useCallback(async () => {
        try {
            const data = await getLabels();
            setLabels(data.labels || []);
        } catch {
            // silently fail
        }
    }, []);

    const fetchModelStatus = useCallback(async () => {
        try {
            const data = await getModelStatus();
            setModelInfo(data);
        } catch {
            // silently fail
        }
    }, []);

    const fetchModels = useCallback(async () => {
        try {
            const data = await listModels();
            setModels(data.models || []);
        } catch {
            // silently fail
        }
    }, []);

    useEffect(() => {
        fetchLabels();
        fetchModelStatus();
        fetchModels();
    }, [fetchLabels, fetchModelStatus, fetchModels]);

    // Single capture
    const handleCapture = useCallback(async () => {
        if (!webcamRef.current || !label.trim()) return;
        const screenshot = webcamRef.current.getScreenshot();
        if (!screenshot) return;

        setIsCapturing(true);
        try {
            const data = await captureImage(screenshot, label.trim());
            if (data.success) {
                setCaptureCount((prev) => prev + 1);
                fetchLabels();
            } else {
                setSnackbar({ open: true, message: data.error || "Capture failed", severity: "error" });
            }
        } catch {
            setSnackbar({ open: true, message: "Failed to connect to server", severity: "error" });
        } finally {
            setIsCapturing(false);
        }
    }, [label, fetchLabels]);

    // Burst capture
    const toggleBurst = useCallback(() => {
        if (burstActive) {
            clearInterval(burstIntervalRef.current);
            setBurstActive(false);
        } else {
            setBurstActive(true);
            burstIntervalRef.current = setInterval(() => {
                handleCapture();
            }, 200);
        }
    }, [burstActive, handleCapture]);

    useEffect(() => {
        return () => {
            if (burstIntervalRef.current) clearInterval(burstIntervalRef.current);
        };
    }, []);

    const handleTrain = async (mode) => {
        setTrainDialogOpen(false);
        setIsTraining(true);
        const name = modelName.trim() || "Untitled Model";
        const type = mode === "new" ? "custom" : "custom";
        try {
            const data = await trainModel(mode, name, type);
            if (data.success) {
                setSnackbar({
                    open: true,
                    message: `Model "${name}" trained successfully!`,
                    severity: "success",
                });
                setModelName("");
                fetchModelStatus();
                fetchModels();
            } else {
                setSnackbar({ open: true, message: data.error || "Training failed", severity: "error" });
            }
        } catch {
            setSnackbar({ open: true, message: "Failed to connect to server", severity: "error" });
        } finally {
            setIsTraining(false);
        }
    };

    const handleActivateModel = async (id) => {
        try {
            const data = await activateModel(id);
            if (data.success) {
                setSnackbar({ open: true, message: "Model activated", severity: "success" });
                fetchModelStatus();
                fetchModels();
            }
        } catch {
            setSnackbar({ open: true, message: "Failed to activate model", severity: "error" });
        }
    };

    const handleDeleteModel = async (id) => {
        try {
            const data = await deleteModelById(id);
            if (data.success) {
                setSnackbar({ open: true, message: "Model deleted", severity: "info" });
                fetchModelStatus();
                fetchModels();
            }
        } catch {
            setSnackbar({ open: true, message: "Failed to delete model", severity: "error" });
        }
    };

    const handlePublishToggle = async (model) => {
        try {
            const fn = model.published ? unpublishModel : publishModel;
            const data = await fn(model.id);
            if (data.success) {
                setSnackbar({
                    open: true,
                    message: model.published
                        ? `"${model.name}" removed from marketplace`
                        : `"${model.name}" published to marketplace`,
                    severity: "success",
                });
                fetchModels();
            }
        } catch {
            setSnackbar({ open: true, message: "Failed to update publish status", severity: "error" });
        }
    };

    const handleDeleteLabel = async (labelName) => {
        try {
            const data = await deleteLabel(labelName);
            if (data.success) {
                setSnackbar({ open: true, message: `Deleted label "${labelName}"`, severity: "info" });
                fetchLabels();
            }
        } catch {
            setSnackbar({ open: true, message: "Failed to delete label", severity: "error" });
        }
    };

    const totalImages = labels.reduce((sum, l) => sum + l.count, 0);

    return (
        <Box sx={{ maxWidth: 1100, mx: "auto", px: 2, py: 4 }}>
            {/* Header */}
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
                <ModelTraining sx={{ fontSize: 36, color: "#ffffff" }} />
                <Typography variant="h4">Model Training</Typography>
            </Stack>
            <Typography variant="body1" sx={{ color: "text.secondary", mb: 4 }}>
                Capture hand sign images with your webcam, then train the model to
                recognize new signs.
            </Typography>

            {isTraining && (
                <Alert
                    severity="info"
                    icon={<ModelTraining />}
                    sx={{ mb: 3, borderRadius: 2 }}
                >
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Training in progress…
                    </Typography>
                    <LinearProgress sx={{ mt: 1, borderRadius: 1 }} />
                </Alert>
            )}

            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                    gap: 3,
                }}
            >
                {/* Left Column: Webcam + Capture */}
                <Stack spacing={3}>
                    {/* Webcam */}
                    <Card sx={{ overflow: "hidden" }}>
                        <Box
                            sx={{
                                position: "relative",
                                width: "100%",
                                paddingTop: "75%",
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

                            {burstActive && (
                                <Fade in>
                                    <Box
                                        sx={{
                                            position: "absolute",
                                            top: 12,
                                            left: 12,
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 1,
                                        }}
                                    >
                                        <Chip
                                            label="● BURST CAPTURE"
                                            size="small"
                                            color="error"
                                            sx={{
                                                fontWeight: 700,
                                                fontSize: "0.7rem",
                                                animation: "pulse 1s infinite",
                                                "@keyframes pulse": {
                                                    "0%, 100%": { opacity: 1 },
                                                    "50%": { opacity: 0.5 },
                                                },
                                            }}
                                        />
                                    </Box>
                                </Fade>
                            )}

                            {captureCount > 0 && (
                                <Box sx={{ position: "absolute", top: 12, right: 12 }}>
                                    <Chip
                                        icon={<CameraAlt />}
                                        label={`${captureCount} captured`}
                                        size="small"
                                        color="primary"
                                        sx={{ fontWeight: 600 }}
                                    />
                                </Box>
                            )}
                        </Box>
                    </Card>

                    {/* Capture Controls */}
                    <Card>
                        <CardContent>
                            <Typography variant="h6" sx={{ mb: 2 }}>
                                Capture Images
                            </Typography>

                            <TextField
                                fullWidth
                                label="Sign Label"
                                placeholder="e.g. hello, thanks, A, B…"
                                value={label}
                                onChange={(e) => setLabel(e.target.value)}
                                variant="outlined"
                                size="small"
                                sx={{
                                    mb: 2,
                                    "& .MuiOutlinedInput-root": { borderRadius: 2 },
                                }}
                            />

                            <Stack direction="row" spacing={1.5}>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    startIcon={<CameraAlt />}
                                    onClick={handleCapture}
                                    disabled={!label.trim() || isCapturing}
                                    fullWidth
                                >
                                    Capture
                                </Button>
                                <Button
                                    variant={burstActive ? "contained" : "outlined"}
                                    color={burstActive ? "error" : "secondary"}
                                    startIcon={<AddAPhoto />}
                                    onClick={toggleBurst}
                                    disabled={!label.trim()}
                                    fullWidth
                                >
                                    {burstActive ? "Stop Burst" : "Burst Mode"}
                                </Button>
                            </Stack>

                            <Typography
                                variant="caption"
                                sx={{ display: "block", mt: 1.5, color: "text.secondary" }}
                            >
                                💡 Burst mode captures images rapidly. Vary your hand position
                                slightly between captures for better training data.
                            </Typography>
                        </CardContent>
                    </Card>
                </Stack>

                {/* Right Column: Dataset, Train & Models */}
                <Stack spacing={3}>
                    {/* Model Status */}
                    <Card
                        sx={{
                            background: modelInfo?.model_loaded
                                ? "rgba(76, 175, 80, 0.06)"
                                : "rgba(244, 67, 54, 0.06)",
                        }}
                    >
                        <CardContent>
                            <Stack direction="row" alignItems="center" justifyContent="space-between">
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    {modelInfo?.model_loaded ? (
                                        <CheckCircle sx={{ color: "success.main" }} />
                                    ) : (
                                        <WarningAmber sx={{ color: "error.main" }} />
                                    )}
                                    <Box>
                                        <Typography variant="h6">
                                            {modelInfo?.model_loaded
                                                ? modelInfo?.active_model?.name || "Model Ready"
                                                : "No Model"}
                                        </Typography>
                                        {modelInfo?.active_model && (
                                            <Typography variant="caption" sx={{ color: "text.secondary" }}>
                                                {modelInfo.active_model.type} · {modelInfo.active_model.words.length} words
                                            </Typography>
                                        )}
                                    </Box>
                                </Stack>
                                <Tooltip title="Refresh status">
                                    <IconButton size="small" onClick={() => { fetchModelStatus(); fetchModels(); }}>
                                        <Refresh />
                                    </IconButton>
                                </Tooltip>
                            </Stack>
                            {modelInfo?.active_model?.words?.length > 0 && (
                                <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 1.5 }}>
                                    {modelInfo.active_model.words.map((w) => (
                                        <Chip
                                            key={w}
                                            label={w}
                                            size="small"
                                            sx={{
                                                height: 22,
                                                fontSize: "0.7rem",
                                                backgroundColor: "rgba(255,255,255,0.08)",
                                                color: "#ccc",
                                            }}
                                        />
                                    ))}
                                </Stack>
                            )}
                        </CardContent>
                    </Card>

                    {/* Dataset Labels */}
                    <Card>
                        <CardContent>
                            <Stack
                                direction="row"
                                alignItems="center"
                                justifyContent="space-between"
                                sx={{ mb: 2 }}
                            >
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    <FolderOpen sx={{ color: "#888" }} />
                                    <Typography variant="h6">Dataset</Typography>
                                </Stack>
                                <Chip
                                    label={`${totalImages} images · ${labels.length} labels`}
                                    size="small"
                                    variant="outlined"
                                    sx={{ borderColor: "#333" }}
                                />
                            </Stack>

                            {labels.length === 0 ? (
                                <Typography
                                    variant="body2"
                                    sx={{ color: "text.secondary", textAlign: "center", py: 3 }}
                                >
                                    No labels yet. Start capturing images above!
                                </Typography>
                            ) : (
                                <Stack spacing={1}>
                                    {labels.map((l) => (
                                        <Box
                                            key={l.name}
                                            sx={{
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "space-between",
                                                p: 1.5,
                                                borderRadius: 2,
                                                backgroundColor: "rgba(255, 255, 255, 0.03)",
                                                border: "1px solid #222",
                                                transition: "all 0.2s",
                                                "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.06)" },
                                            }}
                                        >
                                            <Stack direction="row" alignItems="center" spacing={1.5}>
                                                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                                    {l.name}
                                                </Typography>
                                                <Chip
                                                    label={`${l.count} images`}
                                                    size="small"
                                                    sx={{
                                                        height: 22,
                                                        fontSize: "0.7rem",
                                                        backgroundColor: "rgba(255, 255, 255, 0.08)",
                                                        color: "#ccc",
                                                    }}
                                                />
                                            </Stack>
                                            <Tooltip title={`Delete "${l.name}"`}>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleDeleteLabel(l.name)}
                                                    sx={{ color: "error.main", opacity: 0.6, "&:hover": { opacity: 1 } }}
                                                >
                                                    <DeleteOutline fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                    ))}
                                </Stack>
                            )}

                            <Divider sx={{ my: 2, borderColor: "#222" }} />

                            {/* Train Button */}
                            <Button
                                variant="contained"
                                color="secondary"
                                size="large"
                                fullWidth
                                startIcon={<ModelTraining />}
                                onClick={() => setTrainDialogOpen(true)}
                                disabled={labels.length < 2 || isTraining}
                                sx={{ py: 1.5, fontSize: "1rem" }}
                            >
                                {isTraining ? "Training…" : "Train Model"}
                            </Button>

                            {labels.length > 0 && labels.length < 2 && (
                                <Typography
                                    variant="caption"
                                    sx={{ display: "block", mt: 1, color: "warning.main", textAlign: "center" }}
                                >
                                    You need at least 2 different labels to train a model.
                                </Typography>
                            )}
                        </CardContent>
                    </Card>

                    {/* Saved Models */}
                    <Card>
                        <CardContent>
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                                <Storage sx={{ color: "#888" }} />
                                <Typography variant="h6">Saved Models</Typography>
                                <Chip
                                    label={`${models.length}`}
                                    size="small"
                                    variant="outlined"
                                    sx={{ borderColor: "#333", ml: "auto" }}
                                />
                            </Stack>

                            {models.length === 0 ? (
                                <Typography
                                    variant="body2"
                                    sx={{ color: "text.secondary", textAlign: "center", py: 3 }}
                                >
                                    No saved models yet. Train one above!
                                </Typography>
                            ) : (
                                <Stack spacing={1}>
                                    {models.map((m) => (
                                        <Box
                                            key={m.id}
                                            sx={{
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "space-between",
                                                p: 1.5,
                                                borderRadius: 2,
                                                backgroundColor: m.is_active
                                                    ? "rgba(76, 175, 80, 0.06)"
                                                    : "rgba(255, 255, 255, 0.03)",
                                                border: m.is_active
                                                    ? "1px solid rgba(76, 175, 80, 0.3)"
                                                    : "1px solid #222",
                                                transition: "all 0.2s",
                                                "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.06)" },
                                            }}
                                        >
                                            <Box sx={{ minWidth: 0, flex: 1 }}>
                                                <Stack direction="row" alignItems="center" spacing={1}>
                                                    <Typography
                                                        variant="body1"
                                                        sx={{
                                                            fontWeight: 600,
                                                            overflow: "hidden",
                                                            textOverflow: "ellipsis",
                                                            whiteSpace: "nowrap",
                                                        }}
                                                    >
                                                        {m.name}
                                                    </Typography>
                                                    {m.is_active && (
                                                        <Chip
                                                            label="ACTIVE"
                                                            size="small"
                                                            sx={{
                                                                height: 20,
                                                                fontSize: "0.65rem",
                                                                fontWeight: 700,
                                                                backgroundColor: "rgba(76, 175, 80, 0.15)",
                                                                color: "success.main",
                                                            }}
                                                        />
                                                    )}
                                                    <Chip
                                                        label={m.type}
                                                        size="small"
                                                        sx={{
                                                            height: 20,
                                                            fontSize: "0.65rem",
                                                            backgroundColor: "rgba(255,255,255,0.06)",
                                                            color: "#999",
                                                        }}
                                                    />
                                                    {m.published && (
                                                        <Chip
                                                            label="PUBLISHED"
                                                            size="small"
                                                            sx={{
                                                                height: 20,
                                                                fontSize: "0.65rem",
                                                                fontWeight: 700,
                                                                backgroundColor: "rgba(33, 150, 243, 0.12)",
                                                                color: "#64b5f6",
                                                            }}
                                                        />
                                                    )}
                                                </Stack>
                                                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                                                    {m.words.length} words: {m.words.join(", ")}
                                                </Typography>
                                            </Box>
                                            <Stack direction="row" spacing={0.5}>
                                                <Tooltip title={m.published ? "Remove from marketplace" : "Publish to marketplace"}>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handlePublishToggle(m)}
                                                        sx={{
                                                            color: m.published ? "#64b5f6" : "#666",
                                                            "&:hover": { color: m.published ? "#90caf9" : "#64b5f6" },
                                                        }}
                                                    >
                                                        <Publish fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                {!m.is_active && (
                                                    <Tooltip title="Activate this model">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleActivateModel(m.id)}
                                                            sx={{ color: "#888", "&:hover": { color: "success.main" } }}
                                                        >
                                                            <PlayArrow fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                                <Tooltip title="Delete model">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleDeleteModel(m.id)}
                                                        sx={{ color: "error.main", opacity: 0.6, "&:hover": { opacity: 1 } }}
                                                    >
                                                        <DeleteOutline fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </Stack>
                                        </Box>
                                    ))}
                                </Stack>
                            )}
                        </CardContent>
                    </Card>
                </Stack>
            </Box>

            {/* Train Mode Dialog */}
            <Dialog
                open={trainDialogOpen}
                onClose={() => setTrainDialogOpen(false)}
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        backgroundColor: "#141414",
                        border: "1px solid #333",
                        minWidth: 400,
                    },
                }}
            >
                <DialogTitle sx={{ fontWeight: 700 }}>Train Model</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ color: "text.secondary", mb: 2 }}>
                        Give your model a name and choose training mode:
                    </DialogContentText>

                    <TextField
                        fullWidth
                        label="Model Name"
                        placeholder="e.g. ISL Basics, Alphabet Model…"
                        value={modelName}
                        onChange={(e) => setModelName(e.target.value)}
                        variant="outlined"
                        size="small"
                        sx={{
                            mb: 2,
                            "& .MuiOutlinedInput-root": { borderRadius: 2 },
                        }}
                    />

                    <Stack spacing={2}>
                        <Card
                            onClick={() => handleTrain("new")}
                            sx={{
                                cursor: "pointer",
                                p: 2,
                                transition: "all 0.2s",
                                "&:hover": {
                                    borderColor: "#555",
                                    transform: "translateY(-2px)",
                                    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.3)",
                                },
                            }}
                        >
                            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#ffffff" }}>
                                🆕 Create New
                            </Typography>
                            <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
                                Train a fresh model from the current dataset and save it separately.
                            </Typography>
                        </Card>

                        <Card
                            onClick={() => handleTrain("retrain")}
                            sx={{
                                cursor: "pointer",
                                p: 2,
                                transition: "all 0.2s",
                                "&:hover": {
                                    borderColor: "#555",
                                    transform: "translateY(-2px)",
                                    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.3)",
                                },
                            }}
                        >
                            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#ccc" }}>
                                🔄 Replace Existing
                            </Typography>
                            <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
                                Retrain with updated dataset and save as a new version.
                            </Typography>
                        </Card>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setTrainDialogOpen(false)} color="inherit">
                        Cancel
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                <Alert
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                    severity={snackbar.severity}
                    variant="filled"
                    sx={{ borderRadius: 2, width: "100%" }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}
