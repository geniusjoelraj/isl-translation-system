import { useState, useCallback, useEffect } from "react";
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    Stack,
    Chip,
    Alert,
    Snackbar,
    Divider,
    Fade,
} from "@mui/material";
import {
    Storefront,
    Download,
    CheckCircle,
    Translate,
} from "@mui/icons-material";
import { getMarketplaceModels, downloadModel } from "../api";

export default function MarketplacePage() {
    const [models, setModels] = useState([]);
    const [downloading, setDownloading] = useState(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

    const fetchModels = useCallback(async () => {
        try {
            const data = await getMarketplaceModels();
            setModels(data.models || []);
        } catch {
            // silently fail
        }
    }, []);

    useEffect(() => {
        fetchModels();
    }, [fetchModels]);

    const handleDownload = async (id, name) => {
        setDownloading(id);
        try {
            const data = await downloadModel(id);
            if (data.success) {
                setSnackbar({
                    open: true,
                    message: `"${name}" downloaded — find it in your Saved Models on the Training tab.`,
                    severity: "success",
                });
                fetchModels(); // refresh to remove from marketplace
            } else {
                setSnackbar({ open: true, message: data.error || "Download failed", severity: "error" });
            }
        } catch {
            setSnackbar({ open: true, message: "Failed to connect to server", severity: "error" });
        } finally {
            setDownloading(null);
        }
    };

    return (
        <Box sx={{ maxWidth: 900, mx: "auto", px: 2, py: 4 }}>
            {/* Header */}
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
                <Storefront sx={{ fontSize: 36, color: "#ffffff" }} />
                <Typography variant="h4">Marketplace</Typography>
            </Stack>
            <Typography variant="body1" sx={{ color: "text.secondary", mb: 4 }}>
                Models published by users. Download them to your saved collection
                and start recognising signs instantly.
            </Typography>

            {models.length === 0 ? (
                <Card sx={{ textAlign: "center", py: 6 }}>
                    <CardContent>
                        <Storefront sx={{ fontSize: 48, color: "#555", mb: 2 }} />
                        <Typography variant="h6" sx={{ mb: 1 }}>
                            No models published yet
                        </Typography>
                        <Typography variant="body2" sx={{ color: "text.secondary" }}>
                            Train a model on the Training tab, then publish it here
                            for others to download.
                        </Typography>
                    </CardContent>
                </Card>
            ) : (
                <Stack spacing={2}>
                    {models.map((m) => (
                        <Fade in key={m.id}>
                            <Card
                                sx={{
                                    transition: "all 0.2s",
                                    "&:hover": {
                                        borderColor: "#444",
                                        transform: "translateY(-2px)",
                                        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
                                    },
                                }}
                            >
                                <CardContent sx={{ py: 2.5 }}>
                                    <Stack
                                        direction={{ xs: "column", sm: "row" }}
                                        alignItems={{ sm: "center" }}
                                        justifyContent="space-between"
                                        spacing={2}
                                    >
                                        {/* Info */}
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                                                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                                    {m.name}
                                                </Typography>
                                                <Chip
                                                    label={m.type}
                                                    size="small"
                                                    sx={{
                                                        height: 20,
                                                        fontSize: "0.65rem",
                                                        fontWeight: 700,
                                                        backgroundColor:
                                                            m.type === "base"
                                                                ? "rgba(33, 150, 243, 0.12)"
                                                                : "rgba(255, 255, 255, 0.06)",
                                                        color:
                                                            m.type === "base" ? "#64b5f6" : "#999",
                                                        textTransform: "uppercase",
                                                    }}
                                                />
                                            </Stack>

                                            {m.description && (
                                                <Typography
                                                    variant="body2"
                                                    sx={{ color: "text.secondary", mb: 1.5 }}
                                                >
                                                    {m.description}
                                                </Typography>
                                            )}

                                            <Stack direction="row" alignItems="center" spacing={1}>
                                                <Translate sx={{ fontSize: 16, color: "#666" }} />
                                                <Typography variant="caption" sx={{ color: "#888" }}>
                                                    {m.words.length} words
                                                </Typography>
                                                <Divider
                                                    orientation="vertical"
                                                    flexItem
                                                    sx={{ borderColor: "#333", mx: 0.5 }}
                                                />
                                                <Stack direction="row" flexWrap="wrap" gap={0.5}>
                                                    {m.words.slice(0, 8).map((w) => (
                                                        <Chip
                                                            key={w}
                                                            label={w}
                                                            size="small"
                                                            sx={{
                                                                height: 20,
                                                                fontSize: "0.65rem",
                                                                backgroundColor: "rgba(255, 255, 255, 0.05)",
                                                                color: "#aaa",
                                                            }}
                                                        />
                                                    ))}
                                                    {m.words.length > 8 && (
                                                        <Chip
                                                            label={`+${m.words.length - 8} more`}
                                                            size="small"
                                                            sx={{
                                                                height: 20,
                                                                fontSize: "0.65rem",
                                                                backgroundColor: "rgba(255, 255, 255, 0.03)",
                                                                color: "#666",
                                                            }}
                                                        />
                                                    )}
                                                </Stack>
                                            </Stack>
                                        </Box>

                                        {/* Download button */}
                                        <Button
                                            variant="contained"
                                            startIcon={<Download />}
                                            onClick={() => handleDownload(m.id, m.name)}
                                            disabled={downloading === m.id}
                                            sx={{
                                                minWidth: 130,
                                                py: 1.2,
                                                textTransform: "none",
                                                fontWeight: 600,
                                                whiteSpace: "nowrap",
                                            }}
                                        >
                                            {downloading === m.id ? "Downloading…" : "Download"}
                                        </Button>
                                    </Stack>
                                </CardContent>
                            </Card>
                        </Fade>
                    ))}
                </Stack>
            )}

            {/* Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={5000}
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
