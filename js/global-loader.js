(async function loadMenuAndScripts() {
    const menuPlaceholder = document.getElementById('menu-placeholder');
    if (!menuPlaceholder) {
        console.error('Menu placeholder not found. Cannot load menu.');
        return;
    }

    try {
        // 1. Fetch and inject HTML
        const response = await fetch('/components/menu.html');
        if (!response.ok) {
            throw new Error(`Failed to fetch menu HTML: ${response.status}`);
        }
        menuPlaceholder.innerHTML = await response.text();

        // 2. Now that HTML is in the DOM, load the script that uses it.
        const menuScript = document.createElement('script');
        menuScript.src = '/components/menu.js';
        document.body.appendChild(menuScript);

    } catch (error) {
        console.error('Error loading menu component:', error);
        menuPlaceholder.innerHTML = '<p style="color: red; text-align: center;">Erro ao carregar o menu.</p>';
    }
})();
