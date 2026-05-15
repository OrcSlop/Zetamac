import React, { useState } from 'react';
import { buildLeaderboard } from '../utils/helpers';
import { OpBreakdown } from './OpBreakdown';

export function LeaderboardTable({ allRows }) {
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
