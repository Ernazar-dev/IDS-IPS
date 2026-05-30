# IDS/IPS Pro — Frontend (v3.0)

Minimalistik **oq-ko'k** dizayndagi React + Vite frontend.
Backend API (`/api/*`) va Socket.IO endpoint'lariga to'liq mos keladi.

## Dizayn tizimi

| Element        | Qiymat                                              |
|----------------|-----------------------------------------------------|
| Fon            | `#ffffff` (oq) + `#f8fafc` (yumshoq kulrang)        |
| Asosiy aksent  | `#2563eb` (ko'k) · `#1d4ed8` (hover)                |
| Ochiq aksent   | `#eff6ff` · `#dbeafe` · `#bfdbfe`                   |
| Matn           | `#0f172a` (asosiy) · `#475569` · `#94a3b8`          |
| Border         | `#e5e9f0` · `#e2e8f0` · `#cbd5e1`                   |
| Hujum/xato     | `#dc2626` (qizil — minimal foydalanish)             |
| Normal/ok      | `#10b981` (yashil — minimal)                        |
| Shrift (UI)    | **Manrope** (Google Fonts)                          |
| Shrift (mono)  | **JetBrains Mono** (IP, ID, qiymatlar)              |

## Tuzilma

```
frontend/
├── index.html
├── package.json
├── vite.config.js
├── .env
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── index.css
    ├── config.js
    ├── components/
    │   └── Layout.jsx       # Sidebar + alert banner
    ├── hooks/
    │   ├── useAuth.jsx      # JWT + axios interceptor (o'zgartirilmagan)
    │   └── useSocket.jsx    # Socket.IO ulanish (o'zgartirilmagan)
    └── pages/
        ├── Login.jsx        # Tizimga kirish
        ├── Dashboard.jsx    # Real-vaqt monitoring
        ├── Demo.jsx         # ML pipeline sinov
        ├── History.jsx      # Log tarixi + CSV eksport
        └── Settings.jsx     # Profil va parol
```

## Ishga tushirish

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

Backend `.env` da `ALLOWED_ORIGINS` ga `http://localhost:5173` qo'shilgan bo'lishi kerak.

## Backend bilan moslik

Hech qanday API o'zgartirilmadi. Quyidagi endpoint'lar va field'lar ishlatiladi:

- `POST /api/auth/login` → `{ access_token, refresh_token, user }`
- `GET  /api/auth/me`
- `POST /api/auth/change-password`
- `GET  /api/health` → `model_loaded, db_type, capture_mode, tracked_ips, version`
- `GET  /api/stats` → `total, attacks, normal, attack_rate, by_type, avg_confidence, recent_attacks_1h, tracked_attackers, active_blacklist`
- `GET  /api/timeline` → `[{ hour, ATTACK, NORMAL }]`
- `GET  /api/logs?limit&status&attack_type` → `{ logs, total }`
- `POST /api/demo` → `{ status, attack_type, confidence, det_mode, combined, sample_source, rule, ml, features }`
- WebSocket `new_alert` event'i

## Dizayn falsafasi

- **Cheksiz tinch yuza** — qora foni o'rniga oq, kuchli soyalar yo'q
- **Bitta asosiy rang** — barcha aktiv holatlar ko'kning bir necha tonida
- **Status — minimal qizil/yashil** — faqat ATTACK/NORMAL ajratish uchun
- **Shrift hierarchiyasi** — UI uchun Manrope, ma'lumotlar (IP, raqamlar) uchun JetBrains Mono
- **Tinch animatsiya** — pulsatsiya 2s, slide-in 0.2s, hover transitionlar 0.15s

---

*v3.0 · Minimal redesign · oq-ko'k palitra*
