#!/usr/bin/env bash
set -e

echo "[entrypoint] Waiting for Postgres..."
python - <<'PY'
import os, time
import psycopg2
from urllib.parse import urlparse

url = os.getenv('SQLALCHEMY_DATABASE_URL', '')
if '+asyncpg' in url:
    url = url.replace('+asyncpg', '')
o = urlparse(url)

for _ in range(60):
    try:
        conn = psycopg2.connect(
            dbname=o.path.lstrip('/'), user=o.username, password=o.password, host=o.hostname, port=o.port
        )
        conn.close()
        break
    except Exception as e:
        time.sleep(1)
else:
    raise RuntimeError('Database not available')
print('[entrypoint] Postgres is up')
PY

echo "[entrypoint] Running migrations..."
echo "[entrypoint] SQLALCHEMY_DATABASE_URL=${SQLALCHEMY_DATABASE_URL}"
SYNC_URL="${SQLALCHEMY_DATABASE_URL/+asyncpg/+psycopg2}"
echo "[entrypoint] SYNC_URL=${SYNC_URL}"
alembic -x url="$SYNC_URL" upgrade head || { echo "[entrypoint] Migration failed"; exit 1; }

echo "[entrypoint] Starting server..."
exec "$@"
