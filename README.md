# Challenging Youth 2026

A full-stack website with two dashboards:

- User Dashboard: read-only view of donations, expenditures, and remaining balance.
- Admin Dashboard: add, edit, and delete donations/expenditures.

## Tech Stack

- Node.js + Express
- MongoDB Atlas + Mongoose
- Vanilla HTML/CSS/JavaScript frontend

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure environment:

Create `.env` (already created in this workspace) with:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
ADMIN_KEY=your_admin_secret_key
DNS_SERVERS=8.8.8.8,1.1.1.1
```

3. Run app:

```bash
npm run dev
```

or

```bash
npm start
```

4. Open in browser:

- User dashboard: `http://localhost:5000/user.html`
- Admin dashboard: `http://localhost:5000/admin.html`

## Notes

- In admin dashboard, save your admin key first before creating/updating/deleting records.
- Totals are computed from MongoDB data:
  - Total Donations
  - Total Expenditures
  - Remaining Balance = Donations - Expenditures
- If your network blocks SRV DNS lookups, the server automatically retries Atlas DNS using `DNS_SERVERS` from `.env`.

## Atlas Connection Troubleshooting

- Ensure your current IP is allowed in MongoDB Atlas Network Access.
- Ensure the Atlas database user/password is correct.
- If you still get `querySrv ECONNREFUSED`, keep `DNS_SERVERS=8.8.8.8,1.1.1.1` in `.env`.

## API Endpoints

- `GET /api/transactions`
- `GET /api/transactions/summary`
- `POST /api/transactions` (admin key required)
- `PUT /api/transactions/:id` (admin key required)
- `DELETE /api/transactions/:id` (admin key required)

Admin endpoints require request header:

- `x-admin-key: <ADMIN_KEY>`
