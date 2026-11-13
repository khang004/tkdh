# Chuyên mục tin tức Mộc Hương

Giao diện dùng HTML/CSS/JavaScript hiện có. Máy chủ dùng Node.js tích hợp sẵn, không cần cài thư viện và không dùng cơ sở dữ liệu.

## Khởi chạy

Yêu cầu Node.js 22 trở lên. Tại thư mục dự án:

```powershell
npm start
```

- Tin tức: http://127.0.0.1:8000/view/tintuc.html
- Quản trị: http://127.0.0.1:8000/quan-tri/tin-tuc
- Chi tiết: http://127.0.0.1:8000/tin-tuc/tram-huong-la-gi

Mở bằng máy chủ này để các API và trang chi tiết hoạt động. Live Server cổng 5500 chỉ phục vụ file tĩnh, không xử lý API quản trị hoặc đường dẫn bài viết.

## Tài khoản quản trị

Lần đầu, vào trang quản trị từ chính máy chủ, tự tạo tên đăng nhập và mật khẩu (ít nhất 8 ký tự). Không có mật khẩu mặc định. Các lần sau dùng tài khoản đó để đăng nhập. Mật khẩu được băm bằng scrypt; cookie phiên HttpOnly có thời hạn 8 giờ. Thiết lập lần đầu chỉ được phép từ địa chỉ loopback.

Tài khoản quản trị tin tức độc lập với tài khoản khách hàng đang lưu trên trình duyệt. Chỉ quản trị viên có thể thay đổi bài viết, danh mục và tải ảnh. Đường dẫn xem trước yêu cầu phiên đăng nhập, không công khai bản nháp.

## Dữ liệu

- `.news/store.json`: bài viết, danh mục và mật khẩu đã băm. Tệp được tạo tự động khi chạy lần đầu, không được máy chủ phục vụ như file công khai.
- `news/seed.json`: 8 bài viết khởi tạo. Chỉ được đọc khi chưa có dữ liệu; sửa tệp này không ghi đè những bài đã chỉnh trong quản trị.
- `image/uploads/news/`: ảnh tải lên, tối đa 8 MB mỗi tệp; nhận JPG, PNG, WebP và GIF.

Dừng máy chủ trước khi sao lưu hoặc khôi phục. Sao lưu cả `.news/` và `image/uploads/news/`. Không xóa `.news/` để cập nhật nội dung; dùng trang quản trị. Ứng dụng dùng một tiến trình ghi tệp; không chạy nhiều máy chủ cùng ghi vào một thư mục dữ liệu.

## Biên tập

Thêm bài hoặc chỉnh sửa bài hiện có; điền tiêu đề, slug, danh mục, mô tả, đoạn giới thiệu và ảnh đại diện. Nội dung gồm các khối H2/H3, đoạn văn và ảnh. Có thể tải nhiều ảnh, ghi chú thích, sắp xếp khối lên/xuống, lưu nháp, đăng hoặc ẩn bài. Nút “Lưu & xem trước” lưu thay đổi và mở trang xem trước riêng.

Danh mục đang chứa bài viết không thể bị xóa; chuyển bài sang danh mục khác trước. Slug trùng bị từ chối. Khi thay slug, liên kết cũ không tự chuyển hướng.

## Kiểm tra

```powershell
npm test
```

Kiểm tra tìm kiếm, phân trang, đăng nhập, phân quyền, bản nháp/xem trước, thêm/sửa/xóa bài, quản lý danh mục, tải ảnh, thoát phiên và dữ liệu giữ lại khi đọc lại tệp.

## Chạy trên mạng

Mặc định chỉ lắng nghe 127.0.0.1. Không xem đây là dịch vụ đã triển khai công khai. Khi đưa lên hosting cần cấu hình HTTPS, tên miền và vận hành phù hợp. Máy chủ file tĩnh cũ `server.py` được giữ nguyên, không xử lý chuyên mục động.
