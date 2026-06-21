// Public Client State
let appState = {
  description: '',
  goals: '',
  news: []
};

// Filter and Search states
let activeCategory = 'all';
let searchQuery = '';

// DOM Elements
const jfnDescDisplay = document.getElementById('jfn-description-display');
const jfnGoalsDisplay = document.getElementById('jfn-goals-display');
const madingGrid = document.getElementById('mading-grid');
const madingCount = document.getElementById('mading-count');
const dbStatusDot = document.getElementById('db-status-dot');
const dbStatusText = document.getElementById('db-status-text');
const footerInfo = document.querySelector('.footer-info');

// Search & Filter Inputs
const searchInput = document.getElementById('mading-search');
const filterBtns = document.querySelectorAll('.filter-btn');

// ==========================================================================
// 1. SUPABASE CLIENT INITIALIZATION
// ==========================================================================

// Check if credentials exist in config.js or in local storage
const hasConfig = typeof SUPABASE_URL !== 'undefined' && SUPABASE_URL !== 'https://xuuhgyclvlyywvxtbinp.supabase.co' && SUPABASE_URL.trim() !== '';
const supabaseUrl = hasConfig ? SUPABASE_URL : localStorage.getItem('jfn_supabase_url');
const supabaseAnonKey = hasConfig ? SUPABASE_ANON_KEY : localStorage.getItem('jfn_supabase_anon_key');

let supabaseClient = null;
let isDbConnected = false;

if (typeof supabaseJs !== 'undefined' && supabaseUrl && supabaseAnonKey) {
  try {
    supabaseClient = supabaseJs.createClient(supabaseUrl, supabaseAnonKey);
  } catch (err) {
    console.error('Gagal menginisialisasi klien Supabase:', err);
  }
} else if (supabaseUrl && supabaseAnonKey) {
  console.warn('SDK Supabase (supabaseJs) tidak terdeteksi. Berjalan tanpa koneksi Supabase.');
}

// Fallback Offline Data (If Supabase is not connected or configured)
const fallbackNews = [
  {
    id: 'fallback-1',
    title: 'Peluncuran JFN Studio Hub (Tahap Konten Lokal)',
    category: 'Rilis',
    date: '2026-06-20',
    content: 'Selamat Datang! Supabase belum dikonfigurasi di file config.js atau di Local Storage Anda.\n\nSitus saat ini berjalan menggunakan data cadangan lokal. Silakan buka file supabase_setup.sql di folder proyek, buat tabel di Supabase Anda, lalu masukkan URL dan Anon Key Anda di file config.js (atau di halaman Admin) untuk mengaktifkan koneksi database awan!'
  },
  {
    id: 'fallback-2',
    title: 'Cara Mengakses Portal Admin',
    category: 'Pengumuman',
    date: '2026-06-20',
    content: 'Untuk mengelola konten Hub (mengedit deskripsi ini dan menambah berita baru), buka Portal Admin dengan mengeklik ikon tameng "Portal Admin" di bagian kanan bawah footer halaman ini.\n\nJika menggunakan Supabase, Anda dapat mendaftarkan email admin di tab Authentication Supabase Anda untuk masuk ke sistem.'
  }
];

const fallbackDesc = "JFN Studio adalah pusat integrasi dari berbagai inovasi proyek website yang dikembangkan secara mandiri. Kami merancang solusi digital dengan visual modern dan fungsionalitas mutakhir untuk memaksimalkan efisiensi dan pengalaman pengguna.";
const fallbackGoals = "Membangun jaringan aplikasi web terpadu yang mempermudah manajemen data, menyajikan portofolio kreatif, serta mengoptimalkan produktivitas operasional melalui inovasi berkelanjutan.";

// ==========================================================================
// 2. DATA UTILITIES
// ==========================================================================

async function loadDataFromSupabase() {
  if (!supabaseClient) {
    // No Supabase, use fallback (read from demo localStorage if exists, otherwise fallback)
    setDatabaseStatus(false, 'Offline (Belum Dikonfigurasi)');
    appState.description = localStorage.getItem('demo_desc') || fallbackDesc;
    appState.goals = localStorage.getItem('demo_goals') || fallbackGoals;

    const localNews = localStorage.getItem('demo_news');
    appState.news = localNews ? JSON.parse(localNews) : fallbackNews;

    renderHome();
    return;
  }

  setDatabaseStatus(false, 'Menghubungkan...');

  try {
    // 1. Fetch settings (parallel requests)
    const [descRes, goalsRes, newsRes] = await Promise.all([
      supabaseClient.from('jfn_settings').select('value').eq('key', 'description').single(),
      supabaseClient.from('jfn_settings').select('value').eq('key', 'goals').single(),
      supabaseClient.from('jfn_news').select('*')
    ]);

    // Check error code or database response
    if (descRes.error && descRes.error.code !== 'PGRST116') throw descRes.error;
    if (goalsRes.error && goalsRes.error.code !== 'PGRST116') throw goalsRes.error;
    if (newsRes.error) throw newsRes.error;

    // Apply values
    appState.description = descRes.data ? descRes.data.value : fallbackDesc;
    appState.goals = goalsRes.data ? goalsRes.data.value : fallbackGoals;
    appState.news = newsRes.data || [];

    setDatabaseStatus(true, 'Cloud Database Terhubung');
  } catch (err) {
    console.error('Koneksi database bermasalah. Menggunakan data fallback lokal. Detail:', err);
    setDatabaseStatus(false, 'Offline (Koneksi Gagal)');

    // Fallback on connection error (read from demo localStorage if exists)
    appState.description = localStorage.getItem('demo_desc') || fallbackDesc;
    appState.goals = localStorage.getItem('demo_goals') || fallbackGoals;

    const localNews = localStorage.getItem('demo_news');
    appState.news = localNews ? JSON.parse(localNews) : fallbackNews;
  }

  renderHome();
}

function setDatabaseStatus(connected, text) {
  isDbConnected = connected;
  dbStatusText.textContent = text;

  if (connected) {
    footerInfo.classList.add('online');
  } else {
    footerInfo.classList.remove('online');
  }
}

// ==========================================================================
// 3. RENDER FUNCTIONS
// ==========================================================================

function renderHome() {
  // Render descriptions
  if (jfnDescDisplay) jfnDescDisplay.textContent = appState.description;
  if (jfnGoalsDisplay) jfnGoalsDisplay.textContent = appState.goals;

  // Filter news
  let filteredNews = appState.news;

  // Category Filter
  if (activeCategory !== 'all') {
    filteredNews = filteredNews.filter(n => n.category.toLowerCase() === activeCategory.toLowerCase());
  }

  // Search Filter
  if (searchQuery.trim() !== '') {
    const query = searchQuery.toLowerCase().trim();
    filteredNews = filteredNews.filter(n =>
      n.title.toLowerCase().includes(query) ||
      n.content.toLowerCase().includes(query) ||
      n.category.toLowerCase().includes(query)
    );
  }

  // Sort news: newest first
  filteredNews.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Render count
  if (madingCount) {
    madingCount.textContent = `${filteredNews.length} Informasi`;
  }

  // Clear Grid
  madingGrid.innerHTML = '';

  if (filteredNews.length === 0) {
    madingGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">
          <i data-lucide="inbox"></i>
        </div>
        <h3>Belum Ada Berita</h3>
        <p>Tidak ada berita mading yang cocok dengan kueri pencarian atau filter kategori Anda.</p>
      </div>
    `;
  } else {
    filteredNews.forEach(item => {
      const formattedDate = formatDateIndo(item.date);

      const card = document.createElement('article');
      card.className = 'mading-card';
      card.setAttribute('data-cat', item.category);
      card.innerHTML = `
        <div class="card-header">
          <span class="card-badge">${item.category}</span>
          <span class="card-date">${formattedDate}</span>
        </div>
        <div class="card-body">
          <h3>${escapeHtml(item.title)}</h3>
          <p class="card-text">${escapeHtml(item.content)}</p>
        </div>
      `;
      madingGrid.appendChild(card);
    });
  }

  // Initialize newly rendered icons
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

// Helper: Escape HTML string
function escapeHtml(unsafe) {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Helper: Format date to Indo
function formatDateIndo(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date)) return dateString;

  const options = { day: 'numeric', month: 'short', year: 'numeric' };
  return date.toLocaleDateString('id-ID', options);
}

// ==========================================================================
// 4. SEARCH & FILTER EVENTS
// ==========================================================================

searchInput.addEventListener('input', (e) => {
  searchQuery = e.target.value;
  renderHome();
});

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    activeCategory = btn.getAttribute('data-category');
    renderHome();
  });
});

// ==========================================================================
// 5. GITHUB GRAPH SIMULATOR
// ==========================================================================

function initGitHubGraph() {
  const githubGrid = document.getElementById('github-graph-grid');
  if (!githubGrid) return;

  githubGrid.innerHTML = '';
  // 7 rows x 24 columns = 168 cells
  for (let i = 0; i < 168; i++) {
    const block = document.createElement('div');
    block.className = 'github-block';

    // Realistic coding intensity levels (mostly 0/1, fewer 2/3)
    const rand = Math.random();
    let level = 0;
    if (rand > 0.88) {
      level = 3;
    } else if (rand > 0.70) {
      level = 2;
    } else if (rand > 0.35) {
      level = 1;
    }
    block.classList.add(`level-${level}`);

    // Title/tooltip metadata
    const simulatedCommits = level === 0 ? 0 : (level === 1 ? Math.floor(Math.random() * 3) + 1 : (level === 2 ? Math.floor(Math.random() * 5) + 4 : Math.floor(Math.random() * 8) + 9));
    block.title = `${simulatedCommits} kontribusi`;

    githubGrid.appendChild(block);
  }
}

// ==========================================================================
// 6. GLOBE 3D INITIALIZATION & GEOLOCATION
// ==========================================================================

function initGlobe3D() {
  const container = document.getElementById('globe-container');
  const placeholder = document.getElementById('globe-placeholder');
  const tooltip = document.getElementById('globe-tooltip');
  const userLocText = document.getElementById('user-location-text');

  if (!container) return;

  // CDN Fallback Safety Guard
  if (typeof Globe === 'undefined') {
    console.warn('Pustaka Globe.gl tidak dimuat. Menampilkan fallback visual.');
    if (placeholder) {
      placeholder.innerHTML = `
        <div class="offline-badge" style="margin-bottom: 0.5rem; color: var(--text-muted);">
          <i data-lucide="wifi-off" style="width: 28px; height: 28px;"></i>
        </div>
        <p style="font-size: 0.82rem; color: var(--text-secondary); max-width: 250px; line-height: 1.4;">
          Visualisasi Globe 3D tidak tersedia secara offline atau CDN diblokir.
        </p>
      `;
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }
    return;
  }

  try {
    const width = container.clientWidth;
    const height = container.clientHeight || 420;

    // Core ecosystem node coordinate points
    const markerData = [
      { name: 'Jakarta', lat: -6.2088, lng: 106.8456, size: 1.0 },
      { name: 'Tokyo', lat: 35.6762, lng: 139.6503, size: 0.8 },
      { name: 'London', lat: 51.5074, lng: -0.1278, size: 0.8 },
      { name: 'New York', lat: 40.7128, lng: -74.0060, size: 0.8 }
    ];

    const myGlobe = Globe()(container)
      .width(width)
      .height(height)
      .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-night.jpg')
      .bumpImageUrl('https://unpkg.com/three-globe/example/img/earth-topology.png')
      .backgroundColor('rgba(0,0,0,0)')
      .showAtmosphere(true)
      .atmosphereColor('#5e6ad2')
      .atmosphereAltitude(0.15)
      // Pulsing Ring Animation
      .ringsData(markerData)
      .ringColor(() => '#5e6ad2')
      .ringMaxRadius(2.2)
      .ringPropagationSpeed(1.2)
      .ringRepeatPeriod(1800)
      // Glowing Label details
      .labelsData(markerData)
      .labelLat(d => d.lat)
      .labelLng(d => d.lng)
      .labelText(d => d.name)
      .labelSize(1.6)
      .labelColor(() => '#ffffff')
      .labelDotRadius(0.35)
      .labelResolution(3);

    // Configure default slow rotation controls
    const controls = myGlobe.controls();
    if (controls) {
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.6;
      controls.enableZoom = false; // keep page flow stable
    }

    // Responsive sizing
    window.addEventListener('resize', () => {
      myGlobe.width(container.clientWidth).height(container.clientHeight || 420);
    });

    // Geolocation detection
    fetch('https://ipapi.co/json/')
      .then(res => {
        if (!res.ok) throw new Error('API request failed');
        return res.json();
      })
      .then(data => {
        if (data && typeof data.latitude !== 'undefined') {
          const lat = parseFloat(data.latitude);
          const lng = parseFloat(data.longitude);
          const city = data.city || '';
          const country = data.country_name || '';

          // Add user's node marker
          const userMarker = { name: `Anda (${city || 'Lokasi Anda'})`, lat: lat, lng: lng, size: 1.2 };
          const updatedMarkers = [...markerData, userMarker];

          // Rebind data to include user location node
          myGlobe.ringsData(updatedMarkers);
          myGlobe.labelsData(updatedMarkers);

          // Slow pan to user location
          setTimeout(() => {
            myGlobe.pointOfView({ lat: lat, lng: lng, altitude: 2.2 }, 2000);

            // Set locations indicator tooltip
            if (userLocText && tooltip) {
              userLocText.textContent = `${city ? city + ', ' : ''}${country}`;
              tooltip.style.display = 'flex';
            }

            // Fade out the spinner placeholder
            if (placeholder) {
              placeholder.style.opacity = '0';
              setTimeout(() => placeholder.style.display = 'none', 500);
            }
          }, 1200);
        } else {
          throw new Error('Invalid coordinates payload');
        }
      })
      .catch(err => {
        console.warn('IP Geolocation unavailable/blocked. Falling back to default HQ focus.', err);
        // Fallback to Jakarta HQ view
        setTimeout(() => {
          myGlobe.pointOfView({ lat: -6.2088, lng: 106.8456, altitude: 2.2 }, 2000);

          if (userLocText && tooltip) {
            userLocText.textContent = `Jakarta, Indonesia (Default)`;
            tooltip.style.display = 'flex';
          }

          if (placeholder) {
            placeholder.style.opacity = '0';
            setTimeout(() => placeholder.style.display = 'none', 500);
          }
        }, 1200);
      });

  } catch (error) {
    console.error('Globe.gl rendering error:', error);
    if (placeholder) {
      placeholder.innerHTML = `<p style="font-size: 0.8rem; color: var(--text-secondary);">Gagal menginisialisasi render WebGL Bola Dunia.</p>`;
    }
  }
}

// ==========================================================================
// APP INITIALIZATION
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
  loadDataFromSupabase();
  initGitHubGraph();
  initGlobe3D();
});
