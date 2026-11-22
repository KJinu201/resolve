/**
 * 오답 문항 하나의 모양
 * @typedef {Object} Question
 * @property {string}  id          고유 번호 (예: "q1731730000000")
 * @property {string}  examType    "필기" 또는 "실기"
 * @property {string}  subject     과목 (예: "SQLD", "정보처리산업기사")
 * @property {string}  unit        단원
 * @property {string}  question    문제
 * @property {string}  answer      정답
 * @property {string}  explanation 해설
 * @property {string}  source      출처 (예: "2024년 1회")
 * @property {string}  reason      틀린 이유
 * @property {number}  box         상자 번호 1~5
 * @property {string}  nextReview  다음 복습일 "YYYY-MM-DD" (로컬 날짜)
 * @property {boolean} done        상자 5까지 통과해 졸업했는지
 * @property {{date: string, correct: boolean}[]} history 풀이 기록
 */

/**
 * 등록 폼에서 받은 값으로 새 문항을 만든다. 새 문항은 상자 1에서 시작한다.
 * @param {Object} input 폼에서 읽은 값
 * @returns {Question}
 */
function createQuestion(input) {
  return {
    id: "q-" + crypto.randomUUID(),
    examType: input.examType,
    subject: input.subject.trim(),
    unit: input.unit.trim(),
    question: input.question.trim(),
    answer: input.answer.trim(),
    explanation: input.explanation.trim(),
    source: input.source.trim(),
    reason: input.reason.trim(),
    box: 1,
    nextReview: addDays(todayStr(), 1), // 상자 1 간격(1일): 내일부터 복습
    done: false,
    history: []
  };
}

/**
 * 필수 칸이 비었는지 검사한다.
 * @param {Object} input 폼에서 읽은 값
 * @returns {string[]} 빠진 칸 이름 목록 (비어 있으면 통과)
 */
function validateQuestion(input) {
  const missing = [];
  if (!input.subject.trim()) missing.push("과목");
  if (!input.question.trim()) missing.push("문제");
  if (!input.answer.trim()) missing.push("정답");
  return missing;
}

const CHOICE_MARKS = ["①", "②", "③", "④", "⑤"];

/**
 * 정답 글이 보기 번호 표시(①~⑤)로 시작하면 번호를 돌려준다.
 * @param {string} answer 정답 글
 * @returns {number|null} 1~5 또는 null
 */
function getAnswerNo(answer) {
  if (typeof answer !== "string" || !answer) return null;
  const i = CHOICE_MARKS.indexOf(answer[0]);
  return i >= 0 ? i + 1 : null;
}

/**
 * 문제 글에서 줄 맨 앞이 보기 번호 표시(①~⑤)인 줄 개수를 센다.
 * @param {string} question 문제 글
 * @returns {number}
 */
function countChoices(question) {
  if (typeof question !== "string" || !question) return 0;
  return question
    .split(/\r?\n/)
    .filter(line => /^[①②③④⑤]/.test(line))
    .length;
}
/**
 * 조회 조건에 맞는 문항만 골라낸다. 조건이 빈 값이면 그 조건은 검사하지 않는다.
 * @param {Question[]} list
 * @param {{subject: string, examType?: string, unit?: string, box: string, keyword: string}} filter
 *   examType은 "필기"·"실기", box는 "1"~"5" 또는 "done"(졸업). examType·unit은 빼도 됨
 * @returns {Question[]}
 */
function filterQuestions(list, filter) {
  const keyword = filter.keyword.trim().toLowerCase();
  return list.filter(q => {
    if (filter.subject && q.subject !== filter.subject) return false;
    if (filter.examType && q.examType !== filter.examType) return false;
    if (filter.unit && q.unit !== filter.unit) return false;
    if (filter.box === "done" && !q.done) return false;
    if (filter.box && filter.box !== "done" && (q.done || String(q.box) !== filter.box)) return false;
    if (keyword) {
      const text = [q.question, q.answer, q.explanation, q.unit, q.reason, q.source]
        .join(" ").toLowerCase();
      if (!text.includes(keyword)) return false;
    }
    return true;
  });
}
