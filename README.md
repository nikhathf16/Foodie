# Foodie - Food Ordering & Delivery Management System

Foodie is a full-stack college project prototype with customer, restaurant, delivery partner, and administrator workflows.

## Technology stack

- React.js and React Router
- CSS3
- FastAPI
- SQLite
- REST API
- Lucide React

## Folder structure

```text
sepm/
├── frontend/
│   ├── public/
│   └── src/
│       ├── components/
│       ├── context/
│       ├── services/
│       ├── App.jsx
│       ├── main.jsx
│       └── style.css
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   └── foodie.db
└── README.md
```

## Installation

Backend:

```powershell
cd backend
py -m pip install -r requirements.txt
py -m uvicorn main:app --reload --port 8000
```

Frontend:

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. FastAPI documentation is available at `http://localhost:8000/docs`.

## Demo accounts

All demo accounts use password: `password123`

| Role | Email |
|---|---|
| Customer | customer@foodie.com |
| Restaurant | restaurant@foodie.com |
| Delivery partner | delivery@foodie.com |
| Administrator | admin@foodie.com |

The database and demonstration data are initialized automatically in `backend/foodie.db`.
