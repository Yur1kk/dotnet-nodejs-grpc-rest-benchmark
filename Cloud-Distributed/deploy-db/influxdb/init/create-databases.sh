#!/bin/bash
# InfluxDB 1.8 initialization script
# Creates databases for Node.js and C# stacks.
# This file is placed in /docker-entrypoint-initdb.d/ inside the container.

set -e

# ── Node.js stack ────────────────────────────────────────────────
echo "[InfluxDB Init] Creating k6_rest database..."
influx -execute "CREATE DATABASE k6_rest"

echo "[InfluxDB Init] Creating k6_rpc database..."
influx -execute "CREATE DATABASE k6_rpc"

influx -execute "CREATE RETENTION POLICY \"30d\" ON k6_rest DURATION 30d REPLICATION 1 DEFAULT"
influx -execute "CREATE RETENTION POLICY \"30d\" ON k6_rpc DURATION 30d REPLICATION 1 DEFAULT"

# ── C# stack ─────────────────────────────────────────────────────
echo "[InfluxDB Init] Creating k6_rest_cs database..."
influx -execute "CREATE DATABASE k6_rest_cs"

echo "[InfluxDB Init] Creating k6_rpc_cs database..."
influx -execute "CREATE DATABASE k6_rpc_cs"

influx -execute "CREATE RETENTION POLICY \"30d\" ON k6_rest_cs DURATION 30d REPLICATION 1 DEFAULT"
influx -execute "CREATE RETENTION POLICY \"30d\" ON k6_rpc_cs DURATION 30d REPLICATION 1 DEFAULT"

echo "[InfluxDB Init] Done."
influx -execute "SHOW DATABASES"
