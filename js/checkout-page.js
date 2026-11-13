const checkoutEscape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
function renderCheckout() {
    const items = Cart.getCart();
    const container = document.getElementById('checkout-content');
    document.querySelector('.cart-place-order').disabled = !items.length;
    document.querySelector('.cart-order-label').textContent = items.length ? 'Đặt hàng' : 'Giỏ hàng đang trống';
    if (!items.length) {
        container.innerHTML = '<div class="cart-empty"><p>Giỏ hàng đang trống. Vui lòng chọn sản phẩm trước khi thanh toán.</p><a href="sanpham.html" class="btn-primary">Khám phá sản phẩm</a></div>';
        return;
    }
    container.innerHTML = '<ul class="checkout-items">' + items.map(item => '<li><img src="' + checkoutEscape(window.productImages[item.id] || item.image || '../image/logo-thuong-hieu.png') + '" alt="" width="56" height="56"><div><strong>' + checkoutEscape(item.name) + '</strong><span>Số lượng: ' + item.quantity + '</span></div><b>' + (item.price * item.quantity).toLocaleString('vi-VN') + ' đ</b></li>').join('') + '</ul><div class="cart-summary">Tạm tính<strong>' + Cart.getTotalPrice().toLocaleString('vi-VN') + ' đ</strong></div><p class="cart-shipping-note">Chưa bao gồm phí giao hàng. Phí sẽ được xác nhận khi xử lý đơn.</p>';
}

// Bật / tắt hiển thị mã QR khi chọn Chuyển khoản
        function togglePaymentQR() {
            const bankRadio = document.getElementById('bank');
            const qrBox = document.getElementById('qrBankBox');
            if (bankRadio && qrBox) {
                qrBox.classList.toggle('active', bankRadio.checked);
            }
        }


        function fillShipping() {
            try {
                const user = Account.current();
                if (!user) return;
                for (const key of ['name', 'phone', 'address']) document.getElementById('order-' + key).value = user[key] || '';
            } catch (error) { showToast(error.message); }
        }

        function handleCheckout(e) {
            e.preventDefault();
            if (!e.target.reportValidity()) return;
            try {
                if (!Account.current()) {
                    showBox('Vui lòng đăng nhập để đặt hàng và lưu lịch sử đơn. Giỏ hàng của bạn sẽ được giữ lại.', 'Đăng nhập để đặt hàng', () => { window.location.href = 'taikhoan.html?next=checkout'; });
                    return;
                }
                const shipping = {};
                for (const key of ['name', 'phone', 'address', 'note']) shipping[key] = document.getElementById('order-' + key).value.trim();
                const payment = document.querySelector('input[name="payment"]:checked').value;
                const order = Account.placeOrder(Cart.getCart(), shipping, payment);
                Cart.clearCart();
                renderCheckout();
                e.target.reset();
                togglePaymentQR();
                fillShipping();
                showBox('Đã lưu đơn dùng thử ' + order.id + '. Bạn có thể xem chi tiết trong Tài khoản. Đơn chưa được gửi đến cửa hàng; thanh toán chưa được xác nhận.', 'Đã lưu đơn hàng', () => { window.location.href = 'taikhoan.html#ordersSection'; }, false);
            } catch (error) {
                showBox(error.message || 'Không thể lưu đơn. Vui lòng thử lại.', 'Đặt hàng', null, false);
            }
        }

        document.addEventListener('DOMContentLoaded', fillShipping);
        document.addEventListener('DOMContentLoaded', renderCheckout);
window.addEventListener('storage', event => { if (event.key === 'tram_huong_cart' || event.key === null) renderCheckout(); });
