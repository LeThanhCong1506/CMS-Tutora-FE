export type DiffToken = { text: string; type: 'same' | 'removed' | 'added' };

type RawToken = { text: string; isSpace: boolean };

// Words and whitespace as separate raw tokens — kept apart deliberately (see below) rather than
// glued together, so re-joining them still reproduces the original text exactly.
const tokenizeRaw = (text: string): RawToken[] => {
  const matches = text.match(/\s+|\S+/g) ?? [];
  return matches.map((t) => ({ text: t, isSpace: t.trim().length === 0 }));
};

// Consecutive tokens of the same type render as one span instead of one-per-word, so a multi-word
// change reads as a single continuous highlight rather than a row of separate chips.
const mergeAdjacent = (tokens: DiffToken[]): DiffToken[] => {
  const merged: DiffToken[] = [];
  for (const token of tokens) {
    const last = merged[merged.length - 1];
    if (last && last.type === token.type) {
      last.text += token.text;
    } else {
      merged.push({ ...token });
    }
  }
  return merged;
};

// Above this many word-pairs the O(n*m) LCS table gets too large to build on every render;
// fall back to marking the whole field changed rather than freezing the tab on a huge bio.
const MAX_DIFF_CELLS = 400_000;

/**
 * Word-level diff between two texts, for highlighting exactly what changed inside a field
 * instead of just showing the old/new blocks side by side. Returns two token streams —
 * `before` (for the "Hiện tại" column, with `removed` marking what the proposal drops) and
 * `after` (for the "Đề xuất" column, with `added` marking what the proposal introduces).
 *
 * Matching runs on WORDS only, ignoring whitespace entirely — a lone space is common enough
 * that letting it participate in the match either (a) lets it coincidentally "match" between
 * two genuinely different words and chop one changed phrase into fragments with unhighlighted
 * gaps, or (b) if glued onto the preceding word instead, makes that word's token depend on
 * whether anything follows it — so appending text right after an unchanged word (e.g. "nhé!"
 * gaining a trailing " Hãy...") would wrongly mark "nhé!" itself as removed, just because it
 * now has a trailing space it didn't have before. Diffing words alone avoids both failure modes;
 * each whitespace token is then reattached with the same same/removed/added type as the word
 * immediately before it, since that's whose presence it depends on.
 */
export function diffWords(oldText: string, newText: string): { before: DiffToken[]; after: DiffToken[] } {
  const rawA = tokenizeRaw(oldText);
  const rawB = tokenizeRaw(newText);
  const wordsA = rawA.filter((t) => !t.isSpace).map((t) => t.text);
  const wordsB = rawB.filter((t) => !t.isSpace).map((t) => t.text);
  const n = wordsA.length;
  const m = wordsB.length;

  let wordTypesA: DiffToken['type'][];
  let wordTypesB: DiffToken['type'][];

  if (n * m > MAX_DIFF_CELLS) {
    wordTypesA = wordsA.map(() => 'removed');
    wordTypesB = wordsB.map(() => 'added');
  } else {
    // dp[i][j] = length of the longest common subsequence of wordsA[i:] and wordsB[j:].
    const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        dp[i][j] = wordsA[i] === wordsB[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }

    wordTypesA = [];
    wordTypesB = [];
    let i = 0;
    let j = 0;
    while (i < n && j < m) {
      if (wordsA[i] === wordsB[j]) {
        wordTypesA.push('same');
        wordTypesB.push('same');
        i++;
        j++;
      } else if (dp[i + 1][j] >= dp[i][j + 1]) {
        wordTypesA.push('removed');
        i++;
      } else {
        wordTypesB.push('added');
        j++;
      }
    }
    while (i < n) {
      wordTypesA.push('removed');
      i++;
    }
    while (j < m) {
      wordTypesB.push('added');
      j++;
    }
  }

  // Walks the ORIGINAL word+whitespace sequence, tagging each word with its computed diff type
  // and each whitespace run with the type of the word right before it (or 'same' for a leading
  // run, since there is no preceding word to inherit from).
  const attachTypes = (rawTokens: RawToken[], wordTypes: DiffToken['type'][]): DiffToken[] => {
    const out: DiffToken[] = [];
    let wordIndex = 0;
    let lastType: DiffToken['type'] = 'same';
    for (const token of rawTokens) {
      if (token.isSpace) {
        out.push({ text: token.text, type: lastType });
      } else {
        lastType = wordTypes[wordIndex++];
        out.push({ text: token.text, type: lastType });
      }
    }
    return out;
  };

  return {
    before: mergeAdjacent(attachTypes(rawA, wordTypesA)),
    after: mergeAdjacent(attachTypes(rawB, wordTypesB)),
  };
}
