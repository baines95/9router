# Quy tắc Thiết kế Giao diện Phẳng (Flat Design) - 8Router

Quy tắc này quy định phong cách thiết kế phẳng cho dự án, dựa trên bộ component `shadcn/ui` sử dụng `@base-ui/react`.

## Nguyên tắc Cốt lõi
- **Không Shadow**: Loại bỏ hoàn toàn hiệu ứng đổ bóng. Sử dụng đường viền (border) để phân tách các lớp.
- **Tính Phẳng Tuyệt đối**: Các nút và thẻ (card) không có độ nổi, tập trung vào màu sắc và border.
- **Best Practice (Base UI)**: Luôn sử dụng prop `render` thay vì `asChild` để tránh lỗi hydration.

## 1. Cấu hình Global (Tailwind v4)
Trong `src/app/globals.css`, các biến radius và shadow phải được thiết lập theo phong cách phẳng:

```css
:root {
  --radius: 0.5rem;
  --shadow-sm: none;
  --shadow: none;
  --shadow-md: none;
  --shadow-lg: none;
  --shadow-xl: none;
  --shadow-2xl: none;
  --shadow-inner: none;
}
```

## 2. Quy tắc Component UI

### Thẻ (Card)
- **Sai**: Dùng shadow để tạo độ nổi.
- **Đúng**: Chỉ dùng border và màu nền đồng nhất.
```tsx
<Card className="border-border shadow-none">
  <CardHeader>...</CardHeader>
</Card>
```

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

## 3. Quy trình thực hiện (Best Practices)
1. **Kiểm tra Registry**: Luôn chạy `npx shadcn@latest search` trước khi tạo component mới.
2. **Sử dụng Semantic Colors**: Luôn dùng `bg-background`, `text-foreground`, `border-border`. Tuyệt đối không hardcode mã màu.
3. **Layout**: Sử dụng `flex` với `gap-*` thay vì `space-x/y`.
4. **Icons**: Sử dụng `data-icon="inline-start"` cho icon trong Button.

## 4. Kiểm tra (Validation)
Sau khi tạo hoặc chỉnh sửa component, hãy đảm bảo:
- [ ] Không có thẻ `<button>` lồng trong `<button>`.
- [ ] Không sử dụng `asChild` (thay bằng `render`).
- [ ] Mọi màu sắc đều sử dụng Tailwind tokens.
