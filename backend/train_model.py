"""
train_model.py — CICIDS2017 dan XGBoost modelini o'qitish

Ishlatish:
  python train_model.py
"""
import os, sys, warnings
import numpy as np
import joblib
from xgboost import XGBClassifier
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score

warnings.filterwarnings("ignore")

DATASET_DIR = r"C:\Users\ERNAZAR\Desktop\b\dataset"
MODELS_DIR  = os.path.join(os.path.dirname(__file__), "models")

FEATURES = [
    "Flow Duration",
    "Total Fwd Packets",
    "Total Backward Packets",
    "Fwd Packet Length Mean",
    "Bwd Packet Length Mean",
    "Flow Bytes/s",
    "Flow Packets/s",
    "Packet Length Mean",
    "Fwd IAT Mean",
    "FIN Flag Count",
]

FEATURE_KEYS = [
    "flow_duration", "tot_fwd_pkts", "tot_bwd_pkts",
    "fwd_pkt_len_mean", "bwd_pkt_len_mean",
    "flow_byts_s", "flow_pkts_s", "pkt_len_mean",
    "fwd_iat_mean", "fin_flag_cnt",
]

LABEL_MAP = {
    "BENIGN":           "BENIGN",
    "Bot":              "BOTNET",
    "FTP-Patator":      "BRUTEFORCE",
    "SSH-Patator":      "BRUTEFORCE",
    "PortScan":         "PORTSCAN",
    "DDoS":             "SYN",
    "DoS Hulk":         "SYN",
    "DoS GoldenEye":    "SYN",
    "DoS slowloris":    "SYN",
    "DoS Slowhttptest": "SYN",
}

# Har sinfdan maksimum (muvozanat uchun)
MAX_PER_CLASS = 50_000
DEMO_PER_CLASS = 100

FILES = [
    "Friday-WorkingHours-Afternoon-DDos.pcap_ISCX.csv",
    "Friday-WorkingHours-Afternoon-PortScan.pcap_ISCX.csv",
    "Friday-WorkingHours-Morning.pcap_ISCX.csv",
    "Monday-WorkingHours.pcap_ISCX.csv",
    "Tuesday-WorkingHours.pcap_ISCX.csv",
    "Wednesday-workingHours.pcap_ISCX.csv",
]


def parse_float(val):
    try:
        v = float(val)
        if v != v or v == float("inf") or v == float("-inf"):
            return None
        return v
    except (ValueError, TypeError):
        return None


def load_data():
    import csv as csv_mod

    all_X, all_y = [], []
    class_counts = {}

    for fname in FILES:
        fpath = os.path.join(DATASET_DIR, fname)
        if not os.path.exists(fpath):
            print(f"  [SKIP] {fname}")
            continue

        print(f"  [READ] {fname}")
        file_counts = {}
        rows_read = 0

        with open(fpath, encoding="utf-8", errors="replace") as f:
            reader = csv_mod.reader(f)
            try:
                header = [h.strip() for h in next(reader)]
            except StopIteration:
                continue

            label_idx = next((i for i, h in enumerate(header) if h == "Label"), None)
            if label_idx is None:
                print(f"  [WARN] Label ustuni yo'q: {fname}")
                continue

            feat_indices = []
            ok = True
            for col in FEATURES:
                idx = next((i for i, h in enumerate(header) if h == col), None)
                if idx is None:
                    print(f"  [WARN] Ustun yo'q '{col}': {fname}")
                    ok = False
                    break
                feat_indices.append(idx)
            if not ok:
                continue

            for row in reader:
                if len(row) <= max(label_idx, max(feat_indices)):
                    continue

                raw_label = row[label_idx].strip()
                cls = LABEL_MAP.get(raw_label)
                if cls is None:
                    continue

                already = class_counts.get(cls, 0)
                if already >= MAX_PER_CLASS:
                    continue

                feats = [parse_float(row[i]) for i in feat_indices]
                if None in feats:
                    continue

                all_X.append(feats)
                all_y.append(cls)
                class_counts[cls] = already + 1
                file_counts[cls] = file_counts.get(cls, 0) + 1
                rows_read += 1

        for cls, cnt in sorted(file_counts.items()):
            print(f"    {cls:12s}: +{cnt:,}")

    print("\n  Jami sinf taqsimoti:")
    for cls, cnt in sorted(class_counts.items()):
        print(f"    {cls:12s}: {cnt:,}")

    return np.array(all_X, dtype=np.float32), np.array(all_y)


def make_demo_samples(X_raw, y_raw, model, scaler, encoder):
    """Modelning o'zi to'g'ri tasniflagan namunalarni demo uchun saqlash."""
    classes = list(encoder.classes_)
    samples = {cls: [] for cls in classes}

    X_sc = scaler.transform(X_raw)
    preds = model.predict(X_sc)
    probas = model.predict_proba(X_sc)

    for i, (pred, proba) in enumerate(zip(preds, probas)):
        cls = encoder.inverse_transform([pred])[0]
        true_cls = y_raw[i]
        if cls == true_cls and proba[pred] >= 0.80:
            if len(samples[cls]) < DEMO_PER_CLASS:
                samples[cls].append([round(float(v), 4) for v in X_raw[i]])

    print("\n  Demo namunalar (model verified):")
    for cls in sorted(samples):
        print(f"    {cls:12s}: {len(samples[cls])}")

    return samples


def main():
    print("=" * 55)
    print("IDS/IPS — XGBoost Model O'qitish")
    print("=" * 55)

    print("\n[1/4] Ma'lumotlar yuklanmoqda...")
    X, y = load_data()
    print(f"\n  Jami: {len(X):,} ta qator, {X.shape[1]} ta feature")

    if len(np.unique(y)) < 2:
        print("[XATO] Kamida 2 ta sinf kerak!")
        sys.exit(1)

    print("\n[2/4] Preprocessing...")
    encoder = LabelEncoder()
    y_enc = encoder.fit_transform(y)
    print(f"  Sinflar: {list(encoder.classes_)}")

    scaler = StandardScaler()
    X_sc = scaler.fit_transform(X)

    X_tr, X_te, y_tr, y_te = train_test_split(
        X_sc, y_enc, test_size=0.2, random_state=42, stratify=y_enc
    )
    print(f"  Train: {len(X_tr):,}   Test: {len(X_te):,}")

    print("\n[3/4] XGBoost o'qitilmoqda...")
    model = XGBClassifier(
        n_estimators=300,
        max_depth=6,
        learning_rate=0.1,
        subsample=0.8,
        colsample_bytree=0.8,
        eval_metric="mlogloss",
        random_state=42,
        n_jobs=-1,
        verbosity=0,
    )
    model.fit(X_tr, y_tr)

    y_pred = model.predict(X_te)
    acc = accuracy_score(y_te, y_pred)
    print(f"\n  Aniqlik: {acc*100:.2f}%")
    print("\n  Hisobot:")
    print(classification_report(y_te, y_pred,
          target_names=encoder.classes_, digits=3))

    print("[4/4] Modellar saqlanmoqda...")
    os.makedirs(MODELS_DIR, exist_ok=True)
    joblib.dump(model,   os.path.join(MODELS_DIR, "network_model.pkl"))
    joblib.dump(scaler,  os.path.join(MODELS_DIR, "scaler.pkl"))
    joblib.dump(encoder, os.path.join(MODELS_DIR, "label_encoder.pkl"))

    # Demo namunalar
    demo = make_demo_samples(X, y, model, scaler, encoder)
    joblib.dump(demo, os.path.join(MODELS_DIR, "demo_samples.pkl"))

    print(f"\n  Saqlandi: {MODELS_DIR}/")
    print("=" * 55)
    print("TAYYOR! Endi serverni qayta ishga tushiring:")
    print("  npm run dev")
    print("=" * 55)


if __name__ == "__main__":
    main()
