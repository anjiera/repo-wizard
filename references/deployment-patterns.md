# Code Deployment & Availability Standards

This document serves as the repository's source of truth for high-availability container replicas, Kubernetes liveness/readiness/startup probes, and automated database backup and restore verification scripts.

---

## 1. High-Availability Docker Compose Configurations

For local and single-host container orchestrations, Docker Compose supports multi-replica setups behind a load balancer (such as Nginx or Traefik).

### 1.1 Multi-Replica Service Configuration
To configure replicas, specify the `deploy` configuration block. Note that using host port bindings directly on the replicas will cause port conflicts; instead, route traffic through a load balancer or reverse proxy.

```yaml
version: '3.8'

services:
  web-app:
    image: node:20-alpine
    restart: always
    deploy:
      mode: replicated
      replicas: 3
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
        window: 120s
    environment:
      - DATABASE_URL=postgres://db_user:db_pass@db:5432/main_db
    depends_on:
      db:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/healthz"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 15s

  lb:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - web-app
```

### 1.2 Nginx Round-Robin Config (`nginx.conf`)
```nginx
events { worker_connections 1024; }

http {
    upstream web_nodes {
        # Docker Compose dns resolver maps service name to all running container IPs
        server web-app:3000;
    }

    server {
        listen 80;

        location / {
            proxy_pass http://web_nodes;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }
    }
}
```

---

## 2. Kubernetes Liveness, Readiness, and Startup Probes

Kubernetes uses health probes to detect when a pod is ready to accept traffic (Readiness), when a pod has crashed and must be restarted (Liveness), or when a pod is still starting up (Startup).

```
 ┌──────────────────────┐
 │     STARTUP PROBE    │ ── (Fails) ──► Restart Container
 └──────────┬───────────┘
            │ (Passes)
            ▼
 ┌──────────────────────┐
 │    LIVENESS PROBE    │ ── (Fails) ──► Restart Container
 └──────────────────────┘
 ┌──────────────────────┐
 │   READINESS PROBE    │ ── (Fails) ──► Remove Pod from Service routing
 └──────────────────────┘
```

### 2.1 Standard Pod Probes Configuration
Use a startup probe if your application takes a long time to boot (e.g. running migrations or loading caches) to prevent the liveness probe from prematurely killing it.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-service
  template:
    metadata:
      labels:
        app: api-service
    spec:
      containers:
        - name: application
          image: mycompany/api-service:v1.2.0
          ports:
            - containerPort: 8080
          
          # Startup Probe: allows up to 10 * 3s = 30s to boot before liveness takes over
          startupProbe:
            httpGet:
              path: /healthz/startup
              port: 8080
            failureThreshold: 10
            periodSeconds: 3

          # Liveness Probe: restarts container if unresponsive
          livenessProbe:
            httpGet:
              path: /healthz/liveness
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
            timeoutSeconds: 2
            failureThreshold: 3

          # Readiness Probe: controls traffic flow to the pod
          readinessProbe:
            httpGet:
              path: /healthz/readiness
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 5
            timeoutSeconds: 2
            successThreshold: 1
            failureThreshold: 2
```

---

## 3. Automated Database Backup & Verification Scripts

Reliability requires robust database backups and verified recovery loops. The following script automates a PostgreSQL backup with rotation policies and self-verification.

### 3.1 PostgreSQL Backup & Rotation Script (`scripts/backup-db.sh`)
```bash
#!/usr/bin/env bash
# PostgreSQL Automated Backup, Verification, and Rotation Script
set -euo pipefail

DB_NAME="${DB_NAME:-app_db}"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/db}"
RETENTION_DAYS=7

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_backup_${TIMESTAMP}.sql.gz"

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo "Starting database backup for ${DB_NAME}..."
# Dump and compress database
pg_dump -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" | gzip > "$BACKUP_FILE"

# 1. Validation check: verify output file is non-empty
if [ ! -s "$BACKUP_FILE" ]; then
  echo "ERROR: Backup file is empty or was not created." >&2
  exit 1
fi

# 2. Validation check: verify archive integrity
if ! gzip -t "$BACKUP_FILE"; then
  echo "ERROR: Backup archive file is corrupted." >&2
  exit 1
fi

echo "Backup created successfully: ${BACKUP_FILE}"

# 3. Dry-run restore verification: test restore onto a temporary DB
echo "Running dry-run restore validation..."
TEMP_DB="restore_test_${TIMESTAMP}"
createdb -h "$DB_HOST" -U "$DB_USER" "$TEMP_DB"

if gunzip -c "$BACKUP_FILE" | psql -h "$DB_HOST" -U "$DB_USER" -d "$TEMP_DB" > /dev/null; then
  echo "Restore validation PASSED."
  dropdb -h "$DB_HOST" -U "$DB_USER" "$TEMP_DB"
else
  echo "ERROR: Backup failed restore validation." >&2
  dropdb -h "$DB_HOST" -U "$DB_USER" "$TEMP_DB" || true
  exit 1
fi

# 4. Rotation check: purge backups older than RETENTION_DAYS
echo "Applying rotation policy (retaining last ${RETENTION_DAYS} days)..."
find "$BACKUP_DIR" -name "${DB_NAME}_backup_*.sql.gz" -mtime +"$RETENTION_DAYS" -exec rm -f {} \;

echo "Database maintenance completed."
```
