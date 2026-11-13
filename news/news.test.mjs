import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { once } from 'node:events';
import vm from 'node:vm';
import { createNewsServer } from '../server.mjs';
import { NewsStore } from './store.mjs';

const project=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const root=fs.mkdtempSync(path.join(os.tmpdir(),'moc-news-test-'));
fs.mkdirSync(path.join(root,'news'));fs.mkdirSync(path.join(root,'view'));fs.mkdirSync(path.join(root,'image'));
fs.copyFileSync(path.join(project,'news/seed.json'),path.join(root,'news/seed.json'));
fs.copyFileSync(path.join(project,'view/tintuc.html'),path.join(root,'view/tintuc.html'));
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aFOsAAAAASUVORK5CYII=','base64');
fs.writeFileSync(path.join(root,'image/test.png'),png);
const {server,store}=createNewsServer({root});server.listen(0,'127.0.0.1');await once(server,'listening');
const base='http://127.0.0.1:'+server.address().port;
let cookie='';
async function api(route,method='GET',data,authenticated=true,extra={}){
    const response=await fetch(base+route,{method,headers:{...(authenticated&&cookie?{Cookie:cookie}:{}),...(method!=='GET'?{'Content-Type':'application/json'}:{}),...extra},body:data===undefined?undefined:JSON.stringify(data),redirect:'manual'});
    return response;
}
let articleId,categoryId;
test('real JSON persistence and complete news workflow',async t=>{
 try {
    await t.test('8 seeded articles, search without accents and pagination',async()=>{
        const response=await api('/api/news/articles');const value=await response.json();assert.equal(value.total,8);assert.equal(value.articles.length,6);assert.equal(value.pages,2);
        const second=await(await api('/api/news/articles?page=2')).json();assert.equal(second.articles.length,2);
        const found=await(await api('/api/news/articles?q=bao%20ton')).json();assert(found.total>0);
    });
    await t.test('no anonymous writes, cross-origin writes or private file downloads',async()=>{
        assert.equal((await api('/api/news/admin/articles','POST',{},false)).status,401);
        assert.equal((await api('/api/news/setup','POST',{},false,{Origin:'https://other.example'})).status,403);
        assert.equal((await api('/.news/store.json')).status,404);
        assert.equal((await api('/server.mjs')).status,404);
    });
    await t.test('first-run account, hashed password and authenticated session',async()=>{
        const response=await api('/api/news/setup','POST',{username:'editor-test',password:'moc-test-password'});assert.equal(response.status,201);cookie=response.headers.get('set-cookie').split(';')[0];
        assert((await(await api('/api/news/session')).json()).authenticated);assert.equal((await api('/api/news/setup','POST',{username:'x',password:'x'})).status,403);
        assert.notEqual(store.data.admin.hash,'moc-test-password');assert(!fs.readFileSync(store.file,'utf8').includes('moc-test-password'));
    });
    await t.test('category creation and draft hidden publicly but preview works',async()=>{
        const category=await(await api('/api/news/admin/categories','POST',{name:'Danh mục kiểm tra'})).json();categoryId=category.id;
        const payload={title:'Bài kiểm tra <script>',slug:'bai-kiem-tra',categoryId,status:'draft',excerpt:'Mô tả bài kiểm tra',intro:'Đoạn giới thiệu',cover:'/image/test.png',blocks:[{type:'heading',level:2,text:'Mục đầu'},{type:'paragraph',text:'<script>alert(1)</script>'},{type:'image',src:'/image/test.png',alt:'Ảnh kiểm tra',caption:'Chú thích'}]};
        const response=await api('/api/news/admin/articles','POST',payload);assert.equal(response.status,201);const article=await response.json();articleId=article.id;
        assert.equal((await api('/tin-tuc/bai-kiem-tra')).status,404);assert.equal((await api('/api/news/articles/bai-kiem-tra')).status,404);
        const preview=await api('/quan-tri/tin-tuc/xem-truoc/'+articleId);assert.equal(preview.status,200);const html=await preview.text();assert(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));assert(html.includes('noindex, nofollow'));assert(!html.includes('const articleDatabase'));
        assert.equal((await api('/quan-tri/tin-tuc/xem-truoc/'+articleId,'GET',undefined,false)).status,302);
    });
    await t.test('publish, slug uniqueness, rename category, hide and delete',async()=>{
        let article=await(await api('/api/news/admin/articles/'+articleId)).json();article.status='published';
        assert.equal((await api('/api/news/admin/articles/'+articleId,'PUT',article)).status,200);
        const detail=await api('/tin-tuc/bai-kiem-tra');assert.equal(detail.status,200);const html=await detail.text();assert(html.includes('application/ld+json'));assert(html.includes('newsLightbox'));assert(!html.includes('id="newsCopyLink"'));
        assert.equal((await api('/api/news/admin/articles','POST',article)).status,400);
        assert.equal((await api('/api/news/admin/categories/'+categoryId,'DELETE',{})).status,400);
        assert.equal((await api('/api/news/admin/categories/'+categoryId,'PUT',{name:'Tên danh mục mới'})).status,200);
        assert.equal((await(await api('/api/news/articles/bai-kiem-tra')).json()).category,'Tên danh mục mới');
        const reopened=new NewsStore(root);assert(reopened.data.articles.some(item=>item.id===articleId&&item.status==='published'));
        article.status='draft';await api('/api/news/admin/articles/'+articleId,'PUT',article);assert.equal((await api('/tin-tuc/bai-kiem-tra')).status,404);
        assert.equal((await api('/api/news/admin/articles/'+articleId,'DELETE',{})).status,200);assert.equal((await api('/api/news/admin/categories/'+categoryId,'DELETE',{})).status,200);
    });
    await t.test('upload accepts real image bytes, rejects executable content and unsafe paths',async()=>{
        const upload=await api('/api/news/admin/upload','POST',{data:png.toString('base64')});assert.equal(upload.status,201);const value=await upload.json();assert.equal((await api(value.url)).status,200);
        assert.equal((await api('/api/news/admin/upload','POST',{data:Buffer.from('<svg onload="alert(1)"></svg>').toString('base64')})).status,400);
        assert.throws(()=>store.image('/image/../.news/store.json'));assert.throws(()=>store.image('https://other.example/image.jpg'));
    });
    await t.test('logout revokes session; login works after restart of store',async()=>{
        await api('/api/news/logout','POST',{});assert.equal((await api('/api/news/admin/articles')).status,401);
        const login=await api('/api/news/login','POST',{username:'editor-test',password:'moc-test-password'});assert.equal(login.status,200);
        const reopened=new NewsStore(root);assert.equal(reopened.data.admin.username,'editor-test');assert.equal(reopened.data.articles.length,8);
    });
    await t.test('Live Server fallback loads complete articles and supports search/pagination without API',async()=>{
        const publicData=JSON.parse(fs.readFileSync(path.join(root,'js/news-public.json'),'utf8'));
        assert.equal(publicData.articles.length,8);assert(!Object.hasOwn(publicData,'admin'));
        const context={document:{addEventListener(){}},URLSearchParams,fetch:async url=>String(url).startsWith('/api/')?new Response('',{status:404}):new Response(JSON.stringify(publicData),{headers:{'Content-Type':'application/json'}})};
        vm.createContext(context);
        vm.runInContext(fs.readFileSync(path.join(project,'js/news.js'),'utf8')+'\nthis.client={newsList,newsArticleContent};',context);
        const first=await context.client.newsList(new URLSearchParams());assert.equal(first.total,8);assert.equal(first.articles.length,6);
        const second=await context.client.newsList(new URLSearchParams({page:'2'}));assert.equal(second.articles.length,2);
        const found=await context.client.newsList(new URLSearchParams({q:'bao ton'}));assert(found.total>0);
        for(const article of publicData.articles){const markup=context.client.newsArticleContent(article,base+'/view/tintuc.html?bai='+article.slug);assert(markup.includes('news-body'));assert(markup.includes('news-zoom'));assert(markup.includes(article.title));assert(!markup.includes('news-related'));assert(!markup.includes('news-card'));}
        const markup=context.client.newsArticleContent({...publicData.articles[0],title:'<script>alert(1)</script>'},base);assert(markup.includes('&lt;script&gt;'));assert(!markup.includes('<script>'));
    });
 } finally {server.closeAllConnections();await new Promise(resolve=>server.close(resolve));fs.rmSync(root,{recursive:true,force:true});}
});
