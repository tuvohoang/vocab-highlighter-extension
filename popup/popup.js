// popup/popup.js - Quản lý từ vựng, flashcard, thư mục, xuất Excel & dịch đoạn văn

document.addEventListener("DOMContentLoaded", () => {
  // Elements chính
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");
  const vocabCountEl = document.getElementById("vocab-count");
  const vocabListEl = document.getElementById("vocab-list");
  const emptyStateEl = document.getElementById("empty-state");
  const searchInput = document.getElementById("search-input");
  const clearAllBtn = document.getElementById("clear-all-btn");
  const exportExcelBtn = document.getElementById("export-excel-btn");
  const folderBarContainer = document.getElementById("folder-bar-container");

  // Elements Folder
  const folderFilterSelect = document.getElementById("folder-filter-select");
  const addFolderBtn = document.getElementById("add-folder-btn");
  const manageFolderBtn = document.getElementById("manage-folder-btn");
  const newFolderModal = document.getElementById("new-folder-modal");
  const newFolderInput = document.getElementById("new-folder-input");
  const cancelFolderBtn = document.getElementById("cancel-folder-btn");
  const saveFolderBtn = document.getElementById("save-folder-btn");

  // Elements Edit Word Modal
  const editWordModal = document.getElementById("edit-word-modal");
  const editWordInput = document.getElementById("edit-word-input");
  const editViInput = document.getElementById("edit-vi-input");
  const editMeaningInput = document.getElementById("edit-meaning-input");
  const editNotesInput = document.getElementById("edit-notes-input");
  const editFolderSelect = document.getElementById("edit-folder-select");
  const cancelEditBtn = document.getElementById("cancel-edit-btn");
  const saveEditBtn = document.getElementById("save-edit-btn");
  const closeEditModalBtn = document.getElementById("close-edit-modal-btn");

  // Elements Flashcard Deck
  const deckProgressEl = document.getElementById("deck-progress");
  const deckFolderTagEl = document.getElementById("deck-folder-tag");
  const flashcardWrapper = document.getElementById("flashcard-wrapper");
  const flashcardCard = document.getElementById("flashcard-card");
  const fcFrontWord = document.getElementById("fc-front-word");
  const fcFrontPhonetic = document.getElementById("fc-front-phonetic");
  const fcFrontAudioBtn = document.getElementById("fc-front-audio-btn");
  const fcBackVi = document.getElementById("fc-back-vi");
  const fcBackPos = document.getElementById("fc-back-pos");
  const fcBackMeaning = document.getElementById("fc-back-meaning");
  const fcBackExample = document.getElementById("fc-back-example");
  const fcBackNotes = document.getElementById("fc-back-notes");
  const fcNotesText = document.getElementById("fc-notes-text");
  const prevCardBtn = document.getElementById("prev-card-btn");
  const nextCardBtn = document.getElementById("next-card-btn");
  const flipCardBtn = document.getElementById("flip-card-btn");
  const flashcardDeckEl = document.getElementById("flashcard-deck");
  const fcEmptyStateEl = document.getElementById("fc-empty-state");

  // Elements Tab Dịch đoạn văn
  const transSourceInput = document.getElementById("trans-source-input");
  const transCharCount = document.getElementById("trans-char-count");
  const clearTransInputBtn = document.getElementById("clear-trans-input-btn");
  const doTranslateBtn = document.getElementById("do-translate-btn");
  const transResultArea = document.getElementById("trans-result-area");
  const copyTransBtn = document.getElementById("copy-trans-btn");
  const speakTransBtn = document.getElementById("speak-trans-btn");
  const transFolderSelect = document.getElementById("trans-folder-select");
  const saveTransBtn = document.getElementById("save-trans-btn");

  // State
  let flashcards = [];
  let folders = [];
  let activeFolderId = "all";
  let filteredCards = [];
  let currentCardIndex = 0;
  let isFlipped = false;
  let editingCardId = null;
  let lastTranslatedText = "";

  initApp();

  async function initApp() {
    await loadData();
    bindEvents();
    updateUI();
  }

  function loadData() {
    return new Promise((resolve) => {
      chrome.storage.local.get({ flashcards: [], folders: [], activeFolderId: "all" }, (res) => {
        flashcards = res.flashcards || [];
        folders = res.folders || [];
        if (folders.length === 0) {
          folders = [{ id: "default", name: "Mặc định", createdAt: new Date().toISOString() }];
          chrome.storage.local.set({ folders });
        }
        activeFolderId = res.activeFolderId || "all";
        resolve();
      });
    });
  }

  function bindEvents() {
    // Chuyển Tab
    tabBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const targetTab = btn.getAttribute("data-tab");
        tabBtns.forEach((b) => b.classList.remove("active"));
        tabContents.forEach((c) => c.classList.remove("active"));

        btn.classList.add("active");
        document.getElementById(`tab-${targetTab}`).classList.add("active");

        // Ẩn thanh folder khi ở tab Dịch để thoáng màn hình
        if (targetTab === "translate") {
          folderBarContainer.style.display = "none";
          renderTransFolderSelect();
        } else {
          folderBarContainer.style.display = "flex";
        }

        if (targetTab === "flashcard") {
          initFlashcardDeck();
        }
      });
    });

    // Lọc theo thư mục
    folderFilterSelect.addEventListener("change", (e) => {
      activeFolderId = e.target.value;
      chrome.storage.local.set({ activeFolderId });
      updateUI();
    });

    // Thư mục
    addFolderBtn.addEventListener("click", () => {
      newFolderInput.value = "";
      newFolderModal.classList.remove("hidden");
      newFolderInput.focus();
    });

    cancelFolderBtn.addEventListener("click", () => {
      newFolderModal.classList.add("hidden");
    });

    saveFolderBtn.addEventListener("click", createNewFolder);
    newFolderInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") createNewFolder();
      if (e.key === "Escape") newFolderModal.classList.add("hidden");
    });

    manageFolderBtn.addEventListener("click", handleManageFolder);

    // Tìm kiếm & Xuất Excel
    searchInput.addEventListener("input", applyFilters);
    exportExcelBtn.addEventListener("click", exportToExcel);
    clearAllBtn.addEventListener("click", handleClearAll);

    // Tương tác Flashcard
    flashcardWrapper.addEventListener("click", toggleFlip);
    flipCardBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleFlip();
    });

    prevCardBtn.addEventListener("click", () => {
      if (currentCardIndex > 0) {
        resetFlip();
        currentCardIndex--;
        renderCurrentCard();
      }
    });

    nextCardBtn.addEventListener("click", () => {
      const deckCards = getDeckCards();
      if (currentCardIndex < deckCards.length - 1) {
        resetFlip();
        currentCardIndex++;
        renderCurrentCard();
      }
    });

    fcFrontAudioBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const deckCards = getDeckCards();
      if (deckCards[currentCardIndex]) {
        const card = deckCards[currentCardIndex];
        playAudio(card.word, card.audio);
      }
    });

    // Phím tắt
    document.addEventListener("keydown", (e) => {
      const isFlashcardTab = document.getElementById("tab-flashcard").classList.contains("active");
      if (isFlashcardTab && getDeckCards().length > 0) {
        if (e.code === "Space") {
          e.preventDefault();
          toggleFlip();
        } else if (e.key === "ArrowLeft") {
          prevCardBtn.click();
        } else if (e.key === "ArrowRight") {
          nextCardBtn.click();
        }
      }
    });

    // Modal chỉnh sửa từ
    closeEditModalBtn.addEventListener("click", () => editWordModal.classList.add("hidden"));
    cancelEditBtn.addEventListener("click", () => editWordModal.classList.add("hidden"));
    saveEditBtn.addEventListener("click", saveWordEdit);

    // ================= SỰ KIỆN TAB DỊCH ĐOẠN VĂN =================
    transSourceInput.addEventListener("input", () => {
      transCharCount.textContent = `${transSourceInput.value.length} ký tự`;
    });

    transSourceInput.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        performTranslation();
      }
    });

    clearTransInputBtn.addEventListener("click", () => {
      transSourceInput.value = "";
      transCharCount.textContent = "0 ký tự";
      transResultArea.textContent = "Bản dịch sẽ hiển thị ở đây...";
      lastTranslatedText = "";
      transSourceInput.focus();
    });

    doTranslateBtn.addEventListener("click", performTranslation);

    copyTransBtn.addEventListener("click", () => {
      if (!lastTranslatedText) return;
      navigator.clipboard.writeText(lastTranslatedText).then(() => {
        copyTransBtn.textContent = "✓ Đã chép";
        setTimeout(() => { copyTransBtn.textContent = "📋 Sao chép"; }, 1500);
      });
    });

    speakTransBtn.addEventListener("click", () => {
      if (lastTranslatedText) {
        speakText(lastTranslatedText, "vi-VN");
      }
    });

    saveTransBtn.addEventListener("click", saveTranslatedParagraph);
  }

  function updateUI() {
    renderFolderDropdowns();
    applyFilters();
    initFlashcardDeck();
    renderTransFolderSelect();
  }

  function renderFolderDropdowns() {
    folderFilterSelect.innerHTML = `<option value="all" ${activeFolderId === "all" ? "selected" : ""}>Tất cả thư mục (${flashcards.length})</option>`;
    editFolderSelect.innerHTML = "";

    folders.forEach((f) => {
      const count = flashcards.filter((w) => (w.folderId || "default") === f.id).length;
      const opt = document.createElement("option");
      opt.value = f.id;
      opt.textContent = `${f.name} (${count})`;
      if (f.id === activeFolderId) opt.selected = true;
      folderFilterSelect.appendChild(opt);

      const editOpt = document.createElement("option");
      editOpt.value = f.id;
      editOpt.textContent = f.name;
      editFolderSelect.appendChild(editOpt);
    });
  }

  function renderTransFolderSelect() {
    transFolderSelect.innerHTML = "";
    folders.forEach((f) => {
      const opt = document.createElement("option");
      opt.value = f.id;
      opt.textContent = `📁 ${f.name}`;
      transFolderSelect.appendChild(opt);
    });
  }

  function createNewFolder() {
    const name = newFolderInput.value.trim();
    if (!name) return;

    const newFolder = {
      id: "folder_" + Date.now(),
      name,
      createdAt: new Date().toISOString()
    };

    folders.push(newFolder);
    activeFolderId = newFolder.id;

    chrome.storage.local.set({ folders, activeFolderId }, () => {
      newFolderModal.classList.add("hidden");
      updateUI();
    });
  }

  function handleManageFolder() {
    if (activeFolderId === "all" || activeFolderId === "default") {
      alert("Thư mục hệ thống không thể xóa hoặc đổi tên.");
      return;
    }

    const curFolder = folders.find((f) => f.id === activeFolderId);
    if (!curFolder) return;

    const action = confirm(`Bạn muốn xóa thư mục "${curFolder.name}"?\n(Các từ vựng trong thư mục này sẽ được tự động chuyển về thư mục "Mặc định")`);
    if (action) {
      folders = folders.filter((f) => f.id !== activeFolderId);
      flashcards = flashcards.map((c) => {
        if (c.folderId === activeFolderId) {
          return { ...c, folderId: "default" };
        }
        return c;
      });

      activeFolderId = "default";
      chrome.storage.local.set({ folders, flashcards, activeFolderId }, () => {
        updateUI();
      });
    }
  }

  function applyFilters() {
    const query = searchInput.value.toLowerCase().trim();

    filteredCards = flashcards.filter((item) => {
      const itemFolder = item.folderId || "default";
      const matchesFolder = activeFolderId === "all" || itemFolder === activeFolderId;
      if (!matchesFolder) return false;

      if (!query) return true;
      const matchWord = item.word && item.word.toLowerCase().includes(query);
      const matchVi = item.vietnameseMeaning && item.vietnameseMeaning.toLowerCase().includes(query);
      const matchEn = item.meaning && item.meaning.toLowerCase().includes(query);
      const matchNotes = item.notes && item.notes.toLowerCase().includes(query);

      return matchWord || matchVi || matchEn || matchNotes;
    });

    vocabCountEl.textContent = `${filteredCards.length} từ`;
    renderVocabList();
  }

  function renderVocabList() {
    vocabListEl.innerHTML = "";

    if (filteredCards.length === 0) {
      emptyStateEl.classList.remove("hidden");
      vocabListEl.classList.add("hidden");
      return;
    }

    emptyStateEl.classList.add("hidden");
    vocabListEl.classList.remove("hidden");

    filteredCards.forEach((item) => {
      const card = document.createElement("div");
      card.className = "vocab-card";

      const folderObj = folders.find((f) => f.id === (item.folderId || "default"));
      const folderName = folderObj ? folderObj.name : "Mặc định";

      card.innerHTML = `
        <div class="vc-top">
          <div class="vc-word-group">
            <span class="vc-word">${escapeHtml(item.word)}</span>
            ${item.phonetic ? `<span class="vc-phonetic">${escapeHtml(item.phonetic)}</span>` : ""}
            ${item.partOfSpeech ? `<span class="vc-pos">${escapeHtml(item.partOfSpeech)}</span>` : ""}
            <span class="vc-folder-tag">📁 ${escapeHtml(folderName)}</span>
          </div>
          <div class="vc-actions">
            <button class="vc-btn vc-btn-audio" title="Nghe phát âm">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
              </svg>
            </button>
            <button class="vc-btn vc-btn-edit" title="Sửa">✏️</button>
            <button class="vc-btn vc-btn-del" title="Xóa">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          </div>
        </div>

        ${item.vietnameseMeaning ? `
          <div class="vc-vi-meaning">🇻🇳 ${escapeHtml(item.vietnameseMeaning)}</div>
        ` : ""}

        ${item.meaning ? `<p class="vc-meaning">🇬🇧 ${escapeHtml(item.meaning)}</p>` : ""}
        
        ${item.notes ? `
          <div class="vc-notes">💡 <strong>Ghi chú:</strong> ${escapeHtml(item.notes)}</div>
        ` : ""}

        ${item.example ? `<p class="vc-example">"${escapeHtml(item.example)}"</p>` : ""}
      `;

      card.querySelector(".vc-btn-audio").addEventListener("click", () => {
        playAudio(item.word, item.audio);
      });

      card.querySelector(".vc-btn-edit").addEventListener("click", () => {
        openEditModal(item);
      });

      card.querySelector(".vc-btn-del").addEventListener("click", () => {
        deleteCard(item.id || item.word);
      });

      vocabListEl.appendChild(card);
    });
  }

  function openEditModal(item) {
    editingCardId = item.id || item.word;
    editWordInput.value = item.word;
    editViInput.value = item.vietnameseMeaning || "";
    editMeaningInput.value = item.meaning || "";
    editNotesInput.value = item.notes || "";
    editFolderSelect.value = item.folderId || "default";

    editWordModal.classList.remove("hidden");
    editViInput.focus();
  }

  function saveWordEdit() {
    if (!editingCardId) return;

    flashcards = flashcards.map((c) => {
      const match = c.id ? c.id === editingCardId : c.word === editingCardId;
      if (match) {
        return {
          ...c,
          vietnameseMeaning: editViInput.value.trim(),
          meaning: editMeaningInput.value.trim(),
          notes: editNotesInput.value.trim(),
          folderId: editFolderSelect.value,
        };
      }
      return c;
    });

    chrome.storage.local.set({ flashcards }, () => {
      editWordModal.classList.add("hidden");
      updateUI();
    });
  }

  function deleteCard(idOrWord) {
    flashcards = flashcards.filter((item) => (item.id ? item.id !== idOrWord : item.word !== idOrWord));
    chrome.storage.local.set({ flashcards }, () => {
      updateUI();
    });
  }

  function handleClearAll() {
    const targetCards = filteredCards;
    if (targetCards.length === 0) return;

    const folderName = activeFolderId === "all" ? "tất cả các thư mục" : `thư mục "${folderFilterSelect.options[folderFilterSelect.selectedIndex].text}"`;
    if (confirm(`Bạn có chắc chắn muốn xóa ${targetCards.length} từ vựng trong ${folderName}?`)) {
      if (activeFolderId === "all") {
        flashcards = [];
      } else {
        flashcards = flashcards.filter((c) => (c.folderId || "default") !== activeFolderId);
      }
      chrome.storage.local.set({ flashcards }, () => {
        updateUI();
      });
    }
  }

  // ===================== DỊCH ĐOẠN VĂN =====================
  function performTranslation() {
    const text = transSourceInput.value.trim();
    if (!text) return;

    doTranslateBtn.disabled = true;
    doTranslateBtn.textContent = "Đang dịch...";
    transResultArea.textContent = "⏳ Đang kết nối dịch đoạn văn...";

    chrome.runtime.sendMessage(
      { action: "translate_text", text, sourceLang: "auto", targetLang: "vi" },
      (res) => {
        doTranslateBtn.disabled = false;
        doTranslateBtn.textContent = "Dịch sang tiếng Việt ➔";

        if (res && res.success && res.translation) {
          lastTranslatedText = res.translation;
          transResultArea.textContent = res.translation;
        } else {
          transResultArea.textContent = "❌ Lỗi: " + ((res && res.error) || "Không thể dịch đoạn văn.");
        }
      }
    );
  }

  function saveTranslatedParagraph() {
    const sourceText = transSourceInput.value.trim();
    if (!sourceText || !lastTranslatedText) {
      alert("Vui lòng dịch đoạn văn trước khi lưu.");
      return;
    }

    const shortTitle = sourceText.length > 50 ? sourceText.slice(0, 50) + "..." : sourceText;
    const item = {
      id: Date.now().toString(),
      word: shortTitle,
      phonetic: "",
      audio: "",
      vietnameseMeaning: lastTranslatedText,
      partOfSpeech: "paragraph",
      meaning: sourceText,
      example: "",
      folderId: transFolderSelect.value || "default",
      notes: "Đoạn văn dịch",
      dateAdded: new Date().toISOString(),
    };

    saveTransBtn.disabled = true;
    saveTransBtn.textContent = "Đang lưu...";

    flashcards.unshift(item);
    chrome.storage.local.set({ flashcards }, () => {
      saveTransBtn.disabled = false;
      saveTransBtn.textContent = "✓ Đã lưu câu!";
      setTimeout(() => { saveTransBtn.textContent = "⭐ Lưu câu này"; }, 1500);
      updateUI();
    });
  }

  // ===================== XUẤT EXCEL =====================
  function exportToExcel() {
    const exportList = activeFolderId === "all" ? flashcards : flashcards.filter((c) => (c.folderId || "default") === activeFolderId);

    if (exportList.length === 0) {
      alert("Không có từ vựng nào để xuất Excel.");
      return;
    }

    const headers = [
      "Từ vựng / Câu",
      "Phiên âm",
      "Nghĩa tiếng Việt",
      "Định nghĩa tiếng Anh / Gốc",
      "Từ loại",
      "Ghi chú cá nhân",
      "Ví dụ minh họa",
      "Thư mục",
      "Ngày lưu"
    ];

    const rows = exportList.map((item) => {
      const folderObj = folders.find((f) => f.id === (item.folderId || "default"));
      const folderName = folderObj ? folderObj.name : "Mặc định";
      const dateStr = item.dateAdded ? new Date(item.dateAdded).toLocaleDateString("vi-VN") : "";

      return [
        escapeCsv(item.word),
        escapeCsv(item.phonetic),
        escapeCsv(item.vietnameseMeaning),
        escapeCsv(item.meaning),
        escapeCsv(item.partOfSpeech),
        escapeCsv(item.notes),
        escapeCsv(item.example),
        escapeCsv(folderName),
        escapeCsv(dateStr)
      ].join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const dateTag = new Date().toISOString().slice(0, 10);
    const downloadLink = document.createElement("a");
    downloadLink.href = url;
    downloadLink.setAttribute("download", `Vocab_Highlighter_${dateTag}.csv`);
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(url);
  }

  function escapeCsv(field) {
    if (field === null || field === undefined) return '""';
    const stringField = String(field);
    return `"${stringField.replace(/"/g, '""')}"`;
  }

  // ===================== FLASHCARD DECK =====================
  function getDeckCards() {
    if (activeFolderId === "all") return flashcards;
    return flashcards.filter((c) => (c.folderId || "default") === activeFolderId);
  }

  function initFlashcardDeck() {
    const deckCards = getDeckCards();
    if (deckCards.length === 0) {
      flashcardDeckEl.classList.add("hidden");
      fcEmptyStateEl.classList.remove("hidden");
      return;
    }

    flashcardDeckEl.classList.remove("hidden");
    fcEmptyStateEl.classList.add("hidden");

    if (currentCardIndex >= deckCards.length) {
      currentCardIndex = 0;
    }

    const currentFolderObj = folders.find((f) => f.id === activeFolderId);
    deckFolderTagEl.textContent = `📁 ${currentFolderObj ? currentFolderObj.name : "Tất cả"}`;

    resetFlip();
    renderCurrentCard();
  }

  function renderCurrentCard() {
    const deckCards = getDeckCards();
    const card = deckCards[currentCardIndex];
    if (!card) return;

    deckProgressEl.textContent = `Thẻ ${currentCardIndex + 1} / ${deckCards.length}`;
    fcFrontWord.textContent = card.word;
    fcFrontPhonetic.textContent = card.phonetic || "";
    fcFrontPhonetic.style.display = card.phonetic ? "inline" : "none";

    fcBackVi.textContent = card.vietnameseMeaning || "Chưa có nghĩa tiếng Việt";
    fcBackPos.textContent = card.partOfSpeech || "Vocabulary";
    fcBackMeaning.textContent = card.meaning || "Chưa có định nghĩa";

    if (card.example) {
      fcBackExample.textContent = `"${card.example}"`;
      fcBackExample.style.display = "block";
    } else {
      fcBackExample.style.display = "none";
    }

    if (card.notes) {
      fcNotesText.textContent = card.notes;
      fcBackNotes.style.display = "block";
    } else {
      fcBackNotes.style.display = "none";
    }

    prevCardBtn.disabled = currentCardIndex === 0;
    nextCardBtn.disabled = currentCardIndex === deckCards.length - 1;
  }

  function toggleFlip() {
    isFlipped = !isFlipped;
    if (isFlipped) {
      flashcardCard.classList.add("flipped");
    } else {
      flashcardCard.classList.remove("flipped");
    }
  }

  function resetFlip() {
    isFlipped = false;
    flashcardCard.classList.remove("flipped");
  }

  function playAudio(word, audioUrl) {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play().catch(() => {
        speakText(word, "en-US");
      });
    } else {
      speakText(word, "en-US");
    }
  }

  function speakText(text, lang = "en-US") {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    }
  }

  function escapeHtml(str) {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
});
