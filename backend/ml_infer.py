"""
ml_infer.py — Node.js backend uchun ML inference bridge

Protokol: stdin/stdout, har bir satr = bitta JSON ob'ekti

Node.js → Python:
  {"_id": 1, "type": "analyze", "features": [f1, f2, ...]}
  {"_id": 2, "type": "demo",    "label": "SYN", "fallback_features": [...]}

Python → Node.js:
  {"ready": true, "classes": ["BENIGN", "SYN", ...]}          -- yuklangandan keyin
  {"_id": 1, "status": "ATTACK", "attack_type": "SYN", "confidence": 0.95, "proba": {...}}
  {"_id": 2, ..., "features": [...], "using_real": true}
"""
import sys
import json
import random
import os

try:
    import joblib
    import numpy as np
except ImportError as exc:
    print(json.dumps({"error": f"Import xatosi: {exc}. 'pip install joblib numpy' bajaring."}), flush=True)
    sys.exit(1)

MODEL_PATH   = os.environ.get("MODEL_PATH",   "")
SCALER_PATH  = os.environ.get("SCALER_PATH",  "")
ENCODER_PATH = os.environ.get("ENCODER_PATH", "")
DEMO_PATH    = os.path.join(os.path.dirname(MODEL_PATH), "demo_samples.pkl") if MODEL_PATH else ""

model        = None
scaler       = None
encoder      = None
demo_samples = {}


def load():
    global model, scaler, encoder, demo_samples

    for path, name in [(MODEL_PATH, "Model"), (SCALER_PATH, "Scaler"), (ENCODER_PATH, "Encoder")]:
        if not path or not os.path.exists(path):
            print(json.dumps({
                "error": f"{name} topilmadi: '{path}'. Avval 'python model_train.py' ni ishga tushiring."
            }), flush=True)
            sys.exit(1)

    try:
        model   = joblib.load(MODEL_PATH)
        scaler  = joblib.load(SCALER_PATH)
        encoder = joblib.load(ENCODER_PATH)
    except Exception as exc:
        print(json.dumps({
            "error": f"Model fayllarini yuklashda xato yuz berdi: {exc}. 'xgboost' o'rnatilganligini tekshiring."
        }), flush=True)
        sys.exit(1)

    if DEMO_PATH and os.path.exists(DEMO_PATH):
        try:
            demo_samples = joblib.load(DEMO_PATH)
            demo_info = f"{len(demo_samples)} sinf uchun real namunalar yuklandi"
        except Exception as exc:
            demo_info = f"demo_samples.pkl yuklashda xato: {exc} — synthetic fallback ishlatiladi"
    else:
        demo_info = "demo_samples.pkl topilmadi — synthetic fallback ishlatiladi"

    print(json.dumps({
        "ready":   True,
        "classes": list(encoder.classes_),
        "demo":    demo_info,
    }), flush=True)


def analyze(features):
    X       = np.array([features])
    X_sc    = scaler.transform(X)
    idx     = int(model.predict(X_sc)[0])
    label   = encoder.inverse_transform([idx])[0]
    proba   = model.predict_proba(X_sc)[0]
    conf    = float(proba[idx])
    proba_d = {c: round(float(p) * 100, 1) for c, p in zip(encoder.classes_, proba)}
    return {
        "status":      "NORMAL" if label == "BENIGN" else "ATTACK",
        "attack_type": label,
        "confidence":  conf,
        "proba":       proba_d,
    }


load()

for raw_line in sys.stdin:
    raw_line = raw_line.strip()
    if not raw_line:
        continue
    try:
        req = json.loads(raw_line)
        rid = req.get("_id")

        if req.get("type") == "demo":
            label = req.get("label", "SYN")
            if label in demo_samples and demo_samples[label]:
                features    = random.choice(demo_samples[label])
                using_real  = True
            else:
                features    = req.get("fallback_features") or [0.0] * 10
                using_real  = False
            result = analyze(features)
            result["features"]    = [round(float(f), 2) for f in features]
            result["using_real"]  = using_real

        elif req.get("type") == "analyze":
            result = analyze(req["features"])

        else:
            result = {"error": "Noma'lum type"}

        result["_id"] = rid
        print(json.dumps(result), flush=True)

    except Exception as exc:
        print(json.dumps({"_id": req.get("_id") if "req" in dir() else None,
                          "error": str(exc)}), flush=True)
