import React, { useState } from 'react';

export function ProgressChart({ sessions }) {
  const [hovered, setHovered] = useState(null);

  if (sessions.length === 0) {
    return <p className="history-empty">No sessions to chart yet.</p>;
  }

  // Chart dimensions
  const W = 580, H = 260;
  const PAD = { top: 24, right: 24, bottom: 56, left: 44 };
  const iW = W - PAD.left - PAD.right;
  const iH = H - PAD.top - PAD.bottom;

  const scores   = sessions.map(s => s.score);
  const avgs     = sessions.map(s => s.avgTime);
  const minScore = Math.max(0, Math.min(...scores) - 2);
  const maxScore = Math.max(...scores) + 2;
  const n        = sessions.length;

  const xOf = i  => PAD.left + (n === 1 ? iW / 2 : (i / (n - 1)) * iW);
  const yOf = v  => PAD.top  + iH - ((v - minScore) / (maxScore - minScore || 1)) * iH;

  // Build SVG polyline points string
  const pts = sessions.map((_, i) => `${xOf(i)},${yOf(scores[i])}`).join(' ');

  // Trend stats
  const first = scores[0], last = scores[n - 1];
  const trend = n > 1 ? ((last - first) / (first || 1) * 100).toFixed(0) : null;
  const bestScore  = Math.max(...scores);
  const totalAvg   = (avgs.reduce((a, b) => a + b, 0) / avgs.length).toFixed(2);

  // Y grid lines
  const gridCount = 4;
  const gridLines = Array.from({ length: gridCount + 1 }, (_, i) => {
    const v = minScore + ((maxScore - minScore) / gridCount) * i;
    return { y: yOf(v), label: Math.round(v) };
  });

  return (
    <div className="progress-chart-wrap">
      {/* Summary chips above chart */}
      <div className="stats-bar" style={{ marginBottom: 12 }}>
        <div className="stat-chip">
          <span className="stat-label">Sessions</span>
          <span className="stat-value">{n}</span>
        </div>
        <div className="stat-chip">
          <span className="stat-label">Best Score</span>
          <span className="stat-value" style={{ color: '#2a9d3f' }}>{bestScore}</span>
        </div>
        <div className="stat-chip">
          <span className="stat-label">Latest Score</span>
          <span className="stat-value">{last}</span>
        </div>
        <div className="stat-chip">
          <span className="stat-label">Avg Response</span>
          <span className="stat-value">{totalAvg}s</span>
        </div>
        {trend !== null && (
          <div className="stat-chip">
            <span className="stat-label">Trend</span>
            <span className="stat-value" style={{ color: trend >= 0 ? '#2a9d3f' : '#c0392b' }}>
              {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}%
            </span>
          </div>
        )}
      </div>

      {/* SVG Chart */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="progress-svg"
        onMouseLeave={() => setHovered(null)}
      >
        {/* Grid lines + Y labels */}
        {gridLines.map(({ y, label }) => (
          <g key={label}>
            <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y}
              stroke="#e0e0e0" strokeWidth="1" />
            <text x={PAD.left - 6} y={y + 4} textAnchor="end"
              fontSize="10" fill="#888">{label}</text>
          </g>
        ))}

        {/* Filled area under line */}
        <polygon
          points={`${xOf(0)},${PAD.top + iH} ${pts} ${xOf(n - 1)},${PAD.top + iH}`}
          fill="#0000ee" fillOpacity="0.07"
        />

        {/* Score line */}
        <polyline points={pts} fill="none" stroke="#0000ee" strokeWidth="2" strokeLinejoin="round" />

        {/* Data dots */}
        {sessions.map((s, i) => (
          <circle
            key={i}
            cx={xOf(i)} cy={yOf(scores[i])}
            r={hovered === i ? 6 : 4}
            fill={hovered === i ? '#0000ee' : '#fff'}
            stroke="#0000ee" strokeWidth="2"
            style={{ cursor: 'pointer', transition: 'r 0.1s' }}
            onMouseEnter={() => setHovered(i)}
          />
        ))}

        {/* X-axis labels (every session, or every Nth if crowded) */}
        {sessions.map((s, i) => {
          const step = n > 10 ? Math.ceil(n / 8) : 1;
          if (i % step !== 0 && i !== n - 1) return null;
          return (
            <text key={i} x={xOf(i)} y={H - 4}
              textAnchor="middle" fontSize="9" fill="#888"
              transform={`rotate(-35, ${xOf(i)}, ${H - 4})`}>
              {s.shortDate}
            </text>
          );
        })}

        {/* Tooltip */}
        {hovered !== null && (() => {
          const s = sessions[hovered];
          const cx = xOf(hovered), cy = yOf(scores[hovered]);
          const bx = Math.min(cx - 4, W - PAD.right - 120);
          const by = cy - 60 < PAD.top ? cy + 10 : cy - 58;
          return (
            <g>
              <rect x={bx} y={by} width="118" height="50"
                rx="3" fill="#fff" stroke="#ccc" strokeWidth="1" />
              <text x={bx + 8} y={by + 14} fontSize="10" fontWeight="bold" fill="#000">
                {s.shortDate}
              </text>
              <text x={bx + 8} y={by + 28} fontSize="10" fill="#000">
                Score: {s.score}
              </text>
              <text x={bx + 8} y={by + 42} fontSize="10" fill="#555">
                Avg time: {s.avgTime.toFixed(2)}s
              </text>
            </g>
          );
        })()}

        {/* Axes */}
        <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + iH}
          stroke="#ccc" strokeWidth="1" />
        <line x1={PAD.left} y1={PAD.top + iH} x2={W - PAD.right} y2={PAD.top + iH}
          stroke="#ccc" strokeWidth="1" />
      </svg>
    </div>
  );
}
