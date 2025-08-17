# DropLater - Acceptance Checklist

This document tracks the completion of all requirements from the take-home assignment.

## ✅ Step 1 - Project Setup

- [x] **Node/Express API** - Created in `/api` directory
- [x] **MongoDB and Redis clients** - Configured in all services
- [x] **docker-compose.yml** - All services: api, worker, mongo, redis, sink
- [x] **.env.example** - All required environment variables
- [x] **Dependencies** - express, zod, mongoose, bullmq, pino, dayjs

## ✅ Step 2 - Data Model (MongoDB)

- [x] **notes collection schema**:
  - [x] title (string, required, max 200 chars)
  - [x] body (string, required, max 1000 chars)
  - [x] releaseAt (ISO string, required)
  - [x] webhookUrl (string, required)
  - [x] status ("pending" | "delivered" | "failed" | "dead")
  - [x] attempts (array of { at, statusCode, ok, error? })
  - [x] deliveredAt (date | null)
- [x] **Indexes**:
  - [x] releaseAt (asc) - for finding due notes quickly
  - [x] status - for listing by status
  - [x] Compound index { status: 1, releaseAt: 1 }

## ✅ Step 3 - API Endpoints (Express)

- [x] **POST /api/notes** - create note with validation
- [x] **GET /api/notes?status=&page=** - list notes (paginated 20 per page)
- [x] **POST /api/notes/:id/replay** - requeue failed/dead notes
- [x] **GET /health** - returns { ok: true }
- [x] **Security**:
  - [x] Bearer token authentication
  - [x] Rate limiting (60 req/min per IP)
- [x] **Validation** - Zod schemas for all inputs
- [x] **Error handling** - JSON errors with details

## ✅ Step 4 - The Worker (Redis + BullMQ)

- [x] **Polling approach** - Every 5s, find due notes
- [x] **Delivery logic**:
  - [x] POST to webhookUrl with JSON payload
  - [x] X-Note-Id header
  - [x] X-Idempotency-Key header (sha256(noteId + releaseAt))
- [x] **Retries**: Exponential backoff (1s → 5s → 25s), max 3 tries
- [x] **Status updates**:
  - [x] Success: status = "delivered", deliveredAt = now
  - [x] Final fail: status = "dead"
- [x] **Attempt tracking** - Store every attempt in attempts[]

## ✅ Step 5 - Webhook Receiver ("sink" service)

- [x] **Express app** on port 4000
- [x] **POST /sink** - accepts deliveries
- [x] **Idempotency**:
  - [x] Read X-Idempotency-Key
  - [x] Redis SETNX key 1 EX 86400 (24 hours)
  - [x] Return 200 for duplicates
  - [x] Process first-time requests
- [x] **Failure simulation** - Configurable via SINK_FAILURE_RATE

## ✅ Step 6 - Tiny React Admin

- [x] **Single page** with:
  - [x] Create form: title, body, releaseAt, webhookUrl
  - [x] Table: id, title, status, last attempt code, Replay buttons
- [x] **Micro-interaction**: Framer Motion animations
  - [x] Row animations on status changes
  - [x] Form animations
  - [x] Success/error message animations
- [x] **react-hook-form** for form handling
- [x] **Minimal styles** - Focus on function

## ✅ Step 7 - DX, Tests, Docs

- [x] **Scripts**: dev, test, lint, format, seed, build-admin
- [x] **Tests**:
  - [x] Unit test: idempotency key generation
  - [x] Integration test: note creation and delivery workflow
- [x] **README**:
  - [x] How to run with Docker Compose
  - [x] Example curl commands
  - [x] Environment variables
  - [x] API documentation

## ✅ Acceptance Checklist Verification

### Docker Compose Setup
- [ ] `docker compose up` brings up all services
- [ ] All services start without errors
- [ ] Health checks pass

### API Functionality
- [ ] `GET /health` returns 200 { ok: true }
- [ ] Creating note with past releaseAt triggers delivery within ~5 seconds
- [ ] Sink failure simulation works (set SINK_FAILURE_RATE=0.5)
- [ ] Worker retries with backoff, marks dead after max attempts
- [ ] Replay endpoint requeues dead/failed notes successfully

### Idempotency
- [ ] Sending same note twice leads to only one "real" process at sink
- [ ] Second call recognized as duplicate
- [ ] Redis idempotency keys work correctly

### Rate Limiting
- [ ] Rate limit works (60 req/min per IP)
- [ ] Returns 429 when exceeded

### Tests
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Test coverage adequate

## 🚀 Ready for Testing

The DropLater service is now complete and ready for testing. All core functionality has been implemented according to the specifications.

### Quick Test Commands

```bash
# Start services
docker-compose up -d

# Test health
curl http://localhost:3000/health

# Create a note (replace TOKEN with your admin token)
curl -X POST http://localhost:3000/api/notes \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"Test Note",
    "body":"This is a test",
    "releaseAt":"2024-01-01T00:00:00.000Z",
    "webhookUrl":"http://localhost:4000/sink"
  }'

# List notes
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3000/api/notes"

# Access admin UI
open http://localhost:3000/admin
```

## 📝 Notes

- **Idempotency Key**: Uses `sha256(noteId + releaseAt)` for consistent keys
- **Time Handling**: All times stored in UTC, accepts ISO strings
- **Retry Strategy**: Simple array [1000, 5000, 25000] ms delays
- **Security**: Single admin token, rate limiting per IP
- **Logging**: Structured JSON logs with Pino
- **Error Handling**: Human-readable JSON errors with details
