# Quy tắc Thiết kế Giao diện Phẳng & Tối giản (Flat & Minimalist Design) - 8Router

Quy tắc này quy định phong cách thiết kế giao diện cho dự án, dựa trên bộ component `shadcn/ui` sử dụng `@base-ui/react`, và lấy cảm hứng từ sự tinh giản của trang Quota (`/dashboard/quota`).

## Nguyên tắc Cốt lõi
- **Không Shadow**: Loại bỏ hoàn toàn hiệu ứng đổ bóng. Sử dụng đường viền (border) để phân tách các lớp.
- **Tính Phẳng Tuyệt đối**: Các nút và thẻ (card) không có độ nổi, tập trung vào màu sắc và border.
- **Sự Tinh Giản (Minimalism)**: Tránh các yếu tố thị giác nặng nề (chữ in hoa đậm, khoảng cách chữ quá lớn, viền quá đậm). Mọi thứ cần nhẹ nhàng, thanh thoát và tập trung vào dữ liệu.
- **Best Practice (Base UI)**: Luôn sử dụng prop `render` thay vì `asChild` để tránh lỗi hydration.

## 1. Typography (Nghệ thuật chữ)
- **Tránh dùng Uppercase Cứng Nhắc**: KHÔNG sử dụng kết hợp `uppercase font-black tracking-widest` gây nặng nề cho giao diện.
- **Sử dụng Capitalize hoặc Chữ Thường**: Ưu tiên dùng `capitalize` (viết hoa chữ cái đầu) hoặc chỉ viết hoa chữ đầu câu với font weight vừa phải (`font-medium` hoặc `font-semibold`).
- **Kích thước**: Giữ text nhỏ gọn (`text-xs`, `text-sm`) cho các nhãn (labels) và chi tiết phụ.
- **Số liệu**: Luôn sử dụng class `tabular-nums` cho các con số, phần trăm, thời gian để các chữ số được căn chỉnh thẳng hàng dọc.

## 2. Màu sắc và Độ tương phản (Colors & Contrast)
- **Làm mềm giao diện (Soften UI)**: Sử dụng các màu nền có độ trong suốt như `bg-muted/10`, `bg-muted/30`, `bg-muted/40` thay vì các mảng màu đặc.
- **Text phụ**: Sử dụng `text-muted-foreground` cho các thông tin không quá quan trọng.
- **Viền mờ (Subtle Borders)**: Sử dụng `border-border/40` hoặc `border-border/50` để tạo đường phân cách nhẹ nhàng giữa các phần tử thay vì viền nét liền cứng (`border-border`).

## 3. Quy tắc Component UI

### Thẻ (Card)
- **Sai**: Dùng shadow để tạo độ nổi, padding quá rộng, nền đặc khối cứng nhắc.
- **Đúng**: Chỉ dùng viền mỏng (`border-border/50`), nền trong suốt hoặc bán trong suốt (`bg-transparent`, `bg-background/50`), có thể thêm hiệu ứng hover nhẹ nhàng (`hover:bg-muted/10`).
- Giảm padding cho gọn gàng (ví dụ `p-3`, `p-4`).
```tsx
<Card className="shadow-sm border-border/50 bg-background/50 hover:bg-muted/10">
  <CardHeader className="p-3 pb-2 border-b border-border/50">...</CardHeader>
  <CardContent className="p-3 pt-3">...</CardContent>
</Card>
```

### Thanh Tiến trình (Progress Bar)
- **Kiểu dáng**: Thanh mỏng (`h-1`, `h-1.5`), nền nhẹ (`bg-muted/30` hoặc `bg-muted/40`).
- Có thể dùng thêm `opacity-75` cho thanh indicator để dịu mắt hơn.

### Nút (Button)
- Sử dụng các biến thể `outline` hoặc `ghost` để giữ giao diện phẳng.
- Tránh hiệu ứng `active:translate-y-px` nếu muốn phẳng hoàn toàn.

### Dropdown & Popover
- Sử dụng border rõ nét để phân biệt với nền.
- Luôn sử dụng cấu trúc `render` (do sử dụng `base` style):
```tsx
<DropdownMenuTrigger render={<Button variant="outline" />}>
  ...
</DropdownMenuTrigger>
```

## 4. Quy trình thực hiện (Best Practices)
1. **Kiểm tra Registry**: Luôn chạy `npx shadcn@latest search` trước khi tạo component mới.
2. **Sử dụng Semantic Colors**: Luôn dùng `bg-background`, `text-foreground`, `border-border`. Tuyệt đối không hardcode mã màu.
3. **Layout & Spacing**: Sử dụng `flex` với `gap-1`, `gap-1.5`, `gap-2` để nhóm các phần tử liên quan chặt chẽ lại với nhau thay vì để khoảng trống quá lớn.
4. **Icons**: Sử dụng `data-icon="inline-start"` cho icon trong Button.

## 5. Kiểm tra (Validation)
Sau khi tạo hoặc chỉnh sửa component, hãy đảm bảo:
- [ ] Không có thẻ `<button>` lồng trong `<button>`.
- [ ] Không sử dụng `asChild` (thay bằng `render`).
- [ ] Mọi màu sắc đều sử dụng Tailwind tokens.
- [ ] Không lạm dụng `uppercase` với font chữ quá đậm.
- [ ] Đã kiểm tra lại tính "thanh thoát" của giao diện (viền mờ, nền dịu, khoảng cách gọn).