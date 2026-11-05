/**
 * align-captions.mjs — Force Aligner for Whisper Captions with Ground-Truth Script
 *
 * Automatically corrects misheard Whisper AI words, restores proper capitalization,
 * fixes punctuation, and merges split syllables using the original reference script from Gemini.
 */

function cleanWord(w) {
  if (!w || typeof w !== 'string') return '';
  return w.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,       // deletion
        dp[i][j - 1] + 1,       // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }
  return dp[m][n];
}

function wordSimilarity(a, b) {
  const ca = cleanWord(a);
  const cb = cleanWord(b);
  if (!ca || !cb) return 0;
  if (ca === cb) return 1.0;
  const maxLen = Math.max(ca.length, cb.length);
  const dist = levenshtein(ca, cb);
  return Math.max(0, 1 - dist / maxLen);
}

/**
 * Align timestamped Whisper words with a ground-truth reference script
 *
 * @param {Array<{ text: string, startMs: number, endMs: number, timestampMs?: number, confidence?: number }>} whisperWords
 * @param {string} referenceScript Ground-truth text from Gemini
 * @returns {{ alignedWords: Array, stats: { totalWords: number, correctedCount: number, mergedCount: number, splitCount: number } }}
 */
export function alignWhisperWithScript(whisperWords, referenceScript) {
  if (!Array.isArray(whisperWords) || whisperWords.length === 0) {
    return { alignedWords: [], stats: { totalWords: 0, correctedCount: 0, mergedCount: 0, splitCount: 0 } };
  }

  if (!referenceScript || typeof referenceScript !== 'string' || !referenceScript.trim()) {
    // Return original if no reference script provided
    return { alignedWords: whisperWords, stats: { totalWords: whisperWords.length, correctedCount: 0, mergedCount: 0, splitCount: 0 } };
  }

  // Tokenize reference script into words while preserving attached punctuation & casing
  const refTokens = referenceScript
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(raw => ({
      display: raw.trim(),
      clean: cleanWord(raw),
    }))
    .filter(t => t.clean.length > 0);

  const M = refTokens.length;
  const N = whisperWords.length;

  if (M === 0 || N === 0) {
    return { alignedWords: whisperWords, stats: { totalWords: whisperWords.length, correctedCount: 0, mergedCount: 0, splitCount: 0 } };
  }

  // Dynamic Programming Table
  // cost[i][j] represents min edit cost aligning refTokens[0..i-1] with whisperWords[0..j-1]
  const cost = Array.from({ length: M + 1 }, () => new Array(N + 1).fill(Infinity));
  const op = Array.from({ length: M + 1 }, () => new Array(N + 1).fill(null));

  cost[0][0] = 0;

  for (let i = 0; i <= M; i++) {
    for (let j = 0; j <= N; j++) {
      if (cost[i][j] === Infinity) continue;

      // 1. Match 1 reference token to 1 whisper token (1-to-1)
      if (i < M && j < N) {
        const sim = wordSimilarity(refTokens[i].clean, whisperWords[j].text);
        const matchCost = (1 - sim) * 2.0; // 0 for exact match, up to 2 for complete mismatch
        const newCost = cost[i][j] + matchCost;
        if (newCost < cost[i + 1][j + 1]) {
          cost[i + 1][j + 1] = newCost;
          op[i + 1][j + 1] = { type: '1-to-1', i, j, sim };
        }
      }

      // 2. 1 reference token matches 2 Whisper tokens (Whisper split a word, e.g. "kera" + "njang")
      if (i < M && j + 1 < N) {
        const joinedWhisper = cleanWord(whisperWords[j].text) + cleanWord(whisperWords[j + 1].text);
        const sim = wordSimilarity(refTokens[i].clean, joinedWhisper);
        // Reward valid join
        const joinCost = (1 - sim) * 2.0 + 0.15;
        const newCost = cost[i][j] + joinCost;
        if (newCost < cost[i + 1][j + 2]) {
          cost[i + 1][j + 2] = newCost;
          op[i + 1][j + 2] = { type: '1-to-2', i, j, sim };
        }
      }

      // 3. 2 reference tokens match 1 Whisper token (e.g. "500" + "ml" -> "500ml")
      if (i + 1 < M && j < N) {
        const joinedRef = refTokens[i].clean + refTokens[i + 1].clean;
        const sim = wordSimilarity(joinedRef, whisperWords[j].text);
        const splitCost = (1 - sim) * 2.0 + 0.15;
        const newCost = cost[i][j] + splitCost;
        if (newCost < cost[i + 2][j + 1]) {
          cost[i + 2][j + 1] = newCost;
          op[i + 2][j + 1] = { type: '2-to-1', i, j, sim };
        }
      }

      // 4. Skip 1 Whisper token (Whisper hallucinated a filler sound or extra noise)
      if (j < N) {
        const skipCost = cost[i][j] + 1.2;
        if (skipCost < cost[i][j + 1]) {
          cost[i][j + 1] = skipCost;
          op[i][j + 1] = { type: 'skip-whisper', j };
        }
      }

      // 5. Skip 1 Reference token (Whisper dropped a minor word)
      if (i < M) {
        const skipCost = cost[i][j] + 1.5;
        if (skipCost < cost[i + 1][j]) {
          cost[i + 1][j] = skipCost;
          op[i + 1][j] = { type: 'skip-ref', i };
        }
      }
    }
  }

  // Backtrack optimal alignment path from [M][N]
  const path = [];
  let currI = M;
  let currJ = N;

  while (currI > 0 || currJ > 0) {
    const action = op[currI][currJ];
    if (!action) {
      if (currJ > 0) currJ--;
      else if (currI > 0) currI--;
      else break;
      continue;
    }

    path.unshift(action);

    if (action.type === '1-to-1') {
      currI--;
      currJ--;
    } else if (action.type === '1-to-2') {
      currI--;
      currJ -= 2;
    } else if (action.type === '2-to-1') {
      currI -= 2;
      currJ--;
    } else if (action.type === 'skip-whisper') {
      currJ--;
    } else if (action.type === 'skip-ref') {
      currI--;
    }
  }

  // Construct aligned results with millisecond timestamps
  const alignedWords = [];
  let correctedCount = 0;
  let mergedCount = 0;
  let splitCount = 0;

  for (const step of path) {
    if (step.type === '1-to-1') {
      const ref = refTokens[step.i];
      const w = whisperWords[step.j];
      const isDifferent = cleanWord(w.text) !== ref.clean || w.text.trim() !== ref.display;
      if (isDifferent) correctedCount++;

      alignedWords.push({
        text: ' ' + ref.display,
        startMs: w.startMs,
        endMs: w.endMs,
        timestampMs: w.timestampMs ?? Math.round((w.startMs + w.endMs) / 2),
        confidence: w.confidence ?? 0.95,
        isCorrected: isDifferent,
        originalWhisper: w.text.trim(),
      });
    } else if (step.type === '1-to-2') {
      const ref = refTokens[step.i];
      const w1 = whisperWords[step.j];
      const w2 = whisperWords[step.j + 1];
      mergedCount++;
      correctedCount++;

      alignedWords.push({
        text: ' ' + ref.display,
        startMs: w1.startMs,
        endMs: w2.endMs,
        timestampMs: Math.round((w1.startMs + w2.endMs) / 2),
        confidence: Math.min(w1.confidence ?? 0.9, w2.confidence ?? 0.9),
        isCorrected: true,
        originalWhisper: `${w1.text.trim()} + ${w2.text.trim()}`,
      });
    } else if (step.type === '2-to-1') {
      const ref1 = refTokens[step.i];
      const ref2 = refTokens[step.i + 1];
      const w = whisperWords[step.j];
      splitCount++;
      correctedCount += 2;

      const totalLen = ref1.display.length + ref2.display.length;
      const midTime = Math.round(w.startMs + (w.endMs - w.startMs) * (ref1.display.length / totalLen));

      alignedWords.push({
        text: ' ' + ref1.display,
        startMs: w.startMs,
        endMs: midTime,
        timestampMs: Math.round((w.startMs + midTime) / 2),
        confidence: w.confidence ?? 0.9,
        isCorrected: true,
        originalWhisper: w.text.trim(),
      });

      alignedWords.push({
        text: ' ' + ref2.display,
        startMs: midTime,
        endMs: w.endMs,
        timestampMs: Math.round((midTime + w.endMs) / 2),
        confidence: w.confidence ?? 0.9,
        isCorrected: true,
        originalWhisper: w.text.trim(),
      });
    } else if (step.type === 'skip-whisper') {
      // Whisper heard a filler word that is NOT in the script (e.g. "uh", "eh")
      // We safely omit it from captions so subtitle stays clean!
    } else if (step.type === 'skip-ref') {
      // A word in reference was not picked up by Whisper
      // If previous word exists, interpolate timestamp
      const ref = refTokens[step.i];
      const prevWord = alignedWords[alignedWords.length - 1];
      if (prevWord) {
        alignedWords.push({
          text: ' ' + ref.display,
          startMs: prevWord.endMs,
          endMs: prevWord.endMs + 300,
          timestampMs: prevWord.endMs + 150,
          confidence: 0.8,
          isCorrected: true,
        });
      }
    }
  }

  return {
    alignedWords,
    stats: {
      totalWords: alignedWords.length,
      correctedCount,
      mergedCount,
      splitCount,
    },
  };
}

