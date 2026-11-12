// Tìm kiếm ngay trong đầu trang, không mở hộp thoại hoặc lớp phủ.
document.addEventListener('DOMContentLoaded', () => {
    const header = document.querySelector('.site-header');
    const buttons = document.querySelectorAll('.btn-search');
    if (!header || !buttons.length) return;

    const form = document.createElement('form');
    form.id = 'headerSearch';
    form.className = 'container header-search';
    form.hidden = true;
    form.setAttribute('role', 'search');
    form.action = 'sanpham.html';
    form.method = 'get';
    form.innerHTML = `
        <label for="headerSearchInput">Tìm sản phẩm</label>
        <div class="header-search-fields">
            <input id="headerSearchInput" name="search" type="search" placeholder="Nhập tên sản phẩm…" maxlength="150" required>
            <button type="submit" class="btn-primary">Tìm kiếm</button>
            <button type="button" class="header-search-close" aria-label="Đóng tìm kiếm">&times;</button>
        </div>`;
    header.appendChild(form);
    const input = form.querySelector('input');
    input.value = new URLSearchParams(location.search).get('search') || '';
    let trigger;

    function setOpen(open) {
        form.hidden = !open;
        buttons.forEach(button => button.setAttribute('aria-expanded', String(open)));
        if (open) {
            document.querySelector('.nav-container')?.classList.remove('show');
            document.querySelector('.menu-toggle')?.classList.remove('active');
            input.focus();
        } else trigger?.focus();
    }

    buttons.forEach(button => {
        button.setAttribute('aria-controls', form.id);
        button.setAttribute('aria-expanded', 'false');
        button.addEventListener('click', event => {
            event.preventDefault();
            trigger = button;
            setOpen(form.hidden);
        });
    });
    form.querySelector('.header-search-close').addEventListener('click', () => setOpen(false));
    form.addEventListener('keydown', event => {
        if (event.key === 'Escape') { event.preventDefault(); setOpen(false); }
    });
    form.addEventListener('submit', event => {
        input.value = input.value.trim();
        if (!input.value) { event.preventDefault(); input.focus(); }
    });
});
