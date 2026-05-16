import React from 'react';
import App from '../App.jsx'
 import {HistoryScreen} from '../screens/HistoryScreen.jsx'
import {SessionSpeedChart} from './SessionSpeedChart.jsx'

export function ResultsTable({ rows }) {
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
        if (view === 'app') return <App />;
  if (view === 'history') return <HistoryScreen />;
  if (view === 'sessionChart') return <SessionSpeedChart />;

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button onClick={() => setView('app')}>Back to App</button>
        <button onClick={() => setView('history')}>History</button>
        <button onClick={() => setView('sessionChart')}>Session Speed Chart</button>
      </div>
      {tableView}
    </div>
  );

}
