"""
make_demo.py — CICIDS2017 CSV fayllaridan real namunalar ajratib demo_samples.pkl yaratadi.
sklearn/pandas kerak emas — faqat csv + joblib.

Ishlatish:
  python make_demo.py
  python make_demo.py --dataset C:/boshqa/papka
"""
import csv
import os
import sys
import argparse
import random

# Dataset joyi (o'zgartirish shart emas)
DEFAULT_DATASET = r"C:\Users\ERNAZAR\Desktop\b\dataset"

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")
DEMO_PATH  = os.path.join(MODELS_DIR, "demo_samples.pkl")

# CSV ustun nomlari (CICIDS2017 format, leading space bilan)
FEATURE_COLS = [
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

# Label → model sinfi mosligi
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

# Har sinfdan nechta namuna kerak
SAMPLES_PER_CLASS = 100

# Qaysi fayldan qaysi sinflar olinadi
FILE_TARGETS = {
    "Friday-WorkingHours-Afternoon-DDos.pcap_ISCX.csv":      ["SYN", "BENIGN"],
    "Friday-WorkingHours-Afternoon-PortScan.pcap_ISCX.csv":  ["PORTSCAN"],
    "Friday-WorkingHours-Morning.pcap_ISCX.csv":             ["BOTNET"],
    "Tuesday-WorkingHours.pcap_ISCX.csv":                    ["BRUTEFORCE"],
    "Wednesday-workingHours.pcap_ISCX.csv":                  ["SYN"],
    "Monday-WorkingHours.pcap_ISCX.csv":                     ["BENIGN"],
}


def parse_row(row, col_indices):
    """Bir CSV qatoridan feature vektorini olish."""
    feats = []
    for idx in col_indices:
        try:
            val = float(row[idx])
            if val != val or val == float("inf") or val == float("-inf"):
                return None
            feats.append(round(val, 4))
        except (ValueError, IndexError):
            return None
    return feats


def read_samples_from_file(filepath, wanted_classes, existing):
    """Fayldan kerakli sinf namunalarini o'qiydi (reservoir sampling)."""
    needed = {cls: SAMPLES_PER_CLASS - len(existing.get(cls, []))
              for cls in wanted_classes}
    needed = {cls: n for cls, n in needed.items() if n > 0}
    if not needed:
        return {}

    collected = {cls: [] for cls in needed}
    counts    = {cls: 0 for cls in needed}

    with open(filepath, encoding="utf-8", errors="replace") as f:
        reader = csv.reader(f)
        try:
            header = next(reader)
        except StopIteration:
            return {}

        # Ustun indekslarini topish
        header_stripped = [h.strip() for h in header]
        label_idx = next((i for i, h in enumerate(header_stripped) if h == "Label"), None)
        if label_idx is None:
            print(f"  [WARN] Label ustuni topilmadi: {os.path.basename(filepath)}")
            return {}

        col_indices = []
        missing = []
        for col in FEATURE_COLS:
            idx = next((i for i, h in enumerate(header_stripped) if h == col), None)
            if idx is None:
                missing.append(col)
            col_indices.append(idx)

        if missing:
            print(f"  [WARN] Ustunlar yo'q: {missing}")
            return {}

        # Reservoir sampling
        for row in reader:
            if len(row) <= label_idx:
                continue
            raw_label = row[label_idx].strip()
            cls = LABEL_MAP.get(raw_label)
            if cls not in needed:
                continue

            feats = parse_row(row, col_indices)
            if feats is None:
                continue

            counts[cls] += 1
            bucket = collected[cls]
            if len(bucket) < needed[cls]:
                bucket.append(feats)
            else:
                # Reservoir: tasodifiy almashtirish
                j = random.randint(0, counts[cls] - 1)
                if j < needed[cls]:
                    bucket[j] = feats

    return collected


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", default=DEFAULT_DATASET,
                        help="CICIDS2017 CSV fayllari joylashgan papka")
    args = parser.parse_args()

    dataset_dir = args.dataset
    if not os.path.isdir(dataset_dir):
        print(f"[XATO] Dataset papkasi topilmadi: {dataset_dir}")
        print("  --dataset <yo'l> parametri bilan ko'rsating")
        sys.exit(1)

    print(f"[INFO] Dataset: {dataset_dir}")
    print(f"[INFO] Maqsad:  {DEMO_PATH}\n")

    samples = {cls: [] for cls in LABEL_MAP.values()}
    # Noyob sinflar
    samples = {cls: [] for cls in set(LABEL_MAP.values())}

    for filename, targets in FILE_TARGETS.items():
        filepath = os.path.join(dataset_dir, filename)
        if not os.path.exists(filepath):
            print(f"[SKIP] Fayl yo'q: {filename}")
            continue

        needed_now = [cls for cls in targets
                      if len(samples.get(cls, [])) < SAMPLES_PER_CLASS]
        if not needed_now:
            continue

        print(f"[READ] {filename}")
        print(f"       Kerakli sinflar: {needed_now}")

        result = read_samples_from_file(filepath, needed_now, samples)

        for cls, rows in result.items():
            samples.setdefault(cls, []).extend(rows)
            total = len(samples[cls])
            print(f"  {cls:12s}: {len(rows):3d} ta yangi namuna  (jami: {total})")

        print()

    # Yakuniy holat
    print("=" * 50)
    print("YAKUNIY:")
    all_ok = True
    for cls in sorted(samples):
        n = len(samples[cls])
        status = "OK" if n >= 10 else "KAM!"
        if n < 10:
            all_ok = False
        print(f"  {cls:12s}: {n:4d} ta namuna  [{status}]")

    if not all_ok:
        print("\n[WARN] Ba'zi sinflarda kam namuna bor.")

    # Saqlash
    try:
        import joblib
    except ImportError:
        import pickle as joblib
        DEMO_PATH_actual = DEMO_PATH
        with open(DEMO_PATH_actual, "wb") as f:
            joblib.dump(samples, f)
        print(f"\n[OK] Saqlandi (pickle): {DEMO_PATH}")
        return

    os.makedirs(MODELS_DIR, exist_ok=True)
    joblib.dump(samples, DEMO_PATH)
    print(f"\n[OK] Saqlandi: {DEMO_PATH}")
    print("[OK] Serverni qayta ishga tushiring: npm run dev")


if __name__ == "__main__":
    main()
