# 📚 Vocab Highlighter - Chrome Extension - Vibe coding

> **Tiện ích mở rộng Chrome (Manifest V3) hỗ trợ học tiếng Anh thông minh:** Tra từ vựng song ngữ, dịch đoạn văn dài, quản lý theo Thư mục, ghi chú cá nhân, ôn tập Flashcard 3D và xuất file Excel.

---

## 🚀 Tính Năng Nổi Bật

* **🔍 Tra từ & Dịch đoạn văn khi bôi đen (In-Page Tooltip)**:
  - Bôi đen **từ đơn**: Hiển thị phiên âm IPA, phát âm 🔊, nghĩa tiếng Việt 🇻🇳, định nghĩa tiếng Anh 🇬🇧 và ví dụ.
  - Bôi đen **câu / đoạn văn dài** (lên đến 3.000 ký tự): Hiển thị bản dịch tiếng Việt hoàn chỉnh, nút sao chép 📋 và đọc văn bản 🔊.
  - Sử dụng **Shadow DOM** cô lập 100%, không bị ảnh hưởng bởi CSS của trang web.
* **📁 Quản lý theo Thư mục (Folders)**:
  - Phân loại từ vựng và câu trích dẫn theo từng nhóm học (IELTS, Chuyên ngành, Giao tiếp...).
  - Chọn thư mục lưu ngay trên Tooltip hoặc trong Popup.
* **✏️ Chỉnh sửa & Ghi chú cá nhân (Personal Notes)**:
  - Tự do sửa nghĩa, bổ sung mẹo ghi nhớ hoặc ngữ cảnh riêng cho từng từ.
* **🗂️ Ôn tập Flashcard 3D (Review Mode)**:
  - Mô phỏng thẻ học thực tế với hiệu ứng xoay lật 3D.
  - Điều khiển linh hoạt bằng phím `Space` (lật thẻ) và `←` / `→` (chuyển thẻ).
* **🌐 Tab Dịch đoạn văn nhanh (Quick Translator)**:
  - Khung dịch độc lập trong Popup để dán và dịch tài liệu bên ngoài (PDF, Email, Word).
* **📥 Xuất file Excel (.csv UTF-8 BOM)**:
  - Tải về danh sách từ vựng theo bảng tính Excel chuẩn, hiển thị tiếng Việt có dấu 100% không lỗi font.

---

## 📂 Cấu Trúc Dự Án

```
vocab-highlighter-extension/
├── .agents/                        # Tài liệu và kịch bản điều phối dành cho AI Agent
│   ├── rules                       # Quy chuẩn phát triển (MV3, Vanilla JS, Scope isolation)
│   ├── skills/
│   │   └── test-extension.md       # Quy trình kiểm thử runtime và debug DevTools
│   └── workflows/
│       └── verify-build.md         # Kịch bản kiểm tra toàn vẹn bản build
├── docs/                           # Tài liệu kỹ thuật dự án
│   ├── PRD.md                      # Đặc tả yêu cầu sản phẩm chi tiết
│   └── ARCHITECTURE.md             # Kiến trúc hệ thống và sơ đồ luồng dữ liệu
├── background/                     # Background Service Worker
│   └── background.js               # Xử lý fetch API song song (Dictionary & Google Translate)
├── content/                        # Content Scripts nhúng vào trang web
│   ├── content.js                  # Bắt sự kiện bôi đen, hiển thị Shadow DOM Tooltip
│   └── content.css                 # Style container gốc cho content script
├── popup/                          # Ứng dụng Popup trên thanh công cụ
│   ├── popup.html                  # Giao diện Popup 3 tabs (Từ vựng, Flashcard, Dịch)
│   ├── popup.css                   # Phong cách giao diện hiện đại, hiệu ứng 3D flip
│   └── popup.js                    # Quản lý danh sách, folder, flashcard deck, xuất CSV
├── icons/                          # Bộ icon của tiện ích
│   ├── icon16.png                  # Kích thước 16x16px
│   ├── icon48.png                  # Kích thước 48x48px
│   └── icon128.png                 # Kích thước 128x128px
├── .gitignore                      # Danh sách file loại trừ khi quản lý mã nguồn git
├── manifest.json                   # Tệp cấu hình chuẩn Chrome Extension Manifest V3
└── README.md                       # Tài liệu hướng dẫn sử dụng dự án
```

---

## 🛠️ Hướng Dẫn Cài Đặt Vào Trình Duyệt

1. Mở trình duyệt **Google Chrome** (hoặc Edge, Brave, Cốc Cốc).
2. Truy cập vào địa chỉ: `chrome://extensions`
3. Bật công tắc **"Developer mode" (Chế độ dành cho nhà phát triển)** ở góc trên bên phải.
4. Bấm vào nút **"Load unpacked" (Tải tiện ích đã giải nén)** ở góc trên bên trái.
5. Chọn thư mục dự án: `d:\Projects\vocab-highlighter-extension`.
6. Ghim (Pin) biểu tượng **Vocab Highlighter** lên thanh công cụ để sử dụng thuận tiện.

---

## 💡 Hướng Dẫn Nhanh Sử Dụng

1. **Tra từ**: Mở trang web tiếng Anh bất kỳ (ví dụ: [bbc.com](https://www.bbc.com) hoặc [wikipedia.org](https://en.wikipedia.org)) và bôi đen một từ/câu tiếng Anh.
2. **Lưu Flashcard**: Chọn thư mục trên Tooltip và bấm **"⭐ Lưu Flashcard"**.
3. **Ôn tập**: Mở Popup tiện ích, chọn tab **"Flashcard"**, ấn `Space` để lật thẻ và phím mũi tên để duyệt thẻ.
4. **Xuất Excel**: Tại tab **"Từ vựng"**, bấm nút **"Xuất Excel"** màu xanh để tải file `.csv` về máy.

---

## 📜 Giấy Phép
Dự án được xây dựng phục vụ mục đích học tập và phát triển cá nhân theo giấy phép MIT.

