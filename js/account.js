// Tài khoản và đơn hàng cục bộ, không gửi dữ liệu tới máy chủ.
const Account = {
    key: 'moc_huong_accounts_v1',
    sessionKey: 'moc_huong_user_v1',
    read() {
        const raw = localStorage.getItem(this.key);
        if (!raw) return { users: [], orders: [] };
        const data = JSON.parse(raw);
        if (!Array.isArray(data.users) || !Array.isArray(data.orders)) throw new Error('Dữ liệu tài khoản không hợp lệ.');
        return data;
    },
    write(data) { localStorage.setItem(this.key, JSON.stringify(data)); },
    current() {
        const id = sessionStorage.getItem(this.sessionKey);
        if (!id) return null;
        return this.read().users.find(user => user.id === id) || null;
    },
    async hash(password, salt) {
        if (!globalThis.crypto?.subtle) throw new Error('Vui lòng mở website qua localhost hoặc HTTPS để sử dụng tài khoản.');
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
        const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: encoder.encode(salt), iterations: 100000, hash: 'SHA-256' }, key, 256);
        return Array.from(new Uint8Array(bits), value => value.toString(16).padStart(2, '0')).join('');
    },
    async register(profile, password) {
        if (password.length < 8) throw new Error('Mật khẩu cần ít nhất 8 ký tự.');
        const email = profile.email.trim().toLowerCase();
        const phone = profile.phone.trim();
        if (!profile.name.trim() || !email || !phone) throw new Error('Vui lòng điền đầy đủ thông tin.');
        const salt = crypto.randomUUID();
        const hash = await this.hash(password, salt);
        const data = this.read();
        if (data.users.some(user => user.email === email || user.phone === phone)) throw new Error('Email hoặc số điện thoại đã được đăng ký trên trình duyệt này.');
        const user = { id: crypto.randomUUID(), name: profile.name.trim(), email, phone, address: '', salt, hash };
        data.users.push(user);
        this.write(data);
        sessionStorage.setItem(this.sessionKey, user.id);
        return user;
    },
    async login(identifier, password) {
        const user = this.read().users.find(user => user.email === identifier.trim().toLowerCase() || user.phone === identifier.trim());
        if (!user || await this.hash(password, user.salt) !== user.hash) throw new Error('Email, số điện thoại hoặc mật khẩu chưa đúng. Hãy đăng ký nếu bạn chưa có tài khoản trên trình duyệt này.');
        sessionStorage.setItem(this.sessionKey, user.id);
        return user;
    },
    logout() { sessionStorage.removeItem(this.sessionKey); this.updateLinks(); },
    update(profile) {
        const current = this.current();
        if (!current) throw new Error('Vui lòng đăng nhập lại.');
        const data = this.read();
        const user = data.users.find(user => user.id === current.id);
        if (!profile.name.trim() || !profile.phone.trim()) throw new Error('Họ tên và số điện thoại không được để trống.');
        if (data.users.some(other => other.id !== user.id && other.phone === profile.phone.trim())) throw new Error('Số điện thoại đã được tài khoản khác sử dụng.');
        Object.assign(user, { name: profile.name.trim(), phone: profile.phone.trim(), address: profile.address.trim() });
        this.write(data);
    },
    async changePassword(oldPassword, newPassword) {
        const current = this.current();
        if (!current) throw new Error('Vui lòng đăng nhập lại.');
        if (await this.hash(oldPassword, current.salt) !== current.hash) throw new Error('Mật khẩu hiện tại chưa đúng.');
        if (newPassword.length < 8) throw new Error('Mật khẩu mới cần ít nhất 8 ký tự.');
        const salt = crypto.randomUUID();
        const hash = await this.hash(newPassword, salt);
        const data = this.read();
        Object.assign(data.users.find(user => user.id === current.id), { salt, hash });
        this.write(data);
    },
    orders() {
        const user = this.current();
        return user ? this.read().orders.filter(order => order.userId === user.id).reverse() : [];
    },
    placeOrder(items, shipping, payment) {
        const user = this.current();
        if (!user) throw new Error('Vui lòng đăng nhập trước khi đặt hàng.');
        if (!items.length || items.some(item => !Number.isInteger(item.quantity) || item.quantity < 1 || !Number.isFinite(item.price) || item.price < 0)) throw new Error('Giỏ hàng không hợp lệ. Vui lòng kiểm tra số lượng sản phẩm.');
        if (![shipping.name, shipping.phone, shipping.address].every(value => value.trim())) throw new Error('Vui lòng điền đầy đủ thông tin nhận hàng.');
        if (!['COD', 'Bank'].includes(payment)) throw new Error('Phương thức thanh toán không hợp lệ.');
        const data = this.read();
        const order = { id: 'MH-' + crypto.randomUUID(), userId: user.id, createdAt: new Date().toISOString(), status: 'pending', payment, shipping: { ...shipping }, items: items.map(item => ({ ...item })), total: items.reduce((sum, item) => sum + item.price * item.quantity, 0) };
        data.orders.push(order);
        this.write(data);
        return order;
    },
    cancel(id) {
        const user = this.current();
        if (!user) throw new Error('Vui lòng đăng nhập lại.');
        const data = this.read();
        const order = data.orders.find(order => order.id === id && order.userId === user.id);
        if (!order || order.status !== 'pending') throw new Error('Chỉ có thể hủy đơn đang chờ xác nhận.');
        order.status = 'cancelled';
        this.write(data);
    },
    updateLinks() {
        let user;
        try { user = this.current(); } catch { return; }
        document.querySelectorAll('a[href="taikhoan.html"]').forEach(link => {
            const label = link.querySelector('span:last-child:not(.material-symbols-outlined)');
            link.setAttribute('aria-label', user ? 'Tài khoản của tôi' : 'Đăng nhập / Đăng ký');
            link.title = user ? 'Tài khoản của tôi' : 'Đăng nhập / Đăng ký';
            if (label) label.textContent = user ? 'Tài khoản của tôi' : 'Tài Khoản';
        });
    }
};
document.addEventListener('DOMContentLoaded', () => Account.updateLinks());
window.addEventListener('pageshow', () => Account.updateLinks());
