export function parseCSV(csv) {
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

export function formatFilename(filename) {
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

export function buildLeaderboard(allRows) {
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

export function detectOp(problem) {
  if (problem.includes('+')) return 'add';
  if (problem.includes('*')) return 'mul';
  if (problem.includes('/')) return 'div';
  if (problem.includes('-')) return 'sub';
  return null;
}

export function calculateIntervalRecords(times, intervals) {
  const cumul = [];
  let sum = 0;
  for (let t of times) {
    sum += t;
    cumul.push(sum);
  }

  const results = {};
  for (let T of intervals) {
    let maxQs = 0;
    let left = 0;
    for (let right = 0; right < cumul.length; right++) {
      let totalTime = cumul[right] - (left > 0 ? cumul[left - 1] : 0);
      while (totalTime > T && left <= right) {
        left++;
        totalTime = cumul[right] - (left > 0 ? cumul[left - 1] : 0);
      }
      if (totalTime <= T) {
        maxQs = Math.max(maxQs, right - left + 1);
      }
    }
    results[T] = maxQs;
  }
  return results;
}

export function calculateMilestoneRecords(times, milestones) {
  const cumul = [];
  let sum = 0;
  for (let t of times) {
    sum += t;
    cumul.push(sum);
  }

  const results = {};
  for (let K of milestones) {
    if (times.length < K) {
      results[K] = null;
      continue;
    }
    let minTime = Infinity;
    for (let i = K - 1; i < cumul.length; i++) {
      const timeTaken = cumul[i] - (i - K >= 0 ? cumul[i - K] : 0);
      if (timeTaken < minTime) minTime = timeTaken;
    }
    results[K] = minTime;
  }
  return results;
}
