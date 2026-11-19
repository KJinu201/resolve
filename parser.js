// 붙여넣은 문제 글을 문제·보기·정답·해설로 나눈다 (등록 폼 자동 채우기)

const CIRCLED = ["①", "②", "③", "④", "⑤"];

/** 문제 풀이 사이트의 버튼·안내 문구처럼 문항 내용이 아닌 줄 */
const NOISE_PATTERNS = [
  /^SQL CODE$/i, /^복사$/, /^보기 선택/, /^해설 (먼저 보기|접기)$/, /^건너뛰기$/,
  /^다음 문제(로 이동)?$/, /^정답 확인$/, /^문제 북마크$/, /^오류 신고$/,
  /^(정답|오답)입니다/, /^틀린 문제는 오답노트/, /^훌륭합니다/, /연속 정답 콤보/,
  /^최근 풀이 결과/, /^ADVERTISEMENT$/i
];

/** 화면에는 안 보이지만 복사하면 끼어드는 문자 (폭 0 공백, 그림 자리 표시 문자 등) */
const INVISIBLE_CHARS = /[\u200B-\u200D\u2060\uFEFF\uFFFC]/g;

/** "정답: ③", "정답 4번", "오답입니다 정답 4번" 같은 정답 줄 */
const ANSWER_PATTERNS = [
  /^(?:정답|답)\s*[:：]?\s*([1-5①-⑤])\s*번?$/,
  /^(?:정답|오답)입니다.*\s정답\s*([1-5①-⑤])\s*번$/
];

/** 보기 옆에 붙는 '정답' 표시 (풀이 결과 화면을 복사한 경우) */
const ANSWER_MARK = /^정답$/;

/** 사이트의 "보기 선택 (4지선다)" 줄. 이 줄 뒤부터 보기이고, 괄호 속 숫자가 보기 개수 */
const CHOICE_HEADER = /^보기 선택\s*\((\d)지선다\)/;
/** 그림 자리에 복사되는 글자 (그림 속 내용은 복사되지 않음) */
const IMAGE_LINE = /^문제\s*자료\s*이미지\s*\d*$/;
/** 보기 선택 줄이 있던 자리 표시 (실제 글에는 나올 수 없는 글자) */
const CHOICE_START = "\u0000보기시작";

/** "해설", "해설: 내용" 처럼 해설이 시작되는 줄 */
const EXPL_HEADER = /^(?:상세\s*해설|해설|풀이)\s*(?:[:：]\s*(.*))?$/;
/** 해설 앞에 붙는 다른 제목 줄 (제목은 버리고 내용만 해설에 넣음) */
const EXPL_TITLE = /^(?:핵심 출제 포인트|수험생 빈출 오답 함정|핵심 개념 요약|빈출 함정 주의)/;

/**
 * 보기 번호 읽는 방법. 앞에 있는 형식부터 시도한다.
 * 각 함수는 줄 하나를 받아 {no, text} 또는 null을 돌려준다.
 */
const CHOICE_FORMATS = [
  // ① 내용
  line => {
    const m = line.match(/^([①-⑤])\s*(.*)$/);
    return m ? { no: CIRCLED.indexOf(m[1]) + 1, text: m[2] } : null;
  },
  // 1) 내용 / (1) 내용 / 1. 내용 / 1번 내용
  line => {
    const m = line.match(/^(?:\(([1-5])\)\s*|([1-5])\)\s*|([1-5])\.\s+|([1-5])\s*번[.)]?\s+)(.+)$/);
    return m ? { no: Number(m[1] || m[2] || m[3] || m[4]), text: m[5] } : null;
  },
  // 번호만 있는 줄, 내용은 다음 줄 (사이트 화면을 복사하면 이렇게 나옴)
  line => {
    const m = line.match(/^([1-5])$/);
    return m ? { no: Number(m[1]), text: "" } : null;
  }
];

/** 비교용으로 줄 앞뒤 공백과 앞에 붙은 체크 표시를 뗀다. */
function cleanLine(line) {
  return line.trim().replace(/^[✓✔✗✕×]\s*/, "");
}

/** ①~⑤나 1~5를 숫자로 바꾼다. */
function toChoiceNo(ch) {
  const i = CIRCLED.indexOf(ch);
  return i >= 0 ? i + 1 : Number(ch);
}

/**
 * start 줄부터 보기 1, 2, 3 … 순서로 읽는다.
 * 다음 번호가 나오기 전까지의 줄은 앞 보기의 내용으로 이어 붙인다.
 * @returns {{choices: string[], marked: number|null}|null} 보기 2개 이상을 읽지 못하면 null
 */
function readChoicesFrom(lines, start, read) {
  const first = read(cleanLine(lines[start]));
  if (!first || first.no !== 1) return null;

  const parts = [first.text ? [first.text] : []];
  let marked = null;
  for (let i = start + 1; i < lines.length; i++) {
    const line = cleanLine(lines[i]);
    const current = parts[parts.length - 1];
    const next = read(line);
    // 앞 보기에 내용이 있어야 다음 번호로 넘어감 (보기 내용이 숫자일 때 헷갈리지 않게)
    if (next && next.no === parts.length + 1 && current.length > 0 && parts.length < 5) {
      parts.push(next.text ? [next.text] : []);
    } else if (ANSWER_MARK.test(line)) {
      marked = parts.length;
    } else {
      current.push(lines[i]);
    }
  }

  const choices = parts.map(p => p.join("\n").trim());
  if (choices.length < 2 || choices.some(c => !c)) return null;
  return { choices, marked };
}

/**
 * "보기 선택 (N지선다)" 뒤의 보기를 읽는다. (번호만 있는 줄 + 내용 줄)
 * 사이트는 정답 보기의 번호 자리에 체크 아이콘을 넣어 복사하면 그 번호 하나가 빠진다.
 * 빠진 번호는 앞 보기의 마지막 줄을 떼어 채우고, 그 보기를 정답 후보로 본다.
 * @param {string[]} lines 보기 선택 줄 뒤의 줄들
 * @param {number} n 보기 개수
 * @returns {{choices: string[], marked: number|null}|null} n개를 읽지 못하면 null
 */
function readNumberedRegion(lines, n) {
  const parts = [];
  let missing = null; // 번호가 빠진 보기
  let marked = null;  // 보기 옆 '정답' 표시가 붙은 보기
  for (const raw of lines) {
    const line = cleanLine(raw);
    const no = /^[1-5]$/.test(line) ? Number(line) : null;
    const cur = parts[parts.length - 1];
    if (no === parts.length + 1 && (parts.length === 0 || cur.length > 0)) {
      parts.push([]);
    } else if (no === parts.length + 2 && cur && cur.length >= 2) {
      parts.push([cur.pop()]);           // 앞 보기의 마지막 줄이 번호 빠진 보기
      missing = parts.length;
      parts.push([]);
    } else if (ANSWER_MARK.test(line)) {
      marked = parts.length;
    } else if (parts.length === 0) {
      parts.push([raw]);                 // 첫 보기의 번호가 빠짐
      missing = 1;
    } else {
      cur.push(raw);
    }
  }
  // 마지막 보기의 번호가 빠진 경우
  const last = parts[parts.length - 1];
  if (parts.length === n - 1 && missing === null && last && last.length >= 2) {
    parts.push([last.pop()]);
    missing = n;
  }

  const choices = parts.map(p => p.join("\n").trim());
  if (choices.length !== n || choices.some(c => !c)) return null;
  return { choices, marked: missing !== null ? missing : marked };
}

/**
 * 문제 부분에서 보기를 찾는다. 형식별로 보기 1이 시작될 수 있는 줄을 모두 시도해
 * 보기가 가장 많이 읽히는 위치를 고른다. (같으면 뒤쪽: 문제 안의 번호 목록보다 보기가 뒤에 있으므로)
 */
function findChoices(lines) {
  for (const read of CHOICE_FORMATS) {
    let best = null;
    for (let start = 0; start < lines.length; start++) {
      const r = readChoicesFrom(lines, start, read);
      if (r && (!best || r.choices.length >= best.choices.length)) best = { ...r, start };
    }
    if (best) return best;
  }
  return null;
}

/**
 * 붙여넣은 문제 글을 등록 폼 칸에 맞게 나눈다.
 * 찾지 못한 부분은 빈 문자열로 돌려주고, 보기를 못 찾으면 글 전체를 문제로 본다.
 * @param {string} text 복사해 붙여넣은 글
 * @returns {{question: string, choices: string[], answerNo: number|null, answer: string,
 *   explanation: string, unit: string, hasImage: boolean}|null} 글이 비어 있으면 null
 */
function parsePastedQuestion(text) {
  if (typeof text !== "string" || !text.trim()) return null;

  let lines = text.split(/\r?\n/)
    .map(l => l.replace(INVISIBLE_CHARS, "").replace(/\s+$/, ""))
    .filter(l => l.trim());

  // "Q.4 / 300" 같은 문제 번호 표시가 있으면 그 뒤부터 (앞쪽 메뉴·과목·난이도 글자 제외)
  // 그 앞에 "2과목 …" 배지가 있으면 바로 다음 줄(예: "TopN쿼리")을 단원으로 쓴다
  let unit = "";
  const qMark = lines.findIndex(l => /^Q\.\s*\d+\s*\/\s*\d+$/i.test(cleanLine(l)));
  if (qMark >= 0) {
    const head = lines.slice(0, qMark).map(cleanLine);
    const s = head.findIndex(l => /^\d과목\s/.test(l));
    if (s >= 0 && s + 1 < head.length) unit = head[s + 1];
    lines = lines.slice(qMark + 1);
  }

  // 그림 자리 글자는 빼고, 그림이 있었다는 것만 기억한다
  let hasImage = false;
  lines = lines.filter(l => {
    if (!IMAGE_LINE.test(cleanLine(l))) return true;
    hasImage = true;
    return false;
  });

  // "보기 선택 (N지선다)" 줄은 보기 개수를 읽고 자리 표시로 바꿔 둔다
  let choiceCount = null;
  lines = lines.map(l => {
    const m = cleanLine(l).match(CHOICE_HEADER);
    if (!m || choiceCount !== null) return l;
    choiceCount = Number(m[1]);
    return CHOICE_START;
  });

  // 정답 줄은 따로 읽고 본문에서 뺀다
  let answerNo = null;
  lines = lines.filter(l => {
    const line = cleanLine(l);
    for (const re of ANSWER_PATTERNS) {
      const m = line.match(re);
      if (m) {
        if (answerNo === null) answerNo = toChoiceNo(m[1]);
        return false;
      }
    }
    return true;
  });

  // 버튼·안내 문구 줄 제거
  lines = lines.filter(l => !NOISE_PATTERNS.some(re => re.test(cleanLine(l))));

  // 해설 시작 위치에서 나눈다
  const explStart = lines.findIndex(l => EXPL_HEADER.test(cleanLine(l)) || EXPL_TITLE.test(cleanLine(l)));
  const body = explStart >= 0 ? lines.slice(0, explStart) : lines;
  const explLines = [];
  if (explStart >= 0) {
    lines.slice(explStart).forEach(l => {
      const line = cleanLine(l);
      const m = line.match(EXPL_HEADER);
      if (m) {
        if (m[1]) explLines.push(m[1]);
      } else if (!EXPL_TITLE.test(line) && !ANSWER_MARK.test(line)) {
        explLines.push(line);
      }
    });
  }
  const explanation = [...new Set(explLines)].join("\n"); // 같은 문장이 두 번 나오면 한 번만

  // 보기 찾기: "보기 선택 (N지선다)" 자리가 있으면 그 뒤에서 N개를 읽고, 없거나 실패하면 형식별로 찾는다
  let found = null;
  let stemEnd = body.length;
  const startAt = body.indexOf(CHOICE_START);
  if (startAt >= 0) {
    const r = readNumberedRegion(body.slice(startAt + 1), choiceCount);
    if (r) {
      found = r;
      stemEnd = startAt;
    }
  }
  const rest = body.filter(l => l !== CHOICE_START);
  if (!found) {
    found = findChoices(rest);
    stemEnd = found ? found.start : rest.length;
  }
  const stemLines = rest.slice(0, stemEnd).filter(l => !ANSWER_MARK.test(cleanLine(l)));
  if (stemLines.length > 0) {
    stemLines[0] = stemLines[0].trim().replace(/^(?:문제\s*)?\d+\s*(?:\.\s+|\)\s*)/, ""); // 앞의 문제 번호 제거 ("1.5배" 같은 숫자는 그대로)
  }
  const stem = stemLines.join("\n").trim();
  const choices = found ? found.choices : [];
  if (answerNo === null && found && found.marked) answerNo = found.marked;

  const question = choices.length > 0
    ? (stem ? stem + "\n\n" : "") + choices.map((c, i) => CIRCLED[i] + " " + c).join("\n")
    : stem;

  let answer = "";
  if (answerNo !== null) {
    answer = choices[answerNo - 1] !== undefined
      ? CIRCLED[answerNo - 1] + " " + choices[answerNo - 1]
      : answerNo + "번";
  }

  return { question, choices, answerNo, answer, explanation, unit, hasImage };
}
