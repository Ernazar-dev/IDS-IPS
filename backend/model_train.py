"""
model_train.py — CICIDS2017 asosida XGBoost o'qitish + demo_samples.pkl yaratish

Ishlatish:
  python model_train.py              # faqat demo_samples.pkl yaratish (model allaqachon bor)
  python model_train.py --retrain    # modelni qaytadan o'qitish (dataset kerak)
"""
import os
import sys
import argparse
import numpy as np

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")

MODEL_PATH   = os.path.join(MODELS_DIR, "network_model.pkl")
SCALER_PATH  = os.path.join(MODELS_DIR, "scaler.pkl")
ENCODER_PATH = os.path.join(MODELS_DIR, "label_encoder.pkl")
DEMO_PATH    = os.path.join(MODELS_DIR, "demo_samples.pkl")

FEATURES = [
    "flow_duration", "tot_fwd_pkts", "tot_bwd_pkts",
    "fwd_pkt_len_mean", "bwd_pkt_len_mean",
    "flow_byts_s", "flow_pkts_s", "pkt_len_mean",
    "fwd_iat_mean", "fin_flag_cnt",
]

# CICIDS2017 haqiqiy distribusiyalari (log-scale da o'lchangan)
# [flow_duration, tot_fwd_pkts, tot_bwd_pkts, fwd_pkt_len_mean, bwd_pkt_len_mean,
#  flow_byts_s, flow_pkts_s, pkt_len_mean, fwd_iat_mean, fin_flag_cnt]
CLASS_DISTRIBUTIONS = {
    "BENIGN": {
        "mean": [5_200_000, 15.0, 10.0, 580.0, 520.0,  22_000.0,  9.0, 540.0, 310_000.0, 1.0],
        "std":  [3_000_000,  8.0,  5.0, 220.0, 210.0,  12_000.0,  4.5, 200.0, 180_000.0, 0.5],
        "min":  [       0,   1.0,  0.0,   0.0,   0.0,       0.0,  0.0,   0.0,       0.0, 0.0],
        "max":  [120_000_000, 500, 300, 1500.0, 1500.0, 5_000_000, 500, 1500.0, 60_000_000, 5.0],
    },
    "SYN": {
        # TCP SYN Flood: juda qisqa, ko'p fwd, bwd yo'q deyarli, kichik pkt, yuqori pkt/s
        "mean": [    8_000, 120.0,  1.0,  40.0,   0.0, 480_000.0, 650.0,  40.0,     80.0, 0.0],
        "std":  [    3_000,  50.0,  0.5,   6.0,   0.0, 200_000.0, 250.0,   6.0,     30.0, 0.0],
        "min":  [        0,   2.0,  0.0,   0.0,   0.0,       0.0,  0.0,   0.0,      0.0, 0.0],
        "max":  [   60_000, 800.0,  5.0, 100.0,  20.0, 2_000_000, 2000.0, 100.0, 2_000.0, 0.0],
    },
    "BRUTEFORCE": {
        # SSH/FTP brute force: ko'p urinish, tenglik fwd/bwd, o'rtacha hajm
        "mean": [  650_000,  30.0, 28.0, 350.0, 340.0,  55_000.0, 70.0, 345.0,  22_000.0, 2.0],
        "std":  [  250_000,  10.0,  9.0,  80.0,  70.0,  18_000.0, 22.0,  75.0,   8_000.0, 0.5],
        "min":  [        0,   2.0,  1.0,   0.0,   0.0,       0.0,  0.0,   0.0,      0.0, 0.0],
        "max":  [5_000_000, 200.0, 180.0, 1400.0, 1400.0, 500_000, 400, 1400.0, 500_000.0, 5.0],
    },
    "PORTSCAN": {
        # Port scan: eng qisqa oqim, 1-2 pkt, kichik hajm, yuqori pkt/s
        "mean": [    1_200,   2.0,  0.5,  28.0,   8.0, 185_000.0, 380.0,  22.0,     700.0, 0.0],
        "std":  [      600,   0.5,  0.3,   5.0,   4.0,  70_000.0, 120.0,   5.0,     300.0, 0.0],
        "min":  [        0,   1.0,  0.0,   0.0,   0.0,       0.0,  0.0,   0.0,      0.0, 0.0],
        "max":  [   10_000,   6.0,  3.0,  80.0,  40.0,1_000_000, 1200.0,  80.0,  10_000.0, 1.0],
    },
    "BOTNET": {
        # Botnet: davriy, o'rtacha hajm, bir xil intervalli
        "mean": [1_800_000,   7.0,  6.0, 400.0, 370.0,   6_200.0,  4.8, 385.0, 260_000.0, 1.0],
        "std":  [  700_000,   2.0,  2.0,  60.0,  50.0,   1_800.0,  1.2,  55.0, 100_000.0, 0.3],
        "min":  [        0,   1.0,  0.0,   0.0,   0.0,       0.0,  0.0,   0.0,      0.0, 0.0],
        "max":  [10_000_000,  50.0, 40.0, 1000.0, 900.0, 80_000.0, 30.0, 900.0, 3_000_000.0, 3.0],
    },
}

SAMPLES_PER_CLASS  = 200  # Ko'p candidate → ko'p verified
TARGET_PER_CLASS   = 60   # Har bir sinfdan minimum
MIN_CONFIDENCE     = 0.70  # Modelning minimum ishonch darajasi


def generate_demo_samples():
    """Model-verified namunalar: model o'zi to'g'ri tasniflagan namunalarni saqlaydi."""
    try:
        import joblib
    except ImportError:
        print("[XATO] joblib topilmadi. pip install joblib")
        sys.exit(1)

    print("[DEMO] Modellar yuklanmoqda...")
    model   = joblib.load(MODEL_PATH)
    scaler  = joblib.load(SCALER_PATH)
    encoder = joblib.load(ENCODER_PATH)
    classes = list(encoder.classes_)
    print(f"[DEMO] Sinflar: {classes}")

    samples = {cls: [] for cls in classes}
    stats   = {cls: {"generated": 0, "verified": 0} for cls in classes}

    for cls in classes:
        if cls not in CLASS_DISTRIBUTIONS:
            print(f"[WARN] {cls} uchun distribusiya yo'q, o'tkazib yuborildi")
            continue

        dist   = CLASS_DISTRIBUTIONS[cls]
        mean   = np.array(dist["mean"])
        std    = np.array(dist["std"])
        lo     = np.array(dist["min"])
        hi     = np.array(dist["max"])
        cls_idx = list(encoder.classes_).index(cls)

        print(f"[DEMO] {cls:12s} candidate namunalar yaratilmoqda...")

        # Keng qidiruv: ko'p iteratsiya
        for iteration in range(20):
            scale = 1.0 + iteration * 0.3  # har iteratsiyada tarqalish kengayadi
            batch_size = SAMPLES_PER_CLASS * 3

            batch = np.random.normal(mean, std * scale, (batch_size, len(FEATURES)))
            batch = np.clip(batch, lo, hi)

            # fin_flag_cnt butun son
            batch[:, 9] = np.round(np.clip(batch[:, 9], 0, dist["max"][9]))

            # Model bilan tekshirish
            X_sc  = scaler.transform(batch)
            preds = model.predict(X_sc)
            probas = model.predict_proba(X_sc)

            for i, (pred, proba) in enumerate(zip(preds, probas)):
                if pred == cls_idx and proba[cls_idx] >= MIN_CONFIDENCE:
                    samples[cls].append([round(float(v), 4) for v in batch[i]])
                    stats[cls]["verified"] += 1

            stats[cls]["generated"] += batch_size

            if len(samples[cls]) >= TARGET_PER_CLASS:
                break

        n = len(samples[cls])
        print(f"  {cls:12s}: {n} ta verified namuna "
              f"({stats[cls]['generated']} candidate dan, "
              f"{n/max(stats[cls]['generated'],1)*100:.1f}% o'tdi)")

        if n < 10:
            print(f"  [WARN] {cls}: kam namuna ({n}). Model distribusiyasi juda cheklangan bo'lishi mumkin.")

    joblib.dump(samples, DEMO_PATH)
    print(f"\n[DEMO] Saqlandi: {DEMO_PATH}")

    print("\n[TEST] Har bir sinfdan 3 ta namuna test qilinmoqda:")
    for cls in classes:
        if not samples[cls]:
            continue
        test_batch = np.array(samples[cls][:3])
        X_sc       = scaler.transform(test_batch)
        preds      = model.predict(X_sc)
        probas     = model.predict_proba(X_sc)
        for j, (pred, proba) in enumerate(zip(preds, probas)):
            pred_label = encoder.inverse_transform([pred])[0]
            conf = proba[pred] * 100
            match = "OK" if pred_label == cls else f"XATO ({pred_label})"
            print(f"  {cls:12s} #{j+1}: {pred_label:12s} {conf:5.1f}%  [{match}]")

    return samples


def retrain_model(dataset_path):
    """CICIDS2017 CSV faylidan modelni o'qitish."""
    try:
        import pandas as pd
        import joblib
        from xgboost import XGBClassifier
        from sklearn.preprocessing import LabelEncoder, StandardScaler
        from sklearn.model_selection import train_test_split
        from sklearn.metrics import classification_report, accuracy_score
    except ImportError as e:
        print(f"[XATO] Kerakli paket yo'q: {e}")
        print("  pip install pandas xgboost scikit-learn")
        sys.exit(1)

    print(f"[TRAIN] Dataset o'qilmoqda: {dataset_path}")
    df = pd.read_csv(dataset_path, low_memory=False)
    df.columns = df.columns.str.strip()

    label_col = " Label" if " Label" in df.columns else "Label"
    if label_col not in df.columns:
        print(f"[XATO] Label ustuni topilmadi. Mavjud: {list(df.columns[:5])}")
        sys.exit(1)

    col_map = {
        "Flow Duration":          "flow_duration",
        "Total Fwd Packets":      "tot_fwd_pkts",
        "Total Backward Packets": "tot_bwd_pkts",
        "Fwd Packet Length Mean": "fwd_pkt_len_mean",
        "Bwd Packet Length Mean": "bwd_pkt_len_mean",
        "Flow Bytes/s":           "flow_byts_s",
        "Flow Packets/s":         "flow_pkts_s",
        "Packet Length Mean":     "pkt_len_mean",
        "Fwd IAT Mean":           "fwd_iat_mean",
        "FIN Flag Count":         "fin_flag_cnt",
    }
    df.rename(columns=lambda c: c.strip(), inplace=True)
    col_map = {k.strip(): v for k, v in col_map.items()}

    missing = [c for c in col_map if c not in df.columns]
    if missing:
        print(f"[XATO] Ustunlar topilmadi: {missing}")
        sys.exit(1)

    df = df.rename(columns=col_map)
    df = df[FEATURES + ["Label"]].copy()
    df.replace([np.inf, -np.inf], np.nan, inplace=True)
    df.dropna(inplace=True)

    def simplify(lbl):
        lbl = str(lbl).upper()
        if lbl == "BENIGN":                             return "BENIGN"
        if "SYN" in lbl:                               return "SYN"
        if "BRUTE" in lbl or "FTP" in lbl or "SSH" in lbl: return "BRUTEFORCE"
        if "PORTSCAN" in lbl or "PORT" in lbl:         return "PORTSCAN"
        if "BOT" in lbl:                               return "BOTNET"
        return "BENIGN"

    df["Label"] = df["Label"].apply(simplify)
    print("[TRAIN] Sinf taqsimoti:")
    print(df["Label"].value_counts().to_string())

    X = df[FEATURES].values
    y = df["Label"].values

    encoder = LabelEncoder()
    y_enc   = encoder.fit_transform(y)
    scaler  = StandardScaler()
    X_sc    = scaler.fit_transform(X)

    X_tr, X_te, y_tr, y_te = train_test_split(X_sc, y_enc, test_size=0.2, random_state=42, stratify=y_enc)

    print("[TRAIN] XGBoost o'qitilmoqda...")
    model = __import__("xgboost").XGBClassifier(
        n_estimators=200, max_depth=6, learning_rate=0.1,
        use_label_encoder=False, eval_metric="mlogloss",
        random_state=42, n_jobs=-1,
    )
    model.fit(X_tr, y_tr)

    y_pred = model.predict(X_te)
    print(f"[TRAIN] Aniqlik: {accuracy_score(y_te, y_pred):.4f}")
    print(classification_report(y_te, y_pred, target_names=encoder.classes_))

    os.makedirs(MODELS_DIR, exist_ok=True)
    import joblib
    joblib.dump(model,   MODEL_PATH)
    joblib.dump(scaler,  SCALER_PATH)
    joblib.dump(encoder, ENCODER_PATH)
    print(f"[TRAIN] Modellar saqlandi: {MODELS_DIR}")

    generate_demo_samples()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--retrain", metavar="DATASET_CSV", nargs="?", const="CICIDS2017.csv")
    args = parser.parse_args()

    if args.retrain:
        if not os.path.exists(args.retrain):
            print(f"[XATO] Dataset topilmadi: {args.retrain}")
            sys.exit(1)
        retrain_model(args.retrain)
    else:
        for p, name in [(MODEL_PATH, "Model"), (SCALER_PATH, "Scaler"), (ENCODER_PATH, "Encoder")]:
            if not os.path.exists(p):
                print(f"[XATO] {name} topilmadi: {p}")
                sys.exit(1)
        generate_demo_samples()
        print("[OK] Serverni qayta ishga tushiring: npm run dev")


if __name__ == "__main__":
    main()
