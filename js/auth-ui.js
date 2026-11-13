document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.auth-password-toggle').forEach(button => {
        button.addEventListener('click', () => {
            const input = document.getElementById(button.dataset.password);
            const visible = input.type === 'password';
            input.type = visible ? 'text' : 'password';
            button.setAttribute('aria-pressed', String(visible));
            button.setAttribute('aria-label', visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu');
            button.querySelector('span').textContent = visible ? 'visibility_off' : 'visibility';
        });
    });
    document.querySelectorAll('.auth-tab-btn').forEach(tab => tab.addEventListener('click', () => {
        document.querySelectorAll('.auth-password-toggle').forEach(button => {
            document.getElementById(button.dataset.password).type = 'password';
            button.setAttribute('aria-pressed', 'false');
            button.setAttribute('aria-label', 'Hiện mật khẩu');
            button.querySelector('span').textContent = 'visibility';
        });
    }));
});
