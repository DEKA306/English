(() => {
  const $ = (id) => document.getElementById(id);
  const passages = window.PASSAGES || [];
  const storageKey = "passage-lab-stats-v1";

  let current = null;
  let selectedSlot = null;
  let shuffledWords = [];
  let chosenWords = [];
  let submitted = false;

  // 지문별 + 문제 유형별 셔플 백
  const shuffleBags = {
    insertion: {},
    ordering: {}
  };

  // 통계
  const loadStats = () => {
    try {
      return JSON.parse(localStorage.getItem(storageKey)) || {
        solved: 0,
        correct: 0
      };
    } catch {
      return { solved: 0, correct: 0 };
    }
  };

  let stats = loadStats();

  function saveStats() {
    localStorage.setItem(storageKey, JSON.stringify(stats));
    renderStats();
  }

  function renderStats() {
    $("solvedCount").textContent = stats.solved;
    $("accuracy").textContent =
      stats.solved
        ? Math.round(stats.correct / stats.solved * 100) + "%"
        : "0%";

    $("passageCount").textContent = passages.length;
  }

  // 지문 목록
  function populatePassages() {
    const select = $("passageSelect");
    select.innerHTML = "";

    passages.forEach((p, i) => {
      const option = document.createElement("option");

      option.value = String(i);
      option.textContent =
        `${p.date.slice(2,4)}.${p.date.slice(4,6)}.${p.date.slice(6,8)} 모의고사`;

      select.appendChild(option);
    });
  }

  // 문제 유형 UI
  function setModeUI(mode) {
    $("modeTag").textContent =
      mode === "insertion" ? "INSERTION" : "WORD ORDER";

    $("questionTitle").textContent =
      mode === "insertion"
        ? "문장 삽입 문제"
        : "문장 배열 문제";

    $("givenSentenceBox").hidden = mode !== "insertion";
    $("passageBox").hidden = mode !== "insertion";
    $("orderingBox").hidden = mode !== "ordering";
  }

  // 랜덤 함수
  function randomIndex(length) {
    return Math.floor(Math.random() * length);
  }

  // Fisher-Yates 셔플
  function shuffle(items) {
    const result = [...items];

    for (let i = result.length - 1; i > 0; i--) {
      const j = randomIndex(i + 1);

      [result[i], result[j]] =
        [result[j], result[i]];
    }

    return result;
  }

  // 셔플 백
  function drawFromBag(mode, passageIndex, itemCount) {
    const bagGroup = shuffleBags[mode];

    // 지문별 출제 이력 관리
    if (!bagGroup[passageIndex]) {
      bagGroup[passageIndex] = [];
    }

    const bag = bagGroup[passageIndex];

    // 모든 문항을 소진하면 다시 섞기
    if (bag.length === 0) {
      const newItems = Array.from(
        { length: itemCount },
        (_, i) => i
      );

      bag.push(...shuffle(newItems));
    }

    // 하나씩 꺼내기
    return bag.pop();
  }

  // 새 문제
  function newQuestion() {
    const passageIndex = Number(
      $("passageSelect").value
    );

    const passage = passages[passageIndex];

    if (!passage || !passage.sentences.length) return;

    const mode = $("modeSelect").value;

    submitted = false;
    selectedSlot = null;
    chosenWords = [];

    current = {
      passage,
      passageIndex,
      mode
    };

    $("emptyState").hidden = true;
    $("questionContent").hidden = false;
    $("feedback").hidden = true;
    $("submitBtn").hidden = false;
    $("nextBtn").hidden = true;

    setModeUI(mode);

    // 문장 삽입 문제
    if (mode === "insertion") {
      const answer = drawFromBag(
        "insertion",
        passageIndex,
        passage.sentences.length
      );

      const sentences = [...passage.sentences];
      const given = sentences.splice(answer, 1)[0];

      current.answer = answer;
      current.given = given;
      current.remaining = sentences;

      $("givenSentence").textContent = given;

      renderInsertion();
    }

    // 문장 배열 문제
    else {
      const sentenceIndex = drawFromBag(
        "ordering",
        passageIndex,
        passage.sentences.length
      );

      const sentence = passage.sentences[sentenceIndex];

      const words = sentence.trim().split(/\s+/);

      let mixed = shuffle(words);

      // 원래 순서와 같을 경우 순서 변경
      if (
        words.length > 1 &&
        mixed.every((word, i) => word === words[i])
      ) {
        mixed = [
          ...mixed.slice(1),
          mixed[0]
        ];
      }

      current.answer = words;
      current.sentenceIndex = sentenceIndex;

      shuffledWords = mixed.map((word, id) => ({
        id,
        word
      }));

      renderWordOrder();
    }
  }

  // 문장 삽입 렌더링
  function renderInsertion() {
    const container = $("passageContent");
    container.innerHTML = "";

    const addSlot = (index) => {
      const button = document.createElement("button");

      button.className =
        "insert-slot" +
        (selectedSlot === index ? " selected" : "");

      button.type = "button";

      button.innerHTML =
        `<span class="slot-number">${String(index).padStart(2,"0")}</span>` +
        `<span>이 위치에 문장 삽입</span>`;

      button.disabled = submitted;

      button.addEventListener("click", () => {
        selectedSlot = index;
        renderInsertion();
      });

      container.appendChild(button);
    };

    current.remaining.forEach((sentence, i) => {
      addSlot(i);

      const line = document.createElement("div");
      line.className = "passage-line";

      const num = document.createElement("span");
      num.className = "line-number";
      num.textContent = String(i + 1).padStart(2, "0");

      const text = document.createElement("span");
      text.className = "line-text";
      text.textContent = sentence;

      line.append(num, text);
      container.appendChild(line);
    });

    addSlot(current.remaining.length);

    // 정답 제출 후 원래 순서 표시
    if (submitted) {
      container.innerHTML = "";

      current.passage.sentences.forEach((sentence, i) => {
        const line = document.createElement("div");
        line.className = "passage-line";

        const num = document.createElement("span");
        num.className = "line-number";
        num.textContent = String(i + 1).padStart(2, "0");

        const text = document.createElement("span");
        text.className = "line-text";
        text.textContent = sentence;

        line.append(num, text);

        if (i === current.answer) {
          const inserted = document.createElement("div");

          inserted.className = "inserted-answer";
          inserted.textContent =
            "정답으로 삽입되는 문장: " + current.given;

          container.appendChild(inserted);
        }

        container.appendChild(line);
      });
    }
  }

  // 단어 배열 렌더링
  function renderWordOrder() {
    const bank = $("wordBank");
    const answer = $("answerWords");

    bank.innerHTML = "";
    answer.innerHTML = "";

    shuffledWords.forEach(item => {
      const button = document.createElement("button");

      button.className = "word-chip";
      button.type = "button";
      button.textContent = item.word;

      button.disabled =
        submitted ||
        chosenWords.some(x => x.id === item.id);

      button.addEventListener("click", () => {
        if (
          !submitted &&
          !chosenWords.some(x => x.id === item.id)
        ) {
          chosenWords.push(item);
          renderWordOrder();
        }
      });

      bank.appendChild(button);
    });

    if (!chosenWords.length) {
      const placeholder = document.createElement("span");

      placeholder.className = "placeholder";
      placeholder.textContent =
        "선택한 단어가 여기에 표시돼.";

      answer.appendChild(placeholder);
    } else {
      chosenWords.forEach((item, index) => {
        const button = document.createElement("button");

        button.className = "word-chip";
        button.type = "button";
        button.textContent = item.word;
        button.title = "눌러서 이 단어를 제거";
        button.disabled = submitted;

        button.addEventListener("click", () => {
          chosenWords.splice(index, 1);
          renderWordOrder();
        });

        answer.appendChild(button);
      });
    }
  }

  // 정답 피드백
  function showFeedback(isCorrect, detail) {
    const box = $("feedback");

    box.hidden = false;
    box.className =
      "feedback " + (isCorrect ? "correct" : "wrong");

    box.textContent =
      (isCorrect ? "정답이야. " : "오답이야. ") + detail;
  }

  // 정답 제출
  function submitAnswer() {
    if (!current || submitted) return;

    if (
      current.mode === "insertion" &&
      selectedSlot === null
    ) {
      showFeedback(
        false,
        "먼저 삽입할 위치를 선택해."
      );

      $("feedback").className = "feedback wrong";
      return;
    }

    if (
      current.mode === "ordering" &&
      chosenWords.length !== current.answer.length
    ) {
      showFeedback(
        false,
        `단어 ${current.answer.length - chosenWords.length}개가 더 필요해.`
      );

      $("feedback").className = "feedback wrong";
      return;
    }

    let isCorrect;
    let detail;

    if (current.mode === "insertion") {
      isCorrect = selectedSlot === current.answer;

      detail =
        `정답은 ${String(current.answer).padStart(2,"0")}번 위치야.`;

      renderInsertion();
    } else {
      const userWords = chosenWords.map(x => x.word);

      isCorrect = userWords.every(
        (word, i) => word === current.answer[i]
      );

      detail = isCorrect
        ? "문장의 순서를 정확하게 맞췄어."
        : "정답 문장: " + current.answer.join(" ");

      renderWordOrder();
    }

    submitted = true;

    stats.solved += 1;

    if (isCorrect) {
      stats.correct += 1;
    }

    saveStats();

    showFeedback(isCorrect, detail);

    $("submitBtn").hidden = true;
    $("nextBtn").hidden = false;
  }

  // 이벤트 등록
  $("newQuestionBtn").addEventListener(
    "click",
    newQuestion
  );

  $("nextBtn").addEventListener(
    "click",
    newQuestion
  );

  $("submitBtn").addEventListener(
    "click",
    submitAnswer
  );

  $("clearWordsBtn").addEventListener("click", () => {
    if (!submitted) {
      chosenWords = [];
      renderWordOrder();
    }
  });

  $("modeSelect").addEventListener("change", () => {
    if (current) {
      newQuestion();
    } else {
      setModeUI($("modeSelect").value);
    }
  });

  $("passageSelect").addEventListener("change", () => {
    if (current) {
      newQuestion();
    }
  });

  // 초기 실행
  populatePassages();
  renderStats();

})();
