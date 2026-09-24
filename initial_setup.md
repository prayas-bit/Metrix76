# NAWI OIML R 76 Type Approval & LIMS Platform: Project Setup Specification

This document provides the foundational code, file configurations, directory tree, and setup instructions to bootstrap the Non-Automatic Weighing Instruments (NAWIs) Type Approval platform conforming to OIML R 76-1 / R 76-2 standards.

---

## 1. Directory Tree Overview

```text
nawi-oiml-lims/
├── .gitignore
├── docker-compose.yml
├── README.md
├── initial_setup.md
│
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── tests/
│   │   └── test_oiml_math.py
│   └── app/
│       ├── main.py
│       ├── schemas/
│       │   └── metrology.py
│       └── services/
│           └── metrology/
│               └── engine.py
│
├── frontend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   └── src/
│       ├── types/
│       │   └── metrology.ts
│       ├── lib/
│       │   └── api.ts
│       └── app/
│           ├── layout.tsx
│           ├── page.tsx
│           └── globals.css
│
└── supabase/
    └── migrations/
        └── 20260923000001_initial_schema.sql
```
