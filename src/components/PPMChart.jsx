import React, { useState, useMemo } from 'react';

export function PPMChart({ rows }) {
  const [showRaw, setShowRaw] = useState(true);
  const [showAvg3, setShowAvg3] = useState(false);
  const [showAvg10, setShowAvg10] = useState(false);
  const [showAvg100, setShowAvg100] = useState(false);
  const [showAvg1000, setShowAvg1000] = useState(false);
  const [hovered, setHovered] = useState(null);

  if (!rows || rows.length === 0) return null;

  const times = rows.map(r => r.time);
  const n = times.length;
  // Compute PPM (questions per minute) cumulatively
  const ppmValues = useMemo(() => {
    let totalSeconds = 0;
    return times.map((sec, i) => {
      totalSeconds += sec;
      return totalSeconds > 0 ? 60 * (i + 1) / totalSeconds : 0;
    });
  }, [times]);

  const avg3 = useMemo(() => {
    return ppmValues.map((_, i) => {
      const start = Math.max(0, i - 2);
      const slice = ppmValues.slice(start, i + 1);
      return slice.reduce((a, b) => a + b, 0) / slice.length;
    });
  }, [ppmValues]);

  const avg10 = useMemo(() => {
    return ppmValues.map((_, i) => {
      const start = Math.max(0, i - 9);
      const slice = ppmValues.slice(start, i + 1);
      return slice.reduce((a, b) => a + b, 0) / slice.length;
    });
  }, [ppmValues]);

  const avg100 = useMemo(() => {
    return ppmValues.map((_, i) => {
      const start = Math.max(0, i - 99);
      const slice = ppmValues.slice(start, i + 1);
      return slice.reduce((a, b) => a + b, 0) / slice.length;
    });
  }, [ppmValues]);

  const avg1000 = useMemo(() => {
    return ppmValues.map((_, i) => {
      const start = Math.max(0, i - 999);
      const slice = ppmValues.slice(start, i + 1);
      return slice.reduce((a, b) => a + b, 0) / slice.length;
    });
  }, [ppmValues]);

  // Chart dimensions
  const W = 580, H = 220;
  const PAD = { top: 20, right: 20, bottom: 30, left: 44 };
  const iW = W - PAD.left - PAD.right;
  const iH = H - PAD.top - PAD.bottom;

  // Determine Y scale based on PPM values
  let allVisibleValues = [];
  if (showRaw) allVisibleValues.push(...ppmValues);
  if (showAvg3) allVisibleValues.push(...avg3);
  if (showAvg10) allVisibleValues.push(...avg10);
  if (showAvg100) allVisibleValues.push(...avg100);
  if (showAvg1000) allVisibleValues.push(...avg1000);

  if (allVisibleValues.length === 0) allVisibleValues = [0, 5]; // fallback

  const minPpm = Math.max(0, Math.min(...allVisibleValues) - 2);
  const maxPpm = Math.max(...allVisibleValues) + 2;

  const xOf = i => PAD.left + (n === 1 ? iW / 2 : (i / (n - 1)) * iW);
  const yOf = v => PAD.top + iH - ((v - minPpm) / (maxPpm - minPpm || 1)) * iH;

  // Polyline points (PPM)
  const rawPts = ppmValues.map((v, i) => `${xOf(i)},${yOf(v)}`).join(' ');
  const avg3Pts = avg3.map((v, i) => `${xOf(i)},${yOf(v)}`).join(' ');
  const avg10Pts = avg10.map((v, i) => `${xOf(i)},${yOf(v)}`).join(' ');
  const avg100Pts = avg100.map((v, i) => `${xOf(i)},${yOf(v)}`).join(' ');
  const avg1000Pts = avg1000.map((v, i) => `${xOf(i)},${yOf(v)}`).join(' ');

  // Y grid lines
  const gridCount = 4;
  const gridLines = Array.from({ length: gridCount + 1 }, (_, i) => {
    const v = minPpm + ((maxPpm - minPpm) / gridCount) * i;
    return { y: yOf(v), label: `${v.toFixed(1)} ppm` };
  });

  return (
    <div className="session-chart-wrap">
      <div className="chart-toggles">
        <label className="toggle-label" style={{ color: '#888' }}>
          <input type="checkbox" checked={showRaw} onChange={e => setShowRaw(e.target.checked)} />
          Raw Data
        </label>
        <label className="toggle-label" style={{ color: '#2a9d3f' }}>
          <input type="checkbox" checked={showAvg3} onChange={e => setShowAvg3(e.target.checked)} />
          3-Avg
        </label>
        <label className="toggle-label" style={{ color: '#0000ee' }}>
          <input type="checkbox" checked={showAvg10} onChange={e => setShowAvg10(e.target.checked)} />
          10-Avg
        </label>
        <label className="toggle-label" style={{ color: '#8e44ad' }}>
          <input type="checkbox" checked={showAvg100} onChange={e => setShowAvg100(e.target.checked)} />
          100-Avg
        </label>
        <label className="toggle-label" style={{ color: '#e67e22' }}>
          <input type="checkbox" checked={showAvg1000} onChange={e => setShowAvg1000(e.target.checked)} />
          1000-Avg
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

        {/* Lines (PPM) */}
        {showRaw && <polyline points={rawPts} fill="none" stroke="#ccc" strokeWidth="1.5" strokeLinejoin="round" />}
        {showAvg3 && <polyline points={avg3Pts} fill="none" stroke="#2a9d3f" strokeWidth="2" strokeLinejoin="round" />}
        {showAvg10 && <polyline points={avg10Pts} fill="none" stroke="#0000ee" strokeWidth="2" strokeLinejoin="round" />}
        {showAvg100 && <polyline points={avg100Pts} fill="none" stroke="#8e44ad" strokeWidth="2" strokeLinejoin="round" />}
        {showAvg1000 && <polyline points={avg1000Pts} fill="none" stroke="#e67e22" strokeWidth="2" strokeLinejoin="round" />}

        {/* Interactive dots (we'll just use invisible rectangles or voronoi, but simple columns are easier) */}
        {ppmValues.map((_, i) => (
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
        {ppmValues.map((_, i) => {
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
          // Find y for the tooltip - pick the highest active PPM line
          let activeVals = [];
          if (showRaw) activeVals.push(ppmValues[i]);
          if (showAvg3) activeVals.push(avg3[i]);
          if (showAvg10) activeVals.push(avg10[i]);
          if (showAvg100) activeVals.push(avg100[i]);
          if (showAvg1000) activeVals.push(avg1000[i]);
          const topVal = activeVals.length > 0 ? Math.max(...activeVals) : 0;
          const cy = yOf(topVal);

          const bx = Math.min(Math.max(cx - 50, PAD.left), W - PAD.right - 100);
          const by = cy - 60 < PAD.top ? cy + 10 : cy - 58;

          return (
            <g>
              <line x1={cx} y1={PAD.top} x2={cx} y2={PAD.top + iH} stroke="#999" strokeWidth="1" strokeDasharray="4" />
              <rect x={bx} y={by} width="110" height={showRaw + showAvg3 + showAvg10 + showAvg100 + showAvg1000 > 1 ? (36 + 14 * (showRaw + showAvg3 + showAvg10 + showAvg100 + showAvg1000)) : 50}
                rx="3" fill="#fff" stroke="#ccc" strokeWidth="1" />
              <text x={bx + 8} y={by + 14} fontSize="10" fontWeight="bold" fill="#000">
                Q: {i + 1}
              </text>
              {showRaw && (
                <text x={bx + 8} y={by + 28} fontSize="10" fill="#888">
                  PPM: {ppmValues[i].toFixed(1)}
                </text>
              )}
              {showAvg3 && (
                <text x={bx + 8} y={by + (showRaw ? 42 : 28)} fontSize="10" fill="#2a9d3f">
                  3-Avg: {avg3[i].toFixed(1)} ppm
                </text>
              )}
              {showAvg10 && (
                <text x={bx + 8} y={by + (showRaw ? (showAvg3 ? 56 : 42) : (showAvg3 ? 42 : 28))} fontSize="10" fill="#0000ee">
                  10-Avg: {avg10[i].toFixed(1)} ppm
                </text>
              )}
              {showAvg100 && (
                <text x={bx + 8} y={by + (showRaw ? (showAvg3 ? (showAvg10 ? 70 : 56) : (showAvg10 ? 56 : 42)) : (showAvg3 ? (showAvg10 ? 56 : 42) : (showAvg10 ? 42 : 28)))} fontSize="10" fill="#8e44ad">
                  100-Avg: {avg100[i].toFixed(1)} ppm
                </text>
              )}
              {showAvg1000 && (
                <text x={bx + 8} y={by + (showRaw ? (showAvg3 ? (showAvg10 ? (showAvg100 ? 84 : 70) : (showAvg100 ? 70 : 56)) : (showAvg10 ? (showAvg100 ? 70 : 56) : (showAvg100 ? 56 : 42))) : (showAvg3 ? (showAvg10 ? (showAvg100 ? 70 : 56) : (showAvg100 ? 56 : 42)) : (showAvg10 ? (showAvg100 ? 56 : 42) : (showAvg100 ? 42 : 28))))} fontSize="10" fill="#e67e22">
                  1000-Avg: {avg1000[i].toFixed(1)} ppm
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
