// Ẩn đầu trang khi cuộn xuống, hiện lại khi cuộn lên; giữ chỗ để nội dung không nhảy.
document.addEventListener('DOMContentLoaded', () => {
    const header = document.querySelector('.site-header');
    if (!header) return;
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
        const interacting = menuOpen || (search && !search.hidden) || header.contains(document.activeElement);
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
