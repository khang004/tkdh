const adminEscape = value => String(value ?? '').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
document.addEventListener('DOMContentLoaded',()=>{
    const auth=document.getElementById('adminAuth'),dashboard=document.getElementById('adminDashboard'),editor=document.getElementById('articleEditor');
    if(!editor)return;
    const status=document.getElementById('adminStatus'),editorStatus=document.getElementById('editorStatus'),authForm=document.getElementById('authForm');
    const list=document.getElementById('adminArticles'),pages=document.getElementById('adminPages'),blocksHost=document.getElementById('editorBlocks');
    const categoryDialog=document.getElementById('categoryDialog'),categoryStatus=document.getElementById('categoryStatus');
    let categories=[],setup=false,currentPage=1,dirty=false,uploads=0;
    async function api(url,method='GET',data){
        const response=await fetch('/api/news/'+url,{method,headers:method==='GET'?{}:{'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)});
        let result;try{result=await response.json();}catch{throw Error('Không kết nối được máy chủ tin tức.');}
        if(!response.ok)throw Error(result.error||'Không thể thực hiện thao tác.');return result;
    }
    function busy(form,value){form.querySelectorAll('button[type="submit"]').forEach(button=>button.disabled=value);}
    async function loadCategories(){
        categories=(await api('categories')).categories;
        const selected=editor.elements.categoryId.value;
        editor.elements.categoryId.innerHTML=categories.map(item=>`<option value="${adminEscape(item.id)}">${adminEscape(item.name)}</option>`).join('');
        if(categories.some(item=>item.id===selected))editor.elements.categoryId.value=selected;
    }
    async function loadList(page=currentPage){
        currentPage=page;const q=document.querySelector('#adminSearch input').value;
        const result=await api('admin/articles?'+new URLSearchParams({q,page}));currentPage=result.page;
        list.innerHTML=result.articles.map(item=>`<article class="news-admin-row" data-id="${adminEscape(item.id)}"><img src="${adminEscape(item.cover)}" alt="" loading="lazy"><div><h3>${adminEscape(item.title)}</h3><p>${adminEscape(item.category)} · <span class="news-status-badge ${item.status==='published'?'is-published':''}">${item.status==='published'?'Đã đăng':'Bản nháp / Ẩn'}</span></p></div><div class="news-admin-row-actions"><button type="button" class="news-button news-button-light" data-action="edit">Chỉnh sửa</button><a class="news-button news-button-light" href="/quan-tri/tin-tuc/xem-truoc/${encodeURIComponent(item.id)}" target="_blank" rel="noopener">Xem trước</a><button type="button" class="news-button news-button-light" data-action="toggle">${item.status==='published'?'Ẩn bài':'Đăng bài'}</button><button type="button" class="news-button news-button-light" data-action="delete">Xóa</button></div></article>`).join('')||'<p class="news-empty">Chưa có bài viết phù hợp.</p>';
        pages.innerHTML=Array.from({length:result.pages},(_,index)=>`<button type="button" data-page="${index+1}" ${index+1===result.page?'aria-current="page"':''}>${index+1}</button>`).join('');
    }
    async function start(){
        try{
            const session=await api('session');setup=session.setup;
            if(!session.authenticated){auth.hidden=false;dashboard.hidden=true;editor.hidden=true;document.getElementById('authTitle').textContent=setup?'Tạo tài khoản quản trị đầu tiên':'Đăng nhập quản trị';authForm.elements.password.autocomplete=setup?'new-password':'current-password';status.textContent=setup?'Thiết lập một lần trên máy chủ. Mật khẩu cần ít nhất 8 ký tự.':'';}
            else{auth.hidden=true;dashboard.hidden=false;status.textContent='Xin chào, '+session.username+'.';await loadCategories();await loadList();}
        }catch(error){status.textContent=error.message;}
    }
    authForm.addEventListener('submit',async event=>{event.preventDefault();busy(authForm,true);try{await api(setup?'setup':'login','POST',Object.fromEntries(new FormData(authForm)));authForm.reset();await start();}catch(error){status.textContent=error.message;}finally{busy(authForm,false);}});
    document.getElementById('adminLogout').addEventListener('click',async()=>{if(dirty&&!confirm('Bạn có thay đổi chưa lưu. Đăng xuất và bỏ thay đổi?'))return;try{await api('logout','POST',{});dirty=false;await start();}catch(error){status.textContent=error.message;}});
    document.getElementById('adminSearch').addEventListener('submit',event=>{event.preventDefault();loadList(1).catch(error=>status.textContent=error.message);});
    pages.addEventListener('click',event=>{const button=event.target.closest('[data-page]');if(button)loadList(Number(button.dataset.page)).catch(error=>status.textContent=error.message);});
    function readBlocks(){return [...blocksHost.children].map(row=>{const type=row.dataset.type;const get=field=>row.querySelector(`[data-field="${field}"]`)?.value||'';return type==='image'?{type,src:get('src'),alt:get('alt'),caption:get('caption')}:type==='heading'?{type,level:Number(get('level')),text:get('text')}:{type,text:get('text')};});}
    function blockHTML(block,index){
        const value=adminEscape;
        const bar=`<div class="news-block-bar"><strong>${index+1}. ${block.type==='image'?'Hình ảnh':block.type==='heading'?'Tiêu đề':'Đoạn văn'}</strong><button type="button" data-block-action="up" aria-label="Đưa khối lên">↑</button><button type="button" data-block-action="down" aria-label="Đưa khối xuống">↓</button><button type="button" data-block-action="remove" aria-label="Xóa khối">×</button></div>`;
        let fields;
        if(block.type==='image')fields=`<label>Đường dẫn ảnh<input data-field="src" required value="${value(block.src||'')}" placeholder="/image/ten-anh.jpg"></label><label>Tải ảnh vào khối<input data-upload-block type="file" accept="image/jpeg,image/png,image/webp,image/gif"></label><label>Mô tả ảnh<input data-field="alt" value="${value(block.alt||'')}" maxlength="300"></label><label>Chú thích<input data-field="caption" value="${value(block.caption||'')}" maxlength="600"></label>`;
        else if(block.type==='heading')fields=`<label>Cấp tiêu đề<select data-field="level"><option value="2" ${block.level!==3?'selected':''}>H2 — mục lớn</option><option value="3" ${block.level===3?'selected':''}>H3 — mục nhỏ</option></select></label><label>Nội dung tiêu đề<input data-field="text" required value="${value(block.text||'')}" maxlength="10000"></label>`;
        else fields=`<label>Nội dung đoạn văn<textarea data-field="text" required rows="5" maxlength="10000">${value(block.text||'')}</textarea></label>`;
        return `<section class="news-editor-block" data-type="${block.type}">${bar}${fields}</section>`;
    }
    function renderBlocks(blocks){blocksHost.innerHTML=blocks.map(blockHTML).join('');}
    function openEditor(article){
        editor.reset();for(const name of ['id','title','slug','categoryId','status','excerpt','intro','cover'])editor.elements[name].value=article?.[name]|| (name==='status'?'draft':name==='categoryId'?categories[0]?.id||'':'');
        renderBlocks(article?.blocks||[{type:'heading',level:2,text:''},{type:'paragraph',text:''}]);
        document.getElementById('editorTitle').textContent=article?'Chỉnh sửa bài viết':'Bài viết mới';
        document.getElementById('coverPreview').hidden=!article?.cover;if(article?.cover)document.getElementById('coverPreview').src=article.cover;
        editorStatus.textContent='';dirty=false;dashboard.hidden=true;editor.hidden=false;editor.scrollIntoView({block:'start',behavior:'smooth'});
    }
    document.getElementById('newArticle').addEventListener('click',()=>{if(!categories.length){status.textContent='Hãy tạo danh mục trước khi thêm bài viết.';return;}openEditor();});
    document.getElementById('cancelEdit').addEventListener('click',()=>{if(dirty&&!confirm('Bỏ các thay đổi chưa lưu?'))return;dirty=false;editor.hidden=true;dashboard.hidden=false;});
    editor.addEventListener('input',()=>dirty=true);
    let manualSlug=false;
    editor.elements.slug.addEventListener('input',()=>manualSlug=true);
    editor.elements.title.addEventListener('input',()=>{if(!editor.elements.id.value&&!manualSlug)editor.elements.slug.value=editor.elements.title.value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');});
    editor.addEventListener('click',event=>{
        const add=event.target.closest('[data-add-block]');if(add){const blocks=readBlocks();blocks.push({type:add.dataset.addBlock,level:2,text:''});renderBlocks(blocks);dirty=true;blocksHost.lastElementChild.querySelector('input,textarea')?.focus();}
        const action=event.target.closest('[data-block-action]');if(!action)return;const row=action.closest('.news-editor-block'),blocks=readBlocks(),index=[...blocksHost.children].indexOf(row);
        if(action.dataset.blockAction==='remove'){if(!confirm('Xóa khối nội dung này?'))return;blocks.splice(index,1);}else{const target=index+(action.dataset.blockAction==='up'?-1:1);if(target<0||target>=blocks.length)return;[blocks[index],blocks[target]]=[blocks[target],blocks[index]];}
        renderBlocks(blocks);dirty=true;
    });
    async function upload(file){
        if(!file||file.size>8*1024*1024)throw Error('Vui lòng chọn ảnh tối đa 8 MB.');
        uploads++;editorStatus.textContent='Đang tải ảnh…';
        try{const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(Error('Không đọc được tệp ảnh.'));reader.readAsDataURL(file);});return (await api('admin/upload','POST',{data})).url;}
        finally{uploads--;}
    }
    document.getElementById('coverUpload').addEventListener('change',async event=>{if(!event.target.files[0])return;try{const url=await upload(event.target.files[0]);editor.elements.cover.value=url;const image=document.getElementById('coverPreview');image.src=url;image.hidden=false;dirty=true;editorStatus.textContent='Đã tải ảnh đại diện.';}catch(error){editorStatus.textContent=error.message;}event.target.value='';});
    blocksHost.addEventListener('change',async event=>{if(!event.target.matches('[data-upload-block]')||!event.target.files[0])return;const row=event.target.closest('.news-editor-block');try{row.querySelector('[data-field="src"]').value=await upload(event.target.files[0]);dirty=true;editorStatus.textContent='Đã chèn ảnh vào nội dung.';}catch(error){editorStatus.textContent=error.message;}event.target.value='';});
    async function save(preview=false){
        if(!editor.reportValidity())return;if(uploads){editorStatus.textContent='Vui lòng chờ ảnh tải xong.';return;}
        const payload=Object.fromEntries(new FormData(editor));payload.blocks=readBlocks();const id=payload.id;delete payload.id;
        busy(editor,true);document.getElementById('previewArticle').disabled=true;editorStatus.textContent='Đang lưu…';
        const previewWindow=preview?window.open('about:blank','moc-news-preview'):null;
        try{const article=await api('admin/articles'+(id?'/'+encodeURIComponent(id):''),id?'PUT':'POST',payload);editor.elements.id.value=article.id;dirty=false;editorStatus.textContent=article.status==='published'?'Đã lưu và đăng bài.':'Đã lưu bản nháp.';await loadList();if(preview){const href='/quan-tri/tin-tuc/xem-truoc/'+encodeURIComponent(article.id);if(previewWindow)previewWindow.location.href=href;else{const link=document.createElement('a');link.href=href;link.target='_blank';link.rel='noopener';link.textContent=' Mở bản xem trước';editorStatus.append(link);}}}
        catch(error){previewWindow?.close();editorStatus.textContent=error.message;}finally{busy(editor,false);document.getElementById('previewArticle').disabled=false;}
    }
    editor.addEventListener('submit',event=>{event.preventDefault();save();});
    document.getElementById('previewArticle').addEventListener('click',()=>save(true));
    list.addEventListener('click',async event=>{
        const button=event.target.closest('[data-action]');if(!button)return;const id=button.closest('[data-id]').dataset.id;button.disabled=true;
        try{
            if(button.dataset.action==='delete'){if(!confirm('Xóa bài viết này? Thao tác sẽ loại bỏ nội dung đã lưu.'))return;await api('admin/articles/'+encodeURIComponent(id),'DELETE',{});status.textContent='Đã xóa bài viết.';}
            else{const article=await api('admin/articles/'+encodeURIComponent(id));if(button.dataset.action==='edit'){manualSlug=false;openEditor(article);return;}article.status=article.status==='published'?'draft':'published';await api('admin/articles/'+encodeURIComponent(id),'PUT',article);status.textContent=article.status==='published'?'Đã đăng bài viết.':'Đã ẩn bài viết khỏi trang công khai.';}
            await loadList();
        }catch(error){status.textContent=error.message;}finally{button.disabled=false;}
    });
    function renderCategories(){document.getElementById('categoryList').innerHTML=categories.map(item=>`<div class="news-category-row" data-category-id="${adminEscape(item.id)}"><input value="${adminEscape(item.name)}" aria-label="Tên danh mục" maxlength="80"><button type="button" class="news-button news-button-light" data-category-action="save">Lưu</button><button type="button" class="news-button news-button-light" data-category-action="delete">Xóa</button></div>`).join('');}
    document.getElementById('manageCategories').addEventListener('click',()=>{renderCategories();categoryStatus.textContent='';categoryDialog.showModal();});
    document.getElementById('closeCategories').addEventListener('click',()=>categoryDialog.close());
    document.getElementById('categoryForm').addEventListener('submit',async event=>{event.preventDefault();try{await api('admin/categories','POST',{name:event.target.elements.name.value});event.target.reset();await loadCategories();renderCategories();categoryStatus.textContent='Đã thêm danh mục.';}catch(error){categoryStatus.textContent=error.message;}});
    document.getElementById('categoryList').addEventListener('click',async event=>{const button=event.target.closest('[data-category-action]');if(!button)return;const row=button.closest('[data-category-id]');try{const remove=button.dataset.categoryAction==='delete';if(remove&&!confirm('Xóa danh mục này?'))return;await api('admin/categories/'+encodeURIComponent(row.dataset.categoryId),remove?'DELETE':'PUT',remove?{}:{name:row.querySelector('input').value});await loadCategories();renderCategories();await loadList();categoryStatus.textContent=remove?'Đã xóa danh mục.':'Đã cập nhật danh mục.';}catch(error){categoryStatus.textContent=error.message;}});
    window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
    start();
});
