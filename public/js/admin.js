const loginSection = document.getElementById('loginSection');
const dashboardSection = document.getElementById('dashboardSection');
const logoutBtn = document.getElementById('logoutBtn');
const loginBtn = document.getElementById('loginBtn');
const passwordInput = document.getElementById('passwordInput');
const loginError = document.getElementById('loginError');
const parcelsBody = document.getElementById('parcelsTableBody');
const newParcelBtn = document.getElementById('newParcelBtn');
const newParcelForm = document.getElementById('newParcelForm');
const senderInput = document.getElementById('senderInput');
const receiverInput = document.getElementById('receiverInput');
const createParcelBtn = document.getElementById('createParcelBtn');
const cancelNewBtn = document.getElementById('cancelNewBtn');
const createError = document.getElementById('createError');
const dashboardLoader = document.getElementById('dashboardLoader');

let isAdmin = false;

async function checkAuth() {
  try {
    const res = await fetch('/api/admin/check');
    const data = await res.json();
    isAdmin = data.isAdmin;
    updateUI();
  } catch (error) {
    console.error('Auth check failed', error);
  }
}

function updateUI() {
  if (isAdmin) {
    loginSection.classList.add('hidden');
    dashboardSection.classList.remove('hidden');
    logoutBtn.style.display = 'inline-block';
    loadParcels();
  } else {
    loginSection.classList.remove('hidden');
    dashboardSection.classList.add('hidden');
    logoutBtn.style.display = 'none';
  }
}

async function loadParcels() {
  dashboardLoader.classList.remove('hidden');
  try {
    const res = await fetch('/api/admin/parcels');
    if (!res.ok) throw new Error('Failed to fetch parcels');
    const parcels = await res.json();
    renderParcelsTable(parcels);
  } catch (error) {
    alert('Error loading parcels: ' + error.message);
  } finally {
    dashboardLoader.classList.add('hidden');
  }
}

function renderParcelsTable(parcels) {
  if (parcels.length === 0) {
    parcelsBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:2rem;">No parcels yet. Create one!</td></tr>';
    return;
  }

  parcelsBody.innerHTML = parcels.map(p => `
    <tr>
      <td><code>${p.tracking_number}</code></td>
      <td>${p.sender}</td>
      <td>${p.receiver}</td>
      <td>
        <select class="status-select" data-id="${p.id}" style="padding:0.3rem; border-radius:20px;">
          <option value="Pending" ${p.status === 'Pending' ? 'selected' : ''}>Pending</option>
          <option value="In Transit" ${p.status === 'In Transit' ? 'selected' : ''}>In Transit</option>
          <option value="Delivered" ${p.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
        </select>
      </td>
      <td>${new Date(p.created_at).toLocaleDateString()}</td>
      <td class="action-buttons">
        <button class="btn-small btn-secondary update-location-btn" data-id="${p.id}">📍 Update</button>
        <button class="btn-small btn-secondary delete-btn" data-id="${p.id}" style="color:var(--dhl-red);">Delete</button>
      </td>
    </tr>
  `).join('');

  // Status change handlers
  document.querySelectorAll('.status-select').forEach(select => {
    select.addEventListener('change', async (e) => {
      const id = select.dataset.id;
      const newStatus = select.value;
      const location = prompt('Enter location (optional):');
      await updateParcelStatus(id, newStatus, location);
    });
  });

  document.querySelectorAll('.update-location-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const currentStatus = document.querySelector(`.status-select[data-id="${id}"]`).value;
      const location = prompt('Enter location update:');
      if (location) await updateParcelStatus(id, currentStatus, location);
    });
  });

  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this parcel?')) return;
      await deleteParcel(btn.dataset.id);
    });
  });
}

async function updateParcelStatus(id, status, location) {
  try {
    const res = await fetch(`/api/admin/parcels/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, location: location || undefined })
    });
    if (!res.ok) throw new Error('Update failed');
    loadParcels();
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

async function deleteParcel(id) {
  try {
    const res = await fetch(`/api/admin/parcels/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Delete failed');
    loadParcels();
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

async function createParcel() {
  const sender = senderInput.value.trim();
  const receiver = receiverInput.value.trim();
  if (!sender || !receiver) {
    createError.textContent = 'Sender and receiver required';
    createError.classList.remove('hidden');
    return;
  }

  try {
    const res = await fetch('/api/admin/parcels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sender, receiver })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Creation failed');

    alert(`✅ Parcel created!\nTracking number: ${data.trackingNumber}`);
    newParcelForm.classList.add('hidden');
    senderInput.value = '';
    receiverInput.value = '';
    loadParcels();
  } catch (error) {
    createError.textContent = error.message;
    createError.classList.remove('hidden');
  }
}

async function login() {
  const password = passwordInput.value;
  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    isAdmin = true;
    updateUI();
    passwordInput.value = '';
  } catch (error) {
    loginError.textContent = error.message;
    loginError.classList.remove('hidden');
  }
}

async function logout() {
  await fetch('/api/admin/logout', { method: 'POST' });
  isAdmin = false;
  updateUI();
}

// Event listeners
loginBtn.addEventListener('click', login);
passwordInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') login(); });
logoutBtn.addEventListener('click', logout);
newParcelBtn.addEventListener('click', () => newParcelForm.classList.remove('hidden'));
cancelNewBtn.addEventListener('click', () => {
  newParcelForm.classList.add('hidden');
  createError.classList.add('hidden');
});
createParcelBtn.addEventListener('click', createParcel);

// Initialize
checkAuth();
