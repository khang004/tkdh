const accountField = id => document.getElementById(id);
const escapeAccountText = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const accountMoney = value => value.toLocaleString('vi-VN') + ' đ';

async function accountAction(event, action) {
    event.preventDefault();
    if (!event.target.reportValidity()) return;
    const button = event.target.querySelector('button[type="submit"], button:not([type])');
    if (button?.disabled) return;
    if (button) button.disabled = true;
    try { await action(); }
    catch (error) { showBox(error.message || 'Không thể lưu dữ liệu. Vui lòng kiểm tra quyền lưu trữ của trình duyệt.', 'Tài khoản', null, false); }
    finally { if (button) button.disabled = false; }
}

function finishAccountLogin() {
    accountField('loginForm').reset();
    accountField('registerForm').reset();
    if (new URLSearchParams(location.search).get('next') === 'checkout') {
        location.href = 'thanhtoan.html';
        return;
    }
    location.href = 'index.html';
}

function handleLogin(event) {
    return accountAction(event, async () => {
        await Account.login(accountField('login-email').value, accountField('login-pass').value);
        finishAccountLogin();
    });
}

function handleRegister(event) {
    return accountAction(event, async () => {
        await Account.register({ name: accountField('reg-name').value, email: accountField('reg-email').value, phone: accountField('reg-phone').value }, accountField('reg-pass').value);
        finishAccountLogin();
    });
}

function renderAccount() {
    try {
        const user = Account.current();
        accountField('authPanel').hidden = !!user;
        accountField('accountPanel').hidden = !user;
        Account.updateLinks();
        if (!user) return;
        accountField('accountGreeting').textContent = 'Xin chào, ' + user.name + '. Rất vui được gặp lại bạn.';
        for (const key of ['name', 'email', 'phone', 'address']) accountField('profile-' + key).value = user[key] || '';
        renderAccountOrders();
        selectAccountSection();
    } catch (error) { showToast(error.message || 'Không thể đọc dữ liệu tài khoản.'); }
}

// Các liên kết giữ được mục đang xem khi tải lại hoặc mở từ trang thanh toán.
function selectAccountSection() {
    const sections = ['profileSection', 'ordersSection', 'passwordSection'];
    const requested = location.hash.slice(1);
    const selected = sections.includes(requested) ? requested : sections[0];
    sections.forEach(id => { accountField(id).hidden = id !== selected; });
    document.querySelectorAll('.account-nav a').forEach(link => {
        if (link.getAttribute('href') === '#' + selected) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
    });
}

function accountOrderItem(item) {
    const esc = escapeAccountText;
    const image = window.productImages?.[item.id] || item.image || '../image/logo-thuong-hieu.png';
    return `<li><img class="order-product-image" src="${esc(image)}" alt="${esc(item.name)}" width="64" height="64" loading="lazy"><div class="order-product-info"><span class="order-product-name">${esc(item.name)}</span><span class="order-product-quantity">Số lượng: ${esc(item.quantity)}</span></div><strong class="order-product-total">${accountMoney(item.price * item.quantity)}</strong></li>`;
}

function accountOrderDetails(order) {
    const esc = escapeAccountText;
    const shipping = order.shipping || {};
    const bank = order.payment === 'Bank';
    return `<div class="order-detail-grid">
            <section class="order-detail-section">
                <h3><span class="material-symbols-outlined" aria-hidden="true">local_shipping</span>Thông tin nhận hàng</h3>
                <dl class="order-recipient">
                    <div><dt>Người nhận</dt><dd>${esc(shipping.name)}</dd></div>
                    <div><dt>Số điện thoại</dt><dd>${esc(shipping.phone)}</dd></div>
                    <div><dt>Địa chỉ giao hàng</dt><dd>${esc(shipping.address)}</dd></div>
                    ${shipping.note ? `<div class="order-delivery-note"><dt>Ghi chú giao hàng</dt><dd>${esc(shipping.note)}</dd></div>` : ''}
                </dl>
            </section>
            <section class="order-detail-section order-payment-section">
                <h3><span class="material-symbols-outlined" aria-hidden="true">payments</span>Thông tin thanh toán</h3>
                <p class="order-payment-method">${bank ? 'Chuyển khoản ngân hàng' : 'Thanh toán khi nhận hàng (COD)'}</p>
                ${bank && order.status !== 'cancelled' ? '<span class="order-payment-pending">Chưa xác nhận thanh toán</span>' : ''}
                <dl class="order-costs">
                    <div><dt>Phí giao hàng</dt><dd>Chưa tính</dd></div>
                </dl>
                <p class="order-cost-note">Số tiền trên chưa bao gồm phí giao hàng.</p>
            </section>
        </div>`;
}

function attachOrderImages(container) {
    container.querySelectorAll('.order-product-image').forEach(image => {
        image.addEventListener('error', () => { image.src = '../image/logo-thuong-hieu.png'; }, { once: true });
    });
}

function openAccountOrder(id) {
    const order = Account.orders().find(item => item.id === id);
    if (!order) { showToast('Không tìm thấy đơn hàng.'); return; }
    let dialog = document.getElementById('accountOrderDialog');
    if (!dialog) {
        dialog = document.createElement('dialog');
        dialog.id = 'accountOrderDialog'; dialog.className = 'order-dialog';
        dialog.setAttribute('aria-labelledby', 'orderDialogTitle');
        document.body.append(dialog);
        dialog.addEventListener('click', event => {
            if (event.target === dialog || event.target.closest('[data-close-order]')) dialog.close();
        });
        dialog.addEventListener('close', () => {
            document.documentElement.classList.remove('account-order-open');
            dialog.replaceChildren();
        });
    }
    const esc = escapeAccountText;
    const count = order.items.reduce((sum, item) => sum + item.quantity, 0);
    dialog.innerHTML = `<header class="order-dialog-header"><div><h2 id="orderDialogTitle">Chi tiết đơn hàng</h2><p>${esc(order.id)}</p></div><button type="button" data-close-order aria-label="Đóng chi tiết đơn hàng"><span class="material-symbols-outlined" aria-hidden="true">close</span></button></header>
        <div class="order-dialog-body"><div class="order-dialog-meta"><span class="order-status ${order.status === 'cancelled' ? 'cancelled' : ''}">${order.status === 'cancelled' ? 'Đã hủy' : 'Chờ xác nhận'}</span><span>${esc(new Date(order.createdAt).toLocaleString('vi-VN'))}</span></div><h3 class="order-products-heading">Sản phẩm đã đặt <span>(${count})</span></h3><ul class="order-items">${order.items.map(accountOrderItem).join('')}</ul>${accountOrderDetails(order)}</div>
        <footer class="order-dialog-footer"><div><span>Tổng tiền sản phẩm</span><strong>${accountMoney(order.total)}</strong></div><button type="button" data-close-order>Đóng</button></footer>`;
    attachOrderImages(dialog);
    dialog.querySelector('.order-dialog-body').scrollTop = 0;
    document.documentElement.classList.add('account-order-open');
    if (!dialog.open) dialog.showModal();
}

function renderAccountOrders() {
    const filter = accountField('orderFilter').value;
    const orders = Account.orders().filter(order => filter === 'all' || order.status === filter);
    const container = accountField('accountOrders');
    if (!orders.length) {
        container.innerHTML = '<div class="account-empty"><p>Chưa có đơn hàng trong mục này.</p><a href="sanpham.html" class="btn-secondary">Khám phá sản phẩm</a></div>';
        return;
    }
    const esc = escapeAccountText;
    container.innerHTML = orders.map(order => `<article class="account-order">
        <div class="order-top"><strong>${esc(order.id)}</strong><span class="order-status ${order.status === 'cancelled' ? 'cancelled' : ''}">${order.status === 'cancelled' ? 'Đã hủy' : 'Chờ xác nhận'}</span></div>
        <p class="order-date">${esc(new Date(order.createdAt).toLocaleString('vi-VN'))} · ${order.items.length} sản phẩm · <strong>${accountMoney(order.total)}</strong></p>
        <ul class="order-items">${order.items.slice(0, 2).map(accountOrderItem).join('')}</ul>
        ${order.items.length > 2 ? `<button type="button" class="order-preview-more" data-details="${esc(order.id)}">+ ${order.items.length - 2} sản phẩm khác</button>` : ''}
        <div class="order-actions"><button type="button" class="order-view-button" data-details="${esc(order.id)}"><span class="material-symbols-outlined" aria-hidden="true">visibility</span>Xem chi tiết</button><button type="button" class="btn-secondary" data-repeat="${esc(order.id)}">Mua lại</button>${order.status === 'pending' ? `<button type="button" class="btn-link" data-cancel="${esc(order.id)}">Hủy đơn</button>` : ''}</div>
    </article>`).join('');
    attachOrderImages(container);
}

function repeatAccountOrder(id) {
    const order = Account.orders().find(order => order.id === id);
    if (!order) throw new Error('Không tìm thấy đơn hàng.');
    const cart = Cart.getCart();
    for (const item of order.items) {
        const price = window.productPrices?.[item.id];
        if (!Number.isFinite(price)) throw new Error('Một sản phẩm không còn trong bảng giá. Vui lòng chọn lại tại trang Sản phẩm.');
        const existing = cart.find(product => product.id === item.id);
        if (existing) existing.quantity += item.quantity;
        else cart.push({ ...item, price });
    }
    Cart.saveCart(cart);
    location.href = 'giohang.html';
}

document.addEventListener('DOMContentLoaded', () => {
    renderAccount();
    document.querySelector('.account-nav').addEventListener('click', event => {
        const link = event.target.closest('a[aria-controls]');
        if (!link || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        // Đổi mục mà không kích hoạt cuộn tự động tới phần tử có ID trong URL.
        event.preventDefault();
        history.replaceState(null, '', link.getAttribute('href'));
        selectAccountSection();
    });
    accountField('logoutButton').addEventListener('click', () => {
        try {
            Account.logout();
            accountField('passwordForm').reset();
            accountField('profileForm').reset();
            accountField('accountOrders').replaceChildren();
            switchTab('login');
            renderAccount();
            showToast('Đã đăng xuất.');
        } catch (error) { showToast(error.message); }
    });
    accountField('profileForm').addEventListener('submit', event => accountAction(event, () => {
        Account.update({ name: accountField('profile-name').value, phone: accountField('profile-phone').value, address: accountField('profile-address').value });
        renderAccount();
        showToast('Đã lưu hồ sơ và địa chỉ nhận hàng.');
    }));
    accountField('passwordForm').addEventListener('submit', event => accountAction(event, async () => {
        if (accountField('password-new').value !== accountField('password-confirm').value) throw new Error('Mật khẩu nhập lại chưa khớp.');
        await Account.changePassword(accountField('password-old').value, accountField('password-new').value);
        event.target.reset();
        showToast('Đã cập nhật mật khẩu.');
    }));
    accountField('orderFilter').addEventListener('change', () => {
        try { renderAccountOrders(); } catch (error) { showToast(error.message); }
    });
    accountField('accountOrders').addEventListener('click', event => {
        const details = event.target.closest('[data-details]');
        if (details) { openAccountOrder(details.dataset.details); return; }
        const cancel = event.target.closest('[data-cancel]');
        const repeat = event.target.closest('[data-repeat]');
        if (!cancel && !repeat) return;
        showBox(cancel ? 'Bạn muốn hủy đơn hàng này?' : 'Thêm các sản phẩm của đơn này vào giỏ theo giá hiện tại?', cancel ? 'Hủy đơn hàng' : 'Mua lại', () => {
            try {
                if (cancel) { Account.cancel(cancel.dataset.cancel); renderAccountOrders(); showToast('Đã hủy đơn hàng.'); }
                else repeatAccountOrder(repeat.dataset.repeat);
            } catch (error) { showToast(error.message); }
        });
    });
});
window.addEventListener('pageshow', renderAccount);
window.addEventListener('hashchange', selectAccountSection);
