// Hàm hiển thị hộp thông báo Box Modal thay thế alert mặc định (kích thước nhỏ gọn, có nút Hủy / Xác nhận)
function showBox(message, title = "Thông Báo", onConfirm = null, showCancel = true, onCancel = null) {
    let overlay = document.getElementById('customAlertModal');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'customAlertModal';
        overlay.className = 'custom-modal-overlay';
        overlay.innerHTML = `
            <div class="custom-modal-box">
                <div class="custom-modal-icon">
                    <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                </div>
                <div class="custom-modal-title" id="customAlertTitle">Thông Báo</div>
                <div class="custom-modal-message" id="customAlertMsg"></div>
                <div class="custom-modal-actions">
                    <button class="custom-modal-btn-cancel" id="customAlertCancelBtn">Hủy</button>
                    <button class="custom-modal-btn" id="customAlertBtn">Xác Nhận</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    const titleEl = document.getElementById('customAlertTitle');
    const msgEl = document.getElementById('customAlertMsg');
    const confirmBtn = document.getElementById('customAlertBtn');
    const cancelBtn = document.getElementById('customAlertCancelBtn');

    titleEl.textContent = title;
    msgEl.textContent = message;

    cancelBtn.style.display = showCancel ? 'block' : 'none';

    overlay.classList.add('show');

    // Dọn dẹp listener cũ
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

    const newCancelBtn = cancelBtn.cloneNode(true);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

    newConfirmBtn.addEventListener('click', () => {
        overlay.classList.remove('show');
        if (typeof onConfirm === 'function') onConfirm();
    });

    newCancelBtn.addEventListener('click', () => {
        overlay.classList.remove('show');
        if (typeof onCancel === 'function') onCancel();
    });
}

// Ghi đè hàm alert mặc định sang showBox
window.alert = function(msg) {
    showBox(msg, "Thông Báo", null, false);
};

// Quản lý giỏ hàng dùng localStorage
const Cart = {
    getCart() {
        return JSON.parse(localStorage.getItem('tram_huong_cart')) || [];
    },
    saveCart(cart) {
        localStorage.setItem('tram_huong_cart', JSON.stringify(cart));
        this.updateBadge();
    },
    addItem(product) {
        showBox(`Bạn có muốn thêm sản phẩm "${product.name}" vào giỏ hàng không?`, 'Thêm Vào Giỏ Hàng', () => {
            let cart = this.getCart();
            let existing = cart.find(item => item.id === product.id);
            if (existing) {
                existing.quantity += (product.quantity || 1);
            } else {
                cart.push({ ...product, quantity: product.quantity || 1 });
            }
            this.saveCart(cart);
            showBox('Đã thêm sản phẩm vào giỏ hàng thành công!', 'Giỏ Hàng', null, false);
        }, true);
    },
    removeItem(id, silent = false) {
        let cart = this.getCart().filter(item => item.id !== id);
        this.saveCart(cart);
        if (!silent) {
            showBox('Đã xóa sản phẩm khỏi giỏ hàng!', 'Giỏ Hàng');
        }
    },
    updateQuantity(id, qty) {
        let cart = this.getCart();
        let item = cart.find(item => item.id === id);
        if (item) {
            item.quantity = parseInt(qty);
            if (item.quantity <= 0) {
                cart = cart.filter(p => p.id !== id);
            }
        }
        this.saveCart(cart);
    },
    getTotalPrice() {
        return this.getCart().reduce((sum, item) => sum + (item.price * item.quantity), 0);
    },
    clearCart() {
        localStorage.removeItem('tram_huong_cart');
        this.updateBadge();
    },
    updateBadge() {
        const badges = document.querySelectorAll('.cart-count');
        badges.forEach(badge => {
            const count = this.getCart().reduce((sum, item) => sum + item.quantity, 0);
            badge.textContent = count;
        });
        this.renderMiniCart();
    },
    renderMiniCart() {
        const containers = document.querySelectorAll('.mini-cart-dropdown');
        const items = this.getCart();
        const total = this.getTotalPrice();

        containers.forEach(container => {
            if (items.length === 0) {
                container.innerHTML = `
                    <div class="mini-cart-header">Giỏ Hàng Của Bạn</div>
                    <p style="text-align: center; color: var(--text-muted); font-size: 13px; padding: 15px 0;">
                        Chưa có sản phẩm nào
                    </p>
                    <a href="sanpham.html" class="mini-cart-btn">Xem Sản Phẩm Ngay</a>
                `;
            } else {
                let listHtml = items.map(item => {
                    const imgSrc = item.image || `../image/sp${item.id || 1}.svg`;
                    return `
                    <div class="mini-cart-item">
                        <img src="${imgSrc}" alt="${item.name}" class="mini-cart-img">
                        <div class="mini-cart-item-info">
                            <div class="mini-cart-item-title" title="${item.name}">${item.name}</div>
                            <div class="mini-cart-item-price">${item.quantity} x ${item.price.toLocaleString('vi-VN')} đ</div>
                        </div>
                        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0;">
                            <span style="font-weight: 700; font-size: 13px; color: var(--accent-hover);">
                                ${(item.price * item.quantity).toLocaleString('vi-VN')} đ
                            </span>
                            <button class="mini-cart-del-btn" onclick="event.stopPropagation(); Cart.removeItem(${item.id}, true);" title="Xóa món này">Xóa</button>
                        </div>
                    </div>
                    `;
                }).join('');

                container.innerHTML = `
                    <div class="mini-cart-header">Giỏ Hàng (${items.length} món)</div>
                    <div class="mini-cart-list">${listHtml}</div>
                    <div class="mini-cart-footer">
                        <div class="mini-cart-total">Tổng: <span>${total.toLocaleString('vi-VN')} đ</span></div>
                        <div style="display: flex; gap: 8px; margin-top: 10px;">
                            <a href="giohang.html" class="mini-cart-btn" style="flex: 1; background: linear-gradient(135deg, #b91c1c, #991b1b);">Mua Ngay</a>
                            <a href="giohang.html" class="mini-cart-btn" style="flex: 1; background-color: var(--primary-color);">Xem Giỏ</a>
                        </div>
                    </div>
                `;
            }
        });
    }
};

// Khởi tạo tìm kiếm Modal
function initSearchModal() {
    const searchBtns = document.querySelectorAll('.btn-search');
    let modal = document.getElementById('searchModal');

    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'searchModal';
        modal.className = 'search-modal';
        modal.innerHTML = `
            <div class="search-box-content">
                <button class="search-close-btn" aria-label="Đóng">&times;</button>
                <h4 style="color: var(--primary-color); margin-bottom: 15px; font-size: 18px;">Tìm kiếm sản phẩm trầm hương</h4>
                <div class="search-input-wrapper">
                    <input type="text" id="globalSearchInput" placeholder="Nhập tên sản phẩm (vòng tay, nụ trầm, nhang...)" autocomplete="off">
                    <button class="btn-primary" id="btnSubmitSearch">Tìm Kiếm</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        const closeBtn = modal.querySelector('.search-close-btn');
        closeBtn.addEventListener('click', () => modal.classList.remove('active'));
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('active');
        });

        const doSearch = () => {
            const val = document.getElementById('globalSearchInput').value.trim();
            if (val) {
                window.location.href = `sanpham.html?search=${encodeURIComponent(val)}`;
            }
        };

        modal.querySelector('#btnSubmitSearch').addEventListener('click', doSearch);
        modal.querySelector('#globalSearchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') doSearch();
        });
    }

    searchBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            modal.classList.add('active');
            setTimeout(() => {
                const inp = document.getElementById('globalSearchInput');
                if (inp) inp.focus();
            }, 100);
        });
    });
}

// Khởi tạo menu hamburger và sự kiện chung
document.addEventListener('DOMContentLoaded', () => {
    Cart.updateBadge();
    initSearchModal();

    const toggleBtn = document.querySelector('.menu-toggle');
    const navContainer = document.querySelector('.nav-container');

    if (toggleBtn && navContainer) {
        toggleBtn.addEventListener('click', () => {
            const isOpened = navContainer.classList.toggle('show');
            toggleBtn.classList.toggle('active', isOpened);
        });

        const navLinks = navContainer.querySelectorAll('.nav-link, .mobile-actions a');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                navContainer.classList.remove('show');
                toggleBtn.classList.remove('active');
            });
        });
    }
});
