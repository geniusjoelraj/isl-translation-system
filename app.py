import os
import cv2
import json
import base64
import uuid
import shutil
import numpy as np
import mediapipe as mp
import joblib
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
from sklearn.neighbors import KNeighborsClassifier
import db

# --- Configuration ---
MODELS_DIR = "saved_models"
DATA_DIR = "dataset"

app = Flask(__name__)
CORS(app)

# --- MediaPipe Setup ---
# Hand landmarker: detect up to 2 hands
hand_base = python.BaseOptions(model_asset_path="hand_landmarker.task")
hand_options = vision.HandLandmarkerOptions(base_options=hand_base, num_hands=2)
hand_detector = vision.HandLandmarker.create_from_options(hand_options)

# --- Model State ---
knn_model = None
active_model_id = None


def load_model_from_db():
    """Load the active model from the database."""
    global knn_model, active_model_id
    active = db.get_active_model()
    if active and os.path.exists(active["file_path"]):
        knn_model = joblib.load(active["file_path"])
        active_model_id = active["id"]
        print(f"Loaded active model: {active['name']} ({active['file_path']})")
        return True
    return False


def load_model_by_id(model_id):
    """Load a specific model by its database ID."""
    global knn_model, active_model_id
    model = db.get_model_by_id(model_id)
    if model and os.path.exists(model["file_path"]):
        knn_model = joblib.load(model["file_path"])
        active_model_id = model["id"]
        db.set_active_model(model_id)
        return True
    return False


def extract_landmarks(frame):
    """Extract hand landmarks from a BGR frame. Returns 84-feature list or None."""
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)

    hand_result = hand_detector.detect(mp_image)
    if not hand_result.hand_landmarks:
        return None

    lm_list = []
    for hand_landmarks in hand_result.hand_landmarks:
        for lm in hand_landmarks:
            lm_list.extend([lm.x, lm.y])

    # Pad to 84 if only 1 hand detected (42 → 84)
    if len(lm_list) == 42:
        lm_list.extend([0.0] * 42)

    if len(lm_list) == 84:
        return lm_list
    return None


def decode_base64_image(data_url):
    """Decode a base64 data URL to a cv2 image (BGR)."""
    # Handle both raw base64 and data URL format
    if "," in data_url:
        data_url = data_url.split(",")[1]
    img_bytes = base64.b64decode(data_url)
    np_arr = np.frombuffer(img_bytes, np.uint8)
    frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    return frame


def train_and_save(file_path):
    """Train KNN from dataset directory, save to file_path, return (model, words, error)."""
    X, y = [], []

    if not os.path.exists(DATA_DIR):
        return None, [], "Dataset directory does not exist"

    labels_found = []
    for word in os.listdir(DATA_DIR):
        word_path = os.path.join(DATA_DIR, word)
        if not os.path.isdir(word_path):
            continue
        labels_found.append(word)

        for img_name in os.listdir(word_path):
            img_path = os.path.join(word_path, img_name)
            frame = cv2.imread(img_path)
            if frame is None:
                continue

            landmarks = extract_landmarks(frame)
            if landmarks:
                X.append(landmarks)
                y.append(word)

    if len(X) == 0:
        return None, [], "No valid landmark data extracted from dataset"

    if len(set(y)) < 2:
        return None, [], f"Need at least 2 different labels to train. Found: {set(y)}"

    model = KNeighborsClassifier(n_neighbors=min(3, len(X)))
    model.fit(X, y)

    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    joblib.dump(model, file_path)
    return model, sorted(set(y)), None


# --- API Endpoints ---


@app.route("/api/predict", methods=["POST"])
def predict():
    """Predict sign from a base64-encoded webcam frame."""
    global knn_model

    if knn_model is None:
        return jsonify({"error": "No model loaded. Please train a model first."}), 400

    data = request.get_json()
    if not data or "image" not in data:
        return jsonify({"error": "No image data provided"}), 400

    try:
        frame = decode_base64_image(data["image"])
        if frame is None:
            return jsonify({"error": "Could not decode image"}), 400

        landmarks = extract_landmarks(frame)
        if landmarks is None:
            return jsonify({"prediction": None, "message": "No hands detected"})

        prediction = knn_model.predict([landmarks])[0]
        return jsonify({"prediction": prediction})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/capture", methods=["POST"])
def capture():
    """Save a base64 webcam frame to the dataset under a label folder."""
    data = request.get_json()
    if not data or "image" not in data or "label" not in data:
        return jsonify({"error": "Must provide 'image' and 'label'"}), 400

    label = data["label"].strip()
    if not label:
        return jsonify({"error": "Label cannot be empty"}), 400

    try:
        frame = decode_base64_image(data["image"])
        if frame is None:
            return jsonify({"error": "Could not decode image"}), 400

        label_dir = os.path.join(DATA_DIR, label)
        os.makedirs(label_dir, exist_ok=True)

        filename = f"{uuid.uuid4().hex}.jpg"
        filepath = os.path.join(label_dir, filename)
        cv2.imwrite(filepath, frame)

        # Count images in this label
        count = len(
            [f for f in os.listdir(label_dir) if f.endswith((".jpg", ".png", ".jpeg"))]
        )

        return jsonify(
            {
                "success": True,
                "label": label,
                "filename": filename,
                "total_images": count,
            }
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/train", methods=["POST"])
def train():
    """Train the model. Accepts mode and model_name."""
    global knn_model, active_model_id
    data = request.get_json() or {}
    mode = data.get("mode", "retrain")
    model_name = data.get("name", "Untitled Model").strip() or "Untitled Model"
    model_type = data.get("type", "custom")  # 'base' or 'custom'

    # Generate unique file path
    file_id = uuid.uuid4().hex[:8]
    file_path = os.path.join(MODELS_DIR, f"{file_id}.joblib")

    model, words, error = train_and_save(file_path)
    if error:
        return jsonify({"error": error}), 400

    # Save to database
    model_id = db.add_model(model_name, model_type, file_path, words)
    db.set_active_model(model_id)
    knn_model = model
    active_model_id = model_id

    return jsonify(
        {
            "success": True,
            "message": f"Model '{model_name}' trained successfully",
            "model_id": model_id,
            "words": words,
        }
    )


@app.route("/api/labels", methods=["GET"])
def get_labels():
    """Return list of labels and image counts in the dataset."""
    if not os.path.exists(DATA_DIR):
        return jsonify({"labels": []})

    labels = []
    for name in sorted(os.listdir(DATA_DIR)):
        label_path = os.path.join(DATA_DIR, name)
        if os.path.isdir(label_path):
            count = len(
                [
                    f
                    for f in os.listdir(label_path)
                    if f.lower().endswith((".jpg", ".png", ".jpeg"))
                ]
            )
            labels.append({"name": name, "count": count})

    return jsonify({"labels": labels})


def serialize_model(m):
    """Convert a model DB row to a JSON-safe dict."""
    return {
        "id": m["id"],
        "name": m["name"],
        "type": m["type"],
        "words": json.loads(m["words"]),
        "description": m.get("description", ""),
        "downloaded": bool(m.get("downloaded", 1)),
        "published": bool(m.get("published", 0)),
        "is_active": bool(m["is_active"]),
        "created_at": m["created_at"],
        "updated_at": m["updated_at"],
    }


@app.route("/api/model-status", methods=["GET"])
def model_status():
    """Return whether a model is loaded and info about the active model."""
    active = db.get_active_model()
    info = {
        "model_loaded": knn_model is not None,
        "active_model": serialize_model(active) if active else None,
    }
    return jsonify(info)


@app.route("/api/models", methods=["GET"])
def list_models():
    """Return downloaded (saved) models only."""
    models = db.get_downloaded_models()
    return jsonify({"models": [serialize_model(m) for m in models]})


@app.route("/api/models/marketplace", methods=["GET"])
def marketplace_models():
    """Return models published to the marketplace."""
    models = db.get_marketplace_models()
    return jsonify({"models": [serialize_model(m) for m in models]})


@app.route("/api/models/<int:model_id>/download", methods=["POST"])
def download_model(model_id):
    """Mark a marketplace model as downloaded."""
    model = db.get_model_by_id(model_id)
    if not model:
        return jsonify({"error": "Model not found"}), 404
    db.mark_downloaded(model_id)
    return jsonify({"success": True, "message": f"Model '{model['name']}' downloaded"})


@app.route("/api/models/<int:model_id>/publish", methods=["POST"])
def publish_model(model_id):
    """Publish a model to the marketplace."""
    model = db.get_model_by_id(model_id)
    if not model:
        return jsonify({"error": "Model not found"}), 404
    db.publish_model(model_id)
    return jsonify(
        {
            "success": True,
            "message": f"Model '{model['name']}' published to marketplace",
        }
    )


@app.route("/api/models/<int:model_id>/unpublish", methods=["POST"])
def unpublish_model(model_id):
    """Remove a model from the marketplace."""
    model = db.get_model_by_id(model_id)
    if not model:
        return jsonify({"error": "Model not found"}), 404
    db.unpublish_model(model_id)
    return jsonify(
        {
            "success": True,
            "message": f"Model '{model['name']}' removed from marketplace",
        }
    )


@app.route("/api/models/<int:model_id>/activate", methods=["POST"])
def activate_model(model_id):
    """Switch the active model. Only downloaded models can be activated."""
    model = db.get_model_by_id(model_id)
    if not model:
        return jsonify({"error": "Model not found"}), 404
    if not model.get("downloaded"):
        return jsonify({"error": "Model must be downloaded first"}), 400
    success = load_model_by_id(model_id)
    if not success:
        return jsonify({"error": "Model file missing on disk"}), 404
    return jsonify({"success": True, "message": "Model activated"})


@app.route("/api/models/<int:model_id>", methods=["DELETE"])
def remove_model(model_id):
    """Delete a model from DB and disk."""
    global knn_model, active_model_id
    if active_model_id == model_id:
        knn_model = None
        active_model_id = None
    db.delete_model(model_id)
    return jsonify({"success": True, "message": "Model deleted"})


@app.route("/api/delete-label", methods=["POST"])
def delete_label():
    """Delete all images for a specific label."""
    data = request.get_json()
    if not data or "label" not in data:
        return jsonify({"error": "Must provide 'label'"}), 400

    label = data["label"].strip()
    label_dir = os.path.join(DATA_DIR, label)

    if not os.path.exists(label_dir):
        return jsonify({"error": f"Label '{label}' not found"}), 404

    shutil.rmtree(label_dir)
    return jsonify({"success": True, "message": f"Deleted label '{label}'"})


# --- Startup ---
os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(DATA_DIR, exist_ok=True)
load_model_from_db()

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
