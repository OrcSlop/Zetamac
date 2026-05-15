import React from 'react';
import { calculateIntervalRecords, calculateMilestoneRecords } from '../utils/helpers';

export function SessionAdvancedStats({ rows }) {
  if (!rows || rows.length === 0) return null;

  const times = rows.map(r => r.time);
  
  const intervals = [15, 30, 60, 120];
  const intervalRecords = calculateIntervalRecords(times, intervals);

  const milestones = [10, 25, 50, 100];
  const milestoneRecords = calculateMilestoneRecords(times, milestones);

  return (
    <div className="adv-stats-wrap">
      <div className="adv-stats-section">
        <h3 className="adv-stats-title">Interval Records (Max Qs)</h3>
        <div className="stats-bar">
          {intervals.map(T => (
            <div className="stat-chip" key={T}>
              <span className="stat-label">{T}s Interval</span>
              <span className="stat-value" style={{ color: '#1a6bb5' }}>
                {intervalRecords[T]}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="adv-stats-section">
        <h3 className="adv-stats-title">Milestone Records (Fastest Time)</h3>
        <div className="stats-bar">
          {milestones.map(K => (
            <div className="stat-chip" key={K}>
              <span className="stat-label">{K} Questions</span>
              <span className="stat-value" style={{ color: milestoneRecords[K] !== null ? '#c0392b' : '#999' }}>
                {milestoneRecords[K] !== null ? `${milestoneRecords[K].toFixed(2)}s` : 'N/A'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
