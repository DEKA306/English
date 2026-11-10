
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
    try {
      localStorage.setItem(storageKey, JSON.stringify(stats));
    } catch (error) {
      console.warn("학습 기록을 저장하지 못했습니다.", error);
    }

    renderStats();
  }

  function renderStats() {
    $("solvedCount").textContent = stats.solved;

    $("accuracy").textContent = stats.solved
      ? Math.round(stats.correct / stats.solved * 100) + "%"
      : "0%";

    $("passageCount").textContent = passages.length;
  }

  // 지문 목록
  function populatePassages() {
    const select = $("passageSelect");
    select.innerHTML = "";

    passages.forEach((passage, index) => {
      const option = document.createElement("option");

      option.value = String(index);
      option.textContent =
        `${passage.date.slice(2, 4)}.${passage.date.slice(4, 6)}.${passage.date.slice(6, 8)} 모의고사`;

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

      [result[i], result[j]] = [result[j], result[i]];
    }

    return result;
  }

  // 셔플 백에서 다음 문항 예약
  // 여기서는 실제로 문항을 제거하지 않는다.
  function drawFromBag(mode, passageIndex, itemCount) {
    const bagGroup = shuffleBags[mode];

    if (!bagGroup[passageIndex]) {
      bagGroup[passageIndex] = {
        items: [],
        bagNumber: 0,
        totalDrawn: 0,
        lastDrawn: null,
        startQuestion: 0
      };
    }

    const bag = bagGroup[passageIndex];

    // 이전 가방을 모두 제출했으면 새 가방 생성
    if (bag.items.length === 0) {
      const newItems = shuffle(
        Array.from(
          { length: itemCount },
          (_, index) => index
        )
      );

      // 직전 가방의 마지막 문항과 겹치지 않게 한다.
      if (
        itemCount > 1 &&
        newItems[newItems.length - 1] === bag.lastDrawn
      ) {
        [
          newItems[0],
          newItems[newItems.length - 1]
        ] = [
          newItems[newItems.length - 1],
          newItems[0]
        ];
      }

      bag.bagNumber += 1;
      bag.startQuestion = bag.totalDrawn + 1;
      bag.items = newItems;
    }

    // 마지막 항목을 예약만 한다.
    // pop()은 제출 시점에 실행한다.
    return bag.items[bag.items.length - 1];
  }

  // 정답 제출 시 셔플 백에서 문항 제거
  function completeBagDraw(mode, passageIndex, drawn) {
    const bag = shuffleBags[mode]?.[passageIndex];

    if (!bag || bag.items.length === 0) {
      return;
    }

    // 예약된 문항과 현재 가방의 마지막 항목이 일치해야 한다.
    if (bag.items[bag.items.length - 1] !== drawn) {
      return;
    }

    bag.items.pop();
    bag.lastDrawn = drawn;
    bag.totalDrawn += 1;
  }

  // 현재 가방 정보
  function getBagInfo(mode, passageIndex, itemCount) {
    const bag = shuffleBags[mode]?.[passageIndex];

    if (!bag || bag.bagNumber === 0) {
      return null;
    }

    return {
      bagNumber: bag.bagNumber,
      progress: itemCount - bag.items.length,
      total: itemCount,
      start: bag.startQuestion,
      end: bag.startQuestion + itemCount - 1,
      totalDrawn: bag.totalDrawn
    };
  }

  // 가방 정보 화면 표시
  function renderBagInfo() {
    if (!current) {
      $("bagInfo").hidden = true;
      return;
    }

    const info = getBagInfo(
      current.mode,
      current.passageIndex,
      current.passage.sentences.length
    );

    if (!info) {
      $("bagInfo").hidden = true;
      return;
    }

    $("bagInfo").hidden = false;

    $("bagNumber").textContent =
      `BAG #${info.bagNumber}`;

    $("bagProgress").textContent =
      `${info.progress} / ${info.total}`;

    $("bagProgressBar").style.width =
      `${info.progress / info.total * 100}%`;

    $("bagRange").textContent =
      `이번 가방 출제 범위: ${info.start}번 ~ ${info.end}번 · 전체 ${info.totalDrawn}문제 출제`;
  }

  // 새 문제
  function newQuestion() {
    const passageIndex = Number(
      $("passageSelect").value
    );

    const passage = passages[passageIndex];

    if (!passage || !passage.sentences.length) {
      return;
    }

    const mode = $("modeSelect").value;

    submitted = false;
    selectedSlot = null;
    chosenWords = [];
    shuffledWords = [];

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
    } else {
      const sentenceIndex = drawFromBag(
        "ordering",
        passageIndex,
        passage.sentences.length
      );

      const sentence = passage.sentences[sentenceIndex];
      const words = sentence.trim().split(/\s+/);

      let mixed = shuffle(words);

      // 원래 순서와 똑같이 섞였으면 순서를 한 칸 이동한다.
      if (
        words.length > 1 &&
        mixed.every(
          (word, index) => word === words[index]
        )
      ) {
        mixed = [...mixed.slice(1), mixed[0]];
      }

      current.answer = words;
      current.sentenceIndex = sentenceIndex;

      shuffledWords = mixed.map((word, id) => ({
        id,
        word
      }));

      renderWordOrder();
    }

    renderBagInfo();
  }

  // 문장 삽입 렌더링
  function renderInsertion() {
    const container = $("passageContent");
    container.innerHTML = "";

    if (!submitted) {
      const addSlot = (index) => {
        const button = document.createElement("button");

        button.className =
          "insert-slot" +
          (selectedSlot === index ? " selected" : "");

        button.type = "button";

        button.innerHTML =
          `<span class="slot-number">${String(index).padStart(2, "0")}</span>` +
          `<span>이 위치에 문장 삽입</span>`;

        button.addEventListener("click", () => {
          selectedSlot = index;
          renderInsertion();
        });

        container.appendChild(button);
      };

      current.remaining.forEach((sentence, index) => {
        addSlot(index);

        const line = document.createElement("div");
        line.className = "passage-line";

        const number = document.createElement("span");
        number.className = "line-number";
        number.textContent = String(index + 1).padStart(2, "0");

        const text = document.createElement("span");
        text.className = "line-text";
        text.textContent = sentence;

        line.append(number, text);
        container.appendChild(line);
      });

      addSlot(current.remaining.length);

      return;
    }

    // 제출 후 원래 지문 순서로 정답 표시
    current.passage.sentences.forEach((sentence, index) => {
      if (index === current.answer) {
        const inserted = document.createElement("div");

        inserted.className = "inserted-answer";
        inserted.textContent =
          "정답 문장: " + current.given;

        container.appendChild(inserted);
      }

      const line = document.createElement("div");
      line.className = "passage-line";

      const number = document.createElement("span");
      number.className = "line-number";
      number.textContent = String(index + 1).padStart(2, "0");

      const text = document.createElement("span");
      text.className = "line-text";
      text.textContent = sentence;

      line.append(number, text);
      container.appendChild(line);
    });
  }

  // 문장 배열 렌더링
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
        chosenWords.some(
          chosen => chosen.id === item.id
        );

      button.addEventListener("click", () => {
        if (
          !submitted &&
          !chosenWords.some(
            chosen => chosen.id === item.id
          )
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
          if (!submitted) {
            chosenWords.splice(index, 1);
            renderWordOrder();
          }
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
    if (!current || submitted) {
      return;
    }

    if (
      current.mode === "insertion" &&
      selectedSlot === null
    ) {
      showFeedback(
        false,
        "먼저 삽입할 위치를 선택해."
      );

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

      return;
    }

    let isCorrect;
    let detail;

    if (current.mode === "insertion") {
      isCorrect = selectedSlot === current.answer;

      detail =
        `정답은 ${String(current.answer).padStart(2, "0")}번 위치야.`;
    } else {
      const userWords = chosenWords.map(
        item => item.word
      );

      isCorrect = userWords.every(
        (word, index) => word === current.answer[index]
      );

      detail = isCorrect
        ? "문장의 순서를 정확하게 맞췄어."
        : "정답 문장: " + current.answer.join(" ");
    }

    // 제출이 확정된 순간에만 문항 소비
    submitted = true;

    const drawnIndex =
      current.mode === "insertion"
        ? current.answer
        : current.sentenceIndex;

    completeBagDraw(
      current.mode,
      current.passageIndex,
      drawnIndex
    );

    renderBagInfo();

    if (current.mode === "insertion") {
      renderInsertion();
    } else {
      renderWordOrder();
    }

    // 풀이 통계 갱신
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

  // 문제 유형 변경
  $("modeSelect").addEventListener("change", () => {
    if (current) {
      newQuestion();
    } else {
      setModeUI($("modeSelect").value);
      $("bagInfo").hidden = true;
    }
  });

  // 지문 변경
  $("passageSelect").addEventListener("change", () => {
    if (current) {
      newQuestion();
    }
  });

  // 초기 실행
  populatePassages();
  renderStats();
})();
