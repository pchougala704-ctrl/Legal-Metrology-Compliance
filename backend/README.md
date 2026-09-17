# Consumer Inspection Backend

Node.js and Express.js backend for an Indian consumer product inspection system. It stores users, uploaded package images, OCR-extracted product information, and results supplied by a separate rules module in MySQL.

## Technologies

- Node.js and Express.js
- MySQL with `mysql2`
- JWT authentication and `bcryptjs` password hashing
- Multer image uploads
- `express-validator`, `cors`, and `dotenv`

## Folder Structure

```text
backend/
├── config/db.js
├── controllers/
│   ├── authController.js
│   ├── inspectionController.js
│   └── dashboardController.js
├── middleware/
│   ├── authMiddleware.js
│   ├── errorMiddleware.js
│   └── uploadMiddleware.js
├── routes/
│   ├── authRoutes.js
│   ├── inspectionRoutes.js
│   └── dashboardRoutes.js
├── uploads/
├── app.js
├── server.js
├── schema.sql
├── .env.example
└── package.json
```

## Installation

From the `backend` directory:

```bash
npm install
```

Copy `.env.example` to `.env` and set the MySQL password and a strong JWT secret.

## MySQL Setup

1. Start MySQL.
2. Run `schema.sql` using MySQL Workbench or the MySQL client:

```bash
mysql -u root -p < schema.sql
```

The script creates `consumer_inspection_db`, the three required tables, indexes, and foreign keys.

## Environment Variables

```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=consumer_inspection_db
JWT_SECRET=change_this_secret
```

Never commit `.env` or real credentials.

## Start the Server

```bash
npm start
```

For development with Node's watch mode:

```bash
npm run dev
```

Health check: `GET http://localhost:5000/api/health`

## API Endpoints

All protected endpoints require:

```http
Authorization: Bearer <jwt-token>
```

### Health

`GET /api/health` is public.

Expected response:

```json
{
  "success": true,
  "message": "Backend is running"
}
```

### Authentication

`POST /api/auth/register` is public. JSON body:

```json
{
  "name": "Asha Sharma",
  "email": "asha@example.com",
  "password": "secret123"
}
```

`POST /api/auth/login` is public. JSON body:

```json
{
  "email": "asha@example.com",
  "password": "secret123"
}
```

Both successful authentication endpoints return a JWT in `data.token` and a user object without the password.

### Inspections

`POST /api/inspection` is protected and uses `multipart/form-data`.

- File field: `image`
- Allowed files: JPG, JPEG, PNG
- Maximum size: 5 MB
- Text fields: `product_name`, `brand_name`, `batch_number`, `manufacturer`, `manufacturing_date`, `expiry_date`, `inspection_status`
- Optional rules-module field: `results`, containing a JSON array

Example `results` value:

```json
[
  {
    "rule_id": "LM-PKG-001",
    "field_name": "manufacturer",
    "expected_value": "Declared on package",
    "actual_value": "Example Foods Pvt Ltd",
    "status": "passed",
    "remarks": "Manufacturer is present"
  }
]
```

The OCR module can send extracted product fields in this request, or the frontend can send them after OCR completes. The backend stores supplied values; it does not pretend to perform OCR. The rules module can supply `results` using the same interface.

`GET /api/inspection?page=1&limit=10` returns authenticated-user inspections with pagination.

`GET /api/inspection/:id` returns one owned inspection and its related results.

`DELETE /api/inspection/:id` deletes one owned inspection and its uploaded image.

### Dashboard

`GET /api/dashboard` is protected and returns:

- total, passed, failed, and pending inspection counts
- the five most recent inspections
- a grouped status summary

## Consistent Responses

Success responses use:

```json
{
  "success": true,
  "message": "Inspection retrieved successfully",
  "data": {}
}
```

Errors use:

```json
{
  "success": false,
  "message": "Invalid inspection data"
}
```

## Postman Test Sequence

1. Send `POST /api/auth/register` with JSON and save the returned token.
2. Send `POST /api/auth/login` with JSON and copy `data.token`.
3. For protected requests, add `Authorization: Bearer <token>`.
4. Send `POST /api/inspection` as `form-data`, attach an image under `image`, and add product fields.
5. Optionally add `results` as the JSON string shown above.
6. Send `GET /api/inspection` and check pagination.
7. Send `GET /api/inspection/:id` and verify stored results.
8. Send `GET /api/dashboard` and verify counts.
9. Send `DELETE /api/inspection/:id` and verify the inspection is removed.
10. Test invalid credentials, missing tokens, unsupported file types, files over 5 MB, invalid dates, and another user's inspection ID.

## Integration Flow

```text
Frontend
  -> Express API
  -> JWT middleware
  -> Controllers
  -> MySQL

OCR module -> JSON product fields -> POST /api/inspection
Rules module -> JSON results array -> POST /api/inspection
```

The integration points are intentionally data-based. OCR and rules computation remain separate modules and can be replaced or expanded without changing the database access layer.
