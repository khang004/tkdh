const newsEscape = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const newsRoot = new URL('../', document.currentScript.src);
const newsURL = path => new URL(path.replace(/^\//, ''), newsRoot).href;
const newsListingURL = newsURL('view/tintuc.html');
function newsCard(item) {
    const href=newsListingURL+'?bai='+encodeURIComponent(item.slug);
    return `<article class="news-card news-title-card"><a class="news-card-image" href="${href}" aria-label="${newsEscape(item.title)}"><img src="${newsEscape(newsURL(item.cover))}" alt="${newsEscape(item.title)}" width="560" height="420" loading="lazy" decoding="async"></a><h2><a href="${href}">${newsEscape(item.title)}</a></h2></article>`;
}
async function newsPublicData(signal) {
    try {
        const response=await fetch(newsURL('js/news-public.json'),{signal,cache:'no-store'});
        if(response.ok){
            const data=await response.json();
            if(Array.isArray(data.articles))return data;
        }
    } catch(error) { if(error.name==='AbortError')throw error; }
    const embedded=document.getElementById('newsEmbeddedData');
    if(embedded){
        const data=JSON.parse(embedded.textContent);
        if(Array.isArray(data.articles))return data;
    }
    throw Error('Thiếu dữ liệu tin tức. Vui lòng cập nhật view/tintuc.html và js/news-public.json lên hosting.');
}
async function newsList(params,signal) {
    try{
        const response=await fetch(newsURL('api/news/articles')+'?'+params,{signal});
        if(response.ok){const data=await response.json();if(Array.isArray(data.articles))return data;}
    }catch(error){if(error.name==='AbortError')throw error;}
    const data=await newsPublicData(signal);
    const normalize=value=>String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase().trim();
    const words=normalize(params.get('q')||'').split(/\s+/).filter(Boolean);
    const category=params.get('category');
    const articles=data.articles.filter(item=>(!category||item.categoryId===category)&&words.every(word=>normalize(item.title+' '+item.excerpt+' '+item.category).includes(word))).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
    const pages=Math.max(1,Math.ceil(articles.length/6)),page=Math.min(pages,Math.max(1,Number(params.get('page'))||1));
    return {articles:articles.slice((page-1)*6,page*6),total:articles.length,pages,page};
}

function newsCompactBlocks(blocks) {
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

function newsArticleContent(article,canonical){
    const e=newsEscape;
    const blocks=newsCompactBlocks(article.blocks).map(block=>{
        if(block.type==='heading'){const tag=block.level===3?'h3':'h2';return `<${tag}>${e(block.text)}</${tag}>`;}
        if(block.type==='paragraph')return '<p>'+e(block.text).replace(/\n/g,'<br>')+'</p>';
        if(block.type==='image')return `<figure><button type="button" class="news-zoom" aria-label="Phóng to ảnh: ${e(block.alt)}"><img src="${e(newsURL(block.src))}" alt="${e(block.alt)}" width="900" height="600" loading="lazy" decoding="async"></button>${block.caption?'<figcaption>'+e(block.caption)+'</figcaption>':''}</figure>`;
        return '';
    }).join('');
    return `<div class="news-page news-detail"><nav class="news-breadcrumb" aria-label="Đường dẫn"><a href="${newsListingURL}">Tin tức</a><span aria-hidden="true">/</span><span>${e(article.category)}</span></nav><article><header class="news-article-heading"><span class="news-category">${e(article.category)}</span><h1>${e(article.title)}</h1></header><figure class="news-cover"><button type="button" class="news-zoom" aria-label="Phóng to ảnh bìa"><img src="${e(newsURL(article.cover))}" alt="${e(article.title)}" width="1200" height="675"></button></figure><div class="news-body"><p class="news-intro">${e(article.excerpt)}</p>${blocks}</div></article><a class="news-back" href="${newsListingURL}">← Quay lại danh sách</a></div>`;
}
document.addEventListener('DOMContentLoaded',()=>{
    // Đọc bài trong trang hiện tại; liên kết riêng vẫn dùng được khi mở trực tiếp.
    const reader=document.createElement('dialog');
    reader.className='news-reader';reader.setAttribute('aria-label','Chi tiết bài viết');
    reader.innerHTML='<div class="news-reader-toolbar"><span>GÓC ĐỌC MỘC HƯƠNG</span><button type="button" class="news-reader-close" aria-label="Đóng bài viết">×</button></div><div class="news-reader-content"></div>';
    document.body.append(reader);
    const readerContent=reader.querySelector('.news-reader-content');
    let articleRequest;
    reader.querySelector('button').addEventListener('click',()=>reader.close());
    reader.addEventListener('click',event=>{if(event.target===reader)reader.close();});
    reader.addEventListener('close',()=>{articleRequest?.abort();document.documentElement.classList.remove('news-reader-open');});
    async function openArticle(href){
        articleRequest?.abort();const request=new AbortController();articleRequest=request;
        readerContent.innerHTML='<p class="news-reader-loading" role="status">Đang tải bài viết…</p>';
        if(!reader.open)reader.showModal();
        document.documentElement.classList.add('news-reader-open');readerContent.scrollTop=0;
        try{
            const articleURL=new URL(href,location.href);
            const slug=articleURL.searchParams.get('bai')||decodeURIComponent(articleURL.pathname.split('/').filter(Boolean).at(-1));
            let article,staticMode=false;
            try{
                const response=await fetch(newsURL('api/news/articles/'+encodeURIComponent(slug)),{signal:request.signal});
                if(response.ok)article=await response.json();
            }catch(error){if(error.name==='AbortError')throw error;}
            if(!article?.blocks){
                const data=await newsPublicData(request.signal);staticMode=true;
                article=data.articles.find(item=>item.slug===slug);
                if(!article)throw Error('Bài viết không còn được đăng hoặc đường dẫn đã thay đổi.');

            }

            const canonical=staticMode?newsListingURL+'?bai='+encodeURIComponent(slug):new URL(href,location.href).href;
            readerContent.innerHTML=newsArticleContent(article,canonical);
            reader.setAttribute('aria-label',article.title);readerContent.scrollTop=0;
        }catch(error){
            if(error.name==='AbortError')return;
            const message=document.createElement('p');message.className='news-reader-loading';message.setAttribute('role','alert');message.textContent=error.message;
            const retry=document.createElement('button');retry.type='button';retry.className='news-button';retry.textContent='Thử lại';retry.addEventListener('click',()=>openArticle(href));
            readerContent.replaceChildren(message,retry);
        }
    }
    document.addEventListener('click',event=>{
        const link=event.target.closest('a');
        if(!link||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
        const url=new URL(link.href,location.href);
        if(reader.contains(link)&&(link.classList.contains('news-back')||(url.pathname===new URL(newsListingURL).pathname&&!url.searchParams.has('bai')))){event.preventDefault();reader.close();return;}
        if(link.closest('.news-page')&&url.origin===location.origin&&(/\/tin-tuc\/[^/]+$/.test(url.pathname)||(url.pathname===new URL(newsListingURL).pathname&&url.searchParams.has('bai')))){event.preventDefault();openArticle(url.href);}
    });
    const filters=document.getElementById('newsFilters');
    if(filters){
        const grid=document.getElementById('newsGrid'),pages=document.getElementById('newsPagination'),status=document.getElementById('newsResultStatus');
        let controller,timer;
        async function load(page=1,historyMode='push') {
            clearTimeout(timer);controller?.abort();controller=new AbortController();
            const params=new URLSearchParams(new FormData(filters));params.set('page',page);
            grid.setAttribute('aria-busy','true');status.textContent='Đang tìm bài viết…';
            try{
                const result=await newsList(params,controller.signal);grid.innerHTML=result.articles.map(newsCard).join('')||'<p class="news-empty">Chưa có bài viết phù hợp. Hãy thử từ khóa hoặc danh mục khác.</p>';
                status.textContent=result.total+' bài viết';
                pages.innerHTML=Array.from({length:result.pages},(_,index)=>{const number=index+1;const query=new URLSearchParams(params);query.set('page',number);return `<a href="${newsListingURL}?${newsEscape(query)}" ${number===result.page?'aria-current="page"':''} aria-label="Trang ${number}">${number}</a>`;}).join('');
                params.set('page',result.page);if(historyMode==='push')history.pushState({},'', newsListingURL+'?'+params);
            }catch(error){if(error.name!=='AbortError')status.textContent=error.message;}finally{if(!controller.signal.aborted)grid.removeAttribute('aria-busy');}
        }
        filters.addEventListener('submit',event=>{event.preventDefault();load();});
        filters.elements.category.addEventListener('change',()=>load());
        filters.elements.q.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(()=>load(),300);});
        pages.addEventListener('click',event=>{const link=event.target.closest('a');if(!link)return;event.preventDefault();load(new URL(link.href).searchParams.get('page'));filters.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'});});
        window.addEventListener('popstate',()=>{const query=new URLSearchParams(location.search);filters.elements.q.value=query.get('q')||'';filters.elements.category.value=query.get('category')||'';load(query.get('page')||1,'none');});
        const initialQuery=new URLSearchParams(location.search);
        filters.elements.q.value=initialQuery.get('q')||'';filters.elements.category.value=initialQuery.get('category')||'';
        load(initialQuery.get('page')||1,'none');
    }
    let lightbox=document.getElementById('newsLightbox');
    if(!lightbox){lightbox=document.createElement('dialog');lightbox.id='newsLightbox';lightbox.className='news-lightbox';lightbox.setAttribute('aria-label','Ảnh phóng to');lightbox.innerHTML='<button type="button" class="news-lightbox-close" aria-label="Đóng ảnh">×</button><img alt=""><p></p>';document.body.append(lightbox);}
    lightbox.querySelector('button').addEventListener('click',()=>lightbox.close());
    lightbox.addEventListener('click',event=>{if(event.target===lightbox)lightbox.close();});
    document.addEventListener('click',async event=>{
        const zoom=event.target.closest('.news-zoom');
        if(zoom){const image=zoom.querySelector('img');lightbox.querySelector('img').src=image.src;lightbox.querySelector('img').alt=image.alt;lightbox.querySelector('p').textContent=zoom.closest('figure')?.querySelector('figcaption')?.textContent||image.alt;lightbox.showModal();return;}
        const copy=event.target.closest('#newsCopyLink');if(!copy)return;
        const status=copy.closest('.news-share').querySelector('#newsShareStatus');const url=copy.dataset.url||location.href;
        try{await navigator.clipboard.writeText(url);status.textContent='Đã sao chép liên kết.';}
        catch{status.textContent='Sao chép đường dẫn: '+url;}
    });
    const initialArticle=new URLSearchParams(location.search).get('bai');
    if(initialArticle)openArticle(newsListingURL+'?bai='+encodeURIComponent(initialArticle));
});
