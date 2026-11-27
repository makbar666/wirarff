const eyeIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>';
const eyeOffIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 3 18 18M10.6 5.2A10.8 10.8 0 0 1 12 5c6.4 0 10 7 10 7a16 16 0 0 1-3.1 3.8M6.2 6.3C3.5 8.1 2 12 2 12s3.6 7 10 7a10.5 10.5 0 0 0 4.2-.9"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';

document.querySelectorAll('input[type="password"]').forEach(input => {
  if (input.parentElement.classList.contains('password-field')) return;
  const wrapper = document.createElement('span');
  wrapper.className = 'password-field';
  input.parentNode.insertBefore(wrapper, input);
  wrapper.append(input);
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'password-visibility';
  button.setAttribute('aria-label', 'Tampilkan kata sandi');
  button.title = 'Tampilkan kata sandi';
  button.innerHTML = eyeIcon;
  button.addEventListener('click', () => {
    const visible = input.type === 'password';
    input.type = visible ? 'text' : 'password';
    button.innerHTML = visible ? eyeOffIcon : eyeIcon;
    button.setAttribute('aria-label', visible ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi');
    button.title = visible ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi';
    button.setAttribute('aria-pressed', String(visible));
  });
  wrapper.append(button);
});
