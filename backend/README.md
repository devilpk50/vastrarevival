# Backend (Vastra Revival API)

Quick setup to run the backend locally:

1. Open a terminal at the `backend/` folder.

```powershell
cd backend
npm install
npm start
```

2. Health check:

```powershell
curl http://localhost:3001/api/health
```

Notes:
- This project currently uses `lowdb` (file-based JSON) as the datastore. If you prefer MongoDB, we can migrate to `mongoose` and update the data layer.
- Routes folder (e.g. `routes/auth`) may need to be implemented or moved if missing.
