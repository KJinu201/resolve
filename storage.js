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
    // 깨진 데이터를 그대로 두면 다음 저장 때 덮어써져 사라지므로, 다른 이름으로 따로 보관한다
    localStorage.setItem(STORAGE_KEY + "-broken", text);
    console.error("저장된 데이터를 읽지 못했습니다. 원래 내용은 '" + STORAGE_KEY + "-broken'에 보관했습니다.", e);
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
/**
 * id가 같은 문항의 내용을 바꿔 저장한다.
 * @param {string} id
 * @param {Object} changes 바꿀 항목만 담은 객체
 * @returns {boolean} 찾아서 바꿨으면 true
 */
function updateQuestion(id, changes) {
  const list = loadQuestions();
  const index = list.findIndex(q => q.id === id);
  if (index === -1) return false;
  list[index] = { ...list[index], ...changes };
  saveQuestions(list);
  return true;
}

/**
 * id가 같은 문항을 지운다.
 * @param {string} id
 * @returns {boolean} 찾아서 지웠으면 true
 */
function deleteQuestion(id) {
  const list = loadQuestions();
  const next = list.filter(q => q.id !== id);
  if (next.length === list.length) return false;
  saveQuestions(next);
  return true;
}
