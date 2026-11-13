function renderCart() {
            const items = Cart.getCart();
            const container = document.getElementById('cart-content');
            document.getElementById('cartNextButton').disabled = !items.length;
            document.getElementById('cartSummaryCount').textContent = items.reduce((sum, item) => sum + item.quantity, 0);
            document.getElementById('cartSummaryTotal').textContent = Cart.getTotalPrice().toLocaleString('vi-VN') + ' đ';
            document.getElementById('cartNextNote').textContent = items.length ? '' : 'Thêm sản phẩm vào giỏ để tiếp tục.';

            if (items.length === 0) {
                container.innerHTML = `<div class="cart-empty"><span class="material-symbols-outlined" aria-hidden="true">shopping_bag</span><h3>Giỏ hàng đang trống</h3><p>Chọn một món trầm bạn yêu thích để bắt đầu.</p><a href="sanpham.html" class="btn-primary">Khám phá sản phẩm</a></div>`;
                return;
            }

            let html = `
                <!-- Bảng hiển thị trên máy tính (Desktop) -->
                <table class="cart-table">
                    <thead>
                        <tr>
                            <th>Sản phẩm</th>
                            <th>Đơn giá</th>
                            <th>SL</th>
                            <th>Thành tiền</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            let mobileCardsHtml = `<div class="mobile-cart-list">`;

            items.forEach(item => {
                const subtotal = item.price * item.quantity;
                const imgSrc = window.productImages[item.id] || item.image || '../image/logo-thuong-hieu.png';
                
                // Hàng cho Desktop (có ảnh thumbnail)
                html += `
                    <tr>
                        <td>
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <img src="${imgSrc}" alt="${item.name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 8px; border: 1px solid var(--border-color); background: #fdfaf7; flex-shrink: 0;">
                                <div>
                                    <strong style="display: block; line-height: 1.35; color: var(--primary-dark);">${item.name}</strong>
                                    <span style="font-size: 12px; color: var(--text-muted);">Mã: SP-0${item.id || 1}</span>
                                </div>
                            </div>
                        </td>
                        <td style="font-weight: 600;">${item.price.toLocaleString('vi-VN')} đ</td>
                        <td>
                            <button class="qty-btn" onclick="changeQty(${item.id}, ${item.quantity - 1})">-</button>
                            <span style="margin: 0 6px; font-weight: 600;">${item.quantity}</span>
                            <button class="qty-btn" onclick="changeQty(${item.id}, ${item.quantity + 1})">+</button>
                        </td>
                        <td style="font-weight: 700; color: var(--accent-hover);">${subtotal.toLocaleString('vi-VN')} đ</td>
                        <td><button class="btn-del" onclick="removeItem(${item.id})">Xóa</button></td>
                    </tr>
                `;

                // Thẻ dạng Card gọn gàng cho Mobile (có ảnh thumbnail)
                mobileCardsHtml += `
                    <div class="mobile-cart-card">
                        <div style="display: flex; gap: 12px; align-items: flex-start; margin-bottom: 10px;">
                            <img src="${imgSrc}" alt="${item.name}" style="width: 56px; height: 56px; object-fit: cover; border-radius: 8px; border: 1px solid var(--border-color); background: #fdfaf7; flex-shrink: 0;">
                            <div style="flex: 1; min-width: 0;">
                                <div class="mobile-cart-header" style="margin-bottom: 4px; padding-bottom: 0; border: none;">
                                    <span class="mobile-cart-title">${item.name}</span>
                                    <button class="btn-del" onclick="removeItem(${item.id})" style="font-size: 13px;">Xóa</button>
                                </div>
                                <div style="font-size: 13px; color: var(--text-muted);">Đơn giá: ${item.price.toLocaleString('vi-VN')} đ</div>
                            </div>
                        </div>
                        <div class="mobile-cart-bottom">
                            <div style="display: flex; align-items: center;">
                                <button class="qty-btn" onclick="changeQty(${item.id}, ${item.quantity - 1})">-</button>
                                <span style="margin: 0 10px; font-weight: 600;">${item.quantity}</span>
                                <button class="qty-btn" onclick="changeQty(${item.id}, ${item.quantity + 1})">+</button>
                            </div>
                            <div class="mobile-cart-subtotal">${subtotal.toLocaleString('vi-VN')} đ</div>
                        </div>
                    </div>
                `;
            });

            mobileCardsHtml += `</div>`;

            const total = Cart.getTotalPrice();
            html += `
                    </tbody>
                </table>
                ${mobileCardsHtml}
            `;
            container.innerHTML = html;
        }

        
function changeQty(id, newQty) { Cart.updateQuantity(id, newQty); renderCart(); }
function removeItem(id) { Cart.removeItem(id, false); renderCart(); }
document.addEventListener('DOMContentLoaded', () => {
    renderCart();
    document.getElementById('cartNextButton').addEventListener('click', () => {
        if (Cart.getCart().length) location.href = 'thanhtoan.html';
    });
});
window.addEventListener('storage', event => { if (event.key === 'tram_huong_cart' || event.key === null) renderCart(); });
