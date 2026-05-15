import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';

import { HistoryScreen } from './screens/HistoryScreen';
import { ResultsTable } from './components/ResultsTable';

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
