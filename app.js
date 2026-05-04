'use strict';

const BASES      = [2, 8, 10, 16];
const BASE_NAMES = { 2: '2進数', 8: '8進数', 10: '10進数', 16: '16進数' };
const LABELS     = ['ア', 'イ', 'ウ', 'エ'];
const SUB        = { 2: '(2)', 8: '(8)', 10: '(10)', 16: '(16)' };

const state = {
  question: null,
  score: { correct: 0, total: 0, streak: 0, qNumber: 0 }
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

  el.qNumber = document.getElementById('q-number');

  el.nextBtn.addEventListener('click', nextQuestion);
  el.resetBtn.addEventListener('click', resetQuiz);

  document.addEventListener('keydown', handleKey);

  nextQuestion();
}

function handleKey(e) {
  // 1–4 で選択肢を選ぶ
  const idx = ['1','2','3','4'].indexOf(e.key);
  if (idx !== -1) {
    const btns = el.choices.querySelectorAll('.choice-btn:not(:disabled)');
    if (btns[idx]) btns[idx].click();
    return;
  }
  // Enter / Space で次の問題へ
  if ((e.key === 'Enter' || e.key === ' ') && !el.nextBtn.hidden) {
    e.preventDefault();
    nextQuestion();
  }
}

// ─── Utilities ────────────────────────────────────────────────

function toBaseString(value, base) {
  if (value === 0) return '0';
  return value.toString(base).toUpperCase();
}

// Convert intPart + numerator/denominator to a base string with decimal point.
// denominator must be a power of 2.
function toFracBaseString(intPart, numerator, denominator, base) {
  const intStr = toBaseString(intPart, base);
  if (numerator === 0) return intStr;

  let num     = numerator;
  const den   = denominator;
  let fracStr = '';

  while (num > 0 && fracStr.length < 8) {
    num          *= base;
    const digit   = Math.floor(num / den);
    fracStr      += toBaseString(digit, base);
    num           = num % den;
  }

  return intStr + '.' + fracStr;
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
    '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻'
  };
  return String(n).split('').map(c => map[c] || c).join('');
}

// Remove floating-point noise while preserving meaningful decimals.
function trimDecimal(n) {
  return parseFloat(n.toFixed(10)).toString();
}

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ─── Question generation ──────────────────────────────────────

function generateQuestion() {
  return Math.random() < 0.4
    ? generateFractionalQuestion()
    : generateIntegerQuestion();
}

function pickBases() {
  const fromIdx = Math.floor(Math.random() * BASES.length);
  let toIdx;
  do { toIdx = Math.floor(Math.random() * BASES.length); } while (toIdx === fromIdx);
  return [BASES[fromIdx], BASES[toIdx]];
}

function generateIntegerQuestion() {
  const value           = Math.floor(Math.random() * 255) + 1;
  const [fromBase, toBase] = pickBases();
  const fromStr         = toBaseString(value, fromBase);
  const correctAnswer   = toBaseString(value, toBase);
  const choices         = generateIntChoices(value, toBase, fromStr);

  return { type: 'integer', value, fromBase, toBase, fromStr, correctAnswer, choices };
}

function generateFractionalQuestion() {
  const bits            = Math.floor(Math.random() * 4) + 1;   // 1–4 fractional bits
  const denominator     = Math.pow(2, bits);
  const numerator       = Math.floor(Math.random() * (denominator - 1)) + 1;
  const intPart         = Math.floor(Math.random() * 16);      // 0–15
  const [fromBase, toBase] = pickBases();
  const fromStr         = toFracBaseString(intPart, numerator, denominator, fromBase);
  const correctAnswer   = toFracBaseString(intPart, numerator, denominator, toBase);
  const choices         = generateFracChoices(intPart, numerator, denominator, toBase, correctAnswer);

  return { type: 'fractional', intPart, numerator, denominator,
           fromBase, toBase, fromStr, correctAnswer, choices };
}

// ─── Choice generation ────────────────────────────────────────

function generateIntChoices(correctValue, targetBase, sourceStr) {
  const correctStr = toBaseString(correctValue, targetBase);
  const seen       = new Set([correctStr]);

  function tryAdd(v) {
    if (seen.size >= 4) return;
    if (!Number.isInteger(v) || v <= 0 || v === correctValue) return;
    seen.add(toBaseString(v, targetBase));
  }

  tryAdd(correctValue + 1);
  tryAdd(correctValue - 1);
  tryAdd(correctValue + targetBase);
  tryAdd(correctValue - targetBase);

  // "ソースをそのまま10進数として読む" ミスは、ソースが純粋な数字のときだけ有効
  if (/^\d+$/.test(sourceStr)) {
    const asDecimal = parseInt(sourceStr, 10);
    if (Number.isFinite(asDecimal)) tryAdd(asDecimal);
  }

  tryAdd(correctValue + 2);
  tryAdd(correctValue - 2);
  tryAdd(correctValue + targetBase * 2);
  tryAdd(correctValue - targetBase * 2);

  for (let offset = 3; seen.size < 4 && offset < 100000; offset++) {
    tryAdd(correctValue + offset);
    tryAdd(correctValue - offset);
  }

  return shuffle([...seen].slice(0, 4)).map((val, i) => ({
    label: LABELS[i], value: val, isCorrect: val === correctStr
  }));
}

function generateFracChoices(intPart, numerator, denominator, toBase, correctStr) {
  const seen = new Set([correctStr]);

  function tryFrac(ip, n, d) {
    if (seen.size >= 4) return;
    if (ip < 0 || n <= 0 || n >= d) return;
    const s = toFracBaseString(ip, n, d, toBase);
    if (!seen.has(s)) seen.add(s);
  }

  // 同じ分母で分子を変える
  for (let n = 1; n < denominator && seen.size < 4; n++) {
    if (n !== numerator) tryFrac(intPart, n, denominator);
  }

  // 整数部分を変える
  tryFrac(intPart + 1, numerator, denominator);
  if (intPart > 0) tryFrac(intPart - 1, numerator, denominator);

  // 分母を2倍にした近傍値
  tryFrac(intPart, numerator * 2 - 1, denominator * 2);
  tryFrac(intPart, numerator * 2 + 1, denominator * 2);

  // フォールバック
  for (let extra = 2; seen.size < 4 && extra < 50; extra++) {
    const s = toFracBaseString(intPart + extra, numerator, denominator, toBase);
    if (!seen.has(s)) seen.add(s);
  }

  return shuffle([...seen].slice(0, 4)).map((val, i) => ({
    label: LABELS[i], value: val, isCorrect: val === correctStr
  }));
}

// ─── Rendering ────────────────────────────────────────────────

function nextQuestion() {
  state.question = generateQuestion();
  renderQuestion();
}

function renderQuestion() {
  const q = state.question;

  state.score.qNumber++;
  el.qNumber.textContent = `Q${state.score.qNumber}`;

  el.questionText.innerHTML =
    `<span class="from-val">${escapeHtml(q.fromStr)}</span>` +
    `<span class="base-sub">${SUB[q.fromBase]}</span>` +
    ` を ${escapeHtml(BASE_NAMES[q.toBase])} に変換してください。`;

  el.choices.innerHTML = '';
  q.choices.forEach(choice => {
    const btn = document.createElement('button');
    btn.className          = 'choice-btn';
    btn.dataset.correct    = String(choice.isCorrect);
    btn.dataset.value      = choice.value;
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
    if (btn.dataset.correct === 'true')        btn.classList.add('correct');
    else if (btn.dataset.value === choice.value) btn.classList.add('incorrect');
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
  if (isCorrect) { state.score.correct++; state.score.streak++; }
  else           { state.score.streak = 0; }

  el.scoreCorrect.textContent = state.score.correct;
  el.scoreTotal.textContent   = state.score.total;
  el.scoreRate.textContent    = Math.round(state.score.correct / state.score.total * 100) + '%';
  el.scoreStreak.textContent  = state.score.streak;
}

function resetQuiz() {
  state.score = { correct: 0, total: 0, streak: 0, qNumber: 0 };
  el.scoreCorrect.textContent = '0';
  el.scoreTotal.textContent   = '0';
  el.scoreRate.textContent    = '—';
  el.scoreStreak.textContent  = '0';
  nextQuestion();
}

// ─── Explanation dispatcher ───────────────────────────────────

function buildExplanation(q) {
  return q.type === 'fractional'
    ? buildFractionalExplanation(q)
    : buildIntegerExplanation(q);
}

// ─── Integer explanation ──────────────────────────────────────

function buildIntegerExplanation(q) {
  const { value, fromBase, toBase, fromStr, correctAnswer } = q;
  let html =
    `<p class="answer-summary">正解：<strong>${correctAnswer}</strong>（${BASE_NAMES[toBase]}）</p>`;

  if (fromBase === 10) {
    html += `<h3>${BASE_NAMES[fromBase]} → ${BASE_NAMES[toBase]} への変換</h3>`;
    html += `<p>問題の値はすでに${BASE_NAMES[10]}です。</p>`;
    html += buildFromDecimalSteps(value, toBase, correctAnswer);
  } else if (toBase === 10) {
    html += `<h3>${BASE_NAMES[fromBase]} → ${BASE_NAMES[10]} への展開</h3>`;
    html += buildToDecimalSteps(fromStr, fromBase, value);
    html += `<p>各桁を展開して合計した値が答えです。</p>`;
  } else {
    html += `<h3>Step 1：${BASE_NAMES[fromBase]} → ${BASE_NAMES[10]}</h3>`;
    html += buildToDecimalSteps(fromStr, fromBase, value);
    html += `<h3>Step 2：${BASE_NAMES[10]} → ${BASE_NAMES[toBase]}</h3>`;
    html += buildFromDecimalSteps(value, toBase, correctAnswer);
  }

  const alt = buildAlternativeExplanation(q);
  if (alt) html += `<h3>別解：グルーピング法</h3>` + alt;

  return html;
}

// ─── Fractional explanation ───────────────────────────────────

function buildFractionalExplanation(q) {
  const { intPart, numerator, denominator, fromBase, toBase, fromStr, correctAnswer } = q;
  let html =
    `<p class="answer-summary">正解：<strong>${correctAnswer}</strong>（${BASE_NAMES[toBase]}）</p>`;

  if (fromBase === 10) {
    html += `<h3>${BASE_NAMES[fromBase]} → ${BASE_NAMES[toBase]} への変換</h3>`;
    html += `<p>整数部分と小数部分を分けて変換します。</p>`;
    if (intPart > 0) {
      html += `<p><strong>整数部分：</strong></p>`;
      html += buildFromDecimalSteps(intPart, toBase, toBaseString(intPart, toBase));
    }
    html += `<p><strong>小数部分（繰り返し乗算法）：</strong></p>`;
    html += buildFracFromDecimalSteps(numerator, denominator, toBase);

  } else if (toBase === 10) {
    html += `<h3>${BASE_NAMES[fromBase]} → ${BASE_NAMES[10]} への展開</h3>`;
    html += buildFracToDecimalSteps(fromStr, fromBase, intPart, numerator, denominator);

  } else {
    html += `<h3>Step 1：${BASE_NAMES[fromBase]} → ${BASE_NAMES[10]}</h3>`;
    html += buildFracToDecimalSteps(fromStr, fromBase, intPart, numerator, denominator);
    html += `<h3>Step 2：${BASE_NAMES[10]} → ${BASE_NAMES[toBase]}</h3>`;
    html += `<p>整数部分と小数部分を分けて変換します。</p>`;
    if (intPart > 0) {
      html += `<p><strong>整数部分：</strong></p>`;
      html += buildFromDecimalSteps(intPart, toBase, toBaseString(intPart, toBase));
    }
    html += `<p><strong>小数部分（繰り返し乗算法）：</strong></p>`;
    html += buildFracFromDecimalSteps(numerator, denominator, toBase);
    html += `<p>合わせると：<strong>${correctAnswer}</strong>（${BASE_NAMES[toBase]}）</p>`;
  }

  return html;
}

// 小数を含む数を source base から10進数へ展開する手順を生成する
function buildFracToDecimalSteps(fromStr, fromBase, intPart, numerator, denominator) {
  const parts   = fromStr.split('.');
  const intStr  = parts[0];
  const fracStr = parts[1] || '';
  let html      = '';

  if (intPart > 0) {
    html += `<p><strong>整数部分の展開：</strong></p>`;
    html += buildToDecimalSteps(intStr, fromBase, intPart);
  }

  html += `<p><strong>小数部分の展開：</strong></p>`;
  html += '<div class="calc-steps">';

  fracStr.split('').forEach((d, i) => {
    const dVal    = parseInt(d, 16);          // parseInt base16 はすべての桁文字に有効
    const expNum  = -(i + 1);
    const termVal = dVal / Math.pow(fromBase, i + 1);
    let dDisplay  = d;
    if (fromBase === 16 && dVal >= 10) dDisplay = `${d}(=${dVal})`;
    html += `<div class="calc-row">${dDisplay} × ${fromBase}${toSuperscript(expNum)} = ${trimDecimal(termVal)}</div>`;
  });

  const fracDecimal = numerator / denominator;
  html += `<div class="calc-row total">小数部分の合計 = ${trimDecimal(fracDecimal)}</div>`;
  html += '</div>';

  if (intPart > 0) {
    html += `<p>整数部分 ${intPart} ＋ 小数部分 ${trimDecimal(fracDecimal)} = ` +
            `<strong>${trimDecimal(intPart + fracDecimal)}</strong></p>`;
  }

  return html;
}

// 小数部分（numerator/denominator）を target base へ繰り返し乗算法で変換する手順を生成する
function buildFracFromDecimalSteps(numerator, denominator, base) {
  let html = '<div class="calc-steps">';
  let num  = numerator;
  const den           = denominator;
  const resultDigits  = [];

  while (num > 0 && resultDigits.length < 8) {
    const before  = num / den;
    num          *= base;
    const digit   = Math.floor(num / den);
    num           = num % den;
    const after   = num / den;

    let digitDisplay = toBaseString(digit, base);
    if (base === 16 && digit >= 10) digitDisplay = `${toBaseString(digit, base)}(=${digit})`;

    resultDigits.push(toBaseString(digit, base));

    const afterStr = num === 0 ? '0' : trimDecimal(after);
    html += `<div class="calc-row">` +
            `${trimDecimal(before)} × ${base} = ${trimDecimal(before * base)}` +
            ` → <strong>${digitDisplay}</strong>、残り ${afterStr}</div>`;
  }

  html += `<div class="calc-row total">上から読む → <strong>.${resultDigits.join('')}</strong></div>`;
  html += '</div>';
  return html;
}

// ─── 共通ステップビルダー ─────────────────────────────────────

// str (fromBase 表記) を10進数に展開する手順を生成する
function buildToDecimalSteps(str, base, decimalResult) {
  const digits = str.split('');
  const n      = digits.length;
  let html     = '<div class="calc-steps">';

  digits.forEach((d, i) => {
    const exp     = n - 1 - i;
    const dVal    = parseInt(d, 16);   // base16 解釈はすべての対象桁文字に対して正しい値を返す
    const termVal = dVal * Math.pow(base, exp);
    let dDisplay  = d;
    if (base === 16 && dVal >= 10) dDisplay = `${d}(=${dVal})`;
    html += `<div class="calc-row">${dDisplay} × ${base}${toSuperscript(exp)} = ${termVal}</div>`;
  });

  html += `<div class="calc-row total">合計 = <strong>${decimalResult}</strong></div>`;
  html += '</div>';
  return html;
}

// 10進整数 value を target base へ繰り返し除算する手順を生成する
function buildFromDecimalSteps(value, base, result) {
  let html = '<div class="calc-steps">';
  let rem  = value;

  while (rem > 0) {
    const q        = Math.floor(rem / base);
    const r        = rem % base;
    const rStr     = toBaseString(r, base);
    const rDisplay = (base === 16 && r >= 10) ? `${rStr}(=${r})` : rStr;
    html += `<div class="calc-row">${rem} ÷ ${base} = ${q} … 余り ${rDisplay}</div>`;
    rem = q;
  }

  html += `<div class="calc-row total">余りを下から読む → <strong>${result}</strong></div>`;
  html += '</div>';
  return html;
}

// ─── 別解（グルーピング法）── 整数問題のみ ────────────────────

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
