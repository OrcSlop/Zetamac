import React, { useState, useMemo } from 'react';

export function SessionSpeedChart({ rows }) {
  const [showRaw, setShowRaw] = useState(true);
  const [showDynamicAvg, setShowDynamicAvg] = useState(false);
  const [showAvg10, setShowAvg10] = useState(true);
  const [showAvg100, setShowAvg100] = useState(false);
  const [hovered, setHovered] = useState(null);

  if (!rows || rows.length === 0) return null;

  const times = rows.map(r => r.time);
  const n = times.length;

  const dynamicAvg = useMemo(() => {
    return times.map((_, i) => {
      const slice = times.slice(0, i + 1);
      return slice.reduce((a, b) => a + b, 0) / slice.length;
    });
  }, [times]);

  const avg10 = useMemo(() => {
    return times.map((_, i) => {
      const start = Math.max(0, i - 9);
      const slice = times.slice(start, i + 1);
      return slice.reduce((a, b) => a + b, 0) / slice.length;
    });
  }, [times]);

  const avg100 = useMemo(() => {
    return times.map((_, i) => {
      const start = Math.max(0, i - 99);
      const slice = times.slice(start, i + 1);
      return slice.reduce((a, b) => a + b, 0) / slice.length;
    });
  }, [times]);

  // Chart dimensions
  const W = 580, H = 220;
  const PAD = { top: 20, right: 20, bottom: 30, left: 44 };
  const iW = W - PAD.left - PAD.right;
  const iH = H - PAD.top - PAD.bottom;

  // Determine Y scale
  let allVisibleValues = [];
  if (showRaw) allVisibleValues.push(...times);
  if (showDynamicAvg) allVisibleValues.push(...dynamicAvg);
  if (showAvg10) allVisibleValues.push(...avg10);
  if (showAvg100) allVisibleValues.push(...avg100);

  if (allVisibleValues.length === 0) allVisibleValues = [0, 1]; // fallback

  const minTime = Math.max(0, Math.min(...allVisibleValues) - 0.5);
  const maxTime = Math.max(...allVisibleValues) + 0.5;

  const xOf = i => PAD.left + (n === 1 ? iW / 2 : (i / (n - 1)) * iW);
  const yOf = v => PAD.top + iH - ((v - minTime) / (maxTime - minTime || 1)) * iH;

  // Polyline points
  const rawPts = times.map((v, i) => `${xOf(i)},${yOf(v)}`).join(' ');
  const dynamicAvgPts = dynamicAvg.map((v, i) => `${xOf(i)},${yOf(v)}`).join(' ');
  const avg10Pts = avg10.map((v, i) => `${xOf(i)},${yOf(v)}`).join(' ');
  const avg100Pts = avg100.map((v, i) => `${xOf(i)},${yOf(v)}`).join(' ');

  // Y grid lines
  const gridCount = 4;
  const gridLines = Array.from({ length: gridCount + 1 }, (_, i) => {
    const v = minTime + ((maxTime - minTime) / gridCount) * i;
    return { y: yOf(v), label: v.toFixed(1) + 's' };
  });

  return (
    <div className="session-chart-wrap">
      <div className="chart-toggles">
        <label className="toggle-label" style={{ color: '#888' }}>
          <input type="checkbox" checked={showRaw} onChange={e => setShowRaw(e.target.checked)} />
          Raw Data
        </label>
        <label className="toggle-label" style={{ color: '#2a9d3f' }}>
          <input type="checkbox" checked={showDynamicAvg} onChange={e => setShowDynamicAvg(e.target.checked)} />
          Dynamic Avg
        </label>
        <label className="toggle-label" style={{ color: '#0000ee' }}>
          <input type="checkbox" checked={showAvg10} onChange={e => setShowAvg10(e.target.checked)} />
          10-Avg
        </label>
        <label className="toggle-label" style={{ color: '#8e44ad' }}>
          <input type="checkbox" checked={showAvg100} onChange={e => setShowAvg100(e.target.checked)} />
          100-Avg
        </label>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="progress-svg"
        onMouseLeave={() => setHovered(null)}
        style={{ marginTop: 8 }}
      >
        {/* Grid lines + Y labels */}
        {gridLines.map(({ y, label }) => (
          <g key={label}>
            <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="#e0e0e0" strokeWidth="1" />
            <text x={PAD.left - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#888">{label}</text>
          </g>
        ))}

        {/* Lines */}
        {showRaw && <polyline points={rawPts} fill="none" stroke="#ccc" strokeWidth="1.5" strokeLinejoin="round" />}
        {showDynamicAvg && <polyline points={dynamicAvgPts} fill="none" stroke="#2a9d3f" strokeWidth="2" strokeLinejoin="round" />}
        {showAvg10 && <polyline points={avg10Pts} fill="none" stroke="#0000ee" strokeWidth="2" strokeLinejoin="round" />}
        {showAvg100 && <polyline points={avg100Pts} fill="none" stroke="#8e44ad" strokeWidth="2" strokeLinejoin="round" />}

        {/* Interactive dots (we'll just use invisible rectangles or voronoi, but simple columns are easier) */}
        {times.map((_, i) => (
          <rect
            key={i}
            x={xOf(i) - (iW / n) / 2}
            y={PAD.top}
            width={iW / n}
            height={iH}
            fill="transparent"
            onMouseEnter={() => setHovered(i)}
            style={{ cursor: 'crosshair' }}
          />
        ))}

        {/* X-axis labels (every Nth if crowded) */}
        {times.map((_, i) => {
          const step = n > 20 ? Math.ceil(n / 10) : (n > 10 ? 2 : 1);
          if (i % step !== 0 && i !== n - 1 && i !== 0) return null;
          return (
            <text key={i} x={xOf(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="#888">
              {i + 1}
            </text>
          );
        })}

        {/* Hover overlay */}
        {hovered !== null && (() => {
          const i = hovered;
          const cx = xOf(i);
          // Find y for the tooltip - pick the highest active line
          let activeVals = [];
          if (showRaw) activeVals.push(times[i]);
          if (showDynamicAvg) activeVals.push(dynamicAvg[i]);
          if (showAvg10) activeVals.push(avg10[i]);
          if (showAvg100) activeVals.push(avg100[i]);
          const topVal = activeVals.length > 0 ? Math.max(...activeVals) : 0;
          const cy = yOf(topVal);

          const bx = Math.min(Math.max(cx - 50, PAD.left), W - PAD.right - 100);
          const by = cy - 60 < PAD.top ? cy + 10 : cy - 58;

          return (
            <g>
              <line x1={cx} y1={PAD.top} x2={cx} y2={PAD.top + iH} stroke="#999" strokeWidth="1" strokeDasharray="4" />
              <rect x={bx} y={by} width="110" height={showRaw + showDynamicAvg + showAvg10 + showAvg100 > 1 ? (36 + 14 * (showRaw + showDynamicAvg + showAvg10 + showAvg100)) : 50}
                rx="3" fill="#fff" stroke="#ccc" strokeWidth="1" />
              <text x={bx + 8} y={by + 14} fontSize="10" fontWeight="bold" fill="#000">
                Q: {i + 1}
              </text>
              {showRaw && (
                <text x={bx + 8} y={by + 28} fontSize="10" fill="#888">
                  Time: {times[i].toFixed(2)}s
                </text>
              )}
              {showDynamicAvg && (
                <text x={bx + 8} y={by + (showRaw ? 42 : 28)} fontSize="10" fill="#2a9d3f">
                  Dyn-Avg: {dynamicAvg[i].toFixed(2)}s
                </text>
              )}
              {showAvg10 && (
                <text x={bx + 8} y={by + (showRaw ? (showDynamicAvg ? 56 : 42) : (showDynamicAvg ? 42 : 28))} fontSize="10" fill="#0000ee">
                  10-Avg: {avg10[i].toFixed(2)}s
                </text>
              )}
              {showAvg100 && (
                <text x={bx + 8} y={by + (showRaw ? (showDynamicAvg ? (showAvg10 ? 70 : 56) : (showAvg10 ? 56 : 42)) : (showDynamicAvg ? (showAvg10 ? 56 : 42) : (showAvg10 ? 42 : 28)))} fontSize="10" fill="#8e44ad">
                  100-Avg: {avg100[i].toFixed(2)}s
                </text>
              )}
            </g>
          );
        })()}

        {/* Axes */}
        <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + iH} stroke="#ccc" strokeWidth="1" />
        <line x1={PAD.left} y1={PAD.top + iH} x2={W - PAD.right} y2={PAD.top + iH} stroke="#ccc" strokeWidth="1" />
      </svg>
    </div>
  );
}
