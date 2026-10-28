// content/content.js - Bôi đen tra từ hoặc dịch một đoạn văn dài bất kỳ

(function () {
  let hostEl = null;
  let shadowRoot = null;
  let lastLookupWord = "";

  function isExtensionValid() {
    try {
      return Boolean(typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.id);
    } catch (e) {
      return false;
    }
  }

  function getShadowRoot() {
    if (!hostEl) {
      hostEl = document.createElement("div");
      hostEl.id = "vocab-highlighter-host";
      document.body.appendChild(hostEl);
      shadowRoot = hostEl.attachShadow({ mode: "open" });

      const style = document.createElement("style");
      style.textContent = getShadowStyles();
      shadowRoot.appendChild(style);
    }
    return shadowRoot;
  }

  function removeTooltip() {
    if (shadowRoot) {
      const existing = shadowRoot.querySelector(".vh-tooltip");
      if (existing) {
        existing.remove();
      }
    }
    lastLookupWord = "";
  }

  // Sự kiện bôi đen văn bản
  function onMouseUp(event) {
    if (hostEl && event.composedPath().includes(hostEl)) {
      return;
    }

    setTimeout(() => {
      const selection = window.getSelection();
      const text = selection ? selection.toString().trim() : "";

      // Cho phép từ 1 ký tự đến 3000 ký tự (hỗ trợ cả từ vựng lẫn đoạn văn dài)
      if (text.length > 0 && text.length <= 3000 && /[a-zA-Z]/.test(text)) {
        if (text === lastLookupWord) return;
        lastLookupWord = text;

        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        if (!isExtensionValid()) {
          showContextInvalidatedTooltip(rect, text);
          return;
        }

        showTooltip(rect, text);
      } else {
        if (event.target !== hostEl) {
          removeTooltip();
        }
      }
    }, 15);
  }

  document.addEventListener("mouseup", onMouseUp);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      removeTooltip();
    }
  });

  function showContextInvalidatedTooltip(rect, word) {
    const root = getShadowRoot();
    removeTooltip();

    const tooltip = document.createElement("div");
    tooltip.className = "vh-tooltip";

    const tooltipWidth = 320;
    let left = rect.left + window.scrollX + (rect.width / 2) - (tooltipWidth / 2);
    let top = rect.bottom + window.scrollY + 8;

    if (left < 10) left = 10;
    if (left + tooltipWidth > window.innerWidth - 10) {
      left = window.innerWidth - tooltipWidth - 10;
    }

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;

    renderContextInvalidated(tooltip, word.slice(0, 30));
    root.appendChild(tooltip);
  }

  async function showTooltip(rect, text) {
    const root = getShadowRoot();
    removeTooltip();

    const tooltip = document.createElement("div");
    tooltip.className = "vh-tooltip";

    const isLong = text.length > 50 || text.split(/\s+/).filter(Boolean).length > 4;
    const tooltipWidth = isLong ? 380 : 340;
    const tooltipHeight = isLong ? 320 : 260;

    let left = rect.left + window.scrollX + (rect.width / 2) - (tooltipWidth / 2);
    let top = rect.bottom + window.scrollY + 8;

    if (left < 10) left = 10;
    if (left + tooltipWidth > window.innerWidth - 10) {
      left = window.innerWidth - tooltipWidth - 10;
    }
    if (rect.bottom + tooltipHeight > window.innerHeight && rect.top > tooltipHeight) {
      top = rect.top + window.scrollY - tooltipHeight - 8;
    }

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
    tooltip.style.width = `${tooltipWidth}px`;

    const titlePreview = text.length > 35 ? text.slice(0, 35) + "..." : text;
    tooltip.innerHTML = `
      <div class="vh-header">
        <span class="vh-title-loading">${isLong ? "Đang dịch đoạn văn..." : `Đang tra: "<strong>${escapeHtml(titlePreview)}</strong>"...`}</span>
        <button class="vh-close-btn" title="Đóng">&times;</button>
      </div>
      <div class="vh-body vh-loading-spinner">
        <div class="vh-spinner"></div>
      </div>
    `;

    root.appendChild(tooltip);

    tooltip.querySelector(".vh-close-btn").addEventListener("click", () => {
      removeTooltip();
    });

    try {
      if (!isExtensionValid()) {
        renderContextInvalidated(tooltip, text);
        return;
      }

      chrome.runtime.sendMessage({ action: "lookup_word", word: text }, async (response) => {
        if (chrome.runtime.lastError) {
          const errMsg = chrome.runtime.lastError.message || "";
          if (errMsg.includes("invalidated") || !isExtensionValid()) {
            renderContextInvalidated(tooltip, text);
          } else {
            renderError(tooltip, text, "Lỗi kết nối tiện ích. Vui lòng thử lại.");
          }
          return;
        }

        if (response && response.success && response.data) {
          if (response.data.isLongText) {
            await renderLongTranslationData(tooltip, response.data);
          } else {
            await renderWordData(tooltip, response.data);
          }
        } else {
          const errMsg = response && response.error ? response.error : "Không thể dịch nội dung này.";
          renderNotFound(tooltip, text, errMsg);
        }
      });
    } catch (err) {
      if (err.message && err.message.includes("invalidated")) {
        renderContextInvalidated(tooltip, text);
      } else {
        renderError(tooltip, text, err.message);
      }
    }
  }

  // ==================== RENDER ĐOẠN VĂN DÀI ====================
  async function renderLongTranslationData(tooltip, data) {
    const folders = await getFolders();
    const folderOptions = folders.map((f) => {
      return `<option value="${escapeHtml(f.id)}">📁 ${escapeHtml(f.name)}</option>`;
    }).join("");

    tooltip.innerHTML = `
      <div class="vh-header">
        <div class="vh-word-info">
          <span class="vh-word-badge">🌐 Dịch đoạn văn</span>
          <span class="vh-stat-badge">${data.wordCount} từ</span>
        </div>
        <div class="vh-header-actions">
          <button class="vh-icon-btn vh-speak-btn" title="Nghe đọc tiếng Anh">🔊</button>
          <button class="vh-icon-btn vh-copy-btn" title="Sao chép bản dịch">📋</button>
          <button class="vh-close-btn" title="Đóng">&times;</button>
        </div>
      </div>

      <div class="vh-body vh-body-long">
        <div class="vh-paragraph-original">
          ${escapeHtml(data.originalText)}
        </div>

        <div class="vh-vi-box vh-vi-box-large">
          <span class="vh-flag-badge">🇻🇳 Bản dịch tiếng Việt</span>
          <div class="vh-vi-text vh-vi-paragraph">${escapeHtml(data.vietnameseMeaning)}</div>
        </div>

        <div class="vh-notes-container">
          <input type="text" class="vh-note-input" placeholder="Ghi chú về đoạn văn này (tùy chọn)..." />
        </div>
      </div>

      <div class="vh-footer">
        <div class="vh-folder-group">
          <select class="vh-folder-select" title="Chọn thư mục lưu câu/đoạn">
            ${folderOptions}
          </select>
        </div>
        <button class="vh-save-btn">
          ⭐ Lưu vào Flashcard
        </button>
      </div>
    `;

    tooltip.querySelector(".vh-close-btn").addEventListener("click", () => {
      removeTooltip();
    });

    // Nút copy bản dịch
    const copyBtn = tooltip.querySelector(".vh-copy-btn");
    copyBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(data.vietnameseMeaning).then(() => {
        copyBtn.textContent = "✓";
        setTimeout(() => { copyBtn.textContent = "📋"; }, 1500);
      });
    });

    // Nút nghe đọc văn bản tiếng Anh
    const speakBtn = tooltip.querySelector(".vh-speak-btn");
    speakBtn.addEventListener("click", () => {
      fallbackSpeech(data.originalText);
    });

    // Nút lưu đoạn văn vào Flashcard
    const saveBtn = tooltip.querySelector(".vh-save-btn");
    const folderSelect = tooltip.querySelector(".vh-folder-select");
    const noteInput = tooltip.querySelector(".vh-note-input");

    saveBtn.addEventListener("click", async () => {
      if (!isExtensionValid()) {
        renderContextInvalidated(tooltip, data.originalText);
        return;
      }

      saveBtn.disabled = true;
      saveBtn.textContent = "Đang lưu...";

      // Trích xuất tiêu đề ngắn gọn cho flashcard (dưới 40 ký tự)
      const shortWord = data.originalText.length > 50
        ? data.originalText.slice(0, 50) + "..."
        : data.originalText;

      const flashcardItem = {
        id: Date.now().toString(),
        word: shortWord,
        phonetic: "",
        audio: "",
        vietnameseMeaning: data.vietnameseMeaning,
        partOfSpeech: "sentence",
        meaning: data.originalText,
        example: "",
        folderId: folderSelect.value || "default",
        notes: noteInput.value.trim(),
        dateAdded: new Date().toISOString(),
      };

      await saveFlashcard(flashcardItem);
      saveBtn.disabled = false;
      saveBtn.classList.add("vh-saved");
      saveBtn.textContent = "✓ Đã lưu đoạn văn";
    });
  }

  // ==================== RENDER TỪ VỰNG ĐƠN ====================
  async function renderWordData(tooltip, data) {
    const [isSaved, savedItem, folders] = await Promise.all([
      checkIfSaved(data.word),
      getSavedWordItem(data.word),
      getFolders()
    ]);

    const folderOptions = folders.map((f) => {
      const selected = savedItem && savedItem.folderId === f.id ? "selected" : "";
      return `<option value="${escapeHtml(f.id)}" ${selected}>📁 ${escapeHtml(f.name)}</option>`;
    }).join("");

    const viSectionHtml = data.vietnameseMeaning ? `
      <div class="vh-vi-box">
        <span class="vh-flag-badge">🇻🇳 Tiếng Việt</span>
        <div class="vh-vi-text">${escapeHtml(data.vietnameseMeaning)}</div>
      </div>
    ` : "";

    let meaningsHtml = "";
    if (data.meanings && data.meanings.length > 0) {
      data.meanings.slice(0, 2).forEach((m) => {
        const partOfSpeech = m.partOfSpeech ? `<span class="vh-pos">${escapeHtml(m.partOfSpeech)}</span>` : "";
        const defs = m.definitions.slice(0, 2).map((d) => {
          let item = `<li class="vh-def-item">${escapeHtml(d.definition)}`;
          if (d.example) {
            item += `<div class="vh-example">"${escapeHtml(d.example)}"</div>`;
          }
          item += `</li>`;
          return item;
        }).join("");

        meaningsHtml += `
          <div class="vh-meaning-block">
            ${partOfSpeech}
            <ul class="vh-def-list">${defs}</ul>
          </div>
        `;
      });
    }

    tooltip.innerHTML = `
      <div class="vh-header">
        <div class="vh-word-info">
          <span class="vh-word">${escapeHtml(data.word)}</span>
          ${data.phonetic ? `<span class="vh-phonetic">${escapeHtml(data.phonetic)}</span>` : ""}
          <button class="vh-audio-btn" title="Phát âm">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
            </svg>
          </button>
        </div>
        <button class="vh-close-btn" title="Đóng">&times;</button>
      </div>

      <div class="vh-body">
        ${viSectionHtml}
        ${meaningsHtml ? `
          <div class="vh-en-section">
            <div class="vh-section-title">Định nghĩa tiếng Anh</div>
            ${meaningsHtml}
          </div>
        ` : ""}

        <div class="vh-notes-container">
          <input type="text" class="vh-note-input" placeholder="Thêm ghi chú cá nhân (tùy chọn)..." value="${savedItem && savedItem.notes ? escapeHtml(savedItem.notes) : ""}" />
        </div>
      </div>

      <div class="vh-footer">
        <div class="vh-folder-group">
          <select class="vh-folder-select" title="Chọn thư mục lưu flashcard">
            ${folderOptions}
          </select>
        </div>
        <button class="vh-save-btn ${isSaved ? "vh-saved" : ""}">
          ${isSaved ? "✓ Đã lưu (Cập nhật)" : "⭐ Lưu Flashcard"}
        </button>
      </div>
    `;

    tooltip.querySelector(".vh-close-btn").addEventListener("click", () => {
      removeTooltip();
    });

    const audioBtn = tooltip.querySelector(".vh-audio-btn");
    audioBtn.addEventListener("click", () => {
      playAudio(data.word, data.audio);
    });

    const saveBtn = tooltip.querySelector(".vh-save-btn");
    const folderSelect = tooltip.querySelector(".vh-folder-select");
    const noteInput = tooltip.querySelector(".vh-note-input");

    saveBtn.addEventListener("click", async () => {
      if (!isExtensionValid()) {
        renderContextInvalidated(tooltip, data.word);
        return;
      }

      saveBtn.disabled = true;
      saveBtn.textContent = "Đang lưu...";

      let primaryPos = "";
      let primaryMeaning = "";
      let primaryExample = "";
      if (data.meanings && data.meanings.length > 0) {
        primaryPos = data.meanings[0].partOfSpeech || "";
        if (data.meanings[0].definitions && data.meanings[0].definitions.length > 0) {
          primaryMeaning = data.meanings[0].definitions[0].definition || "";
          primaryExample = data.meanings[0].definitions[0].example || "";
        }
      }

      const flashcardItem = {
        id: savedItem ? savedItem.id : Date.now().toString(),
        word: data.word,
        phonetic: data.phonetic || "",
        audio: data.audio || "",
        vietnameseMeaning: data.vietnameseMeaning || "",
        partOfSpeech: primaryPos,
        meaning: primaryMeaning,
        example: primaryExample,
        folderId: folderSelect.value || "default",
        notes: noteInput.value.trim(),
        dateAdded: savedItem ? savedItem.dateAdded : new Date().toISOString(),
      };

      await saveFlashcard(flashcardItem);
      saveBtn.disabled = false;
      saveBtn.classList.add("vh-saved");
      saveBtn.textContent = "✓ Đã lưu Flashcard";
    });
  }

  function renderContextInvalidated(tooltip, word) {
    tooltip.innerHTML = `
      <div class="vh-header">
        <span class="vh-word">${escapeHtml((word || "Vocab").slice(0, 30))}</span>
        <button class="vh-close-btn" title="Đóng">&times;</button>
      </div>
      <div class="vh-body vh-invalidated-body">
        <div class="vh-reload-alert">
          <div class="vh-reload-title">🔄 Tiện ích vừa được cập nhật</div>
          <p class="vh-reload-desc">Vui lòng tải lại trang web này (phím F5) để tiếp tục tra từ và đồng bộ dữ liệu.</p>
          <button class="vh-reload-action-btn">Tải lại trang ngay (F5)</button>
        </div>
      </div>
    `;

    tooltip.querySelector(".vh-close-btn").addEventListener("click", () => {
      removeTooltip();
    });

    const reloadBtn = tooltip.querySelector(".vh-reload-action-btn");
    if (reloadBtn) {
      reloadBtn.addEventListener("click", () => {
        window.location.reload();
      });
    }
  }

  function renderNotFound(tooltip, word, message) {
    tooltip.innerHTML = `
      <div class="vh-header">
        <span class="vh-word">${escapeHtml(word.slice(0, 30))}</span>
        <button class="vh-close-btn" title="Đóng">&times;</button>
      </div>
      <div class="vh-body vh-empty-body">
        <p class="vh-notfound-text">${escapeHtml(message)}</p>
      </div>
    `;
    tooltip.querySelector(".vh-close-btn").addEventListener("click", () => {
      removeTooltip();
    });
  }

  function renderError(tooltip, word, errorMsg) {
    tooltip.innerHTML = `
      <div class="vh-header">
        <span class="vh-word">${escapeHtml(word.slice(0, 30))}</span>
        <button class="vh-close-btn" title="Đóng">&times;</button>
      </div>
      <div class="vh-body vh-empty-body">
        <p class="vh-error-text">${escapeHtml(errorMsg)}</p>
      </div>
    `;
    tooltip.querySelector(".vh-close-btn").addEventListener("click", () => {
      removeTooltip();
    });
  }

  function playAudio(word, audioUrl) {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play().catch(() => {
        fallbackSpeech(word);
      });
    } else {
      fallbackSpeech(word);
    }
  }

  function fallbackSpeech(text) {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    }
  }

  function checkIfSaved(word) {
    return new Promise((resolve) => {
      if (!isExtensionValid()) {
        resolve(false);
        return;
      }
      try {
        chrome.storage.local.get({ flashcards: [] }, (res) => {
          if (chrome.runtime.lastError) {
            resolve(false);
            return;
          }
          const list = res.flashcards || [];
          const exists = list.some((item) => item.word.toLowerCase() === word.toLowerCase());
          resolve(exists);
        });
      } catch (e) {
        resolve(false);
      }
    });
  }

  function getSavedWordItem(word) {
    return new Promise((resolve) => {
      if (!isExtensionValid()) {
        resolve(null);
        return;
      }
      try {
        chrome.storage.local.get({ flashcards: [] }, (res) => {
          if (chrome.runtime.lastError) {
            resolve(null);
            return;
          }
          const list = res.flashcards || [];
          const found = list.find((item) => item.word.toLowerCase() === word.toLowerCase());
          resolve(found || null);
        });
      } catch (e) {
        resolve(null);
      }
    });
  }

  function getFolders() {
    return new Promise((resolve) => {
      if (!isExtensionValid()) {
        resolve([{ id: "default", name: "Mặc định" }]);
        return;
      }
      try {
        chrome.storage.local.get({ folders: [] }, (res) => {
          if (chrome.runtime.lastError) {
            resolve([{ id: "default", name: "Mặc định" }]);
            return;
          }
          let folders = res.folders || [];
          if (folders.length === 0) {
            folders = [{ id: "default", name: "Mặc định" }];
          }
          resolve(folders);
        });
      } catch (e) {
        resolve([{ id: "default", name: "Mặc định" }]);
      }
    });
  }

  function saveFlashcard(item) {
    return new Promise((resolve) => {
      if (!isExtensionValid()) {
        resolve();
        return;
      }
      try {
        chrome.storage.local.get({ flashcards: [] }, (res) => {
          if (chrome.runtime.lastError) {
            resolve();
            return;
          }
          const list = res.flashcards || [];
          const filtered = list.filter((w) => w.word.toLowerCase() !== item.word.toLowerCase());
          filtered.unshift(item);
          chrome.storage.local.set({ flashcards: filtered }, () => {
            resolve();
          });
        });
      } catch (e) {
        resolve();
      }
    });
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

  function getShadowStyles() {
    return `
      .vh-tooltip {
        position: absolute;
        pointer-events: auto;
        width: 340px;
        max-width: 92vw;
        background: #ffffff;
        color: #1f2937;
        border-radius: 12px;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
        border: 1px solid #e2e8f0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        font-size: 13px;
        line-height: 1.45;
        overflow: hidden;
        animation: vh-fade-in 0.15s ease-out;
        z-index: 2147483647;
      }

      @keyframes vh-fade-in {
        from { opacity: 0; transform: translateY(4px) scale(0.98); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }

      .vh-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 14px;
        background: #f8fafc;
        border-bottom: 1px solid #f1f5f9;
      }

      .vh-header-actions {
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .vh-icon-btn {
        background: #f1f5f9;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        padding: 2px 6px;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.15s;
      }

      .vh-icon-btn:hover {
        background: #e2e8f0;
      }

      .vh-word-info {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }

      .vh-word-badge {
        font-size: 12px;
        font-weight: 700;
        color: #4f46e5;
      }

      .vh-stat-badge {
        font-size: 10px;
        background: #e0e7ff;
        color: #4338ca;
        padding: 1px 6px;
        border-radius: 10px;
        font-weight: 600;
      }

      .vh-word {
        font-size: 16px;
        font-weight: 700;
        color: #0f172a;
      }

      .vh-phonetic {
        font-size: 12px;
        color: #64748b;
        font-family: monospace;
      }

      .vh-title-loading {
        font-size: 13px;
        color: #64748b;
      }

      .vh-audio-btn {
        background: #e0e7ff;
        color: #4338ca;
        border: none;
        border-radius: 50%;
        width: 26px;
        height: 26px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.15s;
        padding: 0;
      }

      .vh-audio-btn:hover {
        background: #c7d2fe;
        transform: scale(1.08);
      }

      .vh-close-btn {
        background: transparent;
        border: none;
        font-size: 18px;
        line-height: 1;
        color: #94a3b8;
        cursor: pointer;
        padding: 0 4px;
      }

      .vh-close-btn:hover {
        color: #334155;
      }

      .vh-body {
        padding: 12px 14px;
        max-height: 280px;
        overflow-y: auto;
      }

      .vh-body-long {
        max-height: 320px;
      }

      .vh-body::-webkit-scrollbar {
        width: 4px;
      }
      .vh-body::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 4px;
      }

      .vh-paragraph-original {
        font-size: 12px;
        color: #64748b;
        background: #f8fafc;
        border-radius: 6px;
        padding: 8px 10px;
        margin-bottom: 8px;
        line-height: 1.45;
        max-height: 100px;
        overflow-y: auto;
        border-left: 2px solid #cbd5e1;
      }

      /* Alert khi extension reload */
      .vh-invalidated-body {
        padding: 14px;
      }

      .vh-reload-alert {
        background: #fffbeb;
        border: 1px solid #fde68a;
        border-radius: 8px;
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        text-align: center;
      }

      .vh-reload-title {
        font-size: 13px;
        font-weight: 700;
        color: #92400e;
      }

      .vh-reload-desc {
        font-size: 11px;
        color: #78350f;
        margin: 0;
        line-height: 1.4;
      }

      .vh-reload-action-btn {
        background: #f59e0b;
        color: #ffffff;
        border: none;
        border-radius: 6px;
        padding: 6px 12px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.15s;
        align-self: center;
      }

      .vh-reload-action-btn:hover {
        background: #d97706;
      }

      /* Nghĩa tiếng Việt */
      .vh-vi-box {
        background: #ecfdf5;
        border: 1px solid #a7f3d0;
        border-radius: 8px;
        padding: 8px 10px;
        margin-bottom: 10px;
      }

      .vh-vi-box-large {
        padding: 10px 12px;
      }

      .vh-flag-badge {
        font-size: 10px;
        font-weight: 700;
        color: #047857;
        text-transform: uppercase;
        display: block;
        margin-bottom: 4px;
      }

      .vh-vi-text {
        font-size: 14px;
        font-weight: 600;
        color: #065f46;
        line-height: 1.5;
      }

      .vh-vi-paragraph {
        font-weight: 500;
        white-space: pre-line;
      }

      .vh-section-title {
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        color: #94a3b8;
        margin-bottom: 6px;
      }

      .vh-pos {
        display: inline-block;
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        background: #ede9fe;
        color: #6d28d9;
        padding: 1px 5px;
        border-radius: 4px;
        margin-bottom: 4px;
      }

      .vh-meaning-block {
        margin-bottom: 8px;
      }
      .vh-meaning-block:last-child {
        margin-bottom: 0;
      }

      .vh-def-list {
        margin: 0;
        padding-left: 18px;
      }

      .vh-def-item {
        color: #334155;
        margin-bottom: 4px;
        font-size: 12px;
      }

      .vh-example {
        font-size: 11px;
        color: #64748b;
        font-style: italic;
        margin-top: 1px;
      }

      /* Notes input */
      .vh-notes-container {
        margin-top: 10px;
      }

      .vh-note-input {
        width: 100%;
        box-sizing: border-box;
        border: 1px dashed #cbd5e1;
        border-radius: 6px;
        padding: 6px 8px;
        font-size: 11px;
        color: #334155;
        outline: none;
        background: #f8fafc;
        transition: border-color 0.15s;
      }

      .vh-note-input:focus {
        border-color: #6366f1;
        background: #ffffff;
      }

      .vh-loading-spinner {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 60px;
      }

      .vh-spinner {
        width: 22px;
        height: 22px;
        border: 2px solid #e2e8f0;
        border-top-color: #6366f1;
        border-radius: 50%;
        animation: vh-spin 0.6s linear infinite;
      }

      @keyframes vh-spin {
        to { transform: rotate(360deg); }
      }

      .vh-empty-body {
        min-height: 50px;
        display: flex;
        align-items: center;
      }

      .vh-notfound-text {
        color: #64748b;
        font-style: italic;
        margin: 0;
      }

      .vh-error-text {
        color: #ef4444;
        margin: 0;
      }

      .vh-footer {
        padding: 8px 12px;
        background: #f8fafc;
        border-top: 1px solid #f1f5f9;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }

      .vh-folder-group {
        flex: 1;
      }

      .vh-folder-select {
        width: 100%;
        max-width: 130px;
        font-size: 11px;
        padding: 5px 6px;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        background: #ffffff;
        color: #334155;
        outline: none;
        cursor: pointer;
      }

      .vh-save-btn {
        background: #4f46e5;
        color: #ffffff;
        border: none;
        border-radius: 6px;
        padding: 6px 10px;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.15s;
        white-space: nowrap;
      }

      .vh-save-btn:hover:not(:disabled) {
        background: #4338ca;
      }

      .vh-save-btn.vh-saved {
        background: #10b981;
      }
    `;
  }
})();
