const SEARCH_PRODUCTS = [
  {
    "id": 1,
    "name": "Vòng Chuỗi Trầm Hương 108 Hạt",
    "price": 890000,
    "image": "../image/vong-tram-108-hat.jpg"
  },
  {
    "id": 2,
    "name": "Nụ Trầm Hương",
    "price": 150000,
    "image": "../image/nu-tram-huong.jpg"
  },
  {
    "id": 3,
    "name": "Nhang Trầm Hương Mộc Hương",
    "price": 180000,
    "image": "../image/nhang-tram-moc-huong.png"
  },
  {
    "id": 4,
    "name": "Vòng Trầm Hương Đốt Trúc Bọc Vàng 18K",
    "price": 4200000,
    "image": "../image/vong-tram-boc-vang.png"
  },
  {
    "id": 5,
    "name": "Kệ Nụ Trầm Trăng Khuyết",
    "price": 290000,
    "image": "../image/ke-nu-tram-trang-khuyet.jpg"
  },
  {
    "id": 6,
    "name": "Bột Trầm Hương Rừng Tự Nhiên (100g)",
    "price": 390000,
    "image": "../image/bot-tram-huong.png"
  },
  {
    "id": 7,
    "name": "Kệ Nụ Trầm Dáng Mộc",
    "price": 250000,
    "image": "../image/ke-nu-tram-dang-moc.jpg"
  },
  {
    "id": 8,
    "name": "Lư Xông Trầm Nắp Hoa Văn",
    "price": 190000,
    "image": "../image/lu-xong-tram-hoa-tiet.jpg"
  },
  {
    "id": 9,
    "name": "Lư Xông Trầm Sắc Nâu",
    "price": 250000,
    "image": "../image/lu-xong-tram-sac-nau.jpg"
  },
  {
    "id": 10,
    "name": "Nhang Trầm Dạng Que",
    "price": 180000,
    "image": "../image/nhang-tram-huong.jpg"
  },
  {
    "id": 11,
    "name": "Nhang Mộc Hương Hộp Trụ Vân Gỗ",
    "price": 250000,
    "image": "../image/nhang-moc-huong-hop-tru.png"
  },
  {
    "id": 12,
    "name": "Nụ Trầm Hương Mộc Hương Hộp Quà",
    "price": 190000,
    "image": "../image/nu-tram-moc-huong-hop-qua.png"
  }
];
// Tìm kiếm mở rộng trên cùng hàng với menu; gợi ý theo danh mục sản phẩm.
document.addEventListener('DOMContentLoaded', () => {
    const header = document.querySelector('.site-header');
    const host = header?.querySelector('.header-container');
    const buttons = header?.querySelectorAll('.btn-search');
    if (!host || !buttons.length) return;
    const form = document.createElement('form');
    form.id = 'headerSearch';
    form.className = 'header-search';
    form.hidden = true;
    form.role = 'search';
    form.action = 'sanpham.html';
    form.method = 'get';
    form.innerHTML = `
        <div class="header-search-fields">
            <input id="headerSearchInput" name="search" type="search" aria-label="Tìm sản phẩm" placeholder="Tìm sản phẩm…" maxlength="150" autocomplete="off" required aria-controls="searchSuggestions" aria-expanded="false">
            <button type="submit" class="header-search-submit" aria-label="Tìm kiếm"><span class="material-symbols-outlined" aria-hidden="true">search</span></button>
            <button type="button" class="header-search-close" aria-label="Đóng tìm kiếm">&times;</button>
        </div>
        <div id="searchSuggestions" class="search-suggestions" hidden>
            <p class="search-status" role="status" aria-live="polite"></p>
            <ul class="search-results" aria-label="Sản phẩm gợi ý"></ul>
        </div>`;
    host.insertBefore(form, host.querySelector('.header-actions'));
    const input = form.querySelector('input');
    const panel = form.querySelector('.search-suggestions');
    const results = form.querySelector('.search-results');
    const status = form.querySelector('.search-status');
    const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();
    input.value = new URLSearchParams(location.search).get('search') || '';
    let trigger;
    function hideSuggestions() {
        panel.hidden = true;
        input.setAttribute('aria-expanded', 'false');
    }
    function suggest() {
        const query = normalize(input.value);
        results.replaceChildren();
        if (!query) { hideSuggestions(); return; }
        const words = query.split(/\s+/);
        const matches = SEARCH_PRODUCTS.filter(item => words.every(word => normalize(item.name).includes(word))).slice(0, 6);
        status.textContent = matches.length ? 'Sản phẩm gợi ý' : 'Không tìm thấy sản phẩm phù hợp.';
        matches.forEach(item => {
            const li = document.createElement('li');
            const link = document.createElement('a');
            link.href = 'chitiet-sanpham.html?id=' + item.id;
            const img = document.createElement('img');
            img.src = window.productImages?.[item.id] || item.image;
            img.alt = '';
            const info = document.createElement('span');
            const name = document.createElement('strong');
            name.textContent = item.name;
            const price = document.createElement('small');
            price.textContent = (window.productPrices?.[item.id] ?? item.price).toLocaleString('vi-VN') + ' đ';
            info.append(name, price);
            link.append(img, info);
            li.append(link);
            results.append(li);
        });
        panel.hidden = false;
        input.setAttribute('aria-expanded', 'true');
    }
    function setOpen(open, restoreFocus = true) {
        form.hidden = !open;
        header.classList.toggle('search-open', open);
        buttons.forEach(button => button.setAttribute('aria-expanded', String(open)));
        if (open) {
            header.querySelector('.nav-container')?.classList.remove('show');
            header.querySelector('.menu-toggle')?.classList.remove('active');
            input.focus();
            suggest();
        } else {
            hideSuggestions();
            if (restoreFocus) (trigger?.getClientRects().length ? trigger : header.querySelector('.menu-toggle'))?.focus();
        }
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
    input.addEventListener('input', suggest);
    input.addEventListener('focus', suggest);
    form.querySelector('.header-search-close').addEventListener('click', () => setOpen(false));
    header.addEventListener('keydown', event => {
        if (event.key === 'Escape' && !form.hidden) { event.preventDefault(); setOpen(false); }
    });
    form.addEventListener('keydown', event => {
        const links = [...results.querySelectorAll('a')];
        if (!links.length || panel.hidden) return;
        const index = links.indexOf(document.activeElement);
        if (event.key === 'ArrowDown') { event.preventDefault(); links[(index + 1) % links.length].focus(); }
        if (event.key === 'ArrowUp') { event.preventDefault(); if (index <= 0) input.focus(); else links[index - 1].focus(); }
    });
    document.addEventListener('click', event => {
        if (!form.hidden && !form.contains(event.target) && ![...buttons].some(button => button.contains(event.target))) setOpen(false, false);
    });
    form.addEventListener('focusout', () => {
        requestAnimationFrame(() => { if (!form.contains(document.activeElement)) hideSuggestions(); });
    });
    form.addEventListener('submit', event => {
        input.value = input.value.trim();
        if (!input.value) { event.preventDefault(); input.focus(); }
    });
});
