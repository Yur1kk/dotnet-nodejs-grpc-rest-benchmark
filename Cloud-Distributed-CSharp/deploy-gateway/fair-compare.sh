#!/bin/bash
# ================================================================
# Fair Compare Runner — Multi-VU Edition
# Usage:
#   ./fair-compare.sh 100 500 1000   -- Run all tests for these VUs
#   ./fair-compare.sh                -- Run defaults (100 to 5000)
# ================================================================

# If no arguments provided, use a default comprehensive list
if [ $# -eq 0 ]; then
    VU_LEVELS=("100" "200" "500" "1000" "2000" "5000")
else
    VU_LEVELS=("$@")
fi

ENV="LOCAL"

# Detect environment via IP (robust check for GCP)
if hostname -I 2>/dev/null | grep -q "10.186.0"; then
  ENV="CLOUD"
  USERS_URL="http://10.186.0.6:3012"
  ORDERS_URL="http://10.186.0.4:3014"
else
  ENV="LOCAL"
  USERS_URL="http://localhost:3012"
  ORDERS_URL="http://localhost:3014"
fi

reset_db() {
    local mode=$1
    local vus=$2
    echo -e "\n\e[31m[FAIR CLEANUP] Resetting DB before $mode ($vus VUs)...\e[0m"
    curl -X POST -s "${USERS_URL}/internal/reset" > /dev/null
    curl -X POST -s "${ORDERS_URL}/internal/reset" > /dev/null
    echo -e "  \e[33mWaiting 15s for re-seeding...\e[0m"
    sleep 15
    echo -e "  \e[32m[DB READY]\e[0m"
}

run_fair_test() {
    local mode=$1
    local vus=$2
    reset_db "$mode" "$vus"
    VUS=$vus ./run-tests.sh "$mode"
}

echo -e "\e[35m==============================================================="
echo -e "  STARTING MULTI-VU FAIR COMPARISON SUITE"
echo -e "  Levels: ${VU_LEVELS[*]}" 
echo -e "  Environment: $ENV"
echo -e "===============================================================\e[0m"

for vu in "${VU_LEVELS[@]}"; do
    echo -e "\n\e[1;44m >>> BEGINNING CYCLE FOR $vu VUs <<< \e[0m"
    
    # Run all 4 test types for this VU level
    run_fair_test "rest-gw"  "$vu"
    run_fair_test "rpc-gw"   "$vu"
    run_fair_test "rest-dir" "$vu"
    run_fair_test "grpc-dir" "$vu"
    
    echo -e "\e[1;32m >>> FINISHED CYCLE FOR $vu VUs <<< \e[0m"
done

echo -e "\n\e[35m==============================================================="
echo -e "  ALL BENCHMARKS COMPLETE!"
echo -e "  Check Grafana for the full comparative data."
echo -e "===============================================================\e[0m"
