// 화면 동작 (버튼, 화면 전환)

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
