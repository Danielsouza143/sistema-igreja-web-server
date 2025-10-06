// Este script deve ser o PRIMEIRO a ser carregado no <head> de todas as páginas protegidas.
const userToken = localStorage.getItem('userToken');

if (!userToken) {
    window.location.href = '/login.html'; // Redireciona para a tela de login
}