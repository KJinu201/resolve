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