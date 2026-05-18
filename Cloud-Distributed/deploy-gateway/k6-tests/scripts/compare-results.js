#!/usr/bin/env node
/**
 * compare-results.js
 * Parses k6 JSON output files and generates a comparison table
 * between REST and RPC ecosystems.
 *
 * Usage:
 *   node k6-tests/scripts/compare-results.js
 *
 * Expects files:
 *   k6-tests/results/rest-100.json
 *   k6-tests/results/rest-1000.json
 *   k6-tests/results/rpc-100.json
 *   k6-tests/results/rpc-1000.json
 */

const fs = require('fs');
const path = require('path');

const RESULTS_DIR = path.join(__dirname, '..', 'results');

function readMetrics(filePath) {
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  File not found: ${filePath}`);
    return null;
  }

  const lines = fs.readFileSync(filePath, 'utf-8').trim().split('\n');
  const metrics = {};

  for (const line of lines) {
    try {
      const entry = JSON.parse(line);
      if (entry.type === 'Point' && entry.metric) {
        if (!metrics[entry.metric]) metrics[entry.metric] = [];
        metrics[entry.metric].push(entry.data.value);
      }
    } catch {}
  }

  return metrics;
}

function avg(arr) {
  if (!arr || arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function percentile(arr, p) {
  if (!arr || arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function summarize(metrics) {
  if (!metrics) return null;
  const dur = metrics['http_req_duration'] || [];
  const failed = metrics['http_req_failed'] || [];
  const reqs = metrics['http_reqs'] || [];
  const sent = metrics['data_sent'] || [];
  const recv = metrics['data_received'] || [];

  return {
    avgResponseMs: avg(dur).toFixed(2),
    p95ResponseMs: percentile(dur, 95).toFixed(2),
    p99ResponseMs: percentile(dur, 99).toFixed(2),
    errorRate: (avg(failed) * 100).toFixed(2) + '%',
    totalRequests: reqs.length,
    dataSentMB: (avg(sent) / 1024 / 1024).toFixed(4),
    dataRecvMB: (avg(recv) / 1024 / 1024).toFixed(4),
  };
}

function printTable(rest, rpc, label) {
  const diff = (a, b) => {
    const numA = parseFloat(a);
    const numB = parseFloat(b);
    if (isNaN(numA) || isNaN(numB) || numA === 0) return 'N/A';
    const pct = ((numB - numA) / numA * 100).toFixed(1);
    return pct > 0 ? `+${pct}%` : `${pct}%`;
  };

  console.log(`\n${'='.repeat(75)}`);
  console.log(` 📊 Comparison Results — ${label}`);
  console.log('='.repeat(75));
  console.log(
    `${'Metric'.padEnd(25)} ${'REST'.padEnd(15)} ${'RPC'.padEnd(15)} ${'Diff (RPC vs REST)'.padEnd(18)}`
  );
  console.log('-'.repeat(75));

  const rows = [
    ['Avg Response (ms)', rest?.avgResponseMs, rpc?.avgResponseMs],
    ['p95 Response (ms)', rest?.p95ResponseMs, rpc?.p95ResponseMs],
    ['p99 Response (ms)', rest?.p99ResponseMs, rpc?.p99ResponseMs],
    ['Error Rate', rest?.errorRate, rpc?.errorRate],
    ['Total Requests', rest?.totalRequests, rpc?.totalRequests],
    ['Data Sent (MB/req)', rest?.dataSentMB, rpc?.dataSentMB],
    ['Data Recv (MB/req)', rest?.dataRecvMB, rpc?.dataRecvMB],
  ];

  for (const [metric, r, p] of rows) {
    const rVal = String(r ?? 'N/A').padEnd(15);
    const pVal = String(p ?? 'N/A').padEnd(15);
    const dVal = (r && p) ? diff(r, p) : 'N/A';
    console.log(`${metric.padEnd(25)} ${rVal} ${pVal} ${dVal}`);
  }

  console.log('='.repeat(75));
}

// Main
console.log('\n🚀 REST vs RPC — Load Test Results Comparison');
console.log('Protocol: REST  = HTTP GET/POST/PUT/DELETE');
console.log('Protocol: RPC   = JSON-RPC 2.0 (internal), REST external\n');

const rest100 = summarize(readMetrics(path.join(RESULTS_DIR, 'rest-100.json')));
const rpc100 = summarize(readMetrics(path.join(RESULTS_DIR, 'rpc-100.json')));
const rest1000 = summarize(readMetrics(path.join(RESULTS_DIR, 'rest-1000.json')));
const rpc1000 = summarize(readMetrics(path.join(RESULTS_DIR, 'rpc-1000.json')));

printTable(rest100, rpc100, '100 VUs (Moderate Load)');
printTable(rest1000, rpc1000, '1000 VUs (High Load)');

console.log('\n💡 Interpretation:');
console.log('  A negative diff means RPC was faster / had less overhead.');
console.log('  A positive diff means RPC was slower / had more overhead.');
console.log('  Under high load, the protocol overhead becomes more visible.\n');
