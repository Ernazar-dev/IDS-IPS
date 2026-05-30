# IDS/IPS Pro — Backend (Node.js)

Real vaqtda tarmoq trafikini kuzatib, gibrid usul (qoida + ML) bilan hujumlarni aniqlaydigan tizim.

---

## Papka tuzilmasi

```
backend-node/
├── src/
│   ├── server.js              # Ishga tushirish nuqtasi
│   ├── app.js                 # Express + Socket.IO konfiguratsiyasi
│   ├── config.js              # Barcha sozlamalar (.env dan o'qiydi)
│   ├── db.js                  # Sequelize ORM (PostgreSQL / SQLite)
│   ├── models/
│   │   ├── User.js            # Foydalanuvchi modeli (JWT + bcrypt)
│   │   └── NetworkLog.js      # Tarmoq hodiyalari logi
│   ├── services/
│   │   ├── mlBridge.js        # Python ML subprocess boshqaruvchi
│   │   ├── ruleEngine.js      # Qoida asosidagi aniqlash + feature builder
│   │   └── slidingWindow.js   # IP so'rov tezligi (req/s) kuzatuv
│   ├── middleware/
│   │   ├── ids.js             # Non-blocking IDS middleware (barcha so'rovlarda)
│   │   └── auth.js            # JWT requireAuth middleware
│   └── routes/
│       ├── auth.js            # /api/auth/* endpointlar
│       ├── demo.js            # /api/demo — pipeline sinash
│       ├── logs.js            # /api/logs — tarix
│       └── stats.js           # /api/health, /api/stats, /api/timeline
├── models/                    # O'qitilgan ML model fayllari
│   ├── network_model.pkl      # XGBoost klassifikator
│   ├── scaler.pkl             # StandardScaler
│   └── label_encoder.pkl      # LabelEncoder
├── ml_infer.py                # Python ML inference bridge (stdin/stdout JSON)
├── .env                       # Muhit o'zgaruvchilari
└── package.json
```

---

## Talablar

- **Node.js** 18+
- **Python** 3.9+ (`joblib`, `numpy`, `xgboost` o'rnatilgan)
- **PostgreSQL** (yoki SQLite — testlash uchun)

Python paketlarini o'rnatish:

```bash
pip install joblib numpy xgboost scikit-learn
```

---

## Ishga tushirish

```bash
cd backend-node
npm install
npm start
```

Ishlab chiqish rejimida (auto-reload):

```bash
npm run dev
```

Server: `http://localhost:5000`

---

## Muhit o'zgaruvchilari (`.env`)

| O'zgaruvchi | Default | Tavsif |
|---|---|---|
| `PORT` | `5000` | Server port |
| `SECRET_KEY` | — | Express session kaliti |
| `JWT_SECRET_KEY` | — | JWT token imzolash kaliti |
| `JWT_ACCESS_TOKEN_HOURS` | `8` | Access token muddati (soat) |
| `DB_HOST` | `localhost` | PostgreSQL server |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_NAME` | `ids_ips_db` | Ma'lumotlar bazasi nomi |
| `DB_USER` | `postgres` | DB foydalanuvchisi |
| `DB_PASSWORD` | — | DB paroli |
| `USE_SQLITE` | `false` | `true` — SQLite ishlatish (PostgreSQL shart emas) |
| `ADMIN_USERNAME` | `admin` | Birinchi admin login |
| `ADMIN_PASSWORD` | `ChangeMe123!` | Birinchi admin paroli |
| `ADMIN_EMAIL` | `admin@ids-ips.local` | Admin email |
| `ALLOWED_ORIGINS` | `http://localhost:5173` | CORS ruxsat berilgan manzillar (vergul bilan ajrating) |
| `MODEL_PATH` | `models/network_model.pkl` | XGBoost model fayli |
| `SCALER_PATH` | `models/scaler.pkl` | Scaler fayli |
| `ENCODER_PATH` | `models/label_encoder.pkl` | Label encoder fayli |
| `PYTHON_PATH` | `python` | Python interpreter yo'li |
| `ANALYSIS_WINDOW_SEC` | `2` | Sliding window uzunligi (soniya) |
| `MIN_RPS_THRESHOLD` | `5.0` | Tahlil boshlash uchun minimum req/s |
| `MAX_IP_TRACKER` | `5000` | Xotirada saqlanadigan maksimal IP soni |

> **SQLite bilan tez sinash:** `.env` da `USE_SQLITE=true` qiling — PostgreSQL o'rnatish shart emas.

---

## API Endpointlar

| Endpoint | Method | Auth | Tavsif |
|---|---|---|---|
| `/api/auth/login` | POST | — | Kirish, JWT access + refresh token olish |
| `/api/auth/refresh` | POST | Refresh token | Access token yangilash |
| `/api/auth/me` | GET | JWT | Joriy foydalanuvchi ma'lumoti |
| `/api/auth/change-password` | POST | JWT | Parol o'zgartirish |
| `/api/health` | GET | — | Server va ML model holati |
| `/api/stats` | GET | JWT | Umumiy statistika |
| `/api/timeline` | GET | JWT | 24 soatlik hujum vaqt chizig'i |
| `/api/logs` | GET | JWT | Tahlil natijalari tarixi |
| `/api/demo` | POST | JWT | ML pipeline ni sinash |

### `/api/auth/login` — kirish

```json
// So'rov (POST)
{ "username": "admin", "password": "ChangeMe123!" }

// Javob
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "user": { "id": 1, "username": "admin", "is_admin": true }
}
```

### `/api/demo` — ML pipeline sinash

```json
// So'rov (POST)
{ "attack_type": "SYN_FLOOD" }

// Mumkin qiymatlar: SYN_FLOOD | UDP_FLOOD | DNS_AMP | PORTSCAN | NORMAL_TEST

// Javob
{
  "status": "ATTACK",
  "attack_type": "SYN",
  "confidence": 87.3,
  "det_mode": "RULE+ML",
  "combined": 72.1,
  "sample_source": "real",
  "rule": { "status": "ATTACK", "type": "SYN", "confidence": 85.0 },
  "ml":   { "status": "ATTACK", "type": "SYN", "confidence": 91.2 },
  "features": { "flow_duration": 450, "tot_fwd_pkts": 2, "..." : "..." }
}
```

---

## Tizim arxitekturasi

### Aniqlash pipeline (har bir HTTP so'rov uchun)

```
HTTP so'rov keladi
      │
      ▼
Sliding Window ── IP dan oxirgi N soniya req/s hisoblanadi
      │
      ▼  (req/s < MIN_RPS_THRESHOLD bo'lsa o'tkazib yuboriladi)
      │
Feature Extraction ── 10 ta CICIDS2017 xususiyat (HTTP dan synthetic)
      │
      ├──────────────────────────────┐
      ▼                              ▼
Rule-based aniqlash          ML (XGBoost) aniqlash
(ruleEngine.js)              (ml_infer.py subprocess)
      │                              │
      └──────────────┬───────────────┘
                     ▼
        Weighted scoring: Rule×0.55 + ML×0.45
                     │
                     ▼
            ATTACK / NORMAL qaror
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
  PostgreSQL/SQLite        WebSocket orqali
  (NetworkLog jadval)      frontendga yuborish
```

### Aniqlash scoring

- Combined score `≥ 0.28` → **ATTACK**
- Combined score `< 0.28` → **NORMAL**
- Rule va ML ikkalasi ATTACK desa → `det_mode: "RULE+ML"`

---

## Aniqlanadigan hujum turlari

| Label | Tavsif |
|---|---|
| `SYN` | TCP SYN flood — server resurslarini to'ldirish |
| `UDP` | UDP flood — tarmoq o'tkazuvchanligini to'ldirish |
| `DNS` | DNS amplification — DNS orqali DDoS |
| `PORTSCAN` | Port skanerlash — ochiq portlarni topish |
| `BRUTEFORCE` | Brute force — FTP/SSH parol taxmin |
| `BOTNET` | Botnet trafigi |
| `XSS` | Cross-site scripting |
| `SQLINJ` | SQL injection |
| `BENIGN` | Normal trafik |

---

## WebSocket voqealari

Frontend `socket.io-client` orqali `new_alert` voqeasiga obuna bo'ladi:

```javascript
socket.on("new_alert", (data) => {
  console.log(data);
  // {
  //   ip: "192.168.1.45",
  //   attack_type: "SYN",
  //   status: "ATTACK",
  //   confidence: 87.3,
  //   req: 42.1,
  //   bytes_s: 384000,
  //   time: "14:32:07",
  //   pattern: "HTTP_SYN_t0.90"
  // }
});
```

---

## Feature vektori (10 ta, CICIDS2017 formatida)

| Feature | Tavsif |
|---|---|
| `flow_duration` | Oqim davomiyligi (μs) |
| `tot_fwd_pkts` | Forward yo'nalishdagi paketlar soni |
| `tot_bwd_pkts` | Backward yo'nalishdagi paketlar soni |
| `fwd_pkt_len_mean` | O'rtacha forward paket hajmi (bayt) |
| `bwd_pkt_len_mean` | O'rtacha backward paket hajmi (bayt) |
| `flow_byts_s` | Sekunddagi baytlar soni |
| `flow_pkts_s` | Sekunddagi paketlar soni |
| `pkt_len_mean` | O'rtacha paket hajmi (bayt) |
| `fwd_iat_mean` | O'rtacha forward inter-arrival time (μs) |
| `fin_flag_cnt` | FIN flag soni |

---

## Default kirish

```
Login:    admin
Parol:    ChangeMe123!
```

> Birinchi kirishdan keyin **Sozlamalar** sahifasida parolni o'zgartiring!

---

## Frontend bilan ulanish

Frontend `http://localhost:5173` da ishlaydi (Vite + React).  
`.env` da `ALLOWED_ORIGINS` ga frontend manzilini qo'shing:

```env
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

Frontend `.env`:

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```
