#!/bin/bash
# ================================================================
# Unified Load Test Runner
# Works on LOCAL (Docker/Windows Git Bash) and CLOUD (GCP Linux)
#
# Usage:
#   ./run-tests.sh gateway   -- REST Gateway + RPC Gateway
#   ./run-tests.sh direct    -- Direct REST + Direct gRPC
#   ./run-tests.sh           -- all (gateway + direct)
# ================================================================

MODE="${1:-all}"
VU_LEVELS=(${VUS:-"100" "200" "500" "1000" "2000" "5000" "10000"})

# ── Auto-detect environment ──────────────────────────────────────
# On GCP VMs, we check for internal IP or specific network markers
if hostname -I | grep -q "10.186.0"; then
  ENV="cloud"
  NETWORK="host"
  DOCKER_FLAGS="--network host"
  INFLUXDB="http://10.186.0.2:8086"
  REST_GW_URL="http://localhost:3000/api"
  RPC_GW_URL="http://localhost:3001/api"
  USERS_REST_URL="http://10.186.0.6:3002"
  ORDERS_REST_URL="http://10.186.0.4:3004"
  USERS_RPC_ADDR="10.186.0.6:5003"
  ORDERS_RPC_ADDR="10.186.0.4:5005"
  SUDO="sudo"
else
  # Default to Local (Docker Desktop / WSL)
  ENV="local"
  NETWORK="bridge"
  DOCKER_FLAGS="--add-host=host.docker.internal:host-gateway"
  INFLUXDB="http://host.docker.internal:8086"
  REST_GW_URL="http://host.docker.internal:3000/api"
  RPC_GW_URL="http://host.docker.internal:3001/api"
  USERS_REST_URL="http://host.docker.internal:3002"
  ORDERS_REST_URL="http://host.docker.internal:3004"
  USERS_RPC_ADDR="host.docker.internal:5003"
  ORDERS_RPC_ADDR="host.docker.internal:5005"
  SUDO=""
fi


# ── Resolve paths ────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Git Bash on Windows needs Windows-style paths for Docker volume mounts
# MSYSTEM is set when running under MINGW (Git Bash)
if [[ -n "$MSYSTEM" ]] || [[ "$OSTYPE" == "msys" ]]; then
  SCRIPT_DIR_WIN="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -W)"
  K6_TESTS="${SCRIPT_DIR_WIN}/k6-tests"
  PROTO_DIR="${SCRIPT_DIR_WIN}/proto"
  export MSYS_NO_PATHCONV=1
else
  K6_TESTS="${SCRIPT_DIR}/k6-tests"
  PROTO_DIR="${SCRIPT_DIR}/proto"
fi

K6_IMAGE="grafana/k6"

# ── Print header ─────────────────────────────────────────────────
echo -e "\e[35m============================================="
echo -e " Load Test Suite — ${ENV^^} mode"
echo -e " Run mode   : ${MODE}"
echo -e " VU levels  : ${VU_LEVELS[*]}"
echo -e " InfluxDB   : ${INFLUXDB}"
echo -e "=============================================\e[0m"

# ── Wait for gateways (only relevant for gateway mode) ───────────
wait_for_gateways() {
  if [[ "$MODE" == "direct" ]]; then return; fi
  echo -e "\n\e[36m> Waiting for Gateways to be ready...\e[0m"
  END=$((SECONDS + 120))
  while [ $SECONDS -lt $END ]; do
    if [ "$ENV" == "local" ]; then
      REST_OK=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/api/users?page=1&limit=1" 2>/dev/null)
      RPC_OK=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3001/api/users?page=1&limit=1" 2>/dev/null)
    else
      REST_OK=$(curl -s -o /dev/null -w "%{http_code}" "${REST_GW_URL}/users?page=1&limit=1" 2>/dev/null)
      RPC_OK=$(curl -s -o /dev/null -w "%{http_code}" "${RPC_GW_URL}/users?page=1&limit=1" 2>/dev/null)
    fi
    if [ "$REST_OK" == "200" ] && [ "$RPC_OK" == "200" ]; then
      echo -e "  \e[32m[OK] Gateways ready\e[0m"; return
    fi
    echo -n "."; sleep 5
  done
  echo -e "\n  \e[31m[WARN] Gateways not ready after 2 min, continuing anyway\e[0m"
}

# ── Test runners ─────────────────────────────────────────────────
run_rest_gateway() {
  local vu=$1
  echo -e "\e[34m  [REST Gateway] ${vu} VUs\e[0m"
  $SUDO docker run --rm $DOCKER_FLAGS \
    -v "${K6_TESTS}:/scripts" \
    -e K6_VUS=$vu \
    -e REST_URL="${REST_GW_URL}" \
    $K6_IMAGE run \
    --out "influxdb=${INFLUXDB}/k6_rest" \
    --tag api=rest --tag vus=$vu \
    /scripts/rest/test-rest-vus.js
}

run_rpc_gateway() {
  local vu=$1
  echo -e "\e[34m  [RPC Gateway] ${vu} VUs\e[0m"
  $SUDO docker run --rm $DOCKER_FLAGS \
    -v "${K6_TESTS}:/scripts" \
    -e K6_VUS=$vu \
    -e RPC_URL="${RPC_GW_URL}" \
    $K6_IMAGE run \
    --out "influxdb=${INFLUXDB}/k6_rpc" \
    --tag api=rpc --tag vus=$vu \
    /scripts/rpc/test-rpc-vus.js
}

run_rest_direct() {
  local vu=$1
  echo -e "\e[34m  [REST Direct] ${vu} VUs\e[0m"
  $SUDO docker run --rm $DOCKER_FLAGS \
    -v "${K6_TESTS}:/scripts" \
    -e K6_VUS=$vu \
    -e USERS_REST_URL="${USERS_REST_URL}" \
    -e ORDERS_REST_URL="${ORDERS_REST_URL}" \
    $K6_IMAGE run \
    --out "influxdb=${INFLUXDB}/k6_rest" \
    --tag api=rest-direct --tag vus=$vu \
    /scripts/rest/test-rest-vus.js
}

run_grpc_direct() {
  local vu=$1
  echo -e "\e[34m  [gRPC Direct] ${vu} VUs\e[0m"
  $SUDO docker run --rm $DOCKER_FLAGS \
    -v "${K6_TESTS}:/scripts" \
    -v "${PROTO_DIR}:/proto" \
    -e K6_VUS=$vu \
    -e USERS_ADDR="${USERS_RPC_ADDR}" \
    -e ORDERS_ADDR="${ORDERS_RPC_ADDR}" \
    $K6_IMAGE run \
    --out "influxdb=${INFLUXDB}/k6_rpc" \
    --tag api=grpc-direct --tag vus=$vu \
    /scripts/grpc-direct/test-grpc-direct-vus.js
}

# ── Main loop ────────────────────────────────────────────────────
wait_for_gateways

for vu in "${VU_LEVELS[@]}"; do
  echo -e "\n\e[33m>>> ${vu} VUs <<<\e[0m"

  case "$MODE" in
    gateway)
      run_rest_gateway $vu
      run_rpc_gateway  $vu
      ;;
    direct)
      run_rest_direct $vu
      run_grpc_direct $vu
      ;;
    all|*)
      run_rest_gateway $vu
      run_rpc_gateway  $vu
      run_rest_direct  $vu
      run_grpc_direct  $vu
      ;;
  esac
done

echo -e "\n\e[32m[DONE] All tests complete!\e[0m"
if [ "$ENV" == "local" ]; then
  echo -e "Grafana: http://localhost:3006"
else
  # Use the actual Influx VM internal IP for Grafana (since it's also running there)
  echo -e "Grafana: http://10.186.0.2:3006"
fi

