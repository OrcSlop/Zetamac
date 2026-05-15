import React from 'react';

export function AllTimeStats({ sessions, onSelectSession }) {
  if (!sessions || sessions.length === 0) return null;

  const allIntervals = { 15: null, 30: null, 60: null, 120: null };
  const allMilestones = { 10: null, 25: null, 50: null, 100: null };

  for (const s of sessions) {
    if (s.intervalRecords) {
      for (const T of [15, 30, 60, 120]) {
        const val = s.intervalRecords[T];
        if (val !== undefined) {
          if (!allIntervals[T] || val > allIntervals[T].val) {
            allIntervals[T] = { val, session: s.filename, shortDate: s.shortDate };
          }
        }
      }
    }
    if (s.milestoneRecords) {
      for (const K of [10, 25, 50, 100]) {
        const val = s.milestoneRecords[K];
        if (val !== null) {
          if (!allMilestones[K] || val < allMilestones[K].val) {
            allMilestones[K] = { val, session: s.filename, shortDate: s.shortDate };
          }
        }
      }
    }
  }

  return (
    <div className="adv-stats-wrap">
      <div className="adv-stats-section">
        <h3 className="adv-stats-title">All-Time Interval Records (Max Qs)</h3>
        <div className="stats-bar">
          {[15, 30, 60, 120].map(T => {
            const rec = allIntervals[T];
            return (
              <div className="stat-chip" key={T} style={{ minHeight: '60px', paddingBottom: '8px' }}>
                <span className="stat-label">{T}s Interval</span>
                <span className="stat-value" style={{ color: '#1a6bb5' }}>
                  {rec ? rec.val : '0'}
                </span>
                {rec && (
                  <button onClick={() => onSelectSession(rec.session)} style={{ fontSize: '10px', marginTop: '4px', background: 'none', border: 'none', color: '#888', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>
                    {rec.shortDate}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="adv-stats-section">
        <h3 className="adv-stats-title">All-Time Milestone Records (Fastest Time)</h3>
        <div className="stats-bar">
          {[10, 25, 50, 100].map(K => {
            const rec = allMilestones[K];
            return (
              <div className="stat-chip" key={K} style={{ minHeight: '60px', paddingBottom: '8px' }}>
                <span className="stat-label">{K} Questions</span>
                <span className="stat-value" style={{ color: rec ? '#c0392b' : '#999' }}>
                  {rec ? `${rec.val.toFixed(2)}s` : 'N/A'}
                </span>
                {rec && (
                  <button onClick={() => onSelectSession(rec.session)} style={{ fontSize: '10px', marginTop: '4px', background: 'none', border: 'none', color: '#888', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>
                    {rec.shortDate}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
