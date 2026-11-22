// 복습 날짜 계산

/**
 * 오늘 날짜를 "YYYY-MM-DD"로 돌려준다. (로컬 시간 기준, toISOString은 UTC라 쓰지 않음)
 * @returns {string}
 */
function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * "YYYY-MM-DD" 날짜에 n일을 더한 날짜를 돌려준다.
 * 시간대 영향을 받지 않도록 UTC 기준으로 계산한다. (월말·연말도 자동으로 넘어감)
 * @param {string} dateStr "YYYY-MM-DD"
 * @param {number} n 더할 일수
 * @returns {string} "YYYY-MM-DD"
 */
function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + n);
  return date.toISOString().slice(0, 10);
}

/** 상자별 복습 간격(일). 상자 1 = 1일, 상자 2 = 2일 … 상자 5 = 16일 */
const BOX_INTERVALS = [1, 2, 4, 8, 16];
const LAST_BOX = BOX_INTERVALS.length;

/**
 * 퀴즈 결과를 반영한 새 문항을 돌려준다. (원래 문항 객체는 바꾸지 않음)
 * - 맞음: 다음 상자로 이동하고, 그 상자 간격만큼 뒤에 다시 복습
 * - 마지막 상자(5)에서 맞음: 졸업(done = true), 더 이상 복습에 나오지 않음
 * - 틀림: 어느 상자에 있든 상자 1로 돌아가 다음 날 다시 복습
 * @param {Question} q
 * @param {boolean} correct 맞았으면 true
 * @param {string} today 오늘 날짜 "YYYY-MM-DD" (테스트에서 날짜를 고정하려고 인자로 받음)
 * @returns {Question}
 */
function applyAnswer(q, correct, today) {
  const history = [...q.history, { date: today, correct: correct }];

  if (!correct) {
    return { ...q, box: 1, nextReview: addDays(today, BOX_INTERVALS[0]), history };
  }
  if (q.box >= LAST_BOX) {
    return { ...q, done: true, history };
  }
  const nextBox = q.box + 1;
  return { ...q, box: nextBox, nextReview: addDays(today, BOX_INTERVALS[nextBox - 1]), history };
}

/**
 * 오늘 복습할 문항을 고른다. 졸업하지 않았고 복습일이 오늘이거나 지난 문항이 대상이다.
 * 계획서대로 상자 번호가 낮은 것부터, 같으면 오래 밀린 것(복습일이 이른 것)부터, 그것도 같으면 등록 순서대로 최대 limit개를 돌려준다.
 * ("YYYY-MM-DD" 문자열은 글자 순서 = 날짜 순서라서 그대로 비교한다)
 * @param {Question[]} list
 * @param {string} today "YYYY-MM-DD"
 * @param {number} [limit=20]
 * @returns {Question[]}
 */
function getTodayReview(list, today, limit = 20) {
  return list
    .filter(q => !q.done && q.nextReview <= today)
    .sort((a, b) => a.box - b.box || (a.nextReview < b.nextReview ? -1 : a.nextReview > b.nextReview ? 1 : 0))
    .slice(0, limit);
}

/**
 * 졸업하지 않은 문항 중 가장 빠른 다음 복습일을 돌려준다. (오늘 복습할 게 없을 때 안내용)
 * @param {Question[]} list
 * @returns {string|null} "YYYY-MM-DD", 복습할 문항이 하나도 없으면 null
 */
function getNextReviewDate(list) {
  const dates = list.filter(q => !q.done).map(q => q.nextReview).sort();
  return dates.length > 0 ? dates[0] : null;
}
