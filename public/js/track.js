const trackingInput = document.getElementById('trackingInput');
const trackBtn = document.getElementById('trackBtn');
const loader = document.getElementById('loader');
const errorDiv = document.getElementById('errorMessage');
const resultContainer = document.getElementById('resultContainer');

function formatDate(dateString) {
  const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(dateString).toLocaleDateString(undefined, options);
}

function renderResult(data) {
  const { parcel, updates } = data;
  const statusClass = `status-${parcel.status.replace(' ', '')}`;

  let updatesHtml = '';
  if (updates && updates.length > 0) {
    updatesHtml = updates.map(u => `
      <div class="update-item">
        <div class="update-time">${formatDate(u.timestamp)}</div>
        <div class="update-desc">
          ${u.status}
          ${u.location ? `<div class="update-location">📍 ${u.location}</div>` : ''}
        </div>
      </div>
    `).join('');
  } else {
    updatesHtml = '<p>No updates yet.</p>';
  }

  const html = `
    <div class="result-header">
      <span class="tracking-number">${parcel.tracking_number}</span>
      <span class="status-badge ${statusClass}">${parcel.status}</span>
    </div>
    <div class="detail-grid">
      <div class="detail-item"><h4>Sender</h4><p>${parcel.sender}</p></div>
      <div class="detail-item"><h4>Receiver</h4><p>${parcel.receiver}</p></div>
      <div class="detail-item"><h4>Created</h4><p>${formatDate(parcel.created_at)}</p></div>
      <div class="detail-item"><h4>Last Update</h4><p>${formatDate(parcel.updated_at)}</p></div>
    </div>
    <div class="updates-timeline">
      <h3>Tracking History</h3>
      ${updatesHtml}
    </div>
  `;

  resultContainer.innerHTML = html;
  resultContainer.classList.remove('hidden');
}

async function trackParcel() {
  const trackingNumber = trackingInput.value.trim();
  if (!trackingNumber) {
    showError('Please enter a tracking number');
    return;
  }

  loader.classList.remove('hidden');
  errorDiv.classList.add('hidden');
  resultContainer.classList.add('hidden');

  try {
    const response = await fetch(`/api/track/${encodeURIComponent(trackingNumber)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Tracking failed');
    renderResult(data);
  } catch (error) {
    showError(error.message);
  } finally {
    loader.classList.add('hidden');
  }
}

function showError(message) {
  errorDiv.textContent = message;
  errorDiv.classList.remove('hidden');
}

trackBtn.addEventListener('click', trackParcel);
trackingInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') trackParcel();
});
