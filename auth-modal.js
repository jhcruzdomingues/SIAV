// Lógica para alternar entre Login e Cadastro
const tabLogin = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');
const loginForm = document.getElementById('login-form-auth');
const registerForm = document.getElementById('register-form-auth');

if (tabLogin && tabRegister && loginForm && registerForm) {
  tabLogin.onclick = () => {
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    loginForm.style.display = '';
    registerForm.style.display = 'none';
  };
  tabRegister.onclick = () => {
    tabRegister.classList.add('active');
    tabLogin.classList.remove('active');
    loginForm.style.display = 'none';
    registerForm.style.display = '';
  };
}

// Exemplo de handlers (substitua pela integração real com Supabase)
loginForm?.addEventListener('submit', function(e) {
  e.preventDefault();
  // Aqui você chama a função de login real
  alert('Login simulado!');
});

registerForm?.addEventListener('submit', function(e) {
  e.preventDefault();
  const pass1 = document.getElementById('register-password-auth').value;
  const pass2 = document.getElementById('register-password2-auth').value;
  if (pass1 !== pass2) {
    alert('As senhas não coincidem!');
    return;
  }
  // Aqui você chama a função de cadastro real
  alert('Cadastro simulado!');
});
