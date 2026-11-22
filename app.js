// 화면 동작 (버튼, 화면 전환, 오늘의 복습·퀴즈)

const form = document.getElementById("register-form");
const msg = document.getElementById("form-msg");
const formTitle = document.getElementById("form-title");
const submitBtn = document.getElementById("submit-btn");
const cancelBtn = document.getElementById("cancel-edit");

const FIELDS = ["subject", "examType", "unit", "question", "answer", "explanation", "source", "reason"];
const SAVE_ERROR_MSG = "저장하지 못했습니다. 브라우저 저장 공간을 확인해 주세요.";

let editingId = null; // 수정 중인 문항 id (등록 중이면 null)

/** 저장 실패 안내 문구를 지정한 요소에 보여 준다. */
function showSaveError(el) {
  el.textContent = SAVE_ERROR_MSG;
}

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
  clearPaste();
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
      showSaveError(msg);
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
    showSaveError(msg);
    msg.className = "error";
    return;
  }
  msg.textContent = "저장했습니다. (지금까지 " + loadQuestions().length + "문항)";
  msg.className = "";
  form.reset();
  clearPaste();
});

cancelBtn.addEventListener("click", () => {
  resetForm();
  msg.textContent = "";
  showScreen("list");
});

/* ---------- 문제 글 붙여넣어 칸 채우기 ---------- */

const pasteText = document.getElementById("paste-text");
const pasteMsg = document.getElementById("paste-msg");
const PASTE_FIELDS = ["unit", "question", "answer", "explanation"]; // 붙여넣기로 채우는 칸

/** 붙여넣기 칸과 안내 문구를 비운다. */
function clearPaste() {
  pasteText.value = "";
  pasteMsg.textContent = "";
}

/** 무엇을 채웠고 무엇을 못 찾았는지 안내 문구를 만든다. */
function describeParse(parsed) {
  const lines = [];
  const filled = [];
  if (parsed.unit) filled.push("단원");
  filled.push(parsed.choices.length > 0 ? "문제(보기 " + parsed.choices.length + "개)" : "문제");
  if (parsed.answer) filled.push("정답 " + parsed.answer.split(" ")[0]);
  if (parsed.explanation) filled.push("해설");
  lines.push("채운 칸: " + filled.join(", ") + ". 저장 전에 내용을 확인해 주세요.");
  if (parsed.hasImage) lines.push("그림이 있는 문제입니다. 그림 속 표·내용은 글자로 복사되지 않으니 문제 칸에 직접 적어 주세요.");
  if (parsed.choices.length === 0) lines.push("보기를 찾지 못해 붙여넣은 글을 문제 칸에 그대로 넣었습니다.");
  if (!parsed.answer) lines.push("정답을 찾지 못했습니다. 정답 칸은 직접 입력해 주세요.");
  return lines.join("\n");
}

document.getElementById("paste-fill").addEventListener("click", () => {
  const parsed = parsePastedQuestion(pasteText.value);
  if (!parsed || !parsed.question) {
    pasteMsg.textContent = parsed ? "문제 부분을 찾지 못했습니다. 문제 글부터 복사해 주세요." : "붙여넣은 글이 없습니다.";
    pasteMsg.className = "error";
    return;
  }

  // 찾은 부분만 채운다. 이미 다른 내용이 적힌 칸이 있으면 먼저 묻는다.
  const toFill = PASTE_FIELDS.filter(name => parsed[name]);
  const willChange = toFill.some(name => {
    const value = document.getElementById(name).value;
    return value.trim() && value !== parsed[name];
  });
  if (willChange && !confirm("이미 입력한 단원·문제·정답·해설이 붙여넣은 내용으로 바뀝니다. 계속할까요?")) return;

  toFill.forEach(name => {
    document.getElementById(name).value = parsed[name];
  });
  msg.textContent = ""; // 앞에서 남은 "저장했습니다" 문구 지우기
  pasteMsg.textContent = describeParse(parsed);
  pasteMsg.className = parsed.answer && parsed.choices.length > 0 ? "" : "error";
});

/* ---------- 조회 ---------- */

const listEl = document.getElementById("question-list");
const countEl = document.getElementById("list-count");
const subjectSel = document.getElementById("filter-subject");
const examSel = document.getElementById("filter-exam");
const unitSel = document.getElementById("filter-unit");
const boxSel = document.getElementById("filter-box");
const keywordInput = document.getElementById("filter-keyword");

/**
 * 선택 목록을 저장된 값으로 다시 채운다. (고르던 값은 유지, 빈 값은 목록에 넣지 않음)
 * @param {HTMLSelectElement} select 채울 선택 목록
 * @param {string[]} values 문항에서 모은 값
 * @param {string} allLabel 맨 위 "전체" 항목 글자
 */
function refreshOptions(select, values, allLabel) {
  const current = select.value;
  const items = [...new Set(values.filter(Boolean))].sort();
  select.innerHTML = "";
  const all = document.createElement("option");
  all.value = "";
  all.textContent = allLabel;
  select.appendChild(all);
  items.forEach(v => {
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = v;
    select.appendChild(opt);
  });
  select.value = items.includes(current) ? current : "";
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
        showSaveError(countEl);
      }
    }
  });

  div.append(meta, text, editBtn, " ", delBtn);
  return div;
}

/** 조건에 맞는 문항으로 목록을 다시 그린다. */
function renderList() {
  const all = loadQuestions();
  refreshOptions(subjectSel, all.map(q => q.subject), "전체 과목");
  refreshOptions(unitSel, all.map(q => q.unit), "전체 단원");
  const shown = filterQuestions(all, {
    subject: subjectSel.value,
    examType: examSel.value,
    unit: unitSel.value,
    box: boxSel.value,
    keyword: keywordInput.value
  });

  listEl.innerHTML = "";
  shown.forEach(q => listEl.appendChild(makeItem(q)));
  if (all.length === 0) {
    countEl.textContent = "등록된 문항이 없습니다.";
  } else if (shown.length === 0) {
    countEl.textContent = "해당 문항 없음 (전체 " + all.length + "문항)";
  } else {
    countEl.textContent = "전체 " + all.length + "문항 중 " + shown.length + "문항";
  }
}

subjectSel.addEventListener("change", renderList);
examSel.addEventListener("change", renderList);
unitSel.addEventListener("change", renderList);
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
      ? "복습할 문항이 " + dueCount + "개 있습니다. 오늘은 상자 번호가 낮은 것부터 " + todayCount + "개를 풉니다."
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
    showSaveError(reviewMsgEl);
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
