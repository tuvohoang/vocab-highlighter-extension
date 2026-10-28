# Kỹ Năng Kiểm Thử Extension (Skill: Test Extension)

Tài liệu hướng dẫn quy trình kiểm thử lỗi runtime, kiểm tra tính năng và cách debug cho tiện ích mở rộng Chrome (Manifest V3).

---

## 1. Kiểm tra Background Service Worker
1. Mở Chrome và truy cập `chrome://extensions`.
2. Bật **Developer mode** (góc trên bên phải).
3. Tại card của tiện ích **Vocab Highlighter**, tìm dòng **Inspect views** và nhấp vào liên kết `service worker`.
4. Cửa sổ Chrome DevTools sẽ mở ra cho Service Worker:
   - **Tab Console**: Xem các log khởi tạo (`chrome.runtime.onInstalled`), log khi nhận message `lookup_word` hoặc `translate_text`.
   - **Tab Network**: Kiểm tra các request gọi sang `api.dictionaryapi.dev` hoặc `translate.googleapis.com` (xem HTTP status, response JSON).
   - **Tab Application > Storage > Extension Storage**: Kiểm tra trực tiếp dữ liệu đang được lưu trong `chrome.storage.local` (`flashcards`, `folders`, `activeFolderId`).

---

## 2. Kiểm tra Content Script trên Trang Web
1. Mở một trang web bất kỳ có văn bản tiếng Anh (ví dụ: `https://en.wikipedia.org/wiki/Main_Page`).
2. Mở DevTools bằng phím `F12`.
3. Bôi đen một từ tiếng Anh (ví dụ: `guidance`, `resilience`) hoặc một đoạn văn dài:
   - Kiểm tra xem Tooltip có xuất hiện chính xác cạnh con trỏ chuột không.
   - Kiểm tra trong tab **Elements**: Tìm thẻ `#vocab-highlighter-host` gắn ở cuối `<body>`. Mở rộng `#shadow-root (open)` để xem các phần tử `.vh-tooltip`.
   - Kiểm tra trong tab **Console**: Xem có lỗi JavaScript nào văng ra không.
   - Thử click nút loa 🔊 để kiểm tra âm thanh phát âm.
   - Thử chọn Folder và bấm "Lưu Flashcard".

---

## 3. Kiểm tra Giao Diện Popup
1. Nhấp chuột phải vào biểu tượng của tiện ích trên thanh công cụ trình duyệt -> Chọn **Inspect popup** (Kiểm tra cửa sổ bật lên).
2. Cửa sổ DevTools dành riêng cho popup sẽ mở ra:
   - **Tab Console**: Kiểm tra các log khi tải danh sách, bắt sự kiện chuyển tab, tìm kiếm hoặc xuất file Excel.
   - **Tab Elements**: Kiểm tra cấu trúc DOM của các tab (Danh sách từ, Flashcard deck, Dịch đoạn văn).
   - Kiểm tra thử nghiệm tính năng:
     - Tạo thư mục mới.
     - Lọc theo thư mục.
     - Bấm nút **"Xuất Excel"** và mở file `.csv` vừa tải về để kiểm tra hiển thị font tiếng Việt.
     - Chuyển sang tab **"Ôn tập Flashcard"**, ấn phím `Space` để lật thẻ và `←` / `→` để chuyển thẻ.
     - Chuyển sang tab **"Dịch đoạn văn"**, dán một đoạn văn và bấm dịch sang tiếng Việt.

---

## 4. Xử Lý Các Lỗi Thường Gặp
| Lỗi | Nguyên nhân | Cách khắc phục |
| :--- | :--- | :--- |
| `Extension context invalidated` | Extension vừa được reload nhưng tab web chưa tải lại | Nhấn `F5` trên tab web đang kiểm tra để nạp lại content script mới. |
| Lỗi CORS / Blocked by CSP | Fetch API trực tiếp trong `content.js` bị chính sách trang web chặn | Toàn bộ request mạng phải gửi qua `chrome.runtime.sendMessage` để Background Service Worker fetch. |
| Audio không phát được | Website chặn autoplay hoặc URL âm thanh bị lỗi | Tiện ích đã có cơ chế tự động fallback sang `window.speechSynthesis`. |
| Popup không cập nhật dữ liệu mới lưu | Cache dữ liệu trong biến nội bộ | Lắng nghe hoặc gọi lại hàm `loadData()` mỗi khi popup được kích hoạt. |

