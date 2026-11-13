import fs from 'node:fs';
import path from 'node:path';
export const escape = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
export function card(item) {
    const href = '/tin-tuc/' + encodeURIComponent(item.slug);
    return `<article class="news-card news-title-card"><a class="news-card-image" href="${href}" aria-label="${escape(item.title)}"><img src="${escape(item.cover)}" alt="${escape(item.title)}" width="560" height="420" loading="lazy" decoding="async"></a><h2><a href="${href}">${escape(item.title)}</a></h2></article>`;
}
export function page(root, { main, title, description, canonical, script = '/js/news.js', schema }) {
    let html = fs.readFileSync(path.join(root, 'view/tintuc.html'), 'utf8');
    html = html.replace(/<link[^>]*href="\/css\/news\.css"[^>]*>/g, '').replace(/<script[^>]*src="\/js\/news\.js"[^>]*><\/script>/g, '');
    html = html.replace(/<main\b[\s\S]*?<\/main>/, () => main);
    html = html.replace(/\s*<!-- Modal xem toàn bộ bài viết -->[\s\S]*?(?=\s*<!-- Footer -->)/, '');
    html = html.replace(/<script>([\s\S]*?)<\/script>/g, (tag, content) => content.includes('const articleDatabase') ? '' : tag);
    html = html.replace(/<title>[\s\S]*?<\/title>/, () => '<title>' + escape(title) + '</title>');
    html = html.replace('<head>', '<head>\n    <base href="/view/">');
    html = html.replace('</head>', `<meta name="description" content="${escape(description)}"><link rel="canonical" href="${escape(canonical)}"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}"><meta property="og:url" content="${escape(canonical)}"><meta property="og:type" content="${schema ? 'article' : 'website'}"><link rel="stylesheet" href="/css/news.css"><script src="${script}" defer></script>${schema ? '<script type="application/ld+json">' + JSON.stringify(schema).replace(/</g, '\\u003c') + '</script>' : ''}</head>`);
    return html;
}
export function listing(store, params) {
    const result = store.list(params);
    const options = store.data.categories.map(item => `<option value="${escape(item.id)}" ${params.category === item.id ? 'selected' : ''}>${escape(item.name)}</option>`).join('');
    return `<main class="news-page" id="newsMain"><header class="news-heading"><p class="news-eyebrow">GÓC ĐỌC MỘC HƯƠNG</p><h1>Tin tức <i>&amp;</i> chuyện trầm</h1><p>Hiểu về gỗ thơm. Gìn giữ nếp Việt. Tìm một khoảng lặng cho riêng mình.</p></header><div class="news-toolbar"><form id="newsFilters" role="search"><label class="news-search-label"><span class="material-symbols-outlined" aria-hidden="true">search</span><input type="search" name="q" value="${escape(params.q || '')}" placeholder="Tìm bài viết về trầm hương…" aria-label="Tìm bài viết" maxlength="150"></label><label class="news-filter-label"><span>Danh mục</span><select name="category"><option value="">Tất cả chủ đề</option>${options}</select></label><button class="news-button" type="submit">Tìm kiếm</button></form></div><p id="newsResultStatus" class="news-result-status" role="status" aria-live="polite">${result.total} bài viết</p><div id="newsGrid" class="news-grid">${result.articles.map(card).join('') || '<p class="news-empty">Chưa có bài viết phù hợp. Hãy thử từ khóa hoặc danh mục khác.</p>'}</div><nav id="newsPagination" class="news-pagination" aria-label="Phân trang tin tức">${pagination(result, params)}</nav></main>`;
}
export function pagination(result, params) {
    return Array.from({ length: result.pages }, (_, index) => {
        const page = index + 1; const query = new URLSearchParams({ q: params.q || '', category: params.category || '', page: String(page) });
        return `<a href="/view/tintuc.html?${escape(query)}" ${page === result.page ? 'aria-current="page"' : ''} aria-label="Trang ${page}">${page}</a>`;
    }).join('');
}
export function blocksHTML(blocks) {
    return blocks.map(block => {
        if (block.type === 'heading') return `<h${block.level === 3 ? '3' : '2'}>${escape(block.text)}</h${block.level === 3 ? '3' : '2'}>`;
        if (block.type === 'paragraph') return '<p>' + escape(block.text).replace(/\n/g, '<br>') + '</p>';
        if (block.type === 'image') return `<figure><button class="news-zoom" type="button" aria-label="Phóng to ảnh: ${escape(block.alt)}"><img src="${escape(block.src)}" alt="${escape(block.alt)}" width="900" height="600" loading="lazy" decoding="async"></button>${block.caption ? '<figcaption>' + escape(block.caption) + '</figcaption>' : ''}</figure>`;
        return '';
    }).join('');
}

export function compactBlocks(blocks) {
    const result=[];
    const hasHeadings=blocks.some(block=>block.type==='heading');
    let heading, included=false, paragraphs=0;
    for(const block of blocks){
        if(block.type==='heading'){heading=block;included=false;}
        else if(block.type==='paragraph'&&(!hasHeadings||!included)){
            if(heading)result.push(heading);
            result.push(block);included=true;paragraphs++;
            if(paragraphs===3)break;
        }
    }
    return result;
}

export function detail(store, article, canonical, preview = false) {
    return `<main class="news-page news-detail"><nav class="news-breadcrumb" aria-label="Đường dẫn"><a href="/view/index.html">Trang chủ</a><span aria-hidden="true">/</span><a href="/view/tintuc.html">Tin tức</a><span aria-hidden="true">/</span><span aria-current="page">${escape(article.category)}</span></nav>${preview ? '<p class="news-preview-banner">BẢN XEM TRƯỚC · Nội dung chưa đăng chỉ hiển thị với quản trị viên.</p><a class="news-read" href="/quan-tri/tin-tuc">Quay lại quản trị</a>' : ''}<article><header class="news-article-heading"><span class="news-category">${escape(article.category)}</span><h1>${escape(article.title)}</h1></header><figure class="news-cover"><button class="news-zoom" type="button" aria-label="Phóng to ảnh bìa"><img src="${escape(article.cover)}" alt="${escape(article.title)}" width="1200" height="675" fetchpriority="high"></button></figure><div class="news-body"><p class="news-intro">${escape(article.excerpt)}</p>${blocksHTML(compactBlocks(article.blocks))}</div></article><a class="news-back" href="/view/tintuc.html">← Quay lại trang tin tức</a><dialog id="newsLightbox" class="news-lightbox" aria-label="Ảnh phóng to"><button type="button" class="news-lightbox-close" aria-label="Đóng ảnh">×</button><img alt=""><p></p></dialog></main>`;
}
export const adminMain = `<main class="news-page news-admin"><header class="news-heading"><p class="news-eyebrow">MỘC HƯƠNG</p><h1>Quản trị tin tức</h1><p>Biên tập câu chuyện, hình ảnh và những kiến thức về trầm hương.</p></header><p id="adminStatus" role="status" aria-live="polite"></p><section id="adminAuth" class="news-auth" hidden><h2 id="authTitle">Đăng nhập quản trị</h2><form id="authForm"><label>Tên đăng nhập<input name="username" required autocomplete="username" minlength="3" maxlength="60"></label><label>Mật khẩu<input name="password" required type="password" autocomplete="current-password" minlength="8" maxlength="200"></label><button class="news-button" type="submit">Tiếp tục</button></form></section><section id="adminDashboard" hidden><div class="news-admin-actions"><button class="news-button" id="newArticle" type="button">+ Thêm bài viết</button><button class="news-button news-button-light" id="manageCategories" type="button">Quản lý danh mục</button><a href="/view/tintuc.html" class="news-read">Xem trang tin tức ↗</a><button class="news-button news-button-light" id="adminLogout" type="button">Đăng xuất</button></div><form id="adminSearch" class="news-admin-search"><input name="q" type="search" placeholder="Tìm theo tiêu đề…" aria-label="Tìm bài trong quản trị"><button class="news-button" type="submit">Tìm</button></form><div id="adminArticles" class="news-admin-list"></div><nav id="adminPages" class="news-pagination" aria-label="Phân trang quản trị"></nav></section><form id="articleEditor" class="news-editor" hidden><div class="news-editor-heading"><h2 id="editorTitle">Bài viết mới</h2><button type="button" class="news-button news-button-light" id="cancelEdit">Đóng</button></div><input type="hidden" name="id"><div class="news-editor-grid"><label>Tiêu đề<input name="title" required maxlength="180"></label><label>Slug đường dẫn<input name="slug" required maxlength="180" pattern="[a-z0-9]+(-[a-z0-9]+)*"><small>Chữ thường không dấu, số và gạch nối.</small></label><label>Danh mục<select name="categoryId" required></select></label><label>Trạng thái<select name="status"><option value="draft">Bản nháp / Ẩn</option><option value="published">Đăng công khai</option></select></label></div><label>Mô tả ngắn<textarea name="excerpt" required maxlength="450" rows="2"></textarea></label><label>Đoạn giới thiệu<textarea name="intro" required maxlength="2500" rows="4"></textarea></label><label>Ảnh đại diện<input name="cover" required placeholder="/image/ten-anh.jpg"></label><label class="news-file-label">Tải ảnh đại diện<input id="coverUpload" type="file" accept="image/jpeg,image/png,image/webp,image/gif"></label><img id="coverPreview" class="news-cover-preview" alt="Xem trước ảnh đại diện" hidden><h3>Nội dung bài viết</h3><p class="news-editor-help">Thêm tiêu đề, đoạn văn và ảnh; dùng nút lên/xuống để sắp xếp. Chỉ nội dung văn bản được lưu, không chèn mã HTML.</p><div id="editorBlocks"></div><div class="news-block-tools"><button type="button" class="news-button news-button-light" data-add-block="paragraph">+ Đoạn văn</button><button type="button" class="news-button news-button-light" data-add-block="heading">+ Tiêu đề</button><button type="button" class="news-button news-button-light" data-add-block="image">+ Hình ảnh</button></div><div class="news-editor-save"><button class="news-button" type="submit">Lưu bài viết</button><button class="news-button news-button-light" id="previewArticle" type="button">Lưu &amp; xem trước</button><span id="editorStatus" role="status" aria-live="polite"></span></div></form><dialog id="categoryDialog" class="news-category-dialog"><div class="news-editor-heading"><h2>Danh mục bài viết</h2><button type="button" id="closeCategories" aria-label="Đóng danh mục">×</button></div><form id="categoryForm"><label>Tên danh mục mới<input name="name" required maxlength="80"></label><button class="news-button" type="submit">Thêm danh mục</button></form><p id="categoryStatus" role="status"></p><div id="categoryList"></div></dialog></main>`;
