import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export function normalize(value) { return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim(); }
export function slugify(value) { return normalize(value).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
export class NewsStore {
    constructor(root, directory = path.join(root, '.news')) {
        this.root = root; this.directory = directory; this.file = path.join(directory, 'store.json');
        fs.mkdirSync(directory, { recursive: true });
        if (!fs.existsSync(this.file)) {
            const seed = JSON.parse(fs.readFileSync(path.join(root, 'news/seed.json'), 'utf8').replace(/^\uFEFF/, ''));
            const categories = seed.categories.map((name, index) => ({ id: String(index + 1), name }));
            this.data = { version: 1, admin: null, categories, articles: seed.articles.map(item => ({
                id: crypto.randomUUID(), title: item.title, slug: item.slug,
                categoryId: categories.find(category => category.name === item.category).id,
                excerpt: item.excerpt, cover: item.cover, intro: item.intro,
                status: 'published', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
                blocks: item.sections.flatMap(section => [
                    { type: 'heading', level: 2, text: section.heading },
                    ...section.paragraphs.map(text => ({ type: 'paragraph', text })),
                    ...(section.image ? [{ type: 'image', src: section.image, alt: section.caption || section.heading, caption: section.caption || '' }] : [])
                ])
            })) };
            this.save();
        } else this.data = JSON.parse(fs.readFileSync(this.file, 'utf8'));
        this.exportPublic();
    }
    save() {
        const temporary = this.file + '.tmp';
        fs.writeFileSync(temporary, JSON.stringify(this.data, null, 2), { mode: 0o600 });
        fs.renameSync(temporary, this.file);
        this.exportPublic();
    }
    exportPublic() {
        const directory = path.join(this.root, 'js');
        fs.mkdirSync(directory, { recursive: true });
        const target = path.join(directory, 'news-public.json');
        const data = { categories: this.data.categories, articles: this.data.articles.filter(item => item.status === 'published').map(item => this.full(item)) };
        fs.writeFileSync(target + '.tmp', JSON.stringify(data));
        fs.renameSync(target + '.tmp', target);
    }
    category(id) { return this.data.categories.find(item => item.id === id)?.name || ''; }
    summary(item) { const { blocks, ...value } = item; return { ...value, category: this.category(item.categoryId) }; }
    full(item) { return { ...item, category: this.category(item.categoryId) }; }
    list({ q = '', category = '', page = 1, limit = 6, admin = false } = {}) {
        const words = normalize(q).split(/\s+/).filter(Boolean);
        const items = this.data.articles.filter(item => (admin || item.status === 'published') && (!category || item.categoryId === category) && words.every(word => normalize(item.title + ' ' + item.excerpt + ' ' + this.category(item.categoryId)).includes(word))).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        const pages = Math.max(1, Math.ceil(items.length / limit));
        page = Math.min(pages, Math.max(1, Number(page) || 1));
        return { articles: items.slice((page - 1) * limit, page * limit).map(item => this.summary(item)), total: items.length, pages, page };
    }
    image(value) {
        if (typeof value !== 'string' || !value.startsWith('/image/') || value.length > 1000) throw new Error('Ảnh phải nằm trong thư mục image của website.');
        let decoded; try { decoded = decodeURIComponent(value); } catch { throw new Error('Đường dẫn ảnh không hợp lệ.'); }
        const target = path.resolve(this.root, '.' + decoded);
        if (!target.startsWith(path.join(this.root, 'image') + path.sep) || !/\.(png|jpe?g|webp|gif)$/i.test(target) || !fs.existsSync(target)) throw new Error('Không tìm thấy ảnh hợp lệ.');
        return value;
    }
    validate(input) {
        const text = (key, max, required = true) => { const value = String(input[key] ?? '').trim(); if ((required && !value) || value.length > max) throw new Error('Vui lòng kiểm tra trường ' + key + '.'); return value; };
        const title = text('title', 180); const slug = text('slug', 180);
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error('Slug chỉ gồm chữ thường không dấu, số và dấu gạch nối.');
        const categoryId = text('categoryId', 100);
        if (!this.data.categories.some(item => item.id === categoryId)) throw new Error('Vui lòng chọn danh mục hợp lệ.');
        if (!['draft', 'published'].includes(input.status)) throw new Error('Trạng thái không hợp lệ.');
        if (!Array.isArray(input.blocks) || !input.blocks.length || input.blocks.length > 160) throw new Error('Bài viết cần từ 1 đến 160 khối nội dung.');
        const blocks = input.blocks.map(block => {
            if (block.type === 'image') return { type: 'image', src: this.image(block.src), alt: String(block.alt || title).slice(0, 300), caption: String(block.caption || '').slice(0, 600) };
            if (!['heading', 'paragraph'].includes(block.type) || typeof block.text !== 'string' || !block.text.trim() || block.text.length > 10000) throw new Error('Khối nội dung không hợp lệ.');
            return block.type === 'heading' ? { type: 'heading', level: block.level === 3 ? 3 : 2, text: block.text.trim() } : { type: 'paragraph', text: block.text.trim() };
        });
        return { title, slug, categoryId, status: input.status, excerpt: text('excerpt', 450), intro: text('intro', 2500), cover: this.image(input.cover), blocks };
    }
    writeArticle(input, id) {
        const value = this.validate(input);
        const existing = id && this.data.articles.find(item => item.id === id);
        if (id && !existing) throw new Error('Không tìm thấy bài viết.');
        if (this.data.articles.some(item => item.slug === value.slug && item.id !== id)) throw new Error('Slug đã được sử dụng bởi bài viết khác.');
        const now = new Date().toISOString();
        const item = { ...value, id: id || crypto.randomUUID(), createdAt: existing?.createdAt || now, updatedAt: now };
        if (existing) this.data.articles[this.data.articles.indexOf(existing)] = item; else this.data.articles.unshift(item);
        this.save(); return this.full(item);
    }
    deleteArticle(id) { const index = this.data.articles.findIndex(item => item.id === id); if (index < 0) return false; this.data.articles.splice(index, 1); this.save(); return true; }
    writeCategory(name, id) {
        name = String(name || '').trim();
        if (!name || name.length > 80) throw new Error('Tên danh mục cần từ 1 đến 80 ký tự.');
        if (this.data.categories.some(item => normalize(item.name) === normalize(name) && item.id !== id)) throw new Error('Danh mục đã tồn tại.');
        const category = id ? this.data.categories.find(item => item.id === id) : { id: crypto.randomUUID() };
        if (!category) throw new Error('Không tìm thấy danh mục.');
        category.name = name; if (!id) this.data.categories.push(category); this.save(); return category;
    }
    deleteCategory(id) { if (this.data.articles.some(item => item.categoryId === id)) throw new Error('Danh mục đang có bài viết. Hãy chuyển các bài sang danh mục khác trước.'); const index = this.data.categories.findIndex(item => item.id === id); if (index < 0) throw new Error('Không tìm thấy danh mục.'); this.data.categories.splice(index, 1); this.save(); }
}
