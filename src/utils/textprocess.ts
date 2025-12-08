const MIN_CHUNK_LEN = 15;

const ABBREVIATIONS = new Set([
  "mr",
  "mrs",
  "ms",
  "dr",
  "prof",
  "sr",
  "jr",
  "st",
  "etc",
  "e.g",
  "i.e",
]);

const isSentenceBoundary = (text: string, idx: number): boolean => {
  const ch = text[idx];
  if (!/[.!?]/.test(ch)) return false;

  // Ellipsis "..." -> not a boundary
  if (ch === "." && text.slice(idx, idx + 3) === "...") return false;

  const prev = text[idx - 1] ?? "";
  const next = text[idx + 1] ?? "";

  // Decimal numbers like 3.14
  if (ch === "." && /\d/.test(prev) && /\d/.test(next)) return false;

  // Abbreviations like "Mr.", "Dr."
  if (ch === ".") {
    const before = text.slice(0, idx).trimEnd();
    const lastSpace = before.lastIndexOf(" ");
    const word = before
      .slice(lastSpace + 1)
      .toLowerCase()
      .replace(/[^a-z.]/g, "");
    if (ABBREVIATIONS.has(word)) return false;
  }

  return true;
};

export const splitTextToChunks = (text: string): string[] => {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const sentences: string[] = [];
  let start = 0;

  for (let i = 0; i < trimmed.length; i++) {
    if (!isSentenceBoundary(trimmed, i)) continue;

    const end = i + 1;
    const rawtext = trimmed.slice(start, end).trim();
    if (rawtext) sentences.push(rawtext);

    let j = end;
    while (j < trimmed.length && /\s/.test(trimmed[j])) j++;
    start = j;
    i = j - 1;
  }

  if (start < trimmed.length) {
    const last = trimmed.slice(start).trim();
    if (last) sentences.push(last);
  }

  const chunks: string[] = [];
  let buf = "";

  for (const s of sentences) {
    if (buf.length < MIN_CHUNK_LEN) {
      buf = buf + " " + s;
    } else {
      chunks.push(buf.trim());
      buf = s;
    }
  }
  if (buf.length > 0) {
    if (buf.length < MIN_CHUNK_LEN) {
      const lastChunk = chunks[chunks.length - 1];
      const newChunk = lastChunk + " " + buf;
      chunks.push(newChunk.trim());
    } else {
      chunks.push(buf.trim());
    }
  }

  return chunks;
};

export function highlightDifferences(
  originalText: string,
  newText: string
): string {
  // 1. 문장을 공백을 기준으로 단어 배열로 분리
  const originalWords = originalText
    .split(/\s+/)
    .filter((word) => word.length > 0);
  const newWords = newText.split(/\s+/).filter((word) => word.length > 0);

  const result: string[] = [];
  let wrongWords = 0;

  let originIndex = 0;
  let newIndex = 0;
  while (originIndex < originalWords.length && newIndex < newWords.length) {
    const originalWord = originalWords[originIndex];
    const newWord = newWords[newIndex];

    console.log(originalWord, newWord);

    if (originalWord === newWord) {
      result.push(newWord);
      originIndex += 1;
      newIndex += 1;
      continue;
    } else {
      wrongWords += 1;
      if (newWords.includes(originalWord)) {
        // 없는게 추가된 것.
        result.push(`<span class="text-red-700">${newWord}</span>`);
        newIndex += 1;
      } else if (originalWords.includes(newWord)) {
        // 있는걸 아예 빠뜨린 것.
        result.push(`<span class="text-red-700">(${originalWord})</span>`);
        originIndex += 1;
      } else {
        // 잘못 말한 것.
        result.push(`<span class="text-red-700">${newWord}</span>`);
        originIndex += 1;
        newIndex += 1;
      }
    }
  }

  return result.join(" ");
}

function diffWords(ref: string, hyp: string) {
  const R = ref.split(/\s+/);
  const H = hyp.split(/\s+/);

  const m = R.length;
  const n = H.length;

  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (R[i - 1] === H[j - 1]) dp[i][j] = dp[i - 1][j - 1];
      else
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1, // delete
          dp[i][j - 1] + 1, // insert
          dp[i - 1][j - 1] + 1 // substitute
        );
    }
  }

  // Backtrack
  let i = m,
    j = n;
  const ops: { type: string; ref?: string; hyp?: string }[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && R[i - 1] === H[j - 1]) {
      ops.push({ type: "equal", ref: R[i - 1] });
      i--;
      j--;
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      ops.push({ type: "delete", ref: R[i - 1] });
      i--;
    } else if (j > 0 && dp[i][j] === dp[i][j - 1] + 1) {
      ops.push({ type: "insert", hyp: H[j - 1] });
      j--;
    } else {
      ops.push({ type: "substitute", ref: R[i - 1], hyp: H[j - 1] });
      i--;
      j--;
    }
  }

  return ops.reverse();
}
export function highlightDifferences2(originalText: string, newText: string) {
  const ops = diffWords(
    originalText.replace(/\./g, "").trim(),
    newText.replace(/\./g, "").trim()
  );

  const result = ops.map((op) => {
    if (op.type === "equal") return op.ref;
    if (op.type === "insert")
      return `<span class="text-red-700">${op.hyp}</span>`;
    if (op.type === "delete")
      return `<span class="text-red-700">(${op.ref})</span>`;
    if (op.type === "substitute")
      return `<span class="text-red-700">${op.hyp}</span>`;
  });
  console.log("결과 : ", result.join(" "));

  return result.join(" ");
}
