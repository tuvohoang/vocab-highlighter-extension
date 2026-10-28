# Quy Trình Tự Động Xác Thực Build (Workflow: Verify Build)

Tài liệu và kịch bản tự động kiểm tra cấu trúc, tính hợp lệ của Manifest, các đường dẫn tài nguyên và bộ icons của tiện ích.

---

## 1. Mục Tiêu Kiểm Tra
1. **Tính hợp lệ của `manifest.json`**: Cú pháp JSON chuẩn, có đầy đủ các trường bắt buộc (`manifest_version: 3`, `name`, `version`, `action`, `background`).
2. **Đường dẫn file mã nguồn**: Đảm bảo toàn bộ các file được trích dẫn trong `manifest.json` đều tồn tại trên ổ đĩa.
3. **Bộ Icons**: Đảm bảo đủ 3 file PNG chuẩn (`icon16.png`, `icon48.png`, `icon128.png`) với dung lượng > 0 byte.
4. **Không có file rác thừa**: Các file tạm hệ thống không được nằm trong gói phân phối.

---

## 2. Kịch Bản Tự Động Kiểm Tra (PowerShell Script)

Chạy câu lệnh PowerShell sau tại thư mục gốc dự án:

```powershell
Write-Host "================ KIỂM TRA BẢN BUILD EXTENSION ================" -ForegroundColor Cyan

# 1. Kiểm tra manifest.json
$manifestPath = ".\manifest.json"
if (-not (Test-Path $manifestPath)) {
    Write-Host "❌ LỖI: Không tìm thấy file manifest.json!" -ForegroundColor Red
    exit 1
}

try {
    $manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
    Write-Host "✓ manifest.json hợp lệ (Version: $($manifest.version), Name: $($manifest.name))" -ForegroundColor Green
} catch {
    Write-Host "❌ LỖI: manifest.json bị lỗi cú pháp JSON! $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 2. Kiểm tra Service Worker
$swPath = $manifest.background.service_worker
if (Test-Path $swPath) {
    Write-Host "✓ Background Service Worker: $swPath" -ForegroundColor Green
} else {
    Write-Host "❌ LỖI: Thiếu file Background Service Worker: $swPath" -ForegroundColor Red
}

# 3. Kiểm tra Popup HTML
$popupPath = $manifest.action.default_popup
if (Test-Path $popupPath) {
    Write-Host "✓ Popup HTML: $popupPath" -ForegroundColor Green
} else {
    Write-Host "❌ LỖI: Thiếu file Popup HTML: $popupPath" -ForegroundColor Red
}

# 4. Kiểm tra Content Scripts
foreach ($cs in $manifest.content_scripts) {
    foreach ($js in $cs.js) {
        if (Test-Path $js) {
            Write-Host "✓ Content Script JS: $js" -ForegroundColor Green
        } else {
            Write-Host "❌ LỖI: Thiếu file Content Script JS: $js" -ForegroundColor Red
        }
    }
    foreach ($css in $cs.css) {
        if (Test-Path $css) {
            Write-Host "✓ Content Script CSS: $css" -ForegroundColor Green
        } else {
            Write-Host "❌ LỖI: Thiếu file Content Script CSS: $css" -ForegroundColor Red
        }
    }
}

# 5. Kiểm tra Bộ Icons
$iconSizes = @(16, 48, 128)
foreach ($size in $iconSizes) {
    $iconFile = ".\icons\icon$size.png"
    if (Test-Path $iconFile) {
        $fileInfo = Get-Item $iconFile
        if ($fileInfo.Length -gt 0) {
            Write-Host "✓ Icon ${size}x${size}: $iconFile ($($fileInfo.Length) bytes)" -ForegroundColor Green
        } else {
            Write-Host "❌ LỖI: File $iconFile có kích thước 0 byte!" -ForegroundColor Red
        }
    } else {
        Write-Host "❌ LỖI: Thiếu file icon: $iconFile" -ForegroundColor Red
    }
}

Write-Host "================ HOÀN TẤT KIỂM TRA ================" -ForegroundColor Cyan
```

