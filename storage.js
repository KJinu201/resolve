// 저장·불러오기 (브라우저 localStorage 사용)

const STORAGE_KEY = "resolve-questions";

/**
 * 저장된 문항 목록을 불러온다. 저장된 게 없거나 깨져 있으면 빈 배열을 돌려준다.
 * @returns {Question[]}
 */
function loadQuestions() {
  const text = localStorage.getItem(STORAGE_KEY);
  if (!text) return [];
  try {
    const list = JSON.parse(text);
    return Array.isArray(list) ? list : [];
  } catch (e) {
    console.error("저장된 데이터를 읽지 못했습니다.", e);
    return [];
  }
}

/**
 * 문항 목록 전체를 저장한다.
 * @param {Question[]} list
 */
function saveQuestions(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

/**
 * 문항 하나를 목록 끝에 추가해 저장한다. (끝에 붙이므로 저장 순서 = 등록 순서)
 * @param {Question} q
 */
function addQuestion(q) {
  const list = loadQuestions();
  list.push(q);
  saveQuestions(list);
}