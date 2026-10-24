/**
 * 디지털 시민교육 퀴즈 - 로직 및 구글 시트 연동 스크립트
 */

// ⭐️ [중요] 배포한 구글 앱스 스크립트 웹앱 URL을 아래 큰따옴표 안에 입력하세요.
const SCRIPT_URL = "여기에_앱스스크립트_URL_입력";

// 상태 관리
let currentQuestionIndex = 0;
let userAnswers = {}; // { 0: 2, 1: 3, ... }
let startTime = null;
let timerInterval = null;
let totalElapsedSeconds = 0;
let studentInfo = {
  grade: "6학년",
  classNum: "",
  studentNum: ""
};

// DOM 로드 완료 시 초기화
document.addEventListener("DOMContentLoaded", () => {
  initDropdowns();
  bindEvents();
});

// 반, 번호 드롭다운 채우기 (개인정보 없이 반/번호만 선택)
function initDropdowns() {
  const classSelect = document.getElementById("class-select");
  const numberSelect = document.getElementById("number-select");

  if (classSelect) {
    for (let i = 1; i <= 15; i++) {
      const opt = document.createElement("option");
      opt.value = `${i}반`;
      opt.textContent = `${i}반`;
      classSelect.appendChild(opt);
    }
  }

  if (numberSelect) {
    for (let i = 1; i <= 35; i++) {
      const opt = document.createElement("option");
      opt.value = `${i}번`;
      opt.textContent = `${i}번`;
      numberSelect.appendChild(opt);
    }
  }
}

// 이벤트 리스너 바인딩
function bindEvents() {
  const startBtn = document.getElementById("start-btn");
  const prevBtn = document.getElementById("prev-btn");
  const nextBtn = document.getElementById("next-btn");
  const retryBtn = document.getElementById("retry-btn");

  if (startBtn) startBtn.addEventListener("click", startQuiz);
  if (prevBtn) prevBtn.addEventListener("click", goToPrevQuestion);
  if (nextBtn) nextBtn.addEventListener("click", goToNextQuestion);
  if (retryBtn) retryBtn.addEventListener("click", resetQuiz);
}

// 퀴즈 시작
function startQuiz() {
  const classVal = document.getElementById("class-select")?.value || "";
  const numberVal = document.getElementById("number-select")?.value || "";

  studentInfo.classNum = classVal ? classVal : "무기명";
  studentInfo.studentNum = numberVal ? numberVal : "무기명";

  // 화면 전환
  document.getElementById("start-screen").classList.add("hidden");
  document.getElementById("quiz-screen").classList.remove("hidden");
  document.getElementById("result-screen").classList.add("hidden");

  // 상태 초기화
  currentQuestionIndex = 0;
  userAnswers = {};
  totalElapsedSeconds = 0;
  startTime = Date.now();

  // 타이머 가동
  startTimer();

  // 첫 번째 문제 렌더링
  renderQuestion(currentQuestionIndex);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// 타이머 시작
function startTimer() {
  clearInterval(timerInterval);
  updateTimerDisplay(0);
  timerInterval = setInterval(() => {
    totalElapsedSeconds++;
    updateTimerDisplay(totalElapsedSeconds);
  }, 1000);
}

// 타이머 텍스트 표시
function updateTimerDisplay(seconds) {
  const timerElem = document.getElementById("timer-display");
  if (!timerElem) return;
  const m = String(Math.floor(seconds / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");
  timerElem.textContent = `⏱️ ${m}:${s}`;
}

// 소요시간 문자열 변환
function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m > 0) {
    return `${m}분 ${s}초`;
  }
  return `${s}초`;
}

// 문제 렌더링
function renderQuestion(index) {
  const q = QUIZ_QUESTIONS[index];
  if (!q) return;

  // 진행률 업데이트
  const progressPercent = ((index + 1) / QUIZ_QUESTIONS.length) * 100;
  const progressBar = document.getElementById("progress-bar");
  const progressText = document.getElementById("progress-text");
  if (progressBar) progressBar.style.width = `${progressPercent}%`;
  if (progressText) progressText.textContent = `${index + 1} / ${QUIZ_QUESTIONS.length}`;

  // 주제 배지
  const topicBadge = document.getElementById("topic-badge");
  if (topicBadge) {
    topicBadge.textContent = q.topicBadge;
    topicBadge.className = `inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${q.badgeColor}`;
  }

  // 문제 번호 및 제목
  const qTitle = document.getElementById("question-title");
  if (qTitle) {
    qTitle.innerHTML = `<span class="text-indigo-600 font-extrabold mr-2">Q${q.id}.</span>${q.question}`;
  }

  // 4지선다 보기 렌더링
  const optionsContainer = document.getElementById("options-container");
  if (optionsContainer) {
    optionsContainer.innerHTML = "";
    q.options.forEach((optText, optIndex) => {
      const isSelected = userAnswers[index] === optIndex;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `w-full text-left p-4 sm:p-5 rounded-2xl border-2 transition-all duration-200 flex items-start space-x-3.5 group ${
        isSelected
          ? "border-indigo-600 bg-indigo-50/80 shadow-md ring-2 ring-indigo-400/50"
          : "border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50/70"
      }`;

      // 번호 뱃지 (1, 2, 3, 4)
      const badge = document.createElement("span");
      badge.className = `flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
        isSelected
          ? "bg-indigo-600 text-white"
          : "bg-slate-100 text-slate-600 group-hover:bg-indigo-100 group-hover:text-indigo-700"
      }`;
      badge.textContent = optIndex + 1;

      // 보기 텍스트
      const textSpan = document.createElement("span");
      textSpan.className = `text-slate-800 text-sm sm:text-base leading-relaxed pt-0.5 font-medium ${
        isSelected ? "text-indigo-950 font-bold" : ""
      }`;
      textSpan.textContent = optText;

      btn.appendChild(badge);
      btn.appendChild(textSpan);

      // 선택 시 처리
      btn.addEventListener("click", () => {
        selectOption(index, optIndex);
      });

      optionsContainer.appendChild(btn);
    });
  }

  // 이전 버튼 활성화/비활성화
  const prevBtn = document.getElementById("prev-btn");
  if (prevBtn) {
    if (index === 0) {
      prevBtn.classList.add("invisible");
    } else {
      prevBtn.classList.remove("invisible");
    }
  }

  // 다음 / 제출 버튼 문구
  const nextBtn = document.getElementById("next-btn");
  if (nextBtn) {
    if (index === QUIZ_QUESTIONS.length - 1) {
      nextBtn.innerHTML = `<span>결과 확인 및 제출 📝</span>`;
      nextBtn.className = "flex-1 sm:flex-none px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-bold shadow-lg shadow-teal-500/25 hover:from-emerald-600 hover:to-teal-700 transition flex items-center justify-center space-x-2";
    } else {
      nextBtn.innerHTML = `<span>다음 문제</span><svg class="w-5 h-5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg>`;
      nextBtn.className = "flex-1 sm:flex-none px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/25 hover:from-indigo-700 hover:to-violet-700 transition flex items-center justify-center space-x-2";
    }
  }
}

// 보기 선택 함수
function selectOption(qIndex, choiceIndex) {
  userAnswers[qIndex] = choiceIndex;
  renderQuestion(qIndex);
}

// 이전 문제로 이동
function goToPrevQuestion() {
  if (currentQuestionIndex > 0) {
    currentQuestionIndex--;
    renderQuestion(currentQuestionIndex);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

// 다음 문제 또는 제출
function goToNextQuestion() {
  // 현재 문제 답안 선택 여부 검증
  if (userAnswers[currentQuestionIndex] === undefined) {
    showNoticeAlert("⚠️ 답안을 선택해 주세요!", "보기 중 가장 알맞은 답 하나를 골라야 다음으로 넘어갈 수 있어요.");
    return;
  }

  if (currentQuestionIndex < QUIZ_QUESTIONS.length - 1) {
    currentQuestionIndex++;
    renderQuestion(currentQuestionIndex);
    window.scrollTo({ top: 0, behavior: "smooth" });
  } else {
    // 10번 문제까지 모두 완료 -> 결과 처리
    finishQuiz();
  }
}

// 퀴즈 완료 및 결과 계산
function finishQuiz() {
  clearInterval(timerInterval);

  // 채점 계산
  let correctCount = 0;
  QUIZ_QUESTIONS.forEach((q, idx) => {
    if (userAnswers[idx] === q.answer) {
      correctCount++;
    }
  });

  const totalScore = correctCount * 10; // 문항당 10점 (총 100점)
  const durationText = formatDuration(totalElapsedSeconds);
  const nowTimestamp = new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });

  // 화면 전환
  document.getElementById("quiz-screen").classList.add("hidden");
  document.getElementById("result-screen").classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });

  // 결과 화면 내용 채우기
  document.getElementById("result-score").textContent = totalScore;
  document.getElementById("result-correct-count").textContent = `${correctCount} / 10`;
  document.getElementById("result-time").textContent = durationText;

  // 학생 반/번호 텍스트
  const studentTag = document.getElementById("result-student-tag");
  if (studentTag) {
    if (studentInfo.classNum === "무기명" && studentInfo.studentNum === "무기명") {
      studentTag.textContent = "6학년 익명 디지털 탐험가";
    } else {
      studentTag.textContent = `6학년 ${studentInfo.classNum} ${studentInfo.studentNum}`;
    }
  }

  // 칭호 및 메시지 부여
  const badgeTitle = document.getElementById("result-badge-title");
  const badgeDesc = document.getElementById("result-badge-desc");
  const resultIcon = document.getElementById("result-icon");

  if (totalScore === 100) {
    resultIcon.textContent = "🏆";
    badgeTitle.textContent = "최고의 마스터 디지털 시민!";
    badgeDesc.textContent = "완벽해요! 디지털 세상의 모든 위험을 슬기롭게 헤쳐 나갈 준비가 되었습니다!";
  } else if (totalScore >= 80) {
    resultIcon.textContent = "🌟";
    badgeTitle.textContent = "믿음직한 모범 디지털 시민!";
    badgeDesc.textContent = "훌륭해요! 대부분의 디지털 에티켓과 안전 수칙을 아주 잘 이해하고 있어요!";
  } else if (totalScore >= 60) {
    resultIcon.textContent = "🌱";
    badgeTitle.textContent = "무럭무럭 자라는 디지털 시민!";
    badgeDesc.textContent = "좋아요! 틀린 문제를 해설과 함께 다시 읽어보면 더욱 멋진 디지털 시민이 될 수 있어요.";
  } else {
    resultIcon.textContent = "🧭";
    badgeTitle.textContent = "열정의 디지털 탐험가!";
    badgeDesc.textContent = "아래 해설을 꼼꼼히 확인하고 다시 한번 도전해 보세요. 할 수 있어요!";
  }

  // 폭죽(콘페티) 효과 실행
  triggerConfetti();

  // 해설 및 오답노트 렌더링
  renderReviewList();

  // 구글 앱스 스크립트 전송
  sendDataToGoogleSheet({
    timestamp: nowTimestamp,
    grade: "6학년",
    classNum: studentInfo.classNum,
    studentNum: studentInfo.studentNum,
    score: totalScore,
    correctCount: correctCount,
    elapsedTime: durationText
  });
}

// 구글 시트 전송 함수
async function sendDataToGoogleSheet(data) {
  const statusElem = document.getElementById("sheet-status");
  if (!statusElem) return;

  // URL 미설정 시 안내
  if (!SCRIPT_URL || SCRIPT_URL.includes("여기에_앱스스크립트_URL_입력")) {
    statusElem.className = "p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs sm:text-sm flex items-center space-x-2";
    statusElem.innerHTML = `
      <span class="text-base">ℹ️</span>
      <span><strong>체험 모드:</strong> 구글 앱스 스크립트 URL이 아직 등록되지 않았습니다. (화면 결과는 정상 표시됩니다)</span>
    `;
    return;
  }

  // 전송 중 상태 표시
  statusElem.className = "p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs sm:text-sm flex items-center space-x-2";
  statusElem.innerHTML = `
    <svg class="animate-spin h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
    <span>선생님 구글 시트로 결과를 안전하게 전송하고 있습니다...</span>
  `;

  try {
    // Apps Script 웹앱의 리다이렉트 및 CORS 제한 우회를 위해 mode: 'no-cors' 및 text/plain 사용
    await fetch(SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(data)
    });

    statusElem.className = "p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center space-x-2";
    statusElem.innerHTML = `
      <span class="text-base">✅</span>
      <span><strong>전송 완료:</strong> 구글 시트에 안전하게 제출되었습니다.</span>
    `;
  } catch (err) {
    console.error("제출 전송 에러:", err);
    statusElem.className = "p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-center space-x-2";
    statusElem.innerHTML = `
      <span class="text-base">⚠️</span>
      <span>네트워크 문제로 전송에 실패했습니다. (화면의 점수를 선생님께 보여주세요)</span>
    `;
  }
}

// 문항별 결과 및 해설 렌더링
function renderReviewList() {
  const container = document.getElementById("review-list-container");
  if (!container) return;
  container.innerHTML = "";

  QUIZ_QUESTIONS.forEach((q, idx) => {
    const userChoice = userAnswers[idx];
    const isCorrect = userChoice === q.answer;

    const card = document.createElement("div");
    card.className = `p-4 sm:p-5 rounded-2xl border-2 transition-all ${
      isCorrect ? "bg-white border-emerald-200 shadow-sm" : "bg-rose-50/40 border-rose-200 shadow-sm"
    }`;

    // 카드 헤더
    const headerDiv = document.createElement("div");
    headerDiv.className = "flex items-center justify-between mb-3";

    const topicSpan = document.createElement("span");
    topicSpan.className = `text-xs font-bold px-2.5 py-1 rounded-full border ${q.badgeColor}`;
    topicSpan.textContent = q.topicBadge;

    const resultBadge = document.createElement("span");
    resultBadge.className = `text-xs font-extrabold px-3 py-1 rounded-full flex items-center space-x-1 ${
      isCorrect ? "bg-emerald-100 text-emerald-700 border border-emerald-300" : "bg-rose-100 text-rose-700 border border-rose-300"
    }`;
    resultBadge.innerHTML = isCorrect ? "<span>✅ 정답 (+10점)</span>" : "<span>❌ 오답 (0점)</span>";

    headerDiv.appendChild(topicSpan);
    headerDiv.appendChild(resultBadge);

    // 문제 텍스트
    const questionText = document.createElement("h4");
    questionText.className = "font-bold text-slate-900 text-sm sm:text-base mb-3 leading-snug";
    questionText.innerHTML = `<span class="text-indigo-600 mr-1.5 font-extrabold">Q${q.id}.</span>${q.question}`;

    // 답안 비교
    const answerCompareDiv = document.createElement("div");
    answerCompareDiv.className = "text-xs sm:text-sm space-y-1.5 mb-3 bg-slate-50/80 p-3 rounded-xl border border-slate-100";

    const myAnsText = q.options[userChoice] !== undefined ? q.options[userChoice] : "선택 안 함";
    const correctAnsText = q.options[q.answer];

    answerCompareDiv.innerHTML = `
      <div class="flex items-start">
        <span class="font-bold text-slate-500 w-16 flex-shrink-0">내가 낸 답:</span>
        <span class="${isCorrect ? 'text-emerald-700 font-semibold' : 'text-rose-600 font-semibold'}">${userChoice + 1}번. ${myAnsText}</span>
      </div>
      ${
        !isCorrect
          ? `<div class="flex items-start pt-1 border-t border-slate-200/60">
              <span class="font-bold text-indigo-600 w-16 flex-shrink-0">바른 정답:</span>
              <span class="text-indigo-700 font-bold">${q.answer + 1}번. ${correctAnsText}</span>
            </div>`
          : ""
      }
    `;

    // 해설 상자
    const expDiv = document.createElement("div");
    expDiv.className = "p-3 rounded-xl bg-amber-50/70 border border-amber-200/70 text-xs sm:text-sm text-amber-950 flex items-start space-x-2";
    expDiv.innerHTML = `
      <span class="text-base flex-shrink-0">💡</span>
      <div class="leading-relaxed"><strong class="text-amber-900 font-bold">선생님의 해설:</strong> ${q.explanation}</div>
    `;

    card.appendChild(headerDiv);
    card.appendChild(questionText);
    card.appendChild(answerCompareDiv);
    card.appendChild(expDiv);

    container.appendChild(card);
  });
}

// 퀴즈 리셋 (처음으로 돌아가기)
function resetQuiz() {
  document.getElementById("result-screen").classList.add("hidden");
  document.getElementById("quiz-screen").classList.add("hidden");
  document.getElementById("start-screen").classList.remove("hidden");
  userAnswers = {};
  currentQuestionIndex = 0;
  totalElapsedSeconds = 0;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// 알림 모달/토스트
function showNoticeAlert(title, message) {
  // 브라우저 기본 알림으로 직관적이고 확실하게 전달
  alert(`${title}\n\n${message}`);
}

// 폭죽 효과 (canvas-confetti 라이브러리 활용)
function triggerConfetti() {
  if (typeof confetti === "function") {
    // 양쪽에서 터지는 축하 폭죽
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });
    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: 0 }
      });
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 55,
        origin: { x: 1 }
      });
    }, 250);
  }
}
