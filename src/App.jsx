import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';

import { HistoryScreen } from './screens/HistoryScreen';
import {SessionSpeedChart} from './components/SessionSpeedChart.jsx'
import { ResultsTable } from './components/ResultsTable';
import { parseCSV } from './utils/helpers';

// ── Main App ──────────────────────────────────────────────────────────────────

const App = () => {
  const [gameState, setGameState] = useState('menu'); // menu | playing | result
  const [view, setView] = useState('app'); // app | history | sessionChart
  const [roomSeed, setRoomSeed] = useState('');

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
  const randomStreamRef = useRef(null);
  const inputRef = useRef(null);
  const csvOutputRef = useRef(null);

  // All-time stats state loaded from files
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [historyStats, setHistoryStats] = useState({
    globalAverageTime: null,
    longestQuestions: [],
    totalQuestionsSolved: 0
  });

  // Practice Mode states
  const [isPracticeMode, setIsPracticeMode] = useState(false);
  const [practiceQueue, setPracticeQueue] = useState([]);
  const [masteredList, setMasteredList] = useState([]);
  const [totalPracticeCount, setTotalPracticeCount] = useState(0);
  const [targetTime, setTargetTime] = useState(null);
  const [currentQuestionElapsedTime, setCurrentQuestionElapsedTime] = useState(0);
  const [practiceToast, setPracticeToast] = useState(null);
  const [practiceStartTime, setPracticeStartTime] = useState(null);
  const [practiceTotalDuration, setPracticeTotalDuration] = useState(0);

  const practiceTimerIntervalRef = useRef(null);
  const toastTimeoutRef = useRef(null);

  const handleSettingChange = (e) => {
    const { id, type, checked, value } = e.target;
    setSettings((prev) => ({
      ...prev,
      [id]: type === 'checkbox' ? checked : parseInt(value) || 0
    }));
  };
  const createRandomStream = (seedString) => {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < seedString.length; i++) {
      h = Math.imul(h ^ seedString.charCodeAt(i), 16777619);
    }
    
    return function() {
      let t = h += 0x6D2B79F5;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  const generateProblem = useCallback(() => {
    const operations = [];
    if (settings.add) operations.push('add');
    if (settings.sub) operations.push('sub');
    if (settings.mul) operations.push('mul');
    if (settings.div) operations.push('div');

    if (operations.length === 0) return false;

    const getRandom = randomStreamRef.current || Math.random;

    const op = operations[Math.floor(getRandom() * operations.length)];
    let probString = '';
    let ans = 0;

    if (op === 'add') {
      const a = Math.floor(getRandom() * (settings.addMax1 - settings.addMin1 + 1)) + settings.addMin1;
      const b = Math.floor(getRandom() * (settings.addMax2 - settings.addMin2 + 1)) + settings.addMin2;
      probString = `${a} + ${b}`;
      ans = a + b;
    } else if (op === 'sub') {
      const a = Math.floor(getRandom() * (settings.addMax1 - settings.addMin1 + 1)) + settings.addMin1;
      const b = Math.floor(getRandom() * (settings.addMax2 - settings.addMin2 + 1)) + settings.addMin2;
      probString = `${a + b} - ${a}`;
      ans = b;
    } else if (op === 'mul') {
      const a = Math.floor(getRandom() * (settings.mulMax1 - settings.mulMin1 + 1)) + settings.mulMin1;
      const b = Math.floor(getRandom() * (settings.mulMax2 - settings.mulMin2 + 1)) + settings.mulMin2;
      probString = `${a} * ${b}`;
      ans = a * b;
    } else if (op === 'div') {
      const a = Math.floor(getRandom() * (settings.mulMax1 - settings.mulMin1 + 1)) + settings.mulMin1;
      const b = Math.floor(getRandom() * (settings.mulMax2 - settings.mulMin2 + 1)) + settings.mulMin2;
      probString = `${a * b} / ${a}`;
      ans = b;
    }

    setCurrentProblem(probString);
    setCurrentAnswer(ans);
    problemStartTimeRef.current = performance.now();
    return true;
  }, [settings]);

  const generateDefaultPracticeQueue = useCallback(() => {
    const queue = [];
    const seen = new Set();
    const operations = [];
    if (settings.add) operations.push('add');
    if (settings.sub) operations.push('sub');
    if (settings.mul) operations.push('mul');
    if (settings.div) operations.push('div');
    
    if (operations.length === 0) {
      operations.push('add', 'mul');
    }
    
    const getRandom = Math.random;
    let attempts = 0;
    while (queue.length < 10 && attempts < 150) {
      attempts++;
      const op = operations[Math.floor(getRandom() * operations.length)];
      let probString = '';
      let ans = 0;
      
      if (op === 'add') {
        const a = Math.floor(getRandom() * (settings.addMax1 - settings.addMin1 + 1)) + settings.addMin1;
        const b = Math.floor(getRandom() * (settings.addMax2 - settings.addMin2 + 1)) + settings.addMin2;
        probString = `${a} + ${b}`;
        ans = a + b;
      } else if (op === 'sub') {
        const a = Math.floor(getRandom() * (settings.addMax1 - settings.addMin1 + 1)) + settings.addMin1;
        const b = Math.floor(getRandom() * (settings.addMax2 - settings.addMin2 + 1)) + settings.addMin2;
        probString = `${a + b} - ${a}`;
        ans = b;
      } else if (op === 'mul') {
        const a = Math.floor(getRandom() * (settings.mulMax1 - settings.mulMin1 + 1)) + settings.mulMin1;
        const b = Math.floor(getRandom() * (settings.mulMax2 - settings.mulMin2 + 1)) + settings.mulMin2;
        probString = `${a} * ${b}`;
        ans = a * b;
      } else if (op === 'div') {
        const a = Math.floor(getRandom() * (settings.mulMax1 - settings.mulMin1 + 1)) + settings.mulMin1;
        const b = Math.floor(getRandom() * (settings.mulMax2 - settings.mulMin2 + 1)) + settings.mulMin2;
        probString = `${a * b} / ${a}`;
        ans = b;
      }
      
      if (!seen.has(probString)) {
        seen.add(probString);
        queue.push({
          problem: probString,
          answer: ans,
          avgTime: 4.5,
          maxTime: 5.0
        });
      }
    }
    
    if (queue.length < 5) {
      const fallbacks = [
        { problem: "17 * 6", answer: 102, avgTime: 4.5, maxTime: 5.0 },
        { problem: "13 * 12", answer: 156, avgTime: 4.5, maxTime: 5.0 },
        { problem: "84 / 6", answer: 14, avgTime: 4.5, maxTime: 5.0 },
        { problem: "78 + 59", answer: 137, avgTime: 4.5, maxTime: 5.0 },
        { problem: "123 - 48", answer: 75, avgTime: 4.5, maxTime: 5.0 },
        { problem: "16 * 7", answer: 112, avgTime: 4.5, maxTime: 5.0 },
        { problem: "91 / 7", answer: 13, avgTime: 4.5, maxTime: 5.0 },
        { problem: "67 + 85", answer: 152, avgTime: 4.5, maxTime: 5.0 }
      ];
      return fallbacks;
    }
    return queue;
  }, [settings]);

  const startPractice = () => {
    let target = 3.0;
    let queue = [];
    
    if (historyStats.longestQuestions.length > 0) {
      target = historyStats.globalAverageTime;
      queue = historyStats.longestQuestions.slice(0, 15).map((q) => ({
        problem: q.problem,
        answer: q.answer,
        avgTime: q.avgTime,
        maxTime: q.maxTime,
        attempts: 0,
        bestTime: null,
        solved: false
      }));
    } else {
      queue = generateDefaultPracticeQueue().map((q) => ({
        ...q,
        attempts: 0,
        bestTime: null,
        solved: false
      }));
    }
    
    setIsPracticeMode(true);
    setPracticeQueue(queue);
    setMasteredList([]);
    setTotalPracticeCount(queue.length);
    setTargetTime(target);
    setInputValue('');
    setScore(0);
    setProblemLog([]);
    setPracticeStartTime(performance.now());
    
    // Pick the first problem
    setCurrentProblem(queue[0].problem);
    setCurrentAnswer(queue[0].answer);
    problemStartTimeRef.current = performance.now();
    setCurrentQuestionElapsedTime(0);
    setPracticeToast(null);
    setGameState('playing');
    
    clearInterval(timerRef.current);
    clearInterval(practiceTimerIntervalRef.current);
    practiceTimerIntervalRef.current = setInterval(() => {
      const elapsed = (performance.now() - problemStartTimeRef.current) / 1000;
      setCurrentQuestionElapsedTime(elapsed);
    }, 50);
  };

  const endPractice = useCallback(() => {
    clearInterval(practiceTimerIntervalRef.current);
    const totalDurationSec = ((performance.now() - practiceStartTime) / 1000).toFixed(1);
    setPracticeTotalDuration(parseFloat(totalDurationSec));
    setGameState('result');
  }, [practiceStartTime]);

  const startGame = () => {
    setIsPracticeMode(false);
    clearInterval(practiceTimerIntervalRef.current);
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


    const activeSeed = roomSeed.trim() || Math.random().toString(36).substring(2);
    randomStreamRef.current = createRandomStream(activeSeed);


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

  const loadHistoryStats = useCallback(async () => {
    try {
      if (!window.electronAPI?.listCSVs) {
        setHistoryLoaded(true);
        return;
      }
      const list = await window.electronAPI.listCSVs();
      const rowsAccum = [];
      
      for (const f of list) {
        const content = await window.electronAPI.readCSV(f);
        if (!content) continue;
        const parsed = parseCSV(content);
        if (parsed.length === 0) continue;
        rowsAccum.push(...parsed);
      }
      
      if (rowsAccum.length === 0) {
        setHistoryLoaded(true);
        return;
      }
      
      const totalTime = rowsAccum.reduce((a, r) => a + r.time, 0);
      const globalAverage = totalTime / rowsAccum.length;
      
      const problemMap = {};
      rowsAccum.forEach((row) => {
        if (!problemMap[row.problem]) {
          problemMap[row.problem] = { problem: row.problem, answer: row.answer, times: [] };
        }
        problemMap[row.problem].times.push(row.time);
      });
      
      const longest = Object.values(problemMap)
        .map((p) => {
          const avg = p.times.reduce((a, b) => a + b, 0) / p.times.length;
          return {
            problem: p.problem,
            answer: parseInt(p.answer),
            avgTime: avg,
            maxTime: Math.max(...p.times)
          };
        })
        .filter((p) => p.avgTime > globalAverage)
        .sort((a, b) => b.avgTime - a.avgTime);
        
      setHistoryStats({
        globalAverageTime: globalAverage,
        longestQuestions: longest,
        totalQuestionsSolved: rowsAccum.length
      });
      setHistoryLoaded(true);
    } catch (e) {
      console.error("Error loading history stats:", e);
      setHistoryLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadHistoryStats();
  }, [loadHistoryStats]);

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      clearInterval(practiceTimerIntervalRef.current);
      clearTimeout(toastTimeoutRef.current);
    };
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
      const timeSpentSec = parseFloat((timeSpentMs / 1000).toFixed(3));

      if (isPracticeMode) {
        setScore((prev) => prev + 1);
        
        // Active item is the current front of queue
        const activeItem = { ...practiceQueue[0] };
        activeItem.attempts += 1;
        
        if (activeItem.bestTime === null || timeSpentSec < activeItem.bestTime) {
          activeItem.bestTime = timeSpentSec;
        }

        // Add to problem log for results table display
        setProblemLog((prev) => [
          ...prev,
          { problem: activeItem.problem, answer: activeItem.answer, time: timeSpentSec, attempts: activeItem.attempts }
        ]);

        clearTimeout(toastTimeoutRef.current);

        if (timeSpentSec <= targetTime) {
          // Mastered!
          const newMasteredItem = { ...activeItem, masteredTime: timeSpentSec };
          setMasteredList((prev) => [...prev, newMasteredItem]);
          
          setPracticeToast({
            message: `🎉 Mastered ${activeItem.problem} in ${timeSpentSec.toFixed(2)}s! (Beat target ${targetTime.toFixed(2)}s)`,
            type: 'success'
          });
          
          toastTimeoutRef.current = setTimeout(() => setPracticeToast(null), 3000);

          const updatedQueue = practiceQueue.slice(1);
          setPracticeQueue(updatedQueue);

          if (updatedQueue.length === 0) {
            endPractice(true);
          } else {
            const next = updatedQueue[0];
            setCurrentProblem(next.problem);
            setCurrentAnswer(next.answer);
            setInputValue('');
            problemStartTimeRef.current = performance.now();
            setCurrentQuestionElapsedTime(0);
          }
        } else {
          // Not mastered - rotate to the back of the queue
          setPracticeToast({
            message: `⚡ Solved in ${timeSpentSec.toFixed(2)}s. Target is ${targetTime.toFixed(2)}s. Trying again later!`,
            type: 'retry'
          });
          
          toastTimeoutRef.current = setTimeout(() => setPracticeToast(null), 3000);

          const rotatedQueue = [...practiceQueue.slice(1), activeItem];
          setPracticeQueue(rotatedQueue);

          const next = rotatedQueue[0];
          setCurrentProblem(next.problem);
          setCurrentAnswer(next.answer);
          setInputValue('');
          problemStartTimeRef.current = performance.now();
          setCurrentQuestionElapsedTime(0);
        }
      } else {
        // Normal game mode logic
        setProblemLog((prev) => [
          ...prev,
          { problem: currentProblem, answer: currentAnswer, time: timeSpentSec }
        ]);
        setScore((prev) => prev + 1);
        setInputValue('');
        generateProblem();
      }
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

  const resetGame = () => {
    setView('app');
    setGameState('menu');
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  if (view === 'history') {
    return <HistoryScreen onBack={() => setView('app')} />;
  }

  if (view === 'sessionChart') {
    return (
      <div id="session-chart-screen">
        <div className="history-header">
          <button className="back-btn" onClick={() => setView('app')}>← Back</button>
          <h2>Session Speed Chart</h2>
        </div>
        <SessionSpeedChart rows={problemLog} />
      </div>
    );
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

          {/* Practice Recommendation Card */}
          {historyLoaded && (
            <div className="practice-recommendation-card">
              {historyStats.longestQuestions.length > 0 ? (
                <>
                  <div className="card-header">📊 Practice Recommendation</div>
                  <div className="card-body">
                    You have <strong>{historyStats.longestQuestions.length}</strong> questions above your average time of <strong>{historyStats.globalAverageTime.toFixed(2)}s</strong>. Practice them now to get them under your average!
                  </div>
                </>
              ) : (
                <>
                  <div className="card-header">💡 Practice Mode Available</div>
                  <div className="card-body">
                    Solve some math in normal mode first to gather stats, or jump in with default challenging questions!
                  </div>
                </>
              )}
            </div>
          )}

          <div className="divider" />


          <div className="room-seed-group" style={{ margin: '15px 0' }}>
            <label htmlFor="roomSeed" className="option-text" style={{ display: 'block', marginBottom: '5px' }}>
              <strong>Seed:</strong>
            </label>
            <input 
              type="text" 
              id="roomSeed" 
              placeholder="e.g., MATRIX-99" 
              value={roomSeed} 
              onChange={(e) => setRoomSeed(e.target.value)} 
              style={{ padding: '8px', width: '100%', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </div>

          <div className="save-group">
            <input type="checkbox" id="autosave" checked={settings.autosave} onChange={handleSettingChange} />
            <label htmlFor="autosave" className="option-text">Auto-save results to .csv on completion</label>
          </div>

          <div className="menu-footer-btns">
            {window.electronAPI?.listCSVs && (
              <button id="history-btn" onClick={() => setView('history')}>View History</button>
            )}
            <button id="practice-btn" onClick={startPractice}>Infinite Practice</button>
            <button id="start-btn" onClick={startGame}>Start</button>
          </div>
        </div>
      )}

      {/* ── Game ── */}
      {gameState === 'playing' && (
        <div id="game-container" className={isPracticeMode ? "practice-layout" : ""}>
          {isPracticeMode ? (
            <div className="practice-hud">
              <div className="hud-metric">
                <span className="metric-label">Target Speed:</span>
                <span className="metric-value">&lt; {targetTime.toFixed(2)}s</span>
              </div>
              <div className="hud-center">
                <span className="practice-mode-badge">⚡ Infinite Practice Mode</span>
              </div>
              <div className="hud-metric">
                <span className="metric-label">Mastery Progress:</span>
                <span className="metric-value">{masteredList.length} / {totalPracticeCount}</span>
              </div>
            </div>
          ) : (
            <div className="hud">
              <div>Seconds left: <span id="timer-display">{timeRemaining}</span></div>
              <div>Score: <span id="score-display">{score}</span></div>
            </div>
          )}
          
          {/* Animated Practice Toast feedback */}
          {isPracticeMode && practiceToast && (
            <div className={`practice-toast ${practiceToast.type}`}>
              {practiceToast.message}
            </div>
          )}

          <div id="problem-area" className={isPracticeMode ? "practice-problem-area" : ""}>
            {isPracticeMode && (
              <div className="practice-timer-container">
                <span className={`live-timer ${currentQuestionElapsedTime > targetTime ? 'slow' : 'fast'}`}>
                  {currentQuestionElapsedTime.toFixed(1)}s
                </span>
              </div>
            )}
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

          {/* Scrolling badge row at the bottom for progress tracking */}
          {isPracticeMode && (
            <div className="practice-progress-badges-container">
              <div className="badges-title">Mastery Checklist:</div>
              <div className="badges-list">
                {masteredList.map((item, idx) => (
                  <div key={`m-${idx}`} className="practice-badge mastered animated-badge">
                    {item.problem} ({item.masteredTime.toFixed(2)}s) ✓
                  </div>
                ))}
                {practiceQueue.map((item, idx) => (
                  <div key={`p-${idx}`} className="practice-badge pending">
                    {item.problem}
                  </div>
                ))}
              </div>
              <div className="practice-actions">
                <button className="practice-exit-btn" onClick={() => endPractice(false)}>Exit & Summary</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Result ── */}
      {gameState === 'result' && (
        isPracticeMode ? (
          <div id="practice-result-screen">
            <div className="practice-result-header">
              <h2>Practice Session Summary</h2>
              {practiceQueue.length === 0 ? (
                <p className="practice-completion-msg success-msg">
                  🎉 Outstanding! You mastered all <strong>{totalPracticeCount}</strong> target questions under your average speed limit!
                </p>
              ) : (
                <p className="practice-completion-msg partial-msg">
                  ⏱️ Practice exited. You mastered <strong>{masteredList.length}</strong> of <strong>{totalPracticeCount}</strong> target questions!
                </p>
              )}
            </div>

            {/* Practice Stats Chips */}
            <div className="stats-bar practice-stats-bar">
              <div className="stat-chip">
                <span className="stat-label">Mastered</span>
                <span className="stat-value text-success" style={{ color: '#2a9d3f' }}>{masteredList.length} / {totalPracticeCount}</span>
              </div>
              <div className="stat-chip">
                <span className="stat-label">Target Time</span>
                <span className="stat-value">{targetTime.toFixed(2)}s</span>
              </div>
              <div className="stat-chip">
                <span className="stat-label">Total Time</span>
                <span className="stat-value">{practiceTotalDuration}s</span>
              </div>
              <div className="stat-chip">
                <span className="stat-label">Total Solved</span>
                <span className="stat-value">{score}</span>
              </div>
            </div>

            {/* Detailed practice log list */}
            <div className="practice-results-details">
              <h3>Checklist Mastery Details</h3>
              <div className="table-scroll">
                <table className="results-tbl practice-results-tbl">
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Problem</th>
                      <th>Best Time</th>
                      <th>Target Speed</th>
                      <th>Attempts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Combine mastered list and what remained in queue to show full summary */}
                    {[
                      ...masteredList.map(item => ({ ...item, isMastered: true })),
                      ...practiceQueue.map(item => ({ ...item, isMastered: false }))
                    ].map((row, i) => (
                      <tr key={i} className={row.isMastered ? "row-mastered" : "row-pending"}>
                        <td className="col-status" style={{ color: row.isMastered ? '#2a9d3f' : '#d4a017', fontWeight: 'bold' }}>
                          {row.isMastered ? <span className="status-check">✓ Mastered</span> : <span className="status-pending">⚡ Pending</span>}
                        </td>
                        <td className="col-problem">{row.problem}</td>
                        <td className="col-time" style={{ fontWeight: 'bold', color: row.isMastered ? '#2a9d3f' : '#c0392b' }}>
                          {row.bestTime ? `${row.bestTime.toFixed(3)}s` : '—'}
                        </td>
                        <td className="col-target-time">
                          &lt; {row.avgTime ? `${row.avgTime.toFixed(2)}s` : `${targetTime.toFixed(2)}s`}
                        </td>
                        <td className="col-attempts" style={{ textAlign: 'center' }}>
                          {row.attempts}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="action-buttons practice-action-buttons">
              <button id="practice-again-btn" onClick={startPractice}>Practice Again</button>
              <button id="back-to-menu-btn" onClick={() => { setIsPracticeMode(false); setGameState('menu'); loadHistoryStats(); }}>Back to Menu</button>
            </div>
          </div>
        ) : (
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
            {/* </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}> */}
              {/* <button onClick={() => setView('app')}>Back to App</button> */}
              <button onClick={() => setView('history')}>History</button>
              <button onClick={() => setView('sessionChart')}>Session Speed Chart</button>
            </div>
          </div>
        )
      )}
    </>
  );
};

export default App;
