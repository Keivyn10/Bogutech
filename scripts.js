document.addEventListener('DOMContentLoaded', () => {

    // --- ELEMENTOS DEL DOM (VERSIÓN ÚNICA Y LIMPIA) ---
    const loginView = document.getElementById('loginView');
    const createUserView = document.getElementById('createUserView');
    const forgotPasswordView = document.getElementById('forgotPasswordView');
    const mainAppContainer = document.getElementById('mainAppContainer');
    const listView = document.getElementById('listView');
    const formView = document.getElementById('formView');
    
    const loginForm = document.getElementById('loginForm');
    const createUserForm = document.getElementById('createUserForm');
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    
    const loginMessage = document.getElementById('loginMessage');
    const createUserMessage = document.getElementById('createUserMessage');
    const forgotPasswordMessage = document.getElementById('forgotPasswordMessage');
    
    const showCreateUserLink = document.getElementById('showCreateUserLink');
    const showLoginLink = document.getElementById('showLoginLink');
    const showForgotPasswordLink = document.getElementById('showForgotPasswordLink');
    const backToLoginLink = document.getElementById('backToLoginLink');
    
    const logoutButton = document.getElementById('logoutButton');
    const showFormButton = document.getElementById('showFormButton');
    const welcomeMessageElement = document.getElementById('welcomeMessage');
    const opportunitiesTableBody = document.querySelector('#opportunitiesTable tbody');
    
    const opportunityForm = document.getElementById('opportunityForm');
    const formTitle = document.getElementById('form-title');
    const portalSelect = document.getElementById('portal');
    const dellCiscoFields = document.getElementById('dellCiscoFields');
    
    const filterInputs = document.querySelectorAll('.filters-container input, .filters-container select');
    const clearFiltersButton = document.getElementById('clearFiltersButton');
    
    const createAdminBtn = document.getElementById('createAdminBtn');
    const createAdminModal = document.getElementById('createAdminModal');
    const createAdminForm = document.getElementById('createAdminForm');
    const cancelAdminCreation = document.getElementById('cancelAdminCreation');
    const createAdminMessage = document.getElementById('createAdminMessage');
    
    const adminPanel = document.getElementById('adminPanel');
    const showAdminPanelButton = document.getElementById('showAdminPanelButton');
    const backToAppButton = document.getElementById('backToAppButton');
    
    const portalForm = document.getElementById('portalForm');
    const countryForm = document.getElementById('countryForm');
    const currencyForm = document.getElementById('currencyForm');
    const portalList = document.getElementById('portalList');
    const countryList = document.getElementById('countryList');
    const currencyList = document.getElementById('currencyList');

    // --- ESTADO Y DATOS DE LA APLICACIÓN ---
    let opportunities = [];
    let currentUser = null;
    const EXPIRATION_ALERT_DAYS = 7;

    // --- LÓGICA DE NAVEGACIÓN Y VISTAS ---
    function animateViewChange(viewToShow, ...viewsToHide) {
        viewsToHide.forEach(view => view && view.classList.add('hidden'));
        if (viewToShow) {
            viewToShow.classList.remove('hidden');
            viewToShow.classList.add('view-enter-active');
        }
    }

    // --- LÓGICA DE AUTENTICACIÓN ---
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: loginForm.username.value, password: loginForm.password.value })
            });
            const data = await response.json();
            if (response.ok) {
                currentUser = data.user;
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                await displayMainAppAnimated(currentUser);
            } else {
                displayAuthMessage(loginMessage, data.message);
            }
        } catch (error) {
            displayAuthMessage(loginMessage, 'Error de conexión.');
        }
    });

    createUserForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const newPassword = createUserForm.newPassword.value;
        if (newPassword !== createUserForm.confirmPassword.value) {
            return displayAuthMessage(createUserMessage, 'Las contraseñas no coinciden.');
        }
        try {
            const response = await fetch('/api/createUser', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newUsername: createUserForm.newUsername.value, newPassword })
            });
            const data = await response.json();
            displayAuthMessage(createUserMessage, data.message, response.ok);
            if (response.ok) setTimeout(displayLoginViewAnimated, 2000);
        } catch (error) {
            displayAuthMessage(createUserMessage, 'Error de conexión.');
        }
    });

    forgotPasswordForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const forgotNewPassword = forgotPasswordForm.forgotNewPassword.value;
        if (forgotNewPassword !== forgotPasswordForm.forgotConfirmPassword.value) {
            return displayAuthMessage(forgotPasswordMessage, 'Las contraseñas no coinciden.');
        }
        try {
            const response = await fetch('/api/forgotPassword', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ forgotUsername: forgotPasswordForm.forgotUsername.value, forgotNewPassword })
            });
            const data = await response.json();
            displayAuthMessage(forgotPasswordMessage, data.message, response.ok);
            if (response.ok) setTimeout(displayLoginViewAnimated, 2500);
        } catch (error) {
            displayAuthMessage(forgotPasswordMessage, 'Error de conexión.');
        }
    });

    function displayLoginViewAnimated() {
        animateViewChange(loginView, createUserView, forgotPasswordView, mainAppContainer, adminPanel, createAdminModal);
        currentUser = null;
        localStorage.removeItem('currentUser');
    }

    async function displayMainAppAnimated(user) {
        animateViewChange(mainAppContainer, loginView, createUserView, forgotPasswordView, adminPanel);
        welcomeMessageElement.textContent = `Bienvenido/a, ${user.username}`;
        const isAdmin = user.isAdmin > 0;
        const isSuperAdmin = user.isAdmin == 2;
        showFormButton.style.display = isAdmin ? 'inline-block' : 'none';
        showAdminPanelButton.classList.toggle('hidden', !isAdmin);
        createAdminBtn.classList.toggle('hidden', !isSuperAdmin);
        await loadDynamicSelects();
        await showListViewAnimated();
    }

    // --- LÓGICA DE LA VENTANA MODAL DE ADMIN ---
    createAdminBtn.addEventListener('click', () => {
        createAdminModal.classList.remove('hidden');
    });

    cancelAdminCreation.addEventListener('click', () => {
        createAdminModal.classList.add('hidden');
        createAdminForm.reset();
        createAdminMessage.classList.add('hidden');
    });

    createAdminForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newUsername = document.getElementById('adminUsername').value;
        const newPassword = document.getElementById('adminPassword').value;
        try {
            const response = await fetch('/api/createAdminUser', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requesterUsername: currentUser.username, newUsername, newPassword })
            });
            const data = await response.json();
            displayAuthMessage(createAdminMessage, data.message, response.ok);
            if (response.ok) {
                createAdminForm.reset();
                setTimeout(() => {
                    createAdminModal.classList.add('hidden');
                    createAdminMessage.classList.add('hidden');
                }, 2000);
            }
        } catch (error) {
            displayAuthMessage(createAdminMessage, 'Error de conexión.');
        }
    });
    
    // --- LÓGICA DEL PANEL DE ADMINISTRACIÓN ---
    showAdminPanelButton.addEventListener('click', () => {
        animateViewChange(adminPanel, mainAppContainer);
        loadManagementLists();
    });

    backToAppButton.addEventListener('click', () => animateViewChange(mainAppContainer, adminPanel));

    const loadManagementList = async (endpoint, listElement, nameField, idField) => {
        listElement.innerHTML = '';
        try {
            const response = await fetch(endpoint);
            const items = await response.json();
            items.forEach(item => {
                const li = document.createElement('li');
                li.innerHTML = `<span>${item[nameField]}</span> <button class="btn-delete-item" data-id="${item[idField]}">X</button>`;
                listElement.appendChild(li);
            });
        } catch (error) {
            console.error(`Error cargando ${endpoint}:`, error);
        }
    };

    const loadManagementLists = () => {
        loadManagementList('/api/portals', portalList, 'name', 'id');
        loadManagementList('/api/countries', countryList, 'name', 'id');
        loadManagementList('/api/currencies', currencyList, 'name', 'id');
    };
    
    const handleManagementFormSubmit = async (form, endpoint, body) => {
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (response.ok) {
                form.reset();
                loadManagementLists();
                loadDynamicSelects();
            } else {
                alert('Error: El item ya podría existir.');
            }
        } catch (error) {
            alert('Error de conexión.');
        }
    };
    
    portalForm.addEventListener('submit', (e) => { e.preventDefault(); handleManagementFormSubmit(portalForm, '/api/portals', { name: document.getElementById('portalName').value }); });
    countryForm.addEventListener('submit', (e) => { e.preventDefault(); handleManagementFormSubmit(countryForm, '/api/countries', { name: document.getElementById('countryName').value }); });
    currencyForm.addEventListener('submit', (e) => { e.preventDefault(); handleManagementFormSubmit(currencyForm, '/api/currencies', { symbol: document.getElementById('currencySymbol').value, name: document.getElementById('currencyName').value }); });
    
    [portalList, countryList, currencyList].forEach(list => {
        list.addEventListener('click', async (e) => {
            if (e.target.classList.contains('btn-delete-item')) {
                const id = e.target.dataset.id;
                const endpoint = `/api/${list.id.replace('List', '')}/${id}`;
                if (confirm('¿Seguro que deseas eliminar este item?')) {
                    await fetch(endpoint, { method: 'DELETE' });
                    loadManagementLists();
                    loadDynamicSelects();
                }
            }
        });
    });

    // --- LÓGICA DE DATOS Y TABLA ---
    async function populateSelect(endpoint, selectElementId, valueField, textField) {
        const select = document.getElementById(selectElementId);
        const currentValue = select.value;
        const firstOption = select.options[0] ? select.options[0].outerHTML : '';
        select.innerHTML = firstOption;
        const response = await fetch(endpoint);
        const items = await response.json();
        items.forEach(item => {
            select.innerHTML += `<option value="${item[valueField]}">${item[textField] || item[valueField]}</option>`;
        });
        select.value = currentValue;
    }

    async function loadDynamicSelects() {
        await Promise.all([
            populateSelect('/api/portals', 'portal', 'name', 'name'),
            populateSelect('/api/portals', 'filterPortal', 'name', 'name'),
            populateSelect('/api/countries', 'pais', 'name', 'name'),
            populateSelect('/api/countries', 'filterPais', 'name', 'name'),
            populateSelect('/api/currencies', 'currencySymbol', 'symbol', 'symbol'),
        ]);
    }

    async function loadOpportunities() {
        try {
            const response = await fetch('/api/opportunities');
            const data = await response.json();
            opportunities = data.opportunities;
        } catch (error) {
            console.error('Error al cargar oportunidades:', error);
            opportunities = [];
        }
    }
    
    // --- FUNCIÓN DE FILTROS Y ORDENAMIENTO (CORREGIDA) ---
    async function applyFiltersAndRenderTable() {
        await loadOpportunities();
    
        // Obtener valores de los filtros
        const idFilter = document.getElementById('filterIdOportunidad').value.toLowerCase();
        const portalFilter = document.getElementById('filterPortal').value;
        const paisFilter = document.getElementById('filterPais').value;
        const clienteFilter = document.getElementById('filterCliente').value.toLowerCase();
        const estatusFilter = document.getElementById('filterEstatus').value;
        const comercialFilter = document.getElementById('filterComercial').value;
        const priorityFilter = document.getElementById('priorityFilter').value;
        const sortFilter = document.getElementById('sortFilter').value;
    
        // Aplicar filtros
        let filteredData = opportunities.filter(op => {
            if (idFilter && !op.idOportunidad.toLowerCase().includes(idFilter)) return false;
            if (portalFilter && op.portal !== portalFilter) return false;
            if (paisFilter && op.pais !== paisFilter) return false;
            if (clienteFilter && !op.cliente.toLowerCase().includes(clienteFilter)) return false;
            if (estatusFilter && op.estatus !== estatusFilter) return false;
            if (comercialFilter && op.comercial !== comercialFilter) return false;
    
            if (priorityFilter === 'expiring_soon') {
                const diasRestantes = calcularDiasRestantes(op.fechaExpira);
                return typeof diasRestantes === 'number' && diasRestantes >= 0 && diasRestantes <= EXPIRATION_ALERT_DAYS;
            }
            return true;
        });
    
        // Aplicar ordenamiento
        switch (sortFilter) {
            case 'newest':
                filteredData.sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion));
                break;
            case 'oldest':
                filteredData.sort((a, b) => new Date(a.fechaCreacion) - new Date(b.fechaCreacion));
                break;
            case 'expiring_soon':
                filteredData.sort((a, b) => {
                    const diasA = calcularDiasRestantes(a.fechaExpira);
                    const diasB = calcularDiasRestantes(b.fechaExpira);
                    const valA = (typeof diasA === 'number' && diasA >= 0) ? diasA : Infinity;
                    const valB = (typeof diasB === 'number' && diasB >= 0) ? diasB : Infinity;
                    return valA - valB;
                });
                break;
        }
    
        renderTable(filteredData);
    }
    
    function renderTable(opportunitiesToDisplay) {
        opportunitiesTableBody.innerHTML = '';
        if (currentUser) {
            document.getElementById('actionsHeader').style.display = currentUser.isAdmin > 0 ? '' : 'none';
        }
        opportunitiesToDisplay.forEach(op => {
            const row = opportunitiesTableBody.insertRow();
            const diasRestantes = calcularDiasRestantes(op.fechaExpira);
            let rowClass = '', diasRestantesDisplay = diasRestantes, diasRestantesCellClass = '';
            if (typeof diasRestantes === 'number') {
                if (diasRestantes < 0) {
                    [rowClass, diasRestantesCellClass, diasRestantesDisplay] = ['expired', 'expired-text', 'Vencida'];
                } else if (diasRestantes <= EXPIRATION_ALERT_DAYS) {
                    [rowClass, diasRestantesCellClass] = ['expiring-soon', 'expiring-soon-text'];
                    diasRestantesDisplay = `${diasRestantes} día(s)`;
                } else {
                    diasRestantesDisplay = `${diasRestantes} día(s)`;
                }
            } else {
                diasRestantesDisplay = 'N/A';
            }
            if (rowClass) row.classList.add(rowClass);
            const actionsCell = currentUser && currentUser.isAdmin > 0 ? `<td><button class="btn btn-edit" onclick="editOpportunityAnimated(${op.internalId})">Editar</button><button class="btn btn-delete" onclick="deleteOpportunity(${op.internalId})">Eliminar</button></td>` : '<td></td>';
            row.innerHTML = `
                <td>${op.idOportunidad}</td><td>${op.productos || 'N/A'}</td><td>${op.descripcion || 'N/A'}</td><td>${op.portal}</td><td>${op.pais}</td><td>${op.cliente}</td>
                <td>${op.fechaCreacion ? new Date(op.fechaCreacion + 'T00:00:00').toLocaleDateString() : 'N/A'}</td>
                <td>${op.fechaExpira ? new Date(op.fechaExpira + 'T00:00:00').toLocaleDateString() : 'N/A'}</td>
                <td>${op.currencySymbol || '$'} ${op.montoAproximado?.toFixed(2) || 'N/A'}</td>
                <td class="${diasRestantesCellClass}">${diasRestantesDisplay}</td>
                <td>${op.estatus}</td><td>${op.comercial}</td>${actionsCell}`;
        });
    }

    window.showListViewAnimated = async () => {
        animateViewChange(listView, formView);
        await applyFiltersAndRenderTable();
    };

    window.showFormViewAnimated = (opToEdit = null) => {
        if (!currentUser || currentUser.isAdmin === 0) return alert("Acceso denegado.");
        animateViewChange(formView, listView);
        opportunityForm.reset();
        document.getElementById('idOportunidad').readOnly = false;
        if (opToEdit) {
            formTitle.textContent = 'Editar Oportunidad';
            Object.keys(opToEdit).forEach(key => {
                const el = document.getElementById(key);
                if (el) el.value = opToEdit[key];
            });
            document.getElementById('opportunityInternalId').value = opToEdit.internalId;
            document.getElementById('idOportunidad').readOnly = true;
        } else {
            formTitle.textContent = 'Registrar Nueva Oportunidad';
            document.getElementById('opportunityInternalId').value = '';
            document.getElementById('fechaCreacion').valueAsDate = new Date();
        }
        toggleDellCiscoFields();
    };
    
    // Hacemos estas funciones globales para que los botones en el HTML puedan llamarlas
    window.editOpportunityAnimated = (id) => {
        const op = opportunities.find(op => op.internalId === id);
        if (op) showFormViewAnimated(op);
    };

    window.deleteOpportunity = async (id) => {
        if (!currentUser || currentUser.isAdmin === 0) return;
        const op = opportunities.find(op => op.internalId === id);
        if (op && confirm(`¿Eliminar la oportunidad ${op.idOportunidad}?`)) {
            await fetch(`/api/opportunities/${id}`, { method: 'DELETE' });
            await applyFiltersAndRenderTable();
        }
    };

    opportunityForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = {
            ...Object.fromEntries(new FormData(opportunityForm)),
            montoAproximado: parseFloat(document.getElementById('montoAproximado').value),
            currencySymbol: document.getElementById('currencySymbol').value,
            opportunityInternalId: document.getElementById('opportunityInternalId').value
        };
        const internalId = formData.opportunityInternalId;
        const url = internalId ? `/api/opportunities/${internalId}` : '/api/opportunities';
        const method = internalId ? 'PUT' : 'POST';
        try {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message);
            }
            alert('Oportunidad guardada.');
            await showListViewAnimated();
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    });

    // --- EVENTOS Y FUNCIONES VARIAS ---
    function displayAuthMessage(element, message, isSuccess = false) { element.textContent = message; element.className = `auth-message ${isSuccess ? 'success' : 'error'}`; }
    function calcularDiasRestantes(fechaExpiraStr) { if (!fechaExpiraStr) return 'N/A'; const hoy = new Date(); hoy.setHours(0, 0, 0, 0); const fechaExpira = new Date(fechaExpiraStr + 'T00:00:00'); if (isNaN(fechaExpira.getTime())) return 'Fecha Inválida'; return Math.ceil((fechaExpira - hoy) / (1000 * 60 * 60 * 24)); }
    function toggleDellCiscoFields() { const selected = portalSelect.value; dellCiscoFields.classList.toggle('hidden', selected !== 'DELL' && selected !== 'Cisco'); }
    portalSelect.addEventListener('change', toggleDellCiscoFields);
    logoutButton.addEventListener('click', displayLoginViewAnimated);
    showCreateUserLink.addEventListener('click', () => animateViewChange(createUserView, loginView));
    showLoginLink.addEventListener('click', () => animateViewChange(loginView, createUserView));
    showForgotPasswordLink.addEventListener('click', () => animateViewChange(forgotPasswordView, loginView));
    backToLoginLink.addEventListener('click', () => animateViewChange(loginView, forgotPasswordView));
    showFormButton.addEventListener('click', () => showFormViewAnimated());
    filterInputs.forEach(input => {
        input.addEventListener('input', applyFiltersAndRenderTable);
        input.addEventListener('change', applyFiltersAndRenderTable);
    });
    clearFiltersButton.addEventListener('click', () => {
        filterInputs.forEach(input => {
            if(input.tagName === "SELECT") {
                input.selectedIndex = 0;
            } else {
                input.value = '';
            }
        });
        applyFiltersAndRenderTable();
    });

    // --- INICIALIZACIÓN ---
    async function init() {
        const persistedUser = JSON.parse(localStorage.getItem('currentUser'));
        if (persistedUser?.username) {
            currentUser = persistedUser;
            await displayMainAppAnimated(currentUser);
        } else {
            displayLoginViewAnimated();
        }
    }

    init();
});