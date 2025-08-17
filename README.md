# DropLater

A small service where users create "notes" that should be sent to a webhook at/after a time. Delivery must be exactly once (idempotent), with retries on failure, and a tiny admin UI to create/list/replay.

## Features

- ✅ **Scheduled Note Delivery**: Create notes with future release times
- ✅ **Exactly-Once Delivery**: Idempotent webhook delivery using Redis
- ✅ **Retry Logic**: Exponential backoff with configurable max attempts
- ✅ **Admin Interface**: React-based UI for managing notes
- ✅ **Real-time Status**: Track delivery attempts and status
- ✅ **Replay Functionality**: Requeue failed or dead notes
- ✅ **Rate Limiting**: API protection with configurable limits
- ✅ **Comprehensive Testing**: Unit and integration tests

## Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   React     │    │   Express   │    │   Worker    │
│   Admin     │◄──►│     API     │◄──►│   Process   │
│   (Port 3k) │    │  (Port 3k)  │    │             │
└─────────────┘    └─────────────┘    └─────────────┘
                           │                   │
                           ▼                   ▼
                    ┌─────────────┐    ┌─────────────┐
                    │  MongoDB    │    │   Redis     │
                    │  Database   │    │   Queue     │
                    └─────────────┘    └─────────────┘
                                              │
                                              ▼
                                       ┌─────────────┐
                                       │   Sink      │
                                       │  Webhook    │
                                       │ (Port 4k)   │
                                       └─────────────┘
```

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development)

### 1. Clone and Setup

```bash
git clone <repository-url>
cd droplater
cp env.example .env
```

### 2. Configure Environment

Edit `.env` file:

```bash
# Database
MONGODB_URI=mongodb://localhost:27017/droplater
REDIS_URL=redis://localhost:6379

# API Configuration
PORT=3000
ADMIN_TOKEN=your-secret-admin-token-here

# Sink Configuration
SINK_PORT=4000
SINK_FAILURE_RATE=0

# Logging
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=60
```

### 3. Start Services

```bash
# Start all services
docker-compose up

# Or start in background
docker-compose up -d
```

### 4. Seed Sample Data (Optional)

```bash
npm run seed
```

### 5. Access Services

- **Admin UI**: http://localhost:3000/admin
- **API**: http://localhost:3000/api
- **Sink Webhook**: http://localhost:4000/sink
- **Health Check**: http://localhost:3000/health

## API Reference

### Authentication

All API endpoints require Bearer token authentication:

```bash
Authorization: Bearer your-secret-admin-token-here
```

### Endpoints

#### Create Note
```bash
POST /api/notes
Content-Type: application/json

{
  "title": "Note Title",
  "body": "Note content",
  "releaseAt": "2024-01-01T12:00:00.000Z",
  "webhookUrl": "https://example.com/webhook"
}
```

## Admin UI

Here’s a preview of the DropLater Admin interface:

![DropLater Admin UI](droplater_admin_ui.jpg)


#### List Notes
```bash
GET /api/notes?status=pending&page=1
```

#### Replay Note
```bash
POST /api/notes/{noteId}/replay
```

#### Health Check
```bash
GET /health
```

### Example cURL Commands

```bash
# Create a note
curl -X POST http://localhost:3000/api/notes \
  -H "Authorization: Bearer your-secret-admin-token-here" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"Hello",
    "body":"Ship me later",
    "releaseAt":"2024-01-01T00:00:10.000Z",
    "webhookUrl":"http://localhost:4000/sink"
  }'

# List notes
curl -H "Authorization: Bearer your-secret-admin-token-here" \
  "http://localhost:3000/api/notes?status=pending&page=1"

# Replay a note
curl -X POST \
  -H "Authorization: Bearer your-secret-admin-token-here" \
  "http://localhost:3000/api/notes/{noteId}/replay"
```

## Development

### Local Development

```bash
# Install dependencies
npm install

# Start development servers
npm run dev

# Run tests
npm test

# Lint code
npm run lint

# Format code
npm run format
```

### Project Structure

```
droplater/
├── api/                    # Express API server
│   ├── models/            # MongoDB models
│   ├── routes/            # API routes
│   ├── middleware/        # Express middleware
│   ├── validation/        # Zod validation schemas
│   └── utils/             # Utilities
├── worker/                # Background worker process
├── sink/                  # Webhook receiver service
├── admin/                 # React admin interface
│   ├── src/
│   │   ├── components/    # React components
│   │   └── ...
│   └── ...
├── tests/                 # Test files
│   ├── unit/             # Unit tests
│   └── integration/      # Integration tests
├── scripts/              # Utility scripts
└── docker-compose.yml    # Docker services
```

### Testing

```bash
# Run all tests
npm test

# Run unit tests only
npm test tests/unit/

# Run integration tests only
npm test tests/integration/

# Run with coverage
npm test -- --coverage
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/droplater` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `ADMIN_TOKEN` | API authentication token | Required |
| `PORT` | API server port | `3000` |
| `SINK_PORT` | Sink server port | `4000` |
| `SINK_FAILURE_RATE` | Simulated failure rate (0-1) | `0` |
| `LOG_LEVEL` | Logging level | `info` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | `60000` |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `60` |

### Database Indexes

The MongoDB collection uses these indexes for optimal performance:

- `releaseAt` (ascending) - For finding due notes quickly
- `status` - For filtering notes by status
- `{ status: 1, releaseAt: 1 }` - Compound index for efficient queries

### Retry Configuration

The worker uses exponential backoff for failed deliveries:

- **Delays**: 1s → 5s → 25s
- **Max Attempts**: 3
- **Status Flow**: pending → failed → dead

## Monitoring & Debugging

### Logs

All services use structured logging with Pino:

```bash
# View API logs
docker-compose logs api

# View worker logs
docker-compose logs worker

# View sink logs
docker-compose logs sink
```

### Health Checks

```bash
# API health
curl http://localhost:3000/health

# Sink health
curl http://localhost:4000/health
```

### Simulating Failures

To test retry logic, set the sink failure rate:

```bash
SINK_FAILURE_RATE=0.5 docker-compose up sink
```

## Deployment

### Docker Compose

The application is designed to run with Docker Compose:

```bash
# Production build
docker-compose -f docker-compose.yml up -d

# With custom environment
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Environment-Specific Configs

Create environment-specific compose files:

```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  api:
    environment:
      - NODE_ENV=production
      - LOG_LEVEL=warn
```

## Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**
   - Check if MongoDB is running: `docker-compose ps mongo`
   - Verify connection string in `.env`

2. **Redis Connection Failed**
   - Check if Redis is running: `docker-compose ps redis`
   - Verify Redis URL in `.env`

3. **Worker Not Processing Notes**
   - Check worker logs: `docker-compose logs worker`
   - Verify note status in database
   - Check if release time is in the past

4. **Webhook Delivery Failing**
   - Check sink logs: `docker-compose logs sink`
   - Verify webhook URL is accessible
   - Check idempotency key handling

### Debug Mode

Enable debug logging:

```bash
LOG_LEVEL=debug docker-compose up
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## License

MIT License - see LICENSE file for details.
