import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { NewsStore } from './news/store.mjs';
import { page, listing, detail, adminMain, escape } from './news/render.mjs';

export function createNewsServer({ root = path.dirname(fileURLToPath(import.meta.url)), dataDirectory, port = 8000 } = {}) {
    const store = new NewsStore(root, dataDirectory);
    const sessions = new Map(), attempts = new Map();
    const cookieName = 'moc_news_session';
    const json = (res, code, body) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)); };
    const loggedIn = req => { const token = req.headers.cookie?.split(';').map(v=>v.trim()).find(v=>v.startsWith(cookieName+'='))?.slice(cookieName.length+1); const session = sessions.get(token); if (!session || session.expires < Date.now()) { sessions.delete(token); return false; } return token; };
    const isLocal = req => ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress);
    const cookie = (token, expires=28800) => `${cookieName}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${expires}`;
    async function body(req) {
        if (!req.headers['content-type']?.startsWith('application/json')) throw Object.assign(new Error('Yêu cầu phải dùng JSON.'), { status: 415 });
        const chunks=[]; let size=0;
        for await(const chunk of req) { size+=chunk.length; if(size>12*1024*1024) throw Object.assign(new Error('Dữ liệu quá lớn.'),{status:413}); chunks.push(chunk); }
        try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new Error('Dữ liệu JSON không hợp lệ.'); }
    }
    function requireAdmin(req) { if(!loggedIn(req)) throw Object.assign(new Error('Vui lòng đăng nhập quản trị.'),{status:401}); }
    function validateOrigin(req) {
        const expected='http://'+req.headers.host;
        if (req.headers.origin && req.headers.origin !== expected) throw Object.assign(new Error('Nguồn yêu cầu không hợp lệ.'), { status:403 });
        if (req.headers['sec-fetch-site'] === 'cross-site') throw Object.assign(new Error('Không chấp nhận yêu cầu từ website khác.'), {status:403});
    }
    const server = http.createServer(async (req,res) => {
        res.setHeader('X-Content-Type-Options','nosniff'); res.setHeader('Referrer-Policy','strict-origin-when-cross-origin'); res.setHeader('X-Frame-Options','SAMEORIGIN');
        try {
            if (!/^[a-z0-9.\-\[\]:]+$/i.test(req.headers.host || '')) return json(res,400,{error:'Tên máy chủ không hợp lệ.'});
            const origin = 'http://' + req.headers.host;
            const url=new URL(req.url, origin); const route=decodeURIComponent(url.pathname);
            if (route.startsWith('/api/news/')) {
                if (!['GET','HEAD'].includes(req.method)) validateOrigin(req);
                if (req.method==='GET' && route==='/api/news/session') return json(res,200,{authenticated:!!loggedIn(req), setup:!store.data.admin && isLocal(req), username:loggedIn(req) ? store.data.admin?.username : null});
                if(req.method==='POST' && route==='/api/news/setup') {
                    if(store.data.admin || !isLocal(req)) return json(res,403,{error:'Thiết lập lần đầu chỉ khả dụng trên máy chủ khi chưa có quản trị viên.'});
                    const input=await body(req); const username=String(input.username||'').trim(); const password=String(input.password||'');
                    if(username.length<3 || username.length>60 || password.length<8 || password.length>200) throw new Error('Tên đăng nhập cần ít nhất 3 ký tự, mật khẩu từ 8 ký tự.');
                    if(store.data.admin) return json(res,409,{error:'Quản trị viên đã được thiết lập.'});
                    const salt=crypto.randomBytes(16).toString('hex'); const hash=crypto.scryptSync(password,salt,64).toString('hex');
                    store.data.admin={username,salt,hash}; store.save(); const token=crypto.randomBytes(32).toString('hex'); sessions.set(token,{expires:Date.now()+28800000}); res.setHeader('Set-Cookie',cookie(token)); return json(res,201,{ok:true});
                }
                if(req.method==='POST' && route==='/api/news/login') {
                    const ip=req.socket.remoteAddress; const entry=attempts.get(ip); if(entry && entry.count>=5 && entry.until>Date.now()) return json(res,429,{error:'Đã thử quá nhiều lần. Vui lòng thử lại sau 15 phút.'});
                    const input=await body(req); const admin=store.data.admin; const pass=String(input.password||'');
                    if(pass.length>200) throw new Error('Thông tin đăng nhập không hợp lệ.');
                    const hash=crypto.scryptSync(pass,admin?.salt||'unused-salt',64);
                    if(!admin || String(input.username||'').trim()!==admin.username || !crypto.timingSafeEqual(hash,Buffer.from(admin.hash,'hex'))) {
                        const prior=entry && entry.until>Date.now() ? entry : {count:0,until:Date.now()+900000}; prior.count++; attempts.set(ip,prior); return json(res,401,{error:'Tên đăng nhập hoặc mật khẩu chưa đúng.'});
                    }
                    attempts.delete(ip); for(const [token,session] of sessions)if(session.expires<Date.now())sessions.delete(token);
                    const token=crypto.randomBytes(32).toString('hex'); sessions.set(token,{expires:Date.now()+28800000}); res.setHeader('Set-Cookie',cookie(token)); return json(res,200,{ok:true});
                }
                if(req.method==='POST' && route==='/api/news/logout') { const token=loggedIn(req); if(token)sessions.delete(token); res.setHeader('Set-Cookie',cookie('',0)); return json(res,200,{ok:true}); }
                if(req.method==='GET' && route==='/api/news/categories') return json(res,200,{categories:store.data.categories});
                if(req.method==='GET' && route==='/api/news/articles') return json(res,200,store.list({q:url.searchParams.get('q')?.slice(0,150),category:url.searchParams.get('category'),page:url.searchParams.get('page')}));
                if(req.method==='GET' && route.startsWith('/api/news/articles/')) { const item=store.data.articles.find(item=>item.slug===route.split('/').at(-1)&&item.status==='published'); return item ? json(res,200,store.full(item)) : json(res,404,{error:'Không tìm thấy bài viết.'}); }
                if(route.startsWith('/api/news/admin/')) {
                    requireAdmin(req);
                    const articleId=route.match(/^\/api\/news\/admin\/articles\/([^/]+)$/)?.[1];
                    const categoryId=route.match(/^\/api\/news\/admin\/categories\/([^/]+)$/)?.[1];
                    if(req.method==='GET' && route==='/api/news/admin/articles')return json(res,200,store.list({q:url.searchParams.get('q')?.slice(0,150),page:url.searchParams.get('page'),limit:10,admin:true}));
                    if(req.method==='GET' && articleId) { const item=store.data.articles.find(item=>item.id===articleId); return item ? json(res,200,store.full(item)) : json(res,404,{error:'Không tìm thấy bài viết.'}); }
                    if(req.method==='POST' && route==='/api/news/admin/articles')return json(res,201,store.writeArticle(await body(req)));
                    if(req.method==='PUT' && articleId)return json(res,200,store.writeArticle(await body(req),articleId));
                    if(req.method==='DELETE' && articleId)return store.deleteArticle(articleId) ? json(res,200,{ok:true}) : json(res,404,{error:'Không tìm thấy bài viết.'});
                    if(req.method==='POST' && route==='/api/news/admin/categories')return json(res,201,store.writeCategory((await body(req)).name));
                    if(req.method==='PUT' && categoryId)return json(res,200,store.writeCategory((await body(req)).name,categoryId));
                    if(req.method==='DELETE' && categoryId) { store.deleteCategory(categoryId); return json(res,200,{ok:true}); }
                    if(req.method==='POST' && route==='/api/news/admin/upload') {
                        const input=await body(req); if(typeof input.data!=='string'||!/^[A-Za-z0-9+/]*={0,2}$/.test(input.data))throw new Error('Ảnh tải lên không hợp lệ.');
                        const buffer=Buffer.from(input.data,'base64'); if(!buffer.length||buffer.length>8*1024*1024)throw new Error('Ảnh tối đa 8 MB.');
                        let ext;
                        if(buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))ext='png';
                        else if(buffer[0]===255&&buffer[1]===216&&buffer[2]===255&&buffer.at(-2)===255&&buffer.at(-1)===217)ext='jpg';
                        else if(buffer.toString('ascii',0,4)==='RIFF'&&buffer.toString('ascii',8,12)==='WEBP')ext='webp';
                        else if(/^GIF8[79]a$/.test(buffer.toString('ascii',0,6)))ext='gif';
                        if(!ext)throw new Error('Chỉ nhận ảnh JPG, PNG, WebP hoặc GIF hợp lệ.');
                        const folder=path.join(root,'image/uploads/news'); fs.mkdirSync(folder,{recursive:true}); const name=crypto.randomUUID()+'.'+ext;
                        fs.writeFileSync(path.join(folder,name),buffer,{flag:'wx'}); return json(res,201,{url:'/image/uploads/news/'+name});
                    }
                }
                return json(res,404,{error:'Không tìm thấy chức năng.'});
            }
            if(!['GET','HEAD'].includes(req.method))return json(res,405,{error:'Phương thức không được hỗ trợ.'});
            let output, status=200;
            const canonical=origin+url.pathname;
            if(['/view/tintuc.html','/tin-tuc','/tin-tuc/'].includes(route)) {
                const params={q:url.searchParams.get('q')?.slice(0,150)||'',category:url.searchParams.get('category')||'',page:url.searchParams.get('page')||1};
                output=page(root,{main:listing(store,params),title:'Tin tức trầm hương – MỘC HƯƠNG',description:'Khám phá kiến thức, lịch sử, văn hóa và những câu chuyện về trầm hương Việt Nam.',canonical});
            } else if(route==='/quan-tri/tin-tuc') {
                output=page(root,{main:adminMain,title:'Quản trị tin tức – MỘC HƯƠNG',description:'Quản trị chuyên mục tin tức Mộc Hương.',canonical,script:'/js/news-admin.js'}).replace('</head>','<meta name="robots" content="noindex, nofollow"></head>'); res.setHeader('Cache-Control','no-store');
            } else if(route.startsWith('/tin-tuc/') || route.startsWith('/quan-tri/tin-tuc/xem-truoc/')) {
                const preview=route.startsWith('/quan-tri/'); if(preview&&!loggedIn(req)) {res.writeHead(302,{Location:'/quan-tri/tin-tuc'});return res.end();}
                const key=route.split('/').at(-1); const item=store.data.articles.find(item=>(preview?item.id===key:item.slug===key&&item.status==='published'));
                if(item) {
                    const article=store.full(item); output=page(root,{main:detail(store,article,canonical,preview),title:article.title+' | MỘC HƯƠNG',description:article.excerpt,canonical,schema:preview?undefined:{'@context':'https://schema.org','@type':'Article',headline:article.title,description:article.excerpt,image:new URL(article.cover,origin).href,inLanguage:'vi',mainEntityOfPage:canonical,publisher:{'@type':'Organization',name:'MỘC HƯƠNG'}}});
                    if(preview){res.setHeader('Cache-Control','no-store');output=output.replace('</head>','<meta name="robots" content="noindex, nofollow"></head>');}
                } else { status=404;output=page(root,{main:'<main class="news-page news-empty"><h1>Không tìm thấy bài viết</h1><p>Bài viết chưa được đăng hoặc đường dẫn đã thay đổi.</p><a href="/view/tintuc.html">Quay lại tin tức</a></main>',title:'Không tìm thấy bài viết | MỘC HƯƠNG',description:'Bài viết không tồn tại.',canonical}); }
            }
            if(output){res.writeHead(status,{'Content-Type':'text/html; charset=utf-8'});return res.end(req.method==='HEAD'?undefined:output);}
            let relative=route==='/'?'index.html':route.replace(/^\//,'');
            if(relative.includes('\\')||relative.includes('\0')||relative.split('/').some(part=>part.startsWith('.'))||!(relative==='index.html'||/^(view|image|css|js|video)\//.test(relative)))return json(res,404,{error:'Không tìm thấy tài nguyên.'});
            const target=path.resolve(root,relative); if(!target.startsWith(root+path.sep)||!fs.existsSync(target)||!fs.statSync(target).isFile())return json(res,404,{error:'Không tìm thấy tài nguyên.'});
            const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.gif':'image/gif','.mp4':'video/mp4'}[path.extname(target).toLowerCase()];
            if(!mime)return json(res,404,{error:'Không tìm thấy tài nguyên.'});
            const stat=fs.statSync(target); const range=req.headers.range;
            if(range && mime==='video/mp4') {
                const match=range.match(/^bytes=(\d+)-(\d*)$/); const start=Number(match?.[1]),end=match?.[2]?Number(match[2]):stat.size-1;
                if(!match||start>end||end>=stat.size){res.writeHead(416,{'Content-Range':`bytes */${stat.size}`});return res.end();}
                res.writeHead(206,{'Content-Type':mime,'Content-Range':`bytes ${start}-${end}/${stat.size}`,'Accept-Ranges':'bytes','Content-Length':end-start+1});return fs.createReadStream(target,{start,end}).pipe(res);
            }
            res.writeHead(200,{'Content-Type':mime,'Content-Length':stat.size,'Cache-Control':mime.startsWith('image/')?'public, max-age=3600':'no-cache','Accept-Ranges':mime==='video/mp4'?'bytes':'none'});
            if(req.method==='HEAD')return res.end();fs.createReadStream(target).pipe(res);
        } catch(error) { if(!res.headersSent)json(res,error.status||400,{error:error.status===500?'Không thể xử lý yêu cầu.':error.message});else res.end(); }
    });
    return { server, store, port };
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
    const port=Number(process.env.PORT||8000);const host=process.env.HOST||'127.0.0.1';
    const {server}=createNewsServer({port});server.listen(port,host,()=>console.log(`Mộc Hương: http://${host}:${port}/view/tintuc.html\nQuản trị: http://${host}:${port}/quan-tri/tin-tuc`));
}
