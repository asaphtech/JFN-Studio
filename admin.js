// Admin State Management
let adminState = {
  description: '',
  goals: '',
  news: []
};

// DOM Elements
const authLoading = document.getElementById('auth-loading');
const adminDashboard = document.getElementById('admin-dashboard');
const logoutBtn = document.getElementById('logout-btn');

// Profile Info Form Elements
const jfnDescInput = document.getElementById('jfn-description-input');
const jfnGoalsInput = document.getElementById('jfn-goals-input');
const saveInfoBtn = document.getElementById('save-info-btn');

// Local Supabase Override Elements
const localUrlInput = document.getElementById('local-supabase-url');
const localKeyInput = document.getElementById('local-supabase-key');
const saveLocalConfigBtn = document.getElementById('save-local-config-btn');
const dbStatus = document.getElementById('db-status');
const dbStatusText = document.getElementById('db-status-text');

// News Form Elements
const newsIdInput = document.getElementById('news-id-input');
const newsTitleInput = document.getElementById('news-title-input');
const newsCategoryInput = document.getElementById('news-category-input');
const newsDateInput = document.getElementById('news-date-input');
const newsContentInput = document.getElementById('news-content-input');
const saveNewsBtn = document.getElementById('save-news-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const newsFormTitle = document.getElementById('news-form-title');
const formIcon = document.getElementById('form-icon');
const newsListManager = document.getElementById('news-list-manager');

// ==========================================================================
// 1. SUPABASE CLIENT & AUTH GUARD
// ==========================================================================

const hasConfig = typeof SUPABASE_URL !== 'undefined' && SUPABASE_URL !== 'https://xuuhgyclvlyywvxtbinp.supabase.co' && SUPABASE_URL.trim() !== '';
let supabaseUrl = hasConfig ? SUPABASE_URL : localStorage.getItem('jfn_supabase_url');
let supabaseAnonKey = hasConfig ? SUPABASE_ANON_KEY : localStorage.getItem('jfn_supabase_anon_key');

let supabaseClient = null;
let useLocalDemoMode = false;

// Attempt initializing Supabase Client
if (typeof supabaseJs !== 'undefined' && supabaseUrl && supabaseAnonKey) {
  try {
    supabaseClient = supabaseJs.createClient(supabaseUrl, supabaseAnonKey);
  } catch (err) {
    console.error('Gagal memuat client Supabase:', err);
  }
}

// Redirect Guard Function
async function checkAuthAndInit() {
  // Populate credential inputs if stored locally
  if (localStorage.getItem('jfn_supabase_url')) {
    localUrlInput.value = localStorage.getItem('jfn_supabase_url');
  }
  if (localStorage.getItem('jfn_supabase_anon_key')) {
    localKeyInput.value = localStorage.getItem('jfn_supabase_anon_key');
  }

  if (!supabaseClient) {
    // No Supabase, run in LOCAL DEMO MODE so user can test the interface
    useLocalDemoMode = true;
    setDatabaseStatus(false, 'Local Demo Mode (Kredensial Kosong)');
    initLocalDemoData();
    showDashboard();
    return;
  }

  setDatabaseStatus(false, 'Menghubungkan...');

  try {
    // Check user session
    const { data, error } = await supabaseClient.auth.getSession();

    if (error) throw error;

    if (data?.session) {
      // User is authenticated
      setDatabaseStatus(true, 'Cloud Database Terhubung');
      showDashboard();
      await fetchAdminData();
    } else {
      // Not logged in, redirect to login page
      window.location.href = 'login.html';
    }
  } catch (err) {
    console.error('Pemeriksaan autentikasi gagal. Mengaktifkan Mode Demo Lokal.', err);
    useLocalDemoMode = true;
    setDatabaseStatus(false, 'Offline (Gagal Hubung)');
    initLocalDemoData();
    showDashboard();
  }
}

function showDashboard() {
  authLoading.style.display = 'none';
  adminDashboard.style.display = 'grid';
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

function setDatabaseStatus(connected, text) {
  dbStatusText.textContent = text;
  if (connected) {
    dbStatus.className = 'status-value online';
  } else {
    dbStatus.className = 'status-value offline';
  }
}

// ==========================================================================
// 2. DATA UTILITIES (SUPABASE VS DEMO MODE)
// ==========================================================================

async function fetchAdminData() {
  if (useLocalDemoMode) {
    return; // Already populated from localStorage
  }

  try {
    const [descRes, goalsRes, newsRes] = await Promise.all([
      supabaseClient.from('jfn_settings').select('value').eq('key', 'description').single(),
      supabaseClient.from('jfn_settings').select('value').eq('key', 'goals').single(),
      supabaseClient.from('jfn_news').select('*')
    ]);

    if (descRes.error && descRes.error.code !== 'PGRST116') throw descRes.error;
    if (goalsRes.error && goalsRes.error.code !== 'PGRST116') throw goalsRes.error;
    if (newsRes.error) throw newsRes.error;

    adminState.description = descRes.data ? descRes.data.value : '';
    adminState.goals = goalsRes.data ? goalsRes.data.value : '';
    adminState.news = newsRes.data || [];

    // Populate profile form inputs
    jfnDescInput.value = adminState.description;
    jfnGoalsInput.value = adminState.goals;

    renderNewsListManager();
  } catch (err) {
    console.error('Gagal mengambil data dari Supabase:', err);
    alert('Terjadi kesalahan saat memuat data dari cloud database.');
  }
}

// Local Demo Mode Setup (using localStorage for backup testing)
function initLocalDemoData() {
  const localDesc = localStorage.getItem('demo_desc') || 'JFN Studio adalah pusat integrasi dari berbagai inovasi proyek website yang dikembangkan secara mandiri.';
  const localGoals = localStorage.getItem('demo_goals') || 'Membangun jaringan aplikasi web terpadu yang mempermudah manajemen data.';
  const localNews = localStorage.getItem('demo_news');

  adminState.description = localDesc;
  adminState.goals = localGoals;

  if (localNews) {
    adminState.news = JSON.parse(localNews);
  } else {
    adminState.news = [
      {
        id: 'news-demo-1',
        title: 'Contoh Berita Mading (Demo Mode)',
        category: 'Pengumuman',
        date: '2026-06-20',
        content: 'Saat ini admin berjalan dalam mode demo karena Supabase belum dihubungkan. Data akan tersimpan di browser Anda.'
      }
    ];
    localStorage.setItem('demo_news', JSON.stringify(adminState.news));
  }

  jfnDescInput.value = adminState.description;
  jfnGoalsInput.value = adminState.goals;

  renderNewsListManager();
}

// ==========================================================================
// 3. CMS INFO JFN (ABOUT & GOALS)
// ==========================================================================

saveInfoBtn.addEventListener('click', async () => {
  const description = jfnDescInput.value.trim();
  const goals = jfnGoalsInput.value.trim();

  if (!description || !goals) {
    alert('Harap isi semua kolom informasi JFN Studio!');
    return;
  }

  if (useLocalDemoMode) {
    // Save to local localStorage fallback
    adminState.description = description;
    adminState.goals = goals;
    localStorage.setItem('demo_desc', description);
    localStorage.setItem('demo_goals', goals);
    showSuccessFeedback(saveInfoBtn, 'Tersimpan Lokal!');
    return;
  }

  // Save to Supabase (Upsert values)
  saveInfoBtn.disabled = true;
  saveInfoBtn.innerHTML = `<i class="loading-spinner" style="width:14px;height:14px;margin-bottom:0;margin-right:5px;display:inline-block;"></i> Menyimpan...`;

  try {
    const { error: descErr } = await supabaseClient.from('jfn_settings').upsert({ key: 'description', value: description });
    const { error: goalsErr } = await supabaseClient.from('jfn_settings').upsert({ key: 'goals', value: goals });

    if (descErr) throw descErr;
    if (goalsErr) throw goalsErr;

    adminState.description = description;
    adminState.goals = goals;

    showSuccessFeedback(saveInfoBtn, 'Tersimpan di Cloud!');
  } catch (err) {
    console.error('Gagal memperbarui pengaturan di Supabase:', err);
    alert('Gagal menyimpan info ke database Supabase.');
    saveInfoBtn.disabled = false;
    saveInfoBtn.innerHTML = `<i data-lucide="save"></i> Simpan Info JFN`;
    lucide.createIcons();
  }
});

// ==========================================================================
// 4. CMS NEWS MANAGEMENT (CRUD)
// ==========================================================================

function renderNewsListManager() {
  newsListManager.innerHTML = '';

  if (adminState.news.length === 0) {
    newsListManager.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85rem; text-align: center; padding: 1.5rem;">Belum ada berita mading.</p>`;
    return;
  }

  // Sort: Newest news first
  const sortedNews = [...adminState.news].sort((a, b) => new Date(b.date) - new Date(a.date));

  sortedNews.forEach(item => {
    const itemEl = document.createElement('div');
    itemEl.className = 'news-manage-item';
    itemEl.innerHTML = `
      <div class="item-left">
        <div class="item-title-row">
          <span class="item-badge" data-cat="${item.category}">${item.category}</span>
          <span class="item-title">${escapeHtml(item.title)}</span>
        </div>
        <span class="item-date">${formatDateIndo(item.date)}</span>
      </div>
      <div class="item-actions">
        <button class="btn-mini edit" title="Edit Berita" onclick="editNewsCard('${item.id}')">
          <i data-lucide="edit-2"></i>
        </button>
        <button class="btn-mini delete" title="Hapus Berita" onclick="deleteNewsCard('${item.id}')">
          <i data-lucide="trash-2"></i>
        </button>
      </div>
    `;
    newsListManager.appendChild(itemEl);
  });

  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

// Reset Form fields
function resetNewsForm() {
  newsIdInput.value = '';
  newsTitleInput.value = '';
  newsCategoryInput.value = 'Pengumuman';
  newsContentInput.value = '';

  // Set default news date input to today
  const today = new Date();
  const offset = today.getTimezoneOffset();
  const localToday = new Date(today.getTime() - (offset * 60 * 1000));
  newsDateInput.value = localToday.toISOString().split('T')[0];

  newsFormTitle.textContent = "Tambah Berita Baru";
  formIcon.setAttribute('data-lucide', 'plus-circle');
  saveNewsBtn.innerHTML = `<i data-lucide="plus"></i> Tambah Berita`;
  cancelEditBtn.style.display = 'none';

  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

cancelEditBtn.addEventListener('click', (e) => {
  e.preventDefault();
  resetNewsForm();
});

// Create or Update Action
saveNewsBtn.addEventListener('click', async (e) => {
  e.preventDefault();

  const id = newsIdInput.value;
  const title = newsTitleInput.value.trim();
  const category = newsCategoryInput.value;
  const date = newsDateInput.value;
  const content = newsContentInput.value.trim();

  if (!title || !date || !content) {
    alert('Harap lengkapi seluruh kolom formulir berita!');
    return;
  }

  const payload = { title, category, date, content };

  if (useLocalDemoMode) {
    if (id) {
      // Edit in Demo Mode
      const index = adminState.news.findIndex(n => n.id === id);
      if (index !== -1) {
        adminState.news[index] = { id, ...payload };
      }
    } else {
      // Add in Demo Mode
      const newId = 'demo-' + Date.now();
      adminState.news.push({ id: newId, ...payload });
    }

    localStorage.setItem('demo_news', JSON.stringify(adminState.news));
    resetNewsForm();
    renderNewsListManager();
    return;
  }

  // Cloud Mode: Supabase DB Insert/Update
  saveNewsBtn.disabled = true;
  saveNewsBtn.innerHTML = `Menyimpan...`;

  try {
    if (id) {
      // Update
      const { error } = await supabaseClient.from('jfn_news').update(payload).eq('id', id);
      if (error) throw error;
    } else {
      // Insert (id generated by DB uuid default)
      const { error } = await supabaseClient.from('jfn_news').insert([payload]);
      if (error) throw error;
    }

    resetNewsForm();
    await fetchAdminData();
  } catch (err) {
    console.error('Gagal mengunggah berita ke Supabase:', err);
    alert('Gagal mengunggah data ke database. Silakan periksa RLS policies di tabel Supabase.');
    saveNewsBtn.disabled = false;
    saveNewsBtn.innerHTML = id ? 'Perbarui Berita' : 'Tambah Berita';
  }
});

// Edit card trigger (attached to window scope)
window.editNewsCard = function (id) {
  const item = adminState.news.find(n => n.id === id);
  if (!item) return;

  newsIdInput.value = item.id;
  newsTitleInput.value = item.title;
  newsCategoryInput.value = item.category;
  newsDateInput.value = item.date;
  newsContentInput.value = item.content;

  newsFormTitle.textContent = "Edit Berita";
  formIcon.setAttribute('data-lucide', 'edit-3');
  saveNewsBtn.innerHTML = `<i data-lucide="save"></i> Perbarui Berita`;
  cancelEditBtn.style.display = 'inline-flex';

  // Scroll to form smoothly
  newsFormTitle.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
};

// Delete card trigger
window.deleteNewsCard = async function (id) {
  if (!confirm('Apakah Anda yakin ingin menghapus berita ini?')) return;

  if (useLocalDemoMode) {
    adminState.news = adminState.news.filter(n => n.id !== id);
    localStorage.setItem('demo_news', JSON.stringify(adminState.news));

    if (newsIdInput.value === id) resetNewsForm();
    renderNewsListManager();
    return;
  }

  // Cloud delete
  try {
    const { error } = await supabaseClient.from('jfn_news').delete().eq('id', id);
    if (error) throw error;

    if (newsIdInput.value === id) resetNewsForm();
    await fetchAdminData();
  } catch (err) {
    console.error('Gagal menghapus berita di Supabase:', err);
    alert('Gagal menghapus berita dari database.');
  }
};

// ==========================================================================
// 5. LOCAL CREDENTIAL OVERRIDES (STORED IN LOCALSTORAGE)
// ==========================================================================

saveLocalConfigBtn.addEventListener('click', () => {
  const urlVal = localUrlInput.value.trim();
  const keyVal = localKeyInput.value.trim();

  if (urlVal === '' || keyVal === '') {
    // Clear local override to use config.js default values
    localStorage.removeItem('jfn_supabase_url');
    localStorage.removeItem('jfn_supabase_anon_key');
    alert('Konfigurasi lokal dibersihkan. Sistem akan menggunakan nilai di config.js.');
  } else {
    // Set local override
    localStorage.setItem('jfn_supabase_url', urlVal);
    localStorage.setItem('jfn_supabase_anon_key', keyVal);
    alert('Kredensial disimpan secara lokal. Muat ulang halaman (refresh) untuk menghubungkan kembali!');
  }

  window.location.reload();
});

// ==========================================================================
// 6. LOGOUT ACTION
// ==========================================================================

logoutBtn.addEventListener('click', async () => {
  if (useLocalDemoMode) {
    window.location.href = 'login.html';
    return;
  }

  try {
    const { error } = await supabaseClient.auth.signOut();
    if (error) throw error;
    window.location.href = 'login.html';
  } catch (err) {
    console.error('Gagal logout:', err);
    // Force redirect anyway
    window.location.href = 'login.html';
  }
});

// ==========================================================================
// HELPERS
// ==========================================================================

function showSuccessFeedback(btnElement, text) {
  const originalHtml = btnElement.innerHTML;
  btnElement.disabled = true;
  btnElement.innerHTML = `<i data-lucide="check"></i> ${text}`;
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }

  setTimeout(() => {
    btnElement.innerHTML = originalHtml;
    btnElement.disabled = false;
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }, 1500);
}

function escapeHtml(unsafe) {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDateIndo(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date)) return dateString;
  const options = { day: 'numeric', month: 'short', year: 'numeric' };
  return date.toLocaleDateString('id-ID', options);
}

// ==========================================================================
// INITIALIZATION
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  resetNewsForm();
  checkAuthAndInit();
});
