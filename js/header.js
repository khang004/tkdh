// Ẩn đầu trang khi cuộn xuống, hiện lại khi cuộn lên; giữ chỗ để nội dung không nhảy.
document.addEventListener('DOMContentLoaded', () => {
    const header = document.querySelector('.site-header');
    if (!header) return;
    if (!header.querySelector('.header-topbar')) {
        const topbar = document.createElement('div');
        topbar.className = 'header-topbar';
        topbar.innerHTML = '<div class="container header-topbar-inner"><a href="tel:02923798668"><span class="material-symbols-outlined" aria-hidden="true">call</span><span>Hotline: 0292-379-8668</span></a><span class="header-shipping-note"><span class="material-symbols-outlined" aria-hidden="true">local_shipping</span><span>Miễn phí vận chuyển cho đơn hàng trên 1 triệu đồng</span></span></div>';
        header.prepend(topbar);
    }
    const productLink = header.querySelector('.nav-menu a[href="sanpham.html"]');
    if (productLink) {
        const item = productLink.closest('li');
        item.classList.add('featured-nav-item');
        const toggle = document.createElement('button');
        toggle.type = 'button'; toggle.className = 'featured-menu-toggle';
        toggle.setAttribute('aria-label', 'Xem sản phẩm nổi bật');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-controls', 'featuredProductsMenu');
        toggle.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">expand_more</span>';
        const panel = document.createElement('div');
        panel.id = 'featuredProductsMenu'; panel.className = 'featured-menu'; panel.hidden = true;
        const products = [
            { id: 6, name: 'Bột Trầm Hương', image: 'bot-tram-huong.png' },
            { id: 7, name: 'Kệ Nụ Trầm Dáng Mộc', image: 'ke-nu-tram-dang-moc.jpg' },
            { id: 8, name: 'Lư Xông Trầm Hoa Tiết', image: 'lu-xong-tram-hoa-tiet.jpg' },
            { id: 11, name: 'Nhang Mộc Hương Hộp Trụ Vân Gỗ', image: 'nhang-moc-huong-hop-tru.png' }
        ];
        panel.innerHTML = '<div class="featured-menu-heading"><strong>Sản phẩm nổi bật</strong><a href="sanpham.html">Xem tất cả ↗</a></div><div class="featured-menu-grid"></div>';
        const grid = panel.querySelector('.featured-menu-grid');
        products.forEach(product => {
            const link = document.createElement('a'); link.className = 'featured-menu-product';
            link.href = 'chitiet-sanpham.html?id=' + product.id;
            const img = document.createElement('img');
            img.src = window.productImages?.[product.id] || '../image/' + product.image;
            img.alt = ''; img.width = 64; img.height = 56; img.loading = 'lazy';
            const name = document.createElement('span'); name.textContent = product.name;
            link.append(img, name);
            grid.append(link);
        });
        item.append(toggle, panel);
        let closeTimer;
        function setFeaturedOpen(open) {
            clearTimeout(closeTimer); panel.hidden = !open;
            toggle.setAttribute('aria-expanded', String(open));
            item.classList.toggle('featured-is-open', open);
            if (open) header.classList.remove('header-hidden');
        }
        const desktopHover = () => matchMedia('(min-width: 769px) and (hover: hover)').matches;
        item.addEventListener('mouseenter', () => { if (desktopHover()) setFeaturedOpen(true); });
        item.addEventListener('mouseleave', () => { if (desktopHover()) closeTimer = setTimeout(() => { if (!item.contains(document.activeElement)) setFeaturedOpen(false); }, 200); });
        panel.addEventListener('mouseenter', () => clearTimeout(closeTimer));
        toggle.addEventListener('click', () => setFeaturedOpen(panel.hidden));
        item.addEventListener('focusin', event => { if (event.target === productLink && desktopHover()) setFeaturedOpen(true); });
        item.addEventListener('focusout', () => setTimeout(() => { if (!item.contains(document.activeElement)) setFeaturedOpen(false); }, 0));
        item.addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); setFeaturedOpen(false); toggle.focus(); } });
        document.addEventListener('click', event => { if (!item.contains(event.target)) setFeaturedOpen(false); });
        panel.addEventListener('click', event => { if (event.target.closest('a')) setFeaturedOpen(false); });
        window.addEventListener('resize', () => setFeaturedOpen(false));
    }
    const backToTop = document.createElement('button');
    backToTop.type = 'button';
    backToTop.className = 'back-to-top';
    backToTop.hidden = true;
    backToTop.setAttribute('aria-label', 'Cuộn lên đầu trang');
    backToTop.title = 'Lên đầu trang';
    backToTop.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 12 6-6 6 6M12 6v14"/></svg>';
    document.body.appendChild(backToTop);
    backToTop.addEventListener('click', () => {
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollTo({ top: 0, behavior: reducedMotion ? 'instant' : 'smooth' });
        header.classList.remove('header-hidden');
    });
    let lastY = Math.max(0, window.scrollY);
    let scheduled = false;

    function updateHeader() {
        scheduled = false;
        const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        const y = Math.min(maxY, Math.max(0, window.scrollY));
        backToTop.hidden = y < 320;
        const delta = y - lastY;
        const menuOpen = header.querySelector('.nav-container.show');
        const search = header.querySelector('#headerSearch');
        const interacting = menuOpen || header.querySelector('.featured-menu:not([hidden])') || (search && !search.hidden) || header.contains(document.activeElement);
        if (y <= header.offsetHeight || interacting) {
            header.classList.remove('header-hidden');
            lastY = y;
            return;
        }
        // Bỏ qua những chuyển động rất nhỏ để tránh rung khi cuộn bằng touchpad.
        if (Math.abs(delta) < 8) return;
        header.classList.toggle('header-hidden', delta > 0);
        lastY = y;
    }

    window.addEventListener('scroll', () => {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(updateHeader);
    }, { passive: true });
    header.addEventListener('focusin', () => header.classList.remove('header-hidden'));
    function resetHeader() {
        lastY = Math.max(0, window.scrollY);
        backToTop.hidden = lastY < 320;
        header.classList.remove('header-hidden');
    }
    window.addEventListener('resize', resetHeader);
    window.addEventListener('pageshow', resetHeader);
    resetHeader();
});
