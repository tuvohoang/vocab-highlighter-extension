// background/background.js - Xử lý tra từ điển Anh-Anh và dịch đoạn văn tiếng Việt

chrome.runtime.onInstalled.addListener(() => {
  console.log("Vocab Highlighter đã được cài đặt/cập nhật.");
  chrome.storage.local.get({ folders: [] }, (res) => {
    if (!res.folders || res.folders.length === 0) {
      chrome.storage.local.set({
        folders: [
          { id: "default", name: "Mặc định", createdAt: new Date().toISOString() }
        ]
      });
    }
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // 1. Tra từ vựng hoặc đoạn văn khi bôi đen
  if (request.action === "lookup_word") {
    handleLookupOrTranslate(request.word)
      .then((data) => sendResponse({ success: true, data }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }

  // 2. Dịch văn bản trực tiếp từ Popup tab Dịch
  if (request.action === "translate_text") {
    translateLongText(request.text, request.sourceLang || "auto", request.targetLang || "vi")
      .then((translation) => sendResponse({ success: true, translation }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

/**
 * Xử lý thông minh: Phân biệt Từ đơn (Vocabulary) hay Đoạn văn dài (Sentence / Paragraph)
 */
async function handleLookupOrTranslate(rawText) {
  const cleanText = rawText.trim();
  if (!cleanText) {
    throw new Error("Nội dung cần tra không hợp lệ.");
  }

  const wordCount = cleanText.split(/\s+/).filter(Boolean).length;
  const isParagraph = cleanText.length > 50 || wordCount > 4;

  // Nếu là đoạn văn dài -> chỉ dịch toàn văn bản
  if (isParagraph) {
    const translation = await translateLongText(cleanText, "auto", "vi");
    return {
      isLongText: true,
      originalText: cleanText,
      vietnameseMeaning: translation,
      wordCount: wordCount,
      charCount: cleanText.length
    };
  }

  // Nếu là từ đơn hoặc cụm từ ngắn -> tra từ điển Anh-Anh kết hợp dịch tiếng Việt
  const [dictResult, viMeaning] = await Promise.allSettled([
    fetchEnglishDictionary(cleanText),
    translateLongText(cleanText, "auto", "vi")
  ]);

  const dictData = dictResult.status === "fulfilled" ? dictResult.value : null;
  const vietnameseTranslation = viMeaning.status === "fulfilled" ? viMeaning.value : "";

  if (!dictData && !vietnameseTranslation) {
    throw new Error("Không tìm thấy kết quả cho từ này.");
  }

  return {
    isLongText: false,
    word: dictData ? dictData.word : cleanText,
    phonetic: dictData ? dictData.phonetic : "",
    audio: dictData ? dictData.audio : "",
    vietnameseMeaning: vietnameseTranslation || "Chưa có bản dịch",
    meanings: dictData && dictData.meanings ? dictData.meanings : []
  };
}

/**
 * Lấy định nghĩa tiếng Anh từ Free Dictionary API
 */
async function fetchEnglishDictionary(word) {
  const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.toLowerCase())}`;
  const res = await fetch(url);
  if (!res.ok) {
    return null;
  }

  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }

  const entry = data[0];
  let phoneticText = entry.phonetic || "";
  let audioUrl = "";

  if (entry.phonetics && Array.isArray(entry.phonetics)) {
    for (const p of entry.phonetics) {
      if (!phoneticText && p.text) {
        phoneticText = p.text;
      }
      if (!audioUrl && p.audio && p.audio.trim().length > 0) {
        audioUrl = p.audio.trim();
        if (audioUrl.startsWith("//")) {
          audioUrl = "https:" + audioUrl;
        }
      }
      if (phoneticText && audioUrl) break;
    }
  }

  const meanings = [];
  if (entry.meanings && Array.isArray(entry.meanings)) {
    for (const m of entry.meanings) {
      const partOfSpeech = m.partOfSpeech || "general";
      const defs = (m.definitions || []).slice(0, 3).map((d) => ({
        definition: d.definition || "",
        example: d.example || "",
      }));

      if (defs.length > 0) {
        meanings.push({
          partOfSpeech,
          definitions: defs,
        });
      }
    }
  }

  return {
    word: entry.word || word,
    phonetic: phoneticText,
    audio: audioUrl,
    meanings: meanings.slice(0, 3),
  };
}

/**
 * Dịch đoạn văn bản dài bằng Google Translate API (hỗ trợ nhiều câu, đoạn văn lớn)
 */
async function translateLongText(text, sl = "auto", tl = "vi") {
  try {
    const gUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(sl)}&tl=${encodeURIComponent(tl)}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(gUrl);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && Array.isArray(data[0])) {
        // Ghép toàn bộ các câu dịch lại thành đoạn hoàn chỉnh
        const translatedParts = data[0].map((item) => item[0]).filter(Boolean);
        if (translatedParts.length > 0) {
          return translatedParts.join("").trim();
        }
      }
    }
  } catch (e) {
    console.warn("Google Translate lỗi đoạn văn, thử MyMemory fallback:", e);
  }

  // Fallback: MyMemory (nếu đoạn văn < 500 ký tự)
  try {
    const memUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.slice(0, 500))}&langpair=en|vi`;
    const res = await fetch(memUrl);
    if (res.ok) {
      const data = await res.json();
      if (data && data.responseData && data.responseData.translatedText) {
        return data.responseData.translatedText.trim();
      }
    }
  } catch (e) {
    console.warn("MyMemory fallback lỗi:", e);
  }

  throw new Error("Không thể dịch đoạn văn vào lúc này. Vui lòng thử lại sau.");
}
