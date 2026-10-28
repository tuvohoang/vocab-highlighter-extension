# Tài Liệu Yêu Cầu Sản Phẩm (Product Requirements Document - PRD)
# Tiện Ích Mở Rộng: Vocab Highlighter

## 1. Giới Thiệu & Tầm Nhìn Sản Phẩm
**Vocab Highlighter** là tiện ích mở rộng dành cho trình duyệt Chrome (Manifest V3), được thiết kế nhằm tối ưu hóa trải nghiệm đọc hiểu văn bản tiếng Anh trên mọi trang web. Tiện ích giúp người dùng:
- Tra cứu nhanh từ vựng song ngữ (Anh - Việt và Anh - Anh) mà không cần chuyển tab hay gián đoạn mạch đọc.
- Dịch các câu, đoạn văn dài bất kỳ mượt mà và chuẩn xác.
- Tổ chức, phân loại từ vựng và câu trích dẫn theo từng **Thư mục (Folder)** chuyên đề.
- Tự thêm ghi chú cá nhân, mẹo ghi nhớ và ôn tập thông minh dưới dạng **Flashcard lật 3D**.
- Xuất danh sách từ ra định dạng bảng tính **Excel (.csv UTF-8 BOM)** phục vụ học tập lâu dài.

---

## 2. Đối Tượng Người Dùng Mục Tiêu
- Người học tiếng Anh ở mọi trình độ (đặc biệt là luyện thi IELTS, TOEIC, TOEFL).
- Lập trình viên, chuyên gia kỹ thuật, sinh viên thường xuyên đọc tài liệu, bài báo tiếng Anh chuyên ngành.
- Người cần một công cụ tra từ nhẹ, không gắn quảng cáo, không theo dõi dữ liệu người dùng và hoạt động hoàn toàn cục bộ (offline storage).

---

## 3. Chi Tiết Tính Năng Sản Phẩm

### 3.1. Bôi Đen Tra Từ & Dịch Đoạn Văn Trực Quan (In-Page Tooltip)
- **Tự động phát hiện thông minh**:
  - **Từ đơn & cụm từ ngắn (< 5 từ)**: Hiển thị giao diện Từ điển hoàn chỉnh gồm:
    - Từ vựng, ký âm quốc tế (IPA).
    - Nút phát âm âm thanh 🔊 (file audio gốc từ từ điển hoặc fallback qua Web Speech API).
    - **Nghĩa tiếng Việt 🇻🇳** được dịch tự động nổi bật.
    - **Định nghĩa tiếng Anh 🇬🇧** chi tiết và câu ví dụ minh họa (từ Free Dictionary API).
    - Ô nhập ghi chú nhanh (Personal Notes).
    - Dropdown chọn Thư mục muốn lưu.
    - Nút **"⭐ Lưu vào Flashcard"** (tự chuyển trạng thái **"✓ Đã lưu"** nếu từ đã tồn tại trong kho).
  - **Câu hoặc đoạn văn dài (5 - 3000 ký tự)**: Tự động chuyển sang giao diện Dịch đoạn văn:
    - Hiển thị văn bản gốc tiếng Anh.
    - Bản dịch tiếng Việt trọn vẹn, định dạng ngắt dòng tự nhiên.
    - Nút **📋 Sao chép bản dịch** 1 chạm vào Clipboard.
    - Nút **🔊 Nghe đọc** toàn bộ đoạn văn tiếng Anh.
    - Tùy chọn lưu đoạn văn mẫu vào Thư mục Flashcard.
- **Cách ly giao diện bằng Shadow DOM**:
  - Giao diện Tooltip được render bên trong một Shadow Root độc lập (`#vocab-highlighter-host`).
  - Đảm bảo 100% không bị ảnh hưởng bởi CSS của trang web hiện tại và không làm biến dạng giao diện trang web.
- **Chống tràn viền màn hình (Viewport Collision Handling)**:
  - Tự động tính toán vị trí bôi đen và kích thước màn hình để đặt Tooltip phù hợp (trên hoặc dưới vùng chọn), không bao giờ bị khuất khỏi tầm nhìn.
- **Khả năng tự phục hồi (Context Invalidation Resilience)**:
  - Tự động phát hiện khi extension vừa được nạp lại/cập nhật mà tab chưa tải lại.
  - Hiển thị thông báo thân thiện và nút **"Tải lại trang ngay (F5)"** thay vì văng lỗi kỹ thuật.

### 3.2. Quản Lý Theo Thư Mục (Folder Management)
- Người dùng có thể tạo không giới hạn các Thư mục chuyên đề (ví dụ: *IELTS Academic*, *Từ vựng IT*, *Giao tiếp hàng ngày*...).
- Mỗi flashcard được liên kết với một `folderId` (mặc định là `"default"` - Mặc định).
- Cho phép lọc danh sách và chọn bộ thẻ ôn tập theo từng thư mục hoặc xem tất cả.
- Hỗ trợ đổi tên hoặc xóa thư mục (khi xóa thư mục, các từ vựng bên trong tự động chuyển an toàn về thư mục "Mặc định").

### 3.3. Chỉnh Sửa Từ Vựng & Thêm Ghi Chú Cá Nhân
- Mỗi thẻ từ trong danh sách có nút chỉnh sửa **✏️**:
  - Cho phép sửa trực tiếp Nghĩa tiếng Việt, Định nghĩa tiếng Anh.
  - Thêm mẹo ghi nhớ, giải thích ngữ cảnh vào trường **Ghi chú cá nhân (Personal Notes)**.
  - Chuyển đổi từ vựng sang thư mục khác.
- Ghi chú cá nhân sẽ hiển thị nổi bật với icon 💡 ở mặt sau của thẻ Flashcard khi ôn tập.

### 3.4. Tab Dịch Đoạn Văn Độc Lập (Quick Translator Trong Popup)
- Tích hợp sẵn một khung dịch văn bản ngay trong Popup tiện ích.
- Người dùng có thể dán hoặc nhập bất kỳ văn bản nào từ tài liệu ngoài (PDF, Word, Email).
- Hỗ trợ phím tắt `Ctrl + Enter` để dịch tức thì.
- Có nút phát âm tiếng Việt, nút sao chép và nút lưu trực tiếp thành một flashcard câu mẫu.

### 3.5. Chế Độ Ôn Tập Flashcard 3D (Review Mode)
- Trải nghiệm học tập tương tác mô phỏng thẻ ghi nhớ ngoài đời thực với hiệu ứng **Lật thẻ 3D (Flip Card)**:
  - **Mặt trước**: Từ vựng to rõ, phiên âm IPA, nút nghe phát âm 🔊.
  - **Mặt sau**: 🇻🇳 Nghĩa tiếng Việt, 🇬🇧 Định nghĩa tiếng Anh & Từ loại, 💡 Ghi chú cá nhân, câu ví dụ minh họa.
- Điều khiển mượt mà bằng chuột hoặc bàn phím:
  - Phím `Space`: Lật thẻ xem nghĩa / lật lại mặt trước.
  - Phím `←` / `→`: Chuyển sang thẻ trước / thẻ tiếp theo.
- Lọc thẻ ôn tập theo từng thư mục cụ thể.

### 3.6. Xuất Dữ Liệu Bảng Tính Excel (.csv UTF-8 BOM)
- Nút **"Xuất Excel"** tích hợp trên thanh công cụ của Popup.
- Xuất toàn bộ danh sách hoặc chỉ xuất theo Thư mục đang chọn.
- Áp dụng tiền tố **Byte Order Mark `\uFEFF`** chuẩn UTF-8, giúp Microsoft Excel trên Windows và Mac tự động nhận diện tiếng Việt chính xác, không bị lỗi font hay ký tự lạ.
- Các cột dữ liệu xuất ra bao gồm:
  1. `Từ vựng / Câu`
  2. `Phiên âm`
  3. `Nghĩa tiếng Việt`
  4. `Định nghĩa tiếng Anh / Gốc`
  5. `Từ loại`
  6. `Ghi chú cá nhân`
  7. `Ví dụ minh họa`
  8. `Thư mục`
  9. `Ngày lưu`

---

## 4. Đặc Tả Dữ Liệu (Data Schema)

Lưu trữ thông qua `chrome.storage.local`:

```typescript
// Thư mục
interface Folder {
  id: string;          // e.g. "default", "folder_1729000000"
  name: string;        // e.g. "IELTS Reading"
  createdAt: string;   // ISO string
}

// Thẻ từ vựng / Flashcard
interface FlashcardItem {
  id: string;                  // timestamp unique id
  word: string;                // từ vựng hoặc tiêu đề câu trích
  phonetic: string;            // phiên âm IPA (nếu có)
  audio: string;               // URL file âm thanh mp3 (nếu có)
  vietnameseMeaning: string;   // bản dịch tiếng Việt
  partOfSpeech: string;        // từ loại (noun, verb, paragraph...)
  meaning: string;             // định nghĩa tiếng Anh hoặc văn bản gốc
  example: string;             // câu ví dụ minh họa
  folderId: string;            // id thư mục chứa thẻ
  notes: string;               // ghi chú cá nhân của người học
  dateAdded: string;           // ISO string ngày lưu
}

// Cấu trúc toàn bộ Storage
interface AppStorage {
  flashcards: FlashcardItem[];
  folders: Folder[];
  activeFolderId: string;     // folder hiện đang được chọn lọc ("all" hoặc folderId)
}
```

---

## 5. Tiêu Chuẩn Phi Chức Năng (Non-functional Requirements)
- **Tốc độ phản hồi**: Thời gian render Tooltip dưới 50ms; kết quả tra từ hiển thị ngay khi API trả về.
- **Quyền riêng tư & Bảo mật**: Không thu thập dữ liệu cá nhân, không gửi dữ liệu người dùng về server bên ngoài; chỉ kết nối trực tiếp đến các API công khai phục vụ tra từ điển và dịch thuật.
- **Dung lượng**: Dung lượng gói extension siêu nhẹ (< 150KB), không phụ thuộc vào thư viện bên thứ ba.

