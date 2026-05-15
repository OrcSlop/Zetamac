import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Parse a CSV string (with optional leading apostrophes) into row objects */
function parseCSV(csv) {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];
  return lines.slice(1).map((line) => {
    // Strip the apostrophe prefix that was added for Excel compatibility
    const clean = line.replace(/^'/, '');
    const [problem, answer, time] = clean.split(',');
    return {
      problem: problem?.trim() ?? '',
      answer: answer?.trim() ?? '',
      time: parseFloat(time) || 0,
    };
  }).filter(r => r.problem);
}

/** Pretty-print a filename like "zetamac_2025-01-15T10-30-00-000Z.csv" */
function formatFilename(filename) {
  // Extract date from filename
  const match = filename.match(/zetamac_(\d{4}-\d{2}-\d{2})T(\d{2}-\d{2}-\d{2})/);
  if (!match) return filename;
  const [, date, time] = match;
  const [h, m] = time.split('-');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 || 12;
  return `${date}  ${h12}:${m} ${ampm}`;
}

// ── Result Table ──────────────────────────────────────────────────────────────

function ResultsTable({ rows }) {
  if (rows.length === 0) return null;

  const times = rows.map(r => r.time);
  const avgTime = (times.reduce((a, b) => a + b, 0) / times.length).toFixed(2);
  const minTime = Math.min(...times).toFixed(2);
  const maxTime = Math.max(...times).toFixed(2);

  // Color scale: green (fast) → yellow → red (slow)
  function timeColor(t) {
    const lo = Math.min(...times);
    const hi = Math.max(...times);
    if (hi === lo) return '#2a9d3f';
    const ratio = (t - lo) / (hi - lo); // 0 = fastest, 1 = slowest
    if (ratio < 0.4) return '#2a9d3f';   // green
    if (ratio < 0.7) return '#d4a017';   // amber
    return '#c0392b';                     // red
  }

  return (
    <div className="results-table-wrap">
      {/* Summary bar */}
      <div className="stats-bar">
        <div className="stat-chip">
          <span className="stat-label">Questions</span>
          <span className="stat-value">{rows.length}</span>
        </div>
        <div className="stat-chip">
          <span className="stat-label">Avg Time</span>
          <span className="stat-value">{avgTime}s</span>
        </div>
        <div className="stat-chip">
          <span className="stat-label">Fastest</span>
          <span className="stat-value" style={{ color: '#2a9d3f' }}>{minTime}s</span>
        </div>
        <div className="stat-chip">
          <span className="stat-label">Slowest</span>
          <span className="stat-value" style={{ color: '#c0392b' }}>{maxTime}s</span>
        </div>
      </div>

      {/* Table */}
      <div className="table-scroll">
        <table className="results-tbl">
          <thead>
            <tr>
              <th>#</th>
              <th>Problem</th>
              <th>Answer</th>
              <th>Time (s)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                <td className="col-num">{i + 1}</td>
                <td className="col-problem">{row.problem}</td>
                <td className="col-answer">{row.answer}</td>
                <td className="col-time" style={{ color: timeColor(row.time) }}>
                  {row.time.toFixed(3)}s
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Progress Chart ────────────────────────────────────────────────────────────

function ProgressChart({ sessions }) {
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

// ── Leaderboard Table ─────────────────────────────────────────────────────────

/** Build leaderboard rows from a flat array of all answered problems */
function buildLeaderboard(allRows) {
  const map = {};
  for (const row of allRows) {
    const key = row.problem;
    if (!map[key]) map[key] = { problem: key, answer: row.answer, times: [] };
    map[key].times.push(row.time);
  }
  return Object.values(map).map(e => ({
    problem:  e.problem,
    answer:   e.answer,
    count:    e.times.length,
    avgTime:  e.times.reduce((a, b) => a + b, 0) / e.times.length,
    bestTime: Math.min(...e.times),
    worstTime:Math.max(...e.times),
  }));
}

// ── Operation Breakdown ──────────────────────────────────────────────────────

const OPS = [
  { key: 'add', label: 'Addition',       symbol: '+', color: '#1a6bb5' },
  { key: 'sub', label: 'Subtraction',    symbol: '−', color: '#8e44ad' },
  { key: 'mul', label: 'Multiplication', symbol: '×', color: '#c0392b' },
  { key: 'div', label: 'Division',       symbol: '÷', color: '#2a9d3f' },
];

function detectOp(problem) {
  if (problem.includes('+')) return 'add';
  if (problem.includes('*')) return 'mul';
  if (problem.includes('/')) return 'div';
  if (problem.includes('-')) return 'sub';
  return null;
}

function OpBreakdown({ allRows }) {
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

function LeaderboardTable({ allRows }) {
  const [sortKey, setSortKey]   = useState('avgTime');
  const [sortDir, setSortDir]   = useState('desc');
  const [search, setSearch]     = useState('');

  if (allRows.length === 0) {
    return <p className="history-empty">No question data yet.</p>;
  }

  const leaderboard = buildLeaderboard(allRows);

  // Filter by search
  const filtered = leaderboard.filter(r =>
    r.problem.toLowerCase().includes(search.toLowerCase())
  );

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    const v = a[sortKey] < b[sortKey] ? -1 : a[sortKey] > b[sortKey] ? 1 : 0;
    return sortDir === 'asc' ? v : -v;
  });

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  }

  const arrow = key => sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '';

  // Color scale for avg time across the visible set
  const times = sorted.map(r => r.avgTime);
  const lo = Math.min(...times), hi = Math.max(...times);
  function timeColor(t) {
    if (hi === lo) return '#2a9d3f';
    const ratio = (t - lo) / (hi - lo);
    if (ratio < 0.4) return '#2a9d3f';
    if (ratio < 0.7) return '#d4a017';
    return '#c0392b';
  }

  // Summary stats
  const totalAttempts = allRows.length;
  const uniqueProblems = leaderboard.length;
  const overallAvg = (allRows.reduce((a, r) => a + r.time, 0) / allRows.length).toFixed(2);
  const hardest = sorted.find(r => r.avgTime === Math.max(...leaderboard.map(x => x.avgTime)));
  const easiest = sorted.find(r => r.avgTime === Math.min(...leaderboard.map(x => x.avgTime)));

  return (
    <div className="leaderboard-wrap">
      <OpBreakdown allRows={allRows} />

      <div className="stats-bar" style={{ marginBottom: 10 }}>
        <div className="stat-chip">
          <span className="stat-label">Total Attempts</span>
          <span className="stat-value">{totalAttempts}</span>
        </div>
        <div className="stat-chip">
          <span className="stat-label">Unique Questions</span>
          <span className="stat-value">{uniqueProblems}</span>
        </div>
        <div className="stat-chip">
          <span className="stat-label">Overall Avg</span>
          <span className="stat-value">{overallAvg}s</span>
        </div>
        {hardest && (
          <div className="stat-chip">
            <span className="stat-label">Hardest</span>
            <span className="stat-value" style={{ color: '#c0392b', fontSize: 13 }}>{hardest.problem}</span>
          </div>
        )}
        {easiest && (
          <div className="stat-chip">
            <span className="stat-label">Easiest</span>
            <span className="stat-value" style={{ color: '#2a9d3f', fontSize: 13 }}>{easiest.problem}</span>
          </div>
        )}
      </div>

      <input
        className="lb-search"
        type="text"
        placeholder="Filter problems…"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      <div className="table-scroll" style={{ maxHeight: 380 }}>
        <table className="results-tbl">
          <thead>
            <tr>
              <th style={{ width: 32 }}>#</th>
              <th className="sortable" onClick={() => toggleSort('problem')}>
                Problem{arrow('problem')}
              </th>
              <th className="sortable" onClick={() => toggleSort('answer')}>
                Answer{arrow('answer')}
              </th>
              <th className="sortable" onClick={() => toggleSort('count')}>
                Seen{arrow('count')}
              </th>
              <th className="sortable" onClick={() => toggleSort('avgTime')}>
                Avg Time{arrow('avgTime')}
              </th>
              <th className="sortable" onClick={() => toggleSort('bestTime')}>
                Best{arrow('bestTime')}
              </th>
              <th className="sortable" onClick={() => toggleSort('worstTime')}>
                Worst{arrow('worstTime')}
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr key={row.problem}>
                <td className="col-num">{i + 1}</td>
                <td className="col-problem">{row.problem}</td>
                <td className="col-answer">{row.answer}</td>
                <td style={{ textAlign: 'center', color: '#555' }}>{row.count}</td>
                <td className="col-time" style={{ color: timeColor(row.avgTime) }}>
                  {row.avgTime.toFixed(3)}s
                </td>
                <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#2a9d3f' }}>
                  {row.bestTime.toFixed(3)}s
                </td>
                <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#c0392b' }}>
                  {row.worstTime.toFixed(3)}s
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── History Screen ────────────────────────────────────────────────────────────

function HistoryScreen({ onBack }) {
  const [files, setFiles]             = useState([]);
  const [selected, setSelected]       = useState(null);
  const [rows, setRows]               = useState([]);
  const [loading, setLoading]         = useState(true);
  const [tab, setTab]                 = useState('sessions');
  const [allSessions, setAllSessions] = useState([]);
  const [allRows, setAllRows]         = useState([]);

  useEffect(() => {
    async function load() {
      if (!window.electronAPI?.listCSVs) { setLoading(false); return; }
      const list = await window.electronAPI.listCSVs();
      setFiles(list);

      // Load all sessions oldest→newest for the progress chart and leaderboard
      const summaries = [];
      const rowsAccum = [];
      for (const f of [...list].reverse()) {
        const content = await window.electronAPI.readCSV(f);
        if (!content) continue;
        const parsed = parseCSV(content);
        if (parsed.length === 0) continue;
        const avg = parsed.reduce((a, r) => a + r.time, 0) / parsed.length;
        const match = f.match(/zetamac_(\d{4}-\d{2}-\d{2})T(\d{2}-\d{2})/);
        const shortDate = match ? `${match[1].slice(5)} ${match[2].replace('-', ':')}` : f;
        summaries.push({ filename: f, score: parsed.length, avgTime: avg, shortDate });
        rowsAccum.push(...parsed);
      }
      setAllSessions(summaries);
      setAllRows(rowsAccum);

      if (list.length > 0) await selectFile(list[0]);
      setLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function selectFile(filename) {
    setSelected(filename);
    if (window.electronAPI?.readCSV) {
      const content = await window.electronAPI.readCSV(filename);
      if (content) setRows(parseCSV(content));
    }
  }

  const score = rows.length;
  const avg   = rows.length
    ? (rows.reduce((a, r) => a + r.time, 0) / rows.length).toFixed(2)
    : '—';

  return (
    <div id="history-screen">
      <div className="history-header">
        <h2>Session History</h2>
        <div className="history-tabs">
          <button className={`tab-btn ${tab === 'sessions' ? 'active' : ''}`}
            onClick={() => setTab('sessions')}>Sessions</button>
          <button className={`tab-btn ${tab === 'progress' ? 'active' : ''}`}
            onClick={() => setTab('progress')}>Progress</button>
          <button className={`tab-btn ${tab === 'leaderboard' ? 'active' : ''}`}
            onClick={() => setTab('leaderboard')}>Leaderboard</button>
        </div>
        <button className="back-btn" onClick={onBack}>← Back</button>
      </div>

      {loading && <p className="history-empty">Loading…</p>}

      {!loading && files.length === 0 && (
        <p className="history-empty">No saved sessions yet. Complete a game with auto-save on!</p>
      )}

      {!loading && files.length > 0 && tab === 'sessions' && (
        <div className="history-layout">
          <div className="history-sidebar">
            {files.map(f => (
              <button key={f}
                className={`session-item ${f === selected ? 'active' : ''}`}
                onClick={() => selectFile(f)}>
                <span className="session-date">{formatFilename(f)}</span>
              </button>
            ))}
          </div>
          <div className="history-detail">
            {selected && (
              <>
                <div className="detail-title">{formatFilename(selected)}</div>
                <div className="detail-meta">
                  Score: <strong>{score}</strong> &nbsp;|&nbsp; Avg: <strong>{avg}s</strong>
                </div>
                <ResultsTable rows={rows} />
              </>
            )}
          </div>
        </div>
      )}

      {!loading && files.length > 0 && tab === 'progress' && (
        <div className="progress-tab">
          <ProgressChart sessions={allSessions} />
        </div>
      )}

      {!loading && tab === 'leaderboard' && (
        <div className="progress-tab">
          <LeaderboardTable allRows={allRows} />
        </div>
      )}
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────

const App = () => {
  const [gameState, setGameState] = useState('menu'); // menu | playing | result | history

  const [settings, setSettings] = useState({
    add: true, addMin1: 2, addMax1: 100, addMin2: 2, addMax2: 100,
    sub: true,
    mul: true, mulMin1: 2, mulMax1: 12, mulMin2: 2, mulMax2: 100,
    div: true,
    duration: 120,
    autosave: true
  });

  const [score, setScore] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(120);
  const [currentProblem, setCurrentProblem] = useState('');
  const [currentAnswer, setCurrentAnswer] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [problemLog, setProblemLog] = useState([]);
  const [copyText, setCopyText] = useState('Copy TSV');

  const timerRef = useRef(null);
  const problemStartTimeRef = useRef(0);
  const inputRef = useRef(null);
  const csvOutputRef = useRef(null);

  const handleSettingChange = (e) => {
    const { id, type, checked, value } = e.target;
    setSettings((prev) => ({
      ...prev,
      [id]: type === 'checkbox' ? checked : parseInt(value) || 0
    }));
  };

  const generateProblem = useCallback(() => {
    const operations = [];
    if (settings.add) operations.push('add');
    if (settings.sub) operations.push('sub');
    if (settings.mul) operations.push('mul');
    if (settings.div) operations.push('div');

    if (operations.length === 0) return false;

    const op = operations[Math.floor(Math.random() * operations.length)];
    let probString = '';
    let ans = 0;

    if (op === 'add') {
      const a = Math.floor(Math.random() * (settings.addMax1 - settings.addMin1 + 1)) + settings.addMin1;
      const b = Math.floor(Math.random() * (settings.addMax2 - settings.addMin2 + 1)) + settings.addMin2;
      probString = `${a} + ${b}`;
      ans = a + b;
    } else if (op === 'sub') {
      const a = Math.floor(Math.random() * (settings.addMax1 - settings.addMin1 + 1)) + settings.addMin1;
      const b = Math.floor(Math.random() * (settings.addMax2 - settings.addMin2 + 1)) + settings.addMin2;
      probString = `${a + b} - ${a}`;
      ans = b;
    } else if (op === 'mul') {
      const a = Math.floor(Math.random() * (settings.mulMax1 - settings.mulMin1 + 1)) + settings.mulMin1;
      const b = Math.floor(Math.random() * (settings.mulMax2 - settings.mulMin2 + 1)) + settings.mulMin2;
      probString = `${a} * ${b}`;
      ans = a * b;
    } else if (op === 'div') {
      const a = Math.floor(Math.random() * (settings.mulMax1 - settings.mulMin1 + 1)) + settings.mulMin1;
      const b = Math.floor(Math.random() * (settings.mulMax2 - settings.mulMin2 + 1)) + settings.mulMin2;
      probString = `${a * b} / ${a}`;
      ans = b;
    }

    setCurrentProblem(probString);
    setCurrentAnswer(ans);
    problemStartTimeRef.current = performance.now();
    return true;
  }, [settings]);

  const startGame = () => {
    const operations = [];
    if (settings.add) operations.push('add');
    if (settings.sub) operations.push('sub');
    if (settings.mul) operations.push('mul');
    if (settings.div) operations.push('div');

    if (operations.length === 0) {
      alert('Please select at least one operation.');
      return;
    }

    setScore(0);
    setTimeRemaining(settings.duration);
    setProblemLog([]);
    setInputValue('');
    setCopyText('Copy TSV');

    if (generateProblem()) {
      setGameState('playing');
      const endTime = Date.now() + settings.duration * 1000;

      timerRef.current = setInterval(() => {
        const remaining = Math.ceil((endTime - Date.now()) / 1000);
        if (remaining <= 0) {
          endGame();
        } else {
          setTimeRemaining(remaining);
        }
      }, 100);
    }
  };

  const endGame = useCallback(() => {
    clearInterval(timerRef.current);
    setTimeRemaining(0);
    setGameState('result');
  }, []);

  useEffect(() => {
    return () => clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    if (gameState === 'playing' && inputRef.current) {
      inputRef.current.focus();
    } else if (gameState === 'result' && settings.autosave) {
      downloadCSV();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, settings.autosave]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputValue(val);

    if (parseInt(val) === currentAnswer) {
      const timeSpentMs = performance.now() - problemStartTimeRef.current;
      const timeSpentSec = (timeSpentMs / 1000).toFixed(3);

      setProblemLog((prev) => [
        ...prev,
        { problem: currentProblem, answer: currentAnswer, time: parseFloat(timeSpentSec) }
      ]);
      setScore((prev) => prev + 1);
      setInputValue('');
      generateProblem();
    }
  };

  const generateTSVContent = () => {
    let tsvString = 'Problem\tCorrect Answer\tTime Spent (Seconds)\n';
    problemLog.forEach((log) => {
      tsvString += `'${log.problem}\t${log.answer}\t${log.time}\n`;
    });
    return tsvString;
  };

  const generateCSVContent = () => {
    let csvString = 'Problem,Correct Answer,Time Spent (Seconds)\n';
    problemLog.forEach((log) => {
      csvString += `'${log.problem},${log.answer},${log.time}\n`;
    });
    return csvString;
  };

  const copyData = () => {
    if (csvOutputRef.current) {
      csvOutputRef.current.select();
      document.execCommand('copy');
      setCopyText('Copied!');
    }
  };

  const downloadCSV = () => {
    if (problemLog.length === 0) return;

    const csvData = generateCSVContent();
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `zetamac_${dateStr}.csv`;

    if (window.electronAPI) {
      window.electronAPI.saveCSV(fileName, csvData);
    } else {
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const resetGame = () => setGameState('menu');

  // ── Render ──────────────────────────────────────────────────────────────────

  if (gameState === 'history') {
    return <HistoryScreen onBack={resetGame} />;
  }

  return (
    <>
      {/* ── Menu ── */}
      {gameState === 'menu' && (
        <div id="menu-container">
          <h1>Arithmetic Game</h1>
          <p className="description">
            The Arithmetic Game is a fast-paced speed drill where you are given two minutes
            to solve as many arithmetic problems as you can.
          </p>
          <p className="contact">
            If you have any questions, please contact <br/><a href="#">arithmetic@zetamac.com</a>.
          </p>

          <div className="option-group">
            <input type="checkbox" id="add" checked={settings.add} onChange={handleSettingChange} />
            <label htmlFor="add" className="option-text">Addition</label>
          </div>
          <div className="range-options">
            Range: ( 
            <input type="number" id="addMin1" value={settings.addMin1} onChange={handleSettingChange} /> to 
            <input type="number" id="addMax1" value={settings.addMax1} onChange={handleSettingChange} /> ) + ( 
            <input type="number" id="addMin2" value={settings.addMin2} onChange={handleSettingChange} /> to 
            <input type="number" id="addMax2" value={settings.addMax2} onChange={handleSettingChange} /> )
          </div>

          <div className="option-group">
            <input type="checkbox" id="sub" checked={settings.sub} onChange={handleSettingChange} />
            <label htmlFor="sub" className="option-text">Subtraction</label>
          </div>
          <div className="range-options">Addition problems in reverse.</div>

          <div className="option-group">
            <input type="checkbox" id="mul" checked={settings.mul} onChange={handleSettingChange} />
            <label htmlFor="mul" className="option-text">Multiplication</label>
          </div>
          <div className="range-options">
            Range: ( 
            <input type="number" id="mulMin1" value={settings.mulMin1} onChange={handleSettingChange} /> to 
            <input type="number" id="mulMax1" value={settings.mulMax1} onChange={handleSettingChange} /> ) * ( 
            <input type="number" id="mulMin2" value={settings.mulMin2} onChange={handleSettingChange} /> to 
            <input type="number" id="mulMax2" value={settings.mulMax2} onChange={handleSettingChange} /> )
          </div>

          <div className="option-group">
            <input type="checkbox" id="div" checked={settings.div} onChange={handleSettingChange} />
            <label htmlFor="div" className="option-text">Division</label>
          </div>
          <div className="range-options">Multiplication problems in reverse.</div>

          <div className="duration-group">
            Duration: 
            <select id="duration" value={settings.duration} onChange={handleSettingChange}>
              <option value="120">120 seconds</option>
            </select>
          </div>

          <div className="divider" />

          <div className="save-group">
            <input type="checkbox" id="autosave" checked={settings.autosave} onChange={handleSettingChange} />
            <label htmlFor="autosave" className="option-text">Auto-save results to .csv on completion</label>
          </div>

          <div className="menu-footer-btns">
            {window.electronAPI?.listCSVs && (
              <button id="history-btn" onClick={() => setGameState('history')}>View History</button>
            )}
            <button id="start-btn" onClick={startGame}>Start</button>
          </div>
        </div>
      )}

      {/* ── Game ── */}
      {gameState === 'playing' && (
        <div id="game-container">
          <div className="hud">
            <div>Seconds left: <span id="timer-display">{timeRemaining}</span></div>
            <div>Score: <span id="score-display">{score}</span></div>
          </div>
          <div id="problem-area">
            <span id="problem-text">{currentProblem} =</span>
            <input
              type="text"
              id="answer-input"
              autoComplete="off"
              ref={inputRef}
              value={inputValue}
              onChange={handleInputChange}
            />
          </div>
        </div>
      )}

      {/* ── Result ── */}
      {gameState === 'result' && (
        <div id="result-screen">
          <h2>Time's Up!</h2>
          <p>Your score: <strong id="final-score">{score}</strong></p>

          {/* Interactive data table */}
          <ResultsTable rows={problemLog} />

          {/* Collapsible raw data (hidden textarea for copy) */}
          <details className="raw-data-details">
            <summary>Raw TSV (paste into Sheets)</summary>
            <div className="csv-container">
              <textarea
                id="csv-output"
                readOnly
                ref={csvOutputRef}
                value={generateTSVContent()}
              />
            </div>
          </details>

          <div className="action-buttons">
            <button id="copy-csv-btn" onClick={copyData}>{copyText}</button>
            <button id="download-csv-btn" onClick={downloadCSV}>Download .CSV</button>
            <button id="play-again-btn" onClick={resetGame}>Play Again</button>
          </div>
        </div>
      )}
    </>
  );
};

export default App;
