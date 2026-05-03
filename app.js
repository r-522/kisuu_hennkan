'use strict';

const BASES      = [2, 8, 10, 16];
const BASE_NAMES = { 2: '2進数', 8: '8進数', 10: '10進数', 16: '16進数' };
const LABELS     = ['ア', 'イ', 'ウ', 'エ'];
const SUB        = { 2: '₂', 8: '₈', 10: '₁₀', 16: '₁₆' };

const state = {
  question: null,
  score: { correct: 0, total: 0, streak: 0 }
};

const el = {};

// ─── Entry point ──────────────────────────────────────────────

function init() {
  el.questionText = document.getElementById('question-text');
  el.choices      = document.getElementById('choices');
  el.result       = document.getElementById('result');
  el.explanation  = document.getElementById('explanation');
  el.nextBtn      = document.getElementById('next-btn');
  el.resetBtn     = document.getElementById('reset-btn');
  el.scoreCorrect = document.getElementById('score-correct');
  el.scoreTotal   = document.getElementById('score-total');
  el.scoreRate    = document.getElementById('score-rate');
  el.scoreStreak  = document.getElementById('score-streak');

  el.nextBtn.addEventListener('click', nextQuestion);
  el.resetBtn.addEventListener('click', resetQuiz);

  nextQuestion();
}

// ─── Utilities ────────────────────────────────────────────────

function toBaseString(value, base) {
  if (value <= 0) return '0';
  return value.toString(base).toUpperCase();
}

function shuffle(array) {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function toSuperscript(n) {
  const map = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
    '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹'
  };
  return String(n).split('').map(c => map[c] || c).join('');
}

// ─── Question generation ──────────────────────────────────────

function generateQuestion() {
  const value   = Math.floor(Math.random() * 4095) + 1;
  const fromIdx = Math.floor(Math.random() * BASES.length);
  let toIdx;
  do { toIdx = Math.floor(Math.random() * BASES.length); } while (toIdx === fromIdx);

  const fromBase      = BASES[fromIdx];
  const toBase        = BASES[toIdx];
  const fromStr       = toBaseString(value, fromBase);
  const correctAnswer = toBaseString(value, toBase);
  const choices       = generateChoices(value, toBase, fromStr);

  return { value, fromBase, toBase, fromStr, correctAnswer, choices };
}

// ─── Choice generation ────────────────────────────────────────

function generateChoices(correctValue, targetBase, sourceStr) {
  const correctStr = toBaseString(correctValue, targetBase);
  const seen = new Set([correctStr]);

  function tryAdd(v) {
    if (seen.size >= 4) return;
    if (!Number.isInteger(v) || v <= 0 || v === correctValue) return;
    seen.add(toBaseString(v, targetBase));
  }

  tryAdd(correctValue + 1);
  tryAdd(correctValue - 1);
  tryAdd(correctValue + targetBase);
  tryAdd(correctValue - targetBase);

  // Common mistake: read source digits as if they were decimal
  const asDecimal = parseInt(sourceStr, 10);
  if (!isNaN(asDecimal)) tryAdd(asDecimal);

  tryAdd(correctValue + 2);
  tryAdd(correctValue - 2);
  tryAdd(correctValue + targetBase * 2);
  tryAdd(correctValue - targetBase * 2);

  // Fallback: widen search
  for (let offset = 3; seen.size < 4 && offset < 100000; offset++) {
    tryAdd(correctValue + offset);
    tryAdd(correctValue - offset);
  }

  const shuffled = shuffle([...seen].slice(0, 4));
  return shuffled.map((val, i) => ({
    label: LABELS[i],
    value: val,
    isCorrect: val === correctStr
  }));
}

// ─── Rendering ────────────────────────────────────────────────

function nextQuestion() {
  state.question = generateQuestion();
  renderQuestion();
}

function renderQuestion() {
  const q = state.question;
  el.questionText.textContent =
    `${q.fromStr}${SUB[q.fromBase]} を ${BASE_NAMES[q.toBase]} に変換してください。`;

  el.choices.innerHTML = '';
  q.choices.forEach(choice => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.dataset.correct = String(choice.isCorrect);
    btn.dataset.value   = choice.value;
    btn.innerHTML =
      `<span class="choice-label-badge">${choice.label}</span>` +
      `<span class="choice-value">${choice.value}</span>`;
    btn.addEventListener('click', () => handleAnswer(choice));
    el.choices.appendChild(btn);
  });

  el.result.textContent    = '';
  el.result.className      = '';
  el.explanation.innerHTML = '';
  el.nextBtn.hidden        = true;
}

// ─── Answer handling ──────────────────────────────────────────

function handleAnswer(choice) {
  el.choices.querySelectorAll('.choice-btn').forEach(btn => {
    btn.disabled = true;
    if (btn.dataset.correct === 'true') {
      btn.classList.add('correct');
    } else if (btn.dataset.value === choice.value) {
      btn.classList.add('incorrect');
    }
  });

  const isCorrect = choice.isCorrect;
  showResult(isCorrect);
  updateScore(isCorrect);
  el.explanation.innerHTML = buildExplanation(state.question);
  el.nextBtn.hidden = false;
}

function showResult(isCorrect) {
  el.result.textContent = isCorrect ? '○ 正解！' : '✕ 不正解';
  el.result.className   = isCorrect ? 'result-correct' : 'result-incorrect';
}

// ─── Score ────────────────────────────────────────────────────

function updateScore(isCorrect) {
  state.score.total++;
  if (isCorrect) {
    state.score.correct++;
    state.score.streak++;
  } else {
    state.score.streak = 0;
  }
  el.scoreCorrect.textContent = state.score.correct;
  el.scoreTotal.textContent   = state.score.total;
  el.scoreRate.textContent    =
    Math.round(state.score.correct / state.score.total * 100) + '%';
  el.scoreStreak.textContent  = state.score.streak;
}

function resetQuiz() {
  state.score = { correct: 0, total: 0, streak: 0 };
  el.scoreCorrect.textContent = '0';
  el.scoreTotal.textContent   = '0';
  el.scoreRate.textContent    = '0%';
  el.scoreStreak.textContent  = '0';
  nextQuestion();
}

// ─── Explanation ──────────────────────────────────────────────

function buildExplanation(q) {
  const { value, fromBase, toBase, fromStr, correctAnswer } = q;
  let html =
    `<p class="answer-summary">正解：<strong>${correctAnswer}</strong>（${BASE_NAMES[toBase]}）</p>`;

  if (fromBase === 10) {
    // Already decimal → convert to target
    html += `<h3>${BASE_NAMES[fromBase]} → ${BASE_NAMES[toBase]}への変換</h3>`;
    html += `<p>問題の値はすでに10進数です。</p>`;
    html += buildFromDecimalSteps(value, toBase, correctAnswer);
  } else if (toBase === 10) {
    // Source → decimal = answer
    html += `<h3>${BASE_NAMES[fromBase]} → 10進数への展開</h3>`;
    html += buildToDecimalSteps(fromStr, fromBase, value);
    html += `<p>各桁を展開して合計した値が答えです。</p>`;
  } else {
    // Two-step: source → decimal → target
    html += `<h3>Step 1：${BASE_NAMES[fromBase]} → 10進数</h3>`;
    html += buildToDecimalSteps(fromStr, fromBase, value);
    html += `<h3>Step 2：10進数 → ${BASE_NAMES[toBase]}</h3>`;
    html += buildFromDecimalSteps(value, toBase, correctAnswer);
  }

  const alt = buildAlternativeExplanation(q);
  if (alt) {
    html += `<h3>別解：グルーピング法</h3>` + alt;
  }

  return html;
}

// Expand digits of `str` (in `base`) into decimal terms
function buildToDecimalSteps(str, base, decimalResult) {
  const digits = str.split('');
  const n      = digits.length;
  let html     = '<div class="calc-steps">';

  digits.forEach((d, i) => {
    const exp    = n - 1 - i;
    const dVal   = parseInt(d, 16); // hex covers all our digit chars
    const termVal = dVal * Math.pow(base, exp);

    let dDisplay = d;
    if (base === 16 && dVal >= 10) dDisplay = `${d}(=${dVal})`;

    const expStr = exp === 0 ? `${base}⁰` :
                   exp === 1 ? `${base}¹` :
                   `${base}${toSuperscript(exp)}`;

    html += `<div class="calc-row">${dDisplay} × ${expStr} = ${termVal}</div>`;
  });

  html += `<div class="calc-row total">合計 = <strong>${decimalResult}</strong></div>`;
  html += '</div>';
  return html;
}

// Show repeated division of `value` by `base`
function buildFromDecimalSteps(value, base, result) {
  let html = '<div class="calc-steps">';
  let n    = value;

  while (n > 0) {
    const q    = Math.floor(n / base);
    const r    = n % base;
    const rStr = toBaseString(r, base);
    const rDisplay = (base === 16 && r >= 10) ? `${rStr}(=${r})` : rStr;
    html += `<div class="calc-row">${n} ÷ ${base} = ${q} … 余り ${rDisplay}</div>`;
    n = q;
  }

  html += `<div class="calc-row total">余りを下から読む → <strong>${result}</strong></div>`;
  html += '</div>';
  return html;
}

// ─── Alternative (grouping) explanations ─────────────────────

function buildAlternativeExplanation(q) {
  const { fromBase, toBase, fromStr, correctAnswer } = q;

  if (fromBase === 2  && toBase === 8)  return binToOctAlt(fromStr, correctAnswer);
  if (fromBase === 8  && toBase === 2)  return octToBinAlt(fromStr, correctAnswer);
  if (fromBase === 2  && toBase === 16) return binToHexAlt(fromStr, correctAnswer);
  if (fromBase === 16 && toBase === 2)  return hexToBinAlt(fromStr, correctAnswer);
  if (fromBase === 8  && toBase === 16) return octToHexAlt(fromStr, correctAnswer);
  if (fromBase === 16 && toBase === 8)  return hexToOctAlt(fromStr, correctAnswer);
  return '';
}

function binToOctAlt(binStr, answer) {
  const padded  = binStr.padStart(Math.ceil(binStr.length / 3) * 3, '0');
  const groups  = padded.match(/.{3}/g);
  const mapping = groups.map(g => `${g}→${parseInt(g, 2)}`).join('、');
  return `<p>2進数を3ビットごとに区切る：</p>
<div class="calc-steps">
  <div class="calc-row">${padded} → [${groups.join('] [')}]</div>
  <div class="calc-row">各グループを変換：${mapping}</div>
  <div class="calc-row total">→ <strong>${answer}</strong></div>
</div>`;
}

function octToBinAlt(octStr, answer) {
  const binGroups = octStr.split('').map(d => parseInt(d, 8).toString(2).padStart(3, '0'));
  const mapping   = octStr.split('').map((d, i) => `${d}→${binGroups[i]}`).join('、');
  return `<p>8進数の各桁を3ビットの2進数に変換：</p>
<div class="calc-steps">
  <div class="calc-row">各桁を変換：${mapping}</div>
  <div class="calc-row">連結：${binGroups.join(' ')}</div>
  <div class="calc-row total">先頭の0を省略 → <strong>${answer}</strong></div>
</div>`;
}

function binToHexAlt(binStr, answer) {
  const padded  = binStr.padStart(Math.ceil(binStr.length / 4) * 4, '0');
  const groups  = padded.match(/.{4}/g);
  const mapping = groups.map(g => `${g}→${parseInt(g, 2).toString(16).toUpperCase()}`).join('、');
  return `<p>2進数を4ビットごとに区切る：</p>
<div class="calc-steps">
  <div class="calc-row">${padded} → [${groups.join('] [')}]</div>
  <div class="calc-row">各グループを変換：${mapping}</div>
  <div class="calc-row total">→ <strong>${answer}</strong></div>
</div>`;
}

function hexToBinAlt(hexStr, answer) {
  const binGroups = hexStr.split('').map(d => parseInt(d, 16).toString(2).padStart(4, '0'));
  const mapping   = hexStr.split('').map((d, i) => `${d}→${binGroups[i]}`).join('、');
  return `<p>16進数の各桁を4ビットの2進数に変換：</p>
<div class="calc-steps">
  <div class="calc-row">各桁を変換：${mapping}</div>
  <div class="calc-row">連結：${binGroups.join(' ')}</div>
  <div class="calc-row total">先頭の0を省略 → <strong>${answer}</strong></div>
</div>`;
}

function octToHexAlt(octStr, answer) {
  const binGroups = octStr.split('').map(d => parseInt(d, 8).toString(2).padStart(3, '0'));
  const fullBin   = binGroups.join('');
  const padLen    = Math.ceil(fullBin.length / 4) * 4;
  const padded    = fullBin.padStart(padLen, '0');
  const hexGrps   = padded.match(/.{4}/g);
  const step1     = octStr.split('').map((d, i) => `${d}→${binGroups[i]}`).join('、');
  const mapping   = hexGrps.map(g => `${g}→${parseInt(g, 2).toString(16).toUpperCase()}`).join('、');
  return `<p>8進数→2進数→16進数の順に変換：</p>
<div class="calc-steps">
  <div class="calc-row">各桁を3ビットに展開：${step1}</div>
  <div class="calc-row">連結→4ビット単位に揃える：${padded} → [${hexGrps.join('] [')}]</div>
  <div class="calc-row">各グループを変換：${mapping}</div>
  <div class="calc-row total">→ <strong>${answer}</strong></div>
</div>`;
}

function hexToOctAlt(hexStr, answer) {
  const binGroups = hexStr.split('').map(d => parseInt(d, 16).toString(2).padStart(4, '0'));
  const fullBin   = binGroups.join('');
  const padLen    = Math.ceil(fullBin.length / 3) * 3;
  const padded    = fullBin.padStart(padLen, '0');
  const octGrps   = padded.match(/.{3}/g);
  const step1     = hexStr.split('').map((d, i) => `${d}→${binGroups[i]}`).join('、');
  const mapping   = octGrps.map(g => `${g}→${parseInt(g, 2)}`).join('、');
  return `<p>16進数→2進数→8進数の順に変換：</p>
<div class="calc-steps">
  <div class="calc-row">各桁を4ビットに展開：${step1}</div>
  <div class="calc-row">連結→3ビット単位に揃える：${padded} → [${octGrps.join('] [')}]</div>
  <div class="calc-row">各グループを変換：${mapping}</div>
  <div class="calc-row total">→ <strong>${answer}</strong></div>
</div>`;
}

// ─── Bootstrap ────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', init);
