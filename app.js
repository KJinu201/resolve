// 화면 동작 (버튼, 화면 전환)

const form = document.getElementById("register-form");
const msg = document.getElementById("form-msg");

/** 폼에 입력된 값을 객체로 읽는다. */
function readForm() {
  return {
    subject: document.getElementById("subject").value,
    examType: document.getElementById("examType").value,
    unit: document.getElementById("unit").value,
    question: document.getElementById("question").value,
    answer: document.getElementById("answer").value,
    explanation: document.getElementById("explanation").value,
    source: document.getElementById("source").value,
    reason: document.getElementById("reason").value
  };
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

  addQuestion(createQuestion(input));
  msg.textContent = "저장했습니다. (지금까지 " + loadQuestions().length + "문항)";
  msg.className = "";
  form.reset();
});