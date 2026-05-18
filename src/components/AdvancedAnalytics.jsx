import { useMemo } from 'react';

export function AdvancedAnalytics({ allSessions, allRows }) {

  // 1. Moving Averages & Achievements Calculations
  const metrics = useMemo(() => {
    if (allSessions.length === 0) return null;

    // Sort summaries oldest to newest by extracting dates
    const sortedSessions = [...allSessions].sort((a, b) => {
      const getMs = (filename) => {
        const m = filename.match(/zetamac_(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})/);
        return m ? new Date(`${m[1]}T${m[2]}:${m[3]}:${m[4]}`).getTime() : 0;
      };
      return getMs(a.filename) - getMs(b.filename);
    });

    // Extract last session date
    const lastSession = sortedSessions[sortedSessions.length - 1];
    const lastFilenameMatch = lastSession.filename.match(/zetamac_(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})/);
    const lastSessionMs = lastFilenameMatch 
      ? new Date(`${lastFilenameMatch[1]}T${lastFilenameMatch[2]}:${lastFilenameMatch[3]}:${lastFilenameMatch[4]}`).getTime()
      : 1770000000000;

    const msInDay = 24 * 60 * 60 * 1000;
    const ms7DaysAgo = lastSessionMs - 7 * msInDay;
    const ms30DaysAgo = lastSessionMs - 30 * msInDay;

    const s7 = [];
    const s30 = [];

    sortedSessions.forEach(s => {
      const m = s.filename.match(/zetamac_(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})/);
      const sMs = m ? new Date(`${m[1]}T${m[2]}:${m[3]}:${m[4]}`).getTime() : 0;
      if (sMs >= ms7DaysAgo) s7.push(s);
      if (sMs >= ms30DaysAgo) s30.push(s);
    });

    const calcAvgScore = (list) => list.length ? (list.reduce((sum, s) => sum + s.score, 0) / list.length).toFixed(1) : '—';
    const calcAvgSpeed = (list) => {
      const listRows = list.flatMap(s => s.rows);
      return listRows.length ? (listRows.reduce((sum, r) => sum + r.time, 0) / listRows.length).toFixed(2) + 's' : '—';
    };

    // Calculate milestones
    const extractMilestone = (K) => {
      const validTimes = allSessions
        .map(s => s.milestoneRecords?.[K])
        .filter(v => v !== null && v !== undefined && v > 0);
      return validTimes.length ? Math.min(...validTimes).toFixed(2) + 's' : '—';
    };

    return {
      avg7Score: calcAvgScore(s7),
      avg7Speed: calcAvgSpeed(s7),
      avg30Score: calcAvgScore(s30),
      avg30Speed: calcAvgSpeed(s30),
      best10: extractMilestone(10),
      best25: extractMilestone(25),
      best50: extractMilestone(50),
      best100: extractMilestone(100)
    };
  }, [allSessions]);

  // 2. Speed Distribution Histogram
  const speedDistribution = useMemo(() => {
    if (allRows.length === 0) return null;

    let sub1s = 0;
    let fluid = 0;
    let lagging = 0;
    let brainFreeze = 0;
    let stuck = 0;

    allRows.forEach(r => {
      const t = r.time;
      if (t < 1.0) sub1s++;
      else if (t < 2.0) fluid++;
      else if (t < 3.0) lagging++;
      else if (t < 5.0) brainFreeze++;
      else stuck++;
    });

    const total = allRows.length;
    const getPct = (cnt) => total ? ((cnt / total) * 100).toFixed(1) : '0.0';

    return [
      { key: 'sub1s', label: 'Sub-1s', count: sub1s, pct: getPct(sub1s), color: '#2a9d3f' },
      { key: 'fluid', label: '1s - 2s', count: fluid, pct: getPct(fluid), color: '#57bb6d' },
      { key: 'lagging', label: '2s - 3s', count: lagging, pct: getPct(lagging), color: '#f3b43f' },
      { key: 'brainFreeze', label: '3s - 5s', count: brainFreeze, pct: getPct(brainFreeze), color: '#e67e22' },
      { key: 'stuck', label: '> 5s', count: stuck, pct: getPct(stuck), color: '#e74c3c' }
    ];
  }, [allRows]);

  // 3. Fatigue & Session Pacing Curve
  const pacingData = useMemo(() => {
    if (allSessions.length === 0) return null;

    const q1Times = [];
    const q2Times = [];
    const q3Times = [];
    const q4Times = [];

    allSessions.forEach(s => {
      let cumul = 0;
      s.rows.forEach(r => {
        cumul += r.time;
        if (cumul <= 30) q1Times.push(r.time);
        else if (cumul <= 60) q2Times.push(r.time);
        else if (cumul <= 90) q3Times.push(r.time);
        else if (cumul <= 120) q4Times.push(r.time);
      });
    });

    const calcAvg = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

    const avgQ1 = calcAvg(q1Times);
    const avgQ2 = calcAvg(q2Times);
    const avgQ3 = calcAvg(q3Times);
    const avgQ4 = calcAvg(q4Times);

    let decayPct = '—';
    if (avgQ1 && avgQ4) {
      decayPct = (((avgQ4 - avgQ1) / avgQ1) * 100).toFixed(1) + '%';
    }

    return {
      q1: avgQ1,
      q2: avgQ2,
      q3: avgQ3,
      q4: avgQ4,
      decayPct
    };
  }, [allSessions]);



  return (
    <div className="advanced-analytics-container">
      
      {/* ── SECTION 1: Moving Averages & Milestones ── */}
      {metrics && (
        <div className="analytics-card-grid">
          <div className="analytics-card moving-averages-card">
            <h3 className="card-title">Performance Moving Averages</h3>
            <div className="pacing-metrics-subgrid">
              <div className="metric-chip">
                <span className="metric-lbl">7-Day Score Avg</span>
                <span className="metric-val text-bold">{metrics.avg7Score}</span>
              </div>
              <div className="metric-chip">
                <span className="metric-lbl">7-Day Speed Avg</span>
                <span className="metric-val text-bold">{metrics.avg7Speed}</span>
              </div>
              <div className="metric-chip">
                <span className="metric-lbl">30-Day Score Avg</span>
                <span className="metric-val text-bold">{metrics.avg30Score}</span>
              </div>
              <div className="metric-chip">
                <span className="metric-lbl">30-Day Speed Avg</span>
                <span className="metric-val text-bold">{metrics.avg30Speed}</span>
              </div>
            </div>
            <p className="card-footnote">Calculated over your last active session dates.</p>
          </div>

          <div className="analytics-card achievement-milestones-card">
            <h3 className="card-title">All-Time Pacing Milestones</h3>
            <div className="pacing-metrics-subgrid">
              <div className="milestone-medal">
                <div className="medal-info">
                  <span className="medal-lbl">Fastest 10</span>
                  <span className="medal-val">{metrics.best10}</span>
                </div>
              </div>
              <div className="milestone-medal">
                <div className="medal-info">
                  <span className="medal-lbl">Fastest 25</span>
                  <span className="medal-val">{metrics.best25}</span>
                </div>
              </div>
              <div className="milestone-medal">
                <div className="medal-info">
                  <span className="medal-lbl">Fastest 50</span>
                  <span className="medal-val">{metrics.best50}</span>
                </div>
              </div>
              <div className="milestone-medal font-gold">
                <div className="medal-info">
                  <span className="medal-lbl">Fastest 100</span>
                  <span className="medal-val">{metrics.best100}</span>
                </div>
              </div>
            </div>
            <p className="card-footnote">Your absolute fastest consecutive speed records.</p>
          </div>
        </div>
      )}

      {/* ── SECTION 2: Speed Distribution & Fatigue Curve ── */}
      <div className="analytics-card-grid two-columns">
        
        {/* Speed Distribution Bucket */}
        {speedDistribution && (
          <div className="analytics-card speed-dist-card">
            <h3 className="card-title">Speed Distribution</h3>
            <div className="ratio-stacked-bar">
              {speedDistribution.map(bucket => parseFloat(bucket.pct) > 0 && (
                <div 
                  key={bucket.key}
                  className="bar-slice" 
                  style={{ width: `${bucket.pct}%`, backgroundColor: bucket.color }}
                  title={`${bucket.label}: ${bucket.pct}%`}
                />
              ))}
            </div>
            <div className="ratio-bar-legend">
              {speedDistribution.map(bucket => (
                <div key={bucket.key} className="legend-item">
                  <span className="legend-dot" style={{ backgroundColor: bucket.color }} />
                  <span className="legend-label">{bucket.label}: <strong>{bucket.count}</strong> ({bucket.pct}%)</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fatigue & Pacing Index */}
        {pacingData && (
          <div className="analytics-card fatigue-card">
            <h3 className="card-title">Session Fatigue Curve</h3>
            <div className="fatigue-metrics-bar">
              <div className="decay-index">
                <span className="decay-lbl">Fatigue Decay Rate:</span>
                <span className="decay-val font-red">{pacingData.decayPct}</span>
              </div>
              <p className="decay-desc">Measures how much your speed slows down from Q1 to Q4.</p>
            </div>
            <div className="fatigue-pacing-chart">
              <div className="chart-bar-container">
                <div className="chart-bar" style={{ height: `${Math.min(100, (pacingData.q1 ? (2.0 / pacingData.q1) * 60 : 20))}%` }}>
                  <span className="chart-val">{pacingData.q1 ? pacingData.q1.toFixed(2) + 's' : '—'}</span>
                </div>
                <span className="chart-lbl">Q1 (0-30s)</span>
              </div>
              <div className="chart-bar-container">
                <div className="chart-bar" style={{ height: `${Math.min(100, (pacingData.q2 ? (2.0 / pacingData.q2) * 60 : 20))}%` }}>
                  <span className="chart-val">{pacingData.q2 ? pacingData.q2.toFixed(2) + 's' : '—'}</span>
                </div>
                <span className="chart-lbl">Q2 (30-60s)</span>
              </div>
              <div className="chart-bar-container">
                <div className="chart-bar" style={{ height: `${Math.min(100, (pacingData.q3 ? (2.0 / pacingData.q3) * 60 : 20))}%` }}>
                  <span className="chart-val">{pacingData.q3 ? pacingData.q3.toFixed(2) + 's' : '—'}</span>
                </div>
                <span className="chart-lbl">Q3 (60-90s)</span>
              </div>
              <div className="chart-bar-container">
                <div className="chart-bar" style={{ height: `${Math.min(100, (pacingData.q4 ? (2.0 / pacingData.q4) * 60 : 20))}%` }}>
                  <span className="chart-val">{pacingData.q4 ? pacingData.q4.toFixed(2) + 's' : '—'}</span>
                </div>
                <span className="chart-lbl">Q4 (90-120s)</span>
              </div>
            </div>
          </div>
        )}
      </div>



    </div>
  );
}
