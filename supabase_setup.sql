-- ==========================================================================
-- JFN STUDIO HUB - SUPABASE SQL SETUP (Terbaru - Bebas Istilah Mading)
-- Salin dan tempel perintah SQL berikut di editor SQL dasbor Supabase Anda.
-- ==========================================================================

-- 1. PEMBUATAN TABEL UNTUK INFORMASI PEMBARUAN (jfn_news)
CREATE TABLE IF NOT EXISTS public.jfn_news (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    title TEXT NOT NULL,
    category TEXT NOT NULL, -- Pengumuman, Update, Rilis
    date DATE NOT NULL,
    content TEXT NOT NULL
);

-- 2. PEMBUATAN TABEL UNTUK PENGATURAN PROFIL (jfn_settings)
CREATE TABLE IF NOT EXISTS public.jfn_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- 3. MEMASUKKAN DATA DEFAULT AWAL UNTUK PENGATURAN (jfn_settings)
INSERT INTO public.jfn_settings (key, value) VALUES
('description', 'JFN Studio adalah pusat integrasi dari berbagai inovasi proyek website yang dikembangkan secara mandiri. Kami merancang solusi digital dengan visual modern dan fungsionalitas mutakhir untuk memaksimalkan efisiensi dan pengalaman pengguna.')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO public.jfn_settings (key, value) VALUES
('goals', 'Membangun jaringan aplikasi web terpadu yang mempermudah manajemen data, menyajikan portofolio kreatif, serta mengoptimalkan produktivitas operasional melalui inovasi berkelanjutan.')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 4. MEMASUKKAN DATA DEFAULT AWAL UNTUK PEMBARUAN (jfn_news)
INSERT INTO public.jfn_news (title, category, date, content) VALUES
('Peluncuran JFN Studio Hub v1.0.0', 'Rilis', '2026-06-18', 'Hari ini kami resmi meluncurkan JFN Studio Hub sebagai pusat kendali untuk seluruh ekosistem proyek website JFN. Mulai dari sini, Anda dapat memantau rilis baru, update sistem, dan pengumuman secara real-time. Hub ini dirancang dengan gaya panel pembaruan interaktif yang dapat dikelola secara instan dari Panel Pengaturan.'),
('Rencana Integrasi Brangkas Data (Vault)', 'Pengumuman', '2026-06-20', 'Kami merencanakan penggabungan proyek Brangkas Data (Personal Data Vault) ke dalam ekosistem JFN Studio Hub. Integrasi ini akan mempermudah pengguna dalam mengakses catatan aman, templat HTML, dan berkas penting melalui sistem dashboard satu pintu.'),
('Optimalisasi Performa & Animasi Panel', 'Update', '2026-06-19', 'Telah dilakukan peningkatan performa render halaman beranda pembaruan. Penambahan efek backdrop-blur (Glassmorphism) dan animasi glow pulse status kini terasa lebih responsif di berbagai perangkat. Kami juga mempermudah alur edit info langsung di sisi klien.')
ON CONFLICT DO NOTHING;

-- 5. KETERANGAN MENGENAI ROW LEVEL SECURITY (RLS):
-- Agar website publik dapat membaca informasi pembaruan dan settings, Anda perlu mengaktifkan kebijakan RLS di Supabase:
--
-- A. Kebijakan untuk jfn_news:
--    - Kebijakan SELECT (BACA): Izinkan untuk semua orang (Enable read access for all users).
--    - Kebijakan INSERT, UPDATE, DELETE (TULIS): Hanya izinkan untuk user yang terautentikasi (Enable write access for authenticated users only).
--
-- B. Kebijakan untuk jfn_settings:
--    - Kebijakan SELECT (BACA): Izinkan untuk semua orang (Enable read access for all users).
--    - Kebijakan INSERT, UPDATE, DELETE (TULIS): Hanya izinkan untuk user yang terautentikasi (Enable write access for authenticated users only).
--
-- Anda juga dapat menonaktifkan RLS untuk tabel ini jika hanya ingin menggunakannya untuk pengujian cepat (TIDAK disarankan untuk produksi).
