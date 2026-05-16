import React, { useState, useEffect } from 'react';
import { parseCSV, formatFilename, calculateIntervalRecords, calculateMilestoneRecords } from '../utils/helpers';
import { ResultsTable } from '../components/ResultsTable';
import { ProgressChart } from '../components/ProgressChart';
import { LeaderboardTable } from '../components/LeaderboardTable';
import { SessionSpeedChart } from '../components/SessionSpeedChart';
import { SessionAdvancedStats } from '../components/SessionAdvancedStats';
import { AllTimeStats } from '../components/AllTimeStats';

export function HistoryScreen({ onBack }) {
  const [files, setFiles]             = useState([]);
  const [selected, setSelected]       = useState(null);
  const [loading, setLoading]         = useState(true);
  const [tab, setTab]                 = useState('sessions');
  const [allSessions, setAllSessions] = useState([]);
  const [allRows, setAllRows]         = useState([]);

  useEffect(() => {
    async function load() {
      if (!window.electronAPI?.listCSVs) { setLoading(false); return; }
      const list = await window.electronAPI.listCSVs();
      setFiles(list);

      // Load all sessions oldest→newest
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
        
        const times = parsed.map(r => r.time);
        const intervalRecords = calculateIntervalRecords(times, [15, 30, 60, 120]);
        const milestoneRecords = calculateMilestoneRecords(times, [10, 25, 50, 100]);
        
        summaries.push({ 
          filename: f, 
          score: parsed.length, 
          avgTime: avg, 
          shortDate,
          intervalRecords,
          milestoneRecords,
          rows: parsed 
        });
        rowsAccum.push(...parsed);
      }
      setAllSessions(summaries);
      setAllRows(rowsAccum);

      if (list.length > 0) {
        setSelected('all-time');
      }
      setLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const displayRows = selected === 'all-time' 
    ? allRows 
    : (allSessions.find(s => s.filename === selected)?.rows || []);

  const score = displayRows.length;
  const avg   = displayRows.length
    ? (displayRows.reduce((a, r) => a + r.time, 0) / displayRows.length).toFixed(2)
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
            <button
              className={`session-item ${selected === 'all-time' ? 'active' : ''}`}
              onClick={() => setSelected('all-time')}
              style={{ fontWeight: 'bold', background: selected === 'all-time' ? '#eef2f5' : '#f8f9fa' }}>
              <span className="session-date">All-Time Overview</span>
            </button>
            {files.map(f => (
              <button key={f}
                className={`session-item ${f === selected ? 'active' : ''}`}
                onClick={() => setSelected(f)}>
                <span className="session-date">{formatFilename(f)}</span>
              </button>
            ))}
          </div>
          <div className="history-detail">
            {selected === 'all-time' && (
              <>
                <div className="detail-title">All-Time Statistics</div>
                <div className="detail-meta">
                  Total Sessions: <strong>{allSessions.length}</strong> &nbsp;|&nbsp; Total Questions: <strong>{score}</strong> &nbsp;|&nbsp; Lifetime Avg: <strong>{avg}s</strong>
                </div>
                <SessionSpeedChart rows={displayRows} />
                <AllTimeStats sessions={allSessions} onSelectSession={setSelected} />
              </>
            )}
            
            {selected !== 'all-time' && selected && (
              <>
                <div className="detail-title">{formatFilename(selected)}</div>
                <div className="detail-meta">
                  Score: <strong>{score}</strong> &nbsp;|&nbsp; Avg: <strong>{avg}s</strong>
                </div>
                <SessionSpeedChart rows={displayRows} />
                <SessionAdvancedStats rows={displayRows} />
                <ResultsTable rows={displayRows} />
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
