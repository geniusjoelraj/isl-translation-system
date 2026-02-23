const API_BASE = "http://localhost:5000/api";

export async function predictSign(imageBase64) {
    const res = await fetch(`${API_BASE}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageBase64 }),
    });
    return res.json();
}

export async function captureImage(imageBase64, label) {
    const res = await fetch(`${API_BASE}/capture`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageBase64, label }),
    });
    return res.json();
}

export async function trainModel(mode, name = "Untitled Model", type = "custom") {
    const res = await fetch(`${API_BASE}/train`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, name, type }),
    });
    return res.json();
}

export async function getLabels() {
    const res = await fetch(`${API_BASE}/labels`);
    return res.json();
}

export async function getModelStatus() {
    const res = await fetch(`${API_BASE}/model-status`);
    return res.json();
}

export async function listModels() {
    const res = await fetch(`${API_BASE}/models`);
    return res.json();
}

export async function activateModel(modelId) {
    const res = await fetch(`${API_BASE}/models/${modelId}/activate`, {
        method: "POST",
    });
    return res.json();
}

export async function deleteModelById(modelId) {
    const res = await fetch(`${API_BASE}/models/${modelId}`, {
        method: "DELETE",
    });
    return res.json();
}

export async function getMarketplaceModels() {
    const res = await fetch(`${API_BASE}/models/marketplace`);
    return res.json();
}

export async function downloadModel(modelId) {
    const res = await fetch(`${API_BASE}/models/${modelId}/download`, {
        method: "POST",
    });
    return res.json();
}

export async function publishModel(modelId) {
    const res = await fetch(`${API_BASE}/models/${modelId}/publish`, {
        method: "POST",
    });
    return res.json();
}

export async function unpublishModel(modelId) {
    const res = await fetch(`${API_BASE}/models/${modelId}/unpublish`, {
        method: "POST",
    });
    return res.json();
}

export async function deleteLabel(label) {
    const res = await fetch(`${API_BASE}/delete-label`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
    });
    return res.json();
}
