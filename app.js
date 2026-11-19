// 화면 동작 (버튼, 화면 전환, 오늘의 복습·퀴즈)

const form = document.getElementById("register-form");
const msg = document.getElementById("form-msg");
const formTitle = document.getElementById("form-title");
const submitBtn = document.getElementById("submit-btn");
const cancelBtn = document.getElementById("cancel-edit");

const FIELDS = ["subject", "examType", "unit", "question", "answer", "explanation", "source", "reason"];

let editingId = null; // 수정 중인 문항 id (등록 중이면 null)

/* ---------- 화면 전환 ---------- */

/** 이름에 맞는 화면 하나만 보여 준다. */
function showScreen(name) {
  document.querySelectorAll("section").forEach(sec => {
    sec.classList.toggle("hidden", sec.id !== name);
  });
  document.querySelectorAll("nav button").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.screen === name);
  });
  if (name === "list") renderList();
  if (name === "review") renderReview();
}

document.querySelectorAll("nav button").forEach(btn => {
  btn.addEventListener("click", () => showScreen(btn.dataset.screen));
});

/* ---------- 등록·수정 폼 ---------- */

/** 폼에 입력된 값을 객체로 읽는다. */
function readForm() {
  const input = {};
  FIELDS.forEach(name => {
    input[name] = document.getElementById(name).value;
  });
  return input;
}

/** 문항 내용을 폼에 채운다. (수정할 때 사용) */
function fillForm(q) {
  FIELDS.forEach(name => {
    document.getElementById(name).value = q[name];
  });
}

/** 폼을 등록 상태로 되돌린다. */
function resetForm() {
  editingId = null;
  form.reset();
  formTitle.textContent = "오답 등록";
  submitBtn.textContent = "저장";
  cancelBtn.classList.add("hidden");
}

/** 수정 상태로 바꾸고 등록 화면으로 이동한다. */
function startEdit(q) {
  editingId = q.id;
  fillForm(q);
  formTitle.textContent = "오답 수정";
  submitBtn.textContent = "수정 저장";
  cancelBtn.classList.remove("hidden");
  msg.textContent = "";
  showScreen("register");
}

form.addEventListener("submit", function (event) {
  event.preventDefault(); // 페이지가 새로고침되지 않게 막음

  const input = readForm();
  const missing = validateQuestion(input);

  if (missing.length > 0) {
    msg.textContent = missing.join(", ") + "을(를) 입력해 주세요.";
    msg.className = "error";
    return; // 저장하지 않음
  }

  if (editingId) {
    // 수정: 입력 칸만 바꾸고 상자·복습일·기록은 그대로 둔다
    const changes = {};
    FIELDS.forEach(name => {
      changes[name] = name === "examType" ? input[name] : input[name].trim();
    });
    let updated;
    try {
      updated = updateQuestion(editingId, changes);
    } catch (e) {
      msg.textContent = "저장하지 못했습니다. 브라우저 저장 공간을 확인해 주세요.";
      msg.className = "error";
      return;
    }
    if (!updated) {
      // 수정하는 사이에 조회 화면에서 그 문항을 지운 경우
      resetForm();
      msg.textContent = "수정할 문항을 찾지 못했습니다. 이미 삭제되었을 수 있습니다.";
      msg.className = "error";
      return;
    }
    resetForm();
    msg.textContent = "";
    showScreen("list");
    return;
  }

  try {
    addQuestion(createQuestion(input));
  } catch (e) {
    msg.textContent = "저장하지 못했습니다. 브라우저 저장 공간을 확인해 주세요.";
    msg.className = "error";
    return;
  }
  msg.textContent = "저장했습니다. (지금까지 " + loadQuestions().length + "문항)";
  msg.className = "";
  form.reset();
});

cancelBtn.addEventListener("click", () => {
  resetForm();
  msg.textContent = "";
  showScreen("list");
});

/* ---------- 조회 ---------- */

const listEl = document.getElementById("question-list");
const countEl = document.getElementById("list-count");
const subjectSel = document.getElementById("filter-subject");
const boxSel = document.getElementById("filter-box");
const keywordInput = document.getElementById("filter-keyword");

/** 과목 선택 목록을 저장된 과목으로 다시 채운다. (고르던 값은 유지) */
function refreshSubjectOptions(list) {
  const current = subjectSel.value;
  const subjects = [...new Set(list.map(q => q.subject))].sort();
  subjectSel.innerHTML = '<option value="">전체 과목</option>';
  subjects.forEach(s => {
    const opt = document.createElement("option");
    opt.value = s;
    opt.textContent = s;
    subjectSel.appendChild(opt);
  });
  subjectSel.value = subjects.includes(current) ? current : "";
}

/** 문항 하나를 목록 카드로 만든다. (입력값은 textContent로만 넣어 HTML로 해석되지 않게 함) */
function makeItem(q) {
  const div = document.createElement("div");
  div.className = "item";

  const meta = document.createElement("div");
  meta.className = "meta";
  const boxText = q.done ? "졸업" : "상자 " + q.box;
  meta.textContent = [q.subject, q.examType, q.unit, boxText, "다음 복습 " + q.nextReview]
    .filter(Boolean).join(" · ");

  const text = document.createElement("div");
  text.className = "q";
  text.textContent = q.question;

  const editBtn = document.createElement("button");
  editBtn.textContent = "수정";
  editBtn.addEventListener("click", () => startEdit(q));

  const delBtn = document.createElement("button");
  delBtn.textContent = "삭제";
  delBtn.className = "del";
  delBtn.addEventListener("click", () => {
    if (confirm("이 문항을 삭제할까요?")) {
      try {
        const deleted = deleteQuestion(q.id);
        renderList();
        if (!deleted) {
          // 다른 탭 등에서 이미 지워진 경우: 목록을 새로 그린 뒤 안내
          countEl.textContent = "이미 삭제된 문항입니다.";
        }
      } catch (e) {
        countEl.textContent = "저장하지 못했습니다. 브라우저 저장 공간을 확인해 주세요.";
      }
    }
  });

  div.append(meta, text, editBtn, " ", delBtn);
  return div;
}

/** 조건에 맞는 문항으로 목록을 다시 그린다. */
function renderList() {
  const all = loadQuestions();
  refreshSubjectOptions(all);
  const shown = filterQuestions(all, {
    subject: subjectSel.value,
    box: boxSel.value,
    keyword: keywordInput.value
  });

  listEl.innerHTML = "";
  shown.forEach(q => listEl.appendChild(makeItem(q)));
  countEl.textContent = all.length === 0
    ? "등록된 문항이 없습니다."
    : "전체 " + all.length + "문항 중 " + shown.length + "문항";
}

subjectSel.addEventListener("change", renderList);
boxSel.addEventListener("change", renderList);
keywordInput.addEventListener("input", renderList);

/* ---------- 오늘의 복습·퀴즈 ---------- */

const reviewStartEl = document.getElementById("review-start");
const reviewCountEl = document.getElementById("review-count");
const startReviewBtn = document.getElementById("start-review");
const quizEl = document.getElementById("quiz");
const quizProgressEl = document.getElementById("quiz-progress");
const quizMetaEl = document.getElementById("quiz-meta");
const quizQuestionEl = document.getElementById("quiz-question");
const quizAnswerEl = document.getElementById("quiz-answer");
const quizAnswerTextEl = document.getElementById("quiz-answer-text");
const quizExplBox = document.getElementById("quiz-explanation-box");
const quizExplEl = document.getElementById("quiz-explanation");
const showAnswerBtn = document.getElementById("show-answer");
const judgeEl = document.getElementById("judge");
const quizLastEl = document.getElementById("quiz-last");
const reviewDoneEl = document.getElementById("review-done");
const reviewResultEl = document.getElementById("review-result");
const reviewMsgEl = document.getElementById("review-msg");

/**
 * 진행 중인 복습. 시작할 때 고른 문항 id 목록을 들고 있다. (진행 중이 아니면 null)
 * 다른 화면에 다녀와도 이어서 풀 수 있게 화면과 따로 보관한다.
 */
let session = null;

/** 복습 화면의 세 부분(시작 / 퀴즈 / 결과) 중 하나만 보여 준다. */
function showReviewPart(part) {
  reviewStartEl.classList.toggle("hidden", part !== "start");
  quizEl.classList.toggle("hidden", part !== "quiz");
  reviewDoneEl.classList.toggle("hidden", part !== "done");
}

/** 오늘의 복습 화면을 그린다. 진행 중인 복습이 있으면 그 문제를 다시 보여 준다. */
function renderReview() {
  reviewMsgEl.textContent = "";
  if (session) {
    showQuizItem();
    return;
  }
  const all = loadQuestions();
  const today = todayStr();
  const dueCount = getTodayReview(all, today, all.length).length; // 개수 제한 없이 센 수
  const todayCount = getTodayReview(all, today).length;            // 오늘 풀 수 (최대 20)

  if (todayCount === 0) {
    const next = getNextReviewDate(all);
    if (all.length === 0) {
      reviewCountEl.textContent = "등록된 문항이 없습니다. 먼저 틀린 문제를 등록해 주세요.";
    } else if (next) {
      reviewCountEl.textContent = "오늘 복습할 문항이 없습니다. 다음 복습일은 " + next + "입니다.";
    } else {
      reviewCountEl.textContent = "모든 문항이 졸업했습니다.";
    }
    startReviewBtn.classList.add("hidden");
  } else {
    reviewCountEl.textContent = dueCount > todayCount
      ? "복습할 문항이 " + dueCount + "개 있습니다. 오늘은 오래된 것부터 " + todayCount + "개를 풉니다."
      : "오늘 복습할 문항은 " + todayCount + "개입니다.";
    startReviewBtn.classList.remove("hidden");
  }
  showReviewPart("start");
}

/** 오늘 풀 문항을 정해 복습을 시작한다. */
function startReview() {
  const ids = getTodayReview(loadQuestions(), todayStr()).map(q => q.id);
  if (ids.length === 0) {
    renderReview();
    return;
  }
  session = { ids: ids, index: 0, correct: 0, wrong: 0, skipped: 0 };
  quizLastEl.textContent = "";
  showQuizItem();
}

/**
 * 지금 차례의 문제를 보여 준다. 정답은 가린 상태로 시작한다.
 * 저장된 최신 내용을 다시 읽으므로, 복습 중에 조회 화면에서 고친 내용도 반영된다.
 * 그 사이 삭제된 문항은 건너뛴다.
 */
function showQuizItem() {
  const all = loadQuestions();
  let q = null;
  while (session.index < session.ids.length) {
    q = all.find(item => item.id === session.ids[session.index]);
    if (q) break;
    session.skipped++;
    session.index++;
  }
  if (!q) {
    finishReview();
    return;
  }

  quizProgressEl.textContent = (session.index + 1) + " / " + session.ids.length;
  quizMetaEl.textContent = [q.subject, q.examType, q.unit, "상자 " + q.box].filter(Boolean).join(" · ");
  quizQuestionEl.textContent = q.question;
  quizAnswerTextEl.textContent = q.answer;
  quizExplEl.textContent = q.explanation;
  quizExplBox.classList.toggle("hidden", !q.explanation);

  quizAnswerEl.classList.add("hidden");
  judgeEl.classList.add("hidden");
  showAnswerBtn.classList.remove("hidden");
  showReviewPart("quiz");
}

/** 정답과 해설을 펼치고 맞음/틀림 버튼을 보여 준다. */
function revealAnswer() {
  quizAnswerEl.classList.remove("hidden");
  showAnswerBtn.classList.add("hidden");
  judgeEl.classList.remove("hidden");
}

/**
 * 맞음/틀림을 저장하고 다음 문제로 넘어간다.
 * 저장에 실패하면 같은 문제에 머물러 다시 누를 수 있게 한다.
 * @param {boolean} correct
 */
function markAnswer(correct) {
  const id = session.ids[session.index];
  let updated;
  try {
    updated = answerQuestion(id, correct, todayStr());
  } catch (e) {
    reviewMsgEl.textContent = "저장하지 못했습니다. 브라우저 저장 공간을 확인해 주세요.";
    return;
  }
  reviewMsgEl.textContent = "";

  if (!updated) {
    session.skipped++;
    quizLastEl.textContent = "방금 문항은 이미 삭제되어 건너뛰었습니다.";
  } else {
    if (correct) session.correct++; else session.wrong++;
    quizLastEl.textContent = "방금 문항: " + (updated.done
      ? "상자 5까지 통과해 졸업했습니다."
      : "상자 " + updated.box + "(으)로 이동, 다음 복습 " + updated.nextReview);
  }
  session.index++;
  showQuizItem();
}

/** 복습을 끝내고 결과를 보여 준다. (그만하기로 중간에 끝내도 같음) */
function finishReview() {
  const s = session;
  session = null;
  const solved = s.correct + s.wrong;
  const left = s.ids.length - s.index;
  const lines = ["푼 문항 " + solved + "개 · 맞음 " + s.correct + " · 틀림 " + s.wrong];
  if (s.wrong > 0) lines.push("틀린 문항은 상자 1로 돌아가 내일 다시 나옵니다.");
  if (left > 0) lines.push("풀지 않은 " + left + "문항은 복습일이 그대로라 다음에 다시 나옵니다.");
  if (s.skipped > 0) lines.push("삭제되어 건너뛴 문항 " + s.skipped + "개");
  reviewResultEl.textContent = lines.join("\n");
  reviewMsgEl.textContent = "";
  showReviewPart("done");
}

startReviewBtn.addEventListener("click", startReview);
showAnswerBtn.addEventListener("click", revealAnswer);
document.getElementById("mark-correct").addEventListener("click", () => markAnswer(true));
document.getElementById("mark-wrong").addEventListener("click", () => markAnswer(false));
document.getElementById("stop-review").addEventListener("click", finishReview);
document.getElementById("back-review").addEventListener("click", renderReview);

// 처음 열면 오늘의 복습 화면부터 보여 준다
showScreen("review");
