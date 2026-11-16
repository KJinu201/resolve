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