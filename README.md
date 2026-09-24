# NAWI OIML R 76 Type Approval & LIMS Platform

Automated test data recording, compliance verification, and standardized report generation for Non-Automatic Weighing Instruments (NAWIs) conforming to OIML R 76-1 and R 76-2 standards under the Legal Metrology Act, 2009.

## Tech Stack
- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, TanStack Table v8, Recharts
- **Backend**: Python FastAPI, Pydantic v2, NumPy, WeasyPrint (PDF), python-docx (DOCX)
- **Database & Storage**: Supabase (PostgreSQL 16, Auth, S3-compatible Storage)

## Getting Started

### 1. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate # Windows: venv\Scripts\activate
pip install -r requirements.txt
pytest                   # Run OIML R 76 math test suite
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000).

### 3. Docker Compose (Alternative)
```bash
docker-compose up --build
```
