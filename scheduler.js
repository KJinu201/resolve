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