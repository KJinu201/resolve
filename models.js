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
    id: "q" + Date.now(),
    examType: input.examType,
    subject: input.subject.trim(),
    unit: input.unit.trim(),
    question: input.question.trim(),
    answer: input.answer.trim(),
    explanation: input.explanation.trim(),
    source: input.source.trim(),
    reason: input.reason.trim(),
    box: 1,
    nextReview: todayStr(),
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