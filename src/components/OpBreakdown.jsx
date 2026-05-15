import React from 'react';
import { detectOp } from '../utils/helpers';

const OPS = [
  { key: 'add', label: 'Addition',       symbol: '+', color: '#1a6bb5' },
  { key: 'sub', label: 'Subtraction',    symbol: '−', color: '#8e44ad' },
  { key: 'mul', label: 'Multiplication', symbol: '×', color: '#c0392b' },
  { key: 'div', label: 'Division',       symbol: '÷', color: '#2a9d3f' },
];

export function OpBreakdown({ allRows }) {
  // Group rows by operation type
  const byOp = {};
  for (const row of allRows) {
    const op = detectOp(row.problem);
    if (!op) continue;
    if (!byOp[op]) byOp[op] = [];
    byOp[op].push(row);
  }

  return (
    <div className="op-grid">
      {OPS.map(({ key, label, symbol, color }) => {
        const rows = byOp[key] || [];
        if (rows.length === 0) return (
          <div key={key} className="op-card" style={{ borderTopColor: color }}>
            <div className="op-header" style={{ color }}>
              <span className="op-symbol">{symbol}</span> {label}
            </div>
            <div className="op-empty">No data yet</div>
          </div>
        );

        // Per-problem aggregation for this op
        const map = {};
        for (const r of rows) {
          if (!map[r.problem]) map[r.problem] = { times: [], answer: r.answer };
          map[r.problem].times.push(r.time);
        }
        const problems = Object.entries(map).map(([prob, d]) => ({
          problem: prob,
          answer:  d.answer,
          avg:     d.times.reduce((a, b) => a + b, 0) / d.times.length,
          best:    Math.min(...d.times),
        }));

        const overallAvg = rows.reduce((a, r) => a + r.time, 0) / rows.length;
        const fastestProb = problems.reduce((a, b) => a.avg < b.avg ? a : b);
        const slowestProb = problems.reduce((a, b) => a.avg > b.avg ? a : b);

        return (
          <div key={key} className="op-card" style={{ borderTopColor: color }}>
            <div className="op-header" style={{ color }}>
              <span className="op-symbol">{symbol}</span> {label}
            </div>
            <div className="op-rows">
              <div className="op-row">
                <span className="op-row-label">Attempts</span>
                <span className="op-row-val">{rows.length}</span>
              </div>
              <div className="op-row">
                <span className="op-row-label">Avg time</span>
                <span className="op-row-val">{overallAvg.toFixed(2)}s</span>
              </div>
              <div className="op-row">
                <span className="op-row-label">Fastest Q</span>
                <span className="op-row-val" style={{ color: '#2a9d3f', fontFamily: 'monospace' }}>
                  {fastestProb.problem} = {fastestProb.answer}
                </span>
              </div>
              <div className="op-row">
                <span className="op-row-label">Fastest avg</span>
                <span className="op-row-val" style={{ color: '#2a9d3f' }}>
                  {fastestProb.avg.toFixed(3)}s
                </span>
              </div>
              <div className="op-row">
                <span className="op-row-label">Hardest Q</span>
                <span className="op-row-val" style={{ color: '#c0392b', fontFamily: 'monospace' }}>
                  {slowestProb.problem} = {slowestProb.answer}
                </span>
              </div>
              <div className="op-row">
                <span className="op-row-label">Hardest avg</span>
                <span className="op-row-val" style={{ color: '#c0392b' }}>
                  {slowestProb.avg.toFixed(3)}s
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
