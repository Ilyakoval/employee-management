#!/usr/bin/env bash
# Restores TestDB.bak into the dockerized SQL Server (see docker-compose.yml).
# Idempotent: safe to re-run at any time to reset the data, even while the
# backend keeps open connections (they are rolled back via SINGLE_USER).
set -euo pipefail

CONTAINER=testdb-mssql
PASSWORD='TestDb!Passw0rd'
SQLCMD=/opt/mssql-tools18/bin/sqlcmd

echo "Waiting for SQL Server to accept connections..."
for i in $(seq 1 60); do
  if docker exec "$CONTAINER" "$SQLCMD" -S localhost -U sa -P "$PASSWORD" -C -Q "SELECT 1" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

echo "Restoring TestDB..."
docker exec "$CONTAINER" "$SQLCMD" -S localhost -U sa -P "$PASSWORD" -C -Q "
IF DB_ID('TestDB') IS NOT NULL
    ALTER DATABASE TestDB SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
RESTORE DATABASE TestDB FROM DISK='/backup/TestDB.bak'
WITH MOVE 'TestDB'     TO '/var/opt/mssql/data/TestDB.mdf',
     MOVE 'TestDB_log' TO '/var/opt/mssql/data/TestDB_log.ldf',
     REPLACE;
ALTER DATABASE TestDB SET MULTI_USER;"

echo "Done. TestDB is ready on localhost,1433 (sa / $PASSWORD)."
