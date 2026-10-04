import type { KnowledgeEntry } from "./knowledge";

// The Bikinpakeai help center as the lab's knowledge base: demo content,
// grouped by product. The baseline path sends all of it with every message;
// the Jev path sends only the entries that match. Keywords are matched as
// lowercase substrings, so keep them specific: "api" would also match "tapi"
// and "aturan" would match "pengaturan".

const UMUM: KnowledgeEntry[] = [
  {
    id: "umum-kanal-support",
    product: "Umum",
    topic: "Kanal dan jam layanan support",
    keywords: [
      "jam layanan",
      "jam kerja",
      "jam operasional",
      "hubungi",
      "kontak support",
      "customer service",
      "admin",
      "lama dibalas",
      "belum dibalas",
    ],
    answer:
      "Tim support Bikinpakeai melayani lewat chat di aplikasi dan email support setiap Senin sampai Jumat pukul 09.00–18.00 WIB, serta Sabtu pukul 09.00–13.00 WIB. Pesan di luar jam layanan tetap tercatat dan dibalas berurutan pada jam kerja berikutnya. Kasus yang sudah dibuatkan tiket akan dibalas di percakapan yang sama, jadi pelanggan tidak perlu mengirim ulang pesan yang sama.",
  },
  {
    id: "umum-ganti-email",
    product: "Umum",
    topic: "Ganti email akun",
    keywords: [
      "ganti email",
      "ubah email",
      "email baru",
      "email lama",
      "pindah email",
    ],
    answer:
      "Email akun bisa diganti di Pengaturan, Profil, lalu Ganti Email. Bikinpakeai mengirim tautan konfirmasi ke email baru dan pemberitahuan ke email lama; perubahan berlaku setelah tautan diklik. Membership, pembelian template, dan kelas ikut pindah ke email baru. Jika email lama sudah tidak bisa diakses, hubungi tim support dengan nomor invoice terakhir sebagai bukti kepemilikan akun.",
  },
  {
    id: "umum-hapus-akun",
    product: "Umum",
    topic: "Menghapus akun dan data",
    keywords: [
      "hapus akun",
      "tutup akun",
      "hapus data",
      "nonaktifkan akun",
      "delete akun",
    ],
    answer:
      "Penghapusan akun diajukan dari Pengaturan, Privasi, lalu Hapus Akun. Akun masuk masa tenggang 14 hari dan bisa dipulihkan dengan masuk kembali selama masa itu; setelahnya data PRD, desain, dan riwayat AndalAI dihapus permanen. Membership aktif tidak otomatis dibatalkan, jadi hentikan perpanjangan otomatis lebih dulu. Riwayat transaksi tetap disimpan sesuai kewajiban pencatatan keuangan.",
  },
  {
    id: "umum-privasi-data",
    product: "Umum",
    topic: "Privasi dan keamanan data",
    keywords: [
      "privasi",
      "data saya",
      "keamanan data",
      "dipakai untuk training",
      "melatih model",
      "kerahasiaan",
      "bocor",
    ],
    answer:
      "Data yang Anda buat di produk Bikinpakeai hanya bisa diakses oleh akun Anda dan anggota yang Anda undang. Konten pelanggan tidak dipakai untuk melatih model AI. Data dienkripsi saat dikirim dan saat disimpan, dan staf support hanya membuka data akun bila pelanggan meminta bantuan untuk kasus tertentu. Detail lengkap ada di halaman Kebijakan Privasi.",
  },
  {
    id: "umum-daftar-masuk",
    product: "Umum",
    topic: "Satu akun untuk semua produk",
    keywords: [
      "cara daftar",
      "buat akun",
      "registrasi",
      "masuk dengan google",
      "login google",
      "satu akun",
      "akun bikinpakeai",
    ],
    answer:
      "Satu akun Bikinpakeai dipakai untuk semua produk: PRDTask, DesainPakeAI, AndalAI, Template, dan Komunitas. Daftar dengan email atau masuk dengan Google; keduanya menghasilkan akun yang sama selama emailnya sama. Jika sebelumnya daftar dengan email lalu masuk dengan Google memakai email lain, akan terbentuk akun terpisah dan pembelian tidak terlihat.",
  },
  {
    id: "umum-verifikasi-email",
    product: "Umum",
    topic: "Email verifikasi tidak masuk",
    keywords: [
      "verifikasi email",
      "email verifikasi",
      "email konfirmasi",
      "tidak menerima email",
      "email tidak masuk",
      "folder spam",
    ],
    answer:
      "Email verifikasi dan reset biasanya tiba dalam lima menit. Periksa folder Spam, Promosi, atau Pembaruan, lalu tandai email dari Bikinpakeai sebagai bukan spam. Tautan berlaku 60 menit; minta ulang dari halaman masuk bila sudah kedaluwarsa. Email kantor kadang memblokir email otomatis, jadi minta tim IT mengizinkan domain Bikinpakeai.",
  },
  {
    id: "umum-browser",
    product: "Umum",
    topic: "Aplikasi lambat atau tampilan berantakan",
    keywords: [
      "browser",
      "chrome",
      "safari",
      "firefox",
      "cache",
      "lemot",
      "lambat",
      "loading terus",
      "tampilan berantakan",
    ],
    answer:
      "Bikinpakeai mendukung Chrome, Edge, Firefox, dan Safari versi terbaru. Jika aplikasi lambat atau tampilan berantakan, muat ulang halaman, hapus cache browser, lalu coba mode samaran tanpa ekstensi. Ekstensi pemblokir iklan dan VPN kantor sering memblokir sebagian fitur. Bila masalah tetap ada, kirim nama browser, versinya, dan tangkapan layar.",
  },
  {
    id: "umum-gangguan",
    product: "Umum",
    topic: "Gangguan layanan dan pemeliharaan",
    keywords: [
      "gangguan",
      "server down",
      "sedang down",
      "error 500",
      "error 502",
      "maintenance",
      "pemeliharaan",
      "status layanan",
    ],
    answer:
      "Status layanan dan jadwal pemeliharaan diumumkan di halaman Status Bikinpakeai dan kanal pengumuman Discord. Pemeliharaan terjadwal dilakukan di luar jam kerja dan diumumkan paling lambat sehari sebelumnya. Saat ada gangguan, data yang sudah tersimpan tetap aman; tunggu status kembali normal sebelum mencoba ulang proses yang berat seperti generate PRD atau ekspor.",
  },
];

const MEMBERSHIP: KnowledgeEntry[] = [
  {
    id: "membership-activation",
    product: "Membership",
    topic: "Aktivasi membership setelah bayar",
    keywords: [
      "bayar",
      "transfer",
      "aktif",
      "terkunci",
      "akses",
      "membership",
      "kelas",
    ],
    answer:
      "Akses membership aktif di akun dengan email yang sama dengan saat membayar, biasanya dalam lima menit setelah pembayaran terkonfirmasi. Jika belum terbuka, keluar lalu masuk lagi agar status akun diperbarui. Pastikan juga Anda masuk dengan email yang tertera di email pembayaran. Jika tetap terkunci, kirim nomor invoice dari email pembayaran untuk dicek tim.",
  },
  {
    id: "upgrade-pro",
    product: "Membership",
    topic: "Cara upgrade ke Pro",
    keywords: [
      "upgrade",
      "paket pro",
      "membership pro",
      "ke pro",
      "harga",
      "langganan",
    ],
    answer:
      "Buka halaman Harga Bikinpakeai, pilih paket Pro bulanan atau tahunan, lalu selesaikan pembayaran. Akses Pro aktif di akun dengan email yang sama setelah pembayaran terkonfirmasi. Upgrade dari Free tidak menghapus data apa pun; semua PRD, desain, dan riwayat tetap ada dan langsung mendapat batas Pro.",
  },
  {
    id: "invoice-check",
    product: "Membership",
    topic: "Cek pembayaran dan tagihan",
    keywords: [
      "tagihan",
      "invoice",
      "kartu",
      "ganda",
      "dua kali",
      "cek pembayaran",
    ],
    answer:
      "Untuk cek pembayaran atau tagihan ganda, kirim nomor invoice (format INV-…) dari email pembayaran. Data kartu tidak diperlukan dan tidak boleh dikirim lewat chat. Riwayat semua tagihan juga bisa dilihat di Pengaturan, Tagihan. Tagihan ganda diperiksa tim support manusia.",
  },
  {
    id: "membership-cancel",
    product: "Membership",
    topic: "Berhenti langganan dan perpanjangan otomatis",
    keywords: [
      "cancel",
      "batal",
      "berhenti langganan",
      "stop langganan",
      "perpanjangan otomatis",
      "unsubscribe",
      "auto renew",
    ],
    answer:
      "Perpanjangan otomatis dihentikan di Pengaturan, Tagihan, lalu Hentikan Perpanjangan. Membership tetap aktif sampai akhir periode yang sudah dibayar, lalu akun kembali ke paket Free tanpa kehilangan data. Membership bisa diaktifkan lagi kapan saja dari halaman yang sama. Pembatalan tidak otomatis berarti refund; permintaan refund ditinjau tim support manusia.",
  },
  {
    id: "membership-metode-bayar",
    product: "Membership",
    topic: "Metode pembayaran",
    keywords: [
      "metode pembayaran",
      "cara bayar",
      "virtual account",
      "qris",
      "e-wallet",
      "gopay",
      "dana",
      "kartu kredit",
    ],
    answer:
      "Pembayaran menerima virtual account bank, QRIS, e-wallet, dan kartu kredit atau debit. Perpanjangan otomatis hanya tersedia untuk kartu; metode lain perlu dibayar manual setiap periode lewat tautan yang dikirim tiga hari sebelum masa aktif habis. Data kartu diproses langsung oleh penyedia pembayaran dan tidak disimpan oleh Bikinpakeai.",
  },
  {
    id: "membership-pembayaran-pending",
    product: "Membership",
    topic: "Pembayaran pending atau gagal",
    keywords: [
      "pending",
      "menunggu pembayaran",
      "expired",
      "gagal bayar",
      "pembayaran gagal",
      "kedaluwarsa",
    ],
    answer:
      "Status pending berarti penyedia pembayaran belum mengirim konfirmasi. Virtual account dan QRIS biasanya terkonfirmasi dalam 15 menit; tagihan yang tidak dibayar dalam 24 jam otomatis kedaluwarsa dan perlu dibuat ulang dari halaman Harga. Jika saldo sudah terpotong tetapi status masih pending lebih dari satu jam, kirim nomor invoice untuk dicek tim.",
  },
  {
    id: "membership-masa-aktif",
    product: "Membership",
    topic: "Masa aktif dan perpanjangan",
    keywords: [
      "masa aktif",
      "perpanjang",
      "jatuh tempo",
      "tanggal tagihan",
      "membership habis",
      "sampai kapan",
    ],
    answer:
      "Masa aktif membership terlihat di Pengaturan, Tagihan. Pengingat dikirim tujuh hari dan satu hari sebelum masa aktif habis. Jika membership habis, akun kembali ke Free: data tetap tersimpan, tetapi fitur Pro, kelas DesainPakeAI, dan akses channel member Discord terkunci sampai diperpanjang.",
  },
  {
    id: "membership-beda-paket",
    product: "Membership",
    topic: "Perbedaan paket Free dan Pro",
    keywords: [
      "free",
      "gratis",
      "beda paket",
      "perbandingan paket",
      "fitur pro",
      "keuntungan",
      "manfaat",
    ],
    answer:
      "Paket Free cocok untuk mencoba: generate PRD terbatas per bulan, satu proyek DesainPakeAI, dan akses komunitas umum. Paket Pro membuka generate PRD lebih banyak, ekspor tanpa watermark, semua kelas DesainPakeAI, channel member di Discord, dan diskon pembelian template. Rincian kuota dan harga terbaru selalu ada di halaman Harga Bikinpakeai.",
  },
  {
    id: "membership-faktur",
    product: "Membership",
    topic: "Faktur dan bukti bayar untuk perusahaan",
    keywords: [
      "faktur",
      "kuitansi",
      "npwp",
      "bukti bayar",
      "invoice perusahaan",
      "reimburse",
      "nama perusahaan",
    ],
    answer:
      "Bukti bayar bisa diunduh dari Pengaturan, Tagihan, lalu pilih transaksi dan Unduh Invoice. Untuk mencantumkan nama perusahaan dan alamat penagihan, isi Profil Penagihan sebelum membayar; invoice berikutnya otomatis memakai data itu. Perubahan pada invoice yang sudah terbit diajukan ke tim support dengan nomor invoice.",
  },
  {
    id: "membership-promo",
    product: "Membership",
    topic: "Promo dan voucher resmi",
    keywords: ["promo", "diskon", "voucher", "potongan harga", "kode kupon"],
    answer:
      "Promo resmi hanya yang diumumkan di halaman Harga Bikinpakeai dan kanal pengumuman komunitas. Voucher dimasukkan di halaman pembayaran sebelum menyelesaikan transaksi dan tidak bisa diterapkan pada transaksi yang sudah dibayar. Asisten dan tim support tidak membuat atau membagikan kode di luar promo resmi.",
  },
  {
    id: "membership-ganti-paket",
    product: "Membership",
    topic: "Pindah paket bulanan dan tahunan",
    keywords: [
      "tahunan",
      "bulanan",
      "ganti paket",
      "pindah paket",
      "downgrade",
    ],
    answer:
      "Pindah dari bulanan ke tahunan dilakukan di Pengaturan, Tagihan, lalu Ganti Paket; sisa hari paket bulanan dihitung sebagai potongan pada paket tahunan. Pindah dari tahunan ke bulanan, atau downgrade ke Free, berlaku setelah periode berjalan berakhir. Data tidak berubah saat pindah paket.",
  },
];

const PRDTASK: KnowledgeEntry[] = [
  {
    id: "prdtask-password",
    product: "PRDTask",
    topic: "Reset password PRDTask",
    keywords: ["password", "lupa", "reset", "masuk", "login", "prdtask"],
    answer:
      "Di halaman masuk PRDTask pilih “Lupa password”, lalu ikuti tautan reset yang dikirim ke email akun. Tautan berlaku 60 menit. Jika akun dibuat dengan Google, masuk lewat tombol Google; akun seperti itu tidak memakai password terpisah.",
  },
  {
    id: "prdtask-export",
    product: "PRDTask",
    topic: "Ekspor PRD ke PDF",
    keywords: ["ekspor", "export", "pdf", "prd", "unduh"],
    answer:
      "Buka PRD, pilih menu Bagikan lalu Ekspor PDF. Jika ekspor gagal, coba muat ulang halaman; bila tetap gagal, kirim tangkapan layar galatnya. PRD yang sangat panjang (lebih dari 60 halaman) lebih stabil bila diekspor per bagian lewat opsi Pilih Bagian.",
  },
  {
    id: "prdtask-generate-tidak-lengkap",
    product: "PRDTask",
    topic: "Bagian PRD tidak ter-generate",
    keywords: [
      "generate",
      "section",
      "bagian",
      "terpotong",
      "tidak lengkap",
      "kosong",
    ],
    answer:
      "Jika sebagian bagian PRD kosong atau terpotong, buka bagian itu lalu pilih Generate Ulang Bagian; bagian lain tidak berubah. Ini biasanya terjadi saat koneksi terputus atau kuota generate bulanan habis di tengah proses. Pastikan deskripsi produk di langkah awal cukup jelas. Bila bagian yang sama terus kosong, kirim nama PRD dan nama bagiannya untuk dicek tim.",
  },
  {
    id: "prdtask-kuota",
    product: "PRDTask",
    topic: "Kuota generate PRD",
    keywords: [
      "kuota",
      "limit",
      "batas generate",
      "habis kuota",
      "sisa generate",
    ],
    answer:
      "Sisa kuota generate terlihat di pojok kanan atas editor PRDTask. Kuota Free dan Pro di-reset setiap tanggal tagihan, bukan tanggal 1. Generate ulang satu bagian memakai kuota lebih kecil daripada generate PRD penuh. Upgrade ke Pro langsung menambah kuota bulan berjalan.",
  },
  {
    id: "prdtask-kolaborasi",
    product: "PRDTask",
    topic: "Berbagi dan kolaborasi PRD",
    keywords: [
      "kolaborasi",
      "undang",
      "share",
      "rekan",
      "akses edit",
      "hanya lihat",
    ],
    answer:
      "Dari menu Bagikan, undang rekan dengan email lalu pilih peran Bisa Edit, Bisa Komentar, atau Hanya Lihat. Tautan publik hanya-baca juga bisa dibuat dan dicabut kapan saja. Undangan memakai kursi kolaborator: Free maksimal dua kolaborator per PRD, Pro tanpa batas.",
  },
  {
    id: "prdtask-template-prd",
    product: "PRDTask",
    topic: "Template dan struktur PRD",
    keywords: [
      "template prd",
      "format prd",
      "struktur prd",
      "isi prd",
      "contoh prd",
    ],
    answer:
      "PRDTask menyediakan struktur bawaan: latar belakang, tujuan, persona, user story, kebutuhan fungsional, kebutuhan non-fungsional, metrik keberhasilan, dan rencana rilis. Bagian bisa ditambah, dihapus, atau diurutkan ulang di panel Struktur, lalu disimpan sebagai template tim untuk PRD berikutnya.",
  },
  {
    id: "prdtask-riwayat-versi",
    product: "PRDTask",
    topic: "Riwayat versi dan memulihkan PRD",
    keywords: [
      "riwayat versi",
      "versi sebelumnya",
      "terhapus",
      "pulihkan",
      "kembalikan versi",
      "undo",
    ],
    answer:
      "Setiap perubahan PRD tersimpan otomatis. Buka menu Riwayat Versi untuk melihat versi sebelumnya dan pilih Pulihkan; versi saat ini tetap disimpan sebagai riwayat. PRD yang dihapus masuk ke Sampah selama 30 hari sebelum terhapus permanen.",
  },
  {
    id: "prdtask-ekspor-lain",
    product: "PRDTask",
    topic: "Ekspor ke Word, Notion, dan Markdown",
    keywords: ["word", "docx", "notion", "markdown", "google docs"],
    answer:
      "Selain PDF, PRD bisa diekspor ke Word (.docx) dan Markdown dari menu Bagikan, Ekspor. Untuk Notion, ekspor Markdown lalu impor di Notion; struktur judul dan tabel ikut terbawa. Ekspor ke Word dan Markdown tersedia di paket Free dan Pro.",
  },
  {
    id: "prdtask-bahasa",
    product: "PRDTask",
    topic: "Bahasa hasil PRD",
    keywords: [
      "bahasa inggris",
      "english",
      "bahasa output",
      "terjemah",
      "translate",
    ],
    answer:
      "Bahasa hasil diatur di Pengaturan PRD, Bahasa Keluaran: Indonesia atau Inggris. PRD yang sudah jadi bisa diterjemahkan lewat menu Bagikan, Buat Salinan Terjemahan; salinan baru dibuat dan PRD asli tidak berubah. Terjemahan memakai kuota generate.",
  },
  {
    id: "prdtask-ke-task",
    product: "PRDTask",
    topic: "Memecah PRD menjadi daftar task",
    keywords: [
      "daftar task",
      "daftar tugas",
      "pecah jadi task",
      "backlog",
      "jira",
      "trello",
    ],
    answer:
      "Dari PRD yang sudah jadi, pilih Buat Task untuk memecah kebutuhan menjadi daftar task beserta kriteria penerimaannya. Daftar itu bisa diekspor sebagai CSV untuk diimpor ke Jira, Trello, atau Linear. Mengubah PRD setelahnya tidak otomatis memperbarui task yang sudah diekspor.",
  },
];

const DESAINPAKEAI: KnowledgeEntry[] = [
  {
    id: "desainpakeai-classes",
    product: "DesainPakeAI",
    topic: "Kelas DesainPakeAI",
    keywords: ["desainpakeai", "kelas", "desain", "canvas"],
    answer:
      "Kelas DesainPakeAI terbuka untuk member Pro aktif. Pastikan masuk dengan email yang sama dengan saat membayar membership. Kelas tersusun dari modul video, latihan di canvas, dan kuis singkat; progres tersimpan otomatis dan bisa dilanjutkan dari perangkat lain.",
  },
  {
    id: "desainpakeai-canvas-simpan",
    product: "DesainPakeAI",
    topic: "Desain di canvas tidak tersimpan",
    keywords: [
      "tersimpan",
      "autosave",
      "desain hilang",
      "simpan desain",
      "canvas kosong",
    ],
    answer:
      "Canvas menyimpan otomatis setiap beberapa detik; ikon awan di atas canvas menunjukkan status simpan. Jika ikon menunjukkan offline, jangan tutup tab sampai koneksi kembali. Versi sebelumnya bisa dipulihkan dari menu File, Riwayat Versi. Bila desain tetap tidak muncul, kirim nama proyek dan perkiraan waktu terakhir disimpan.",
  },
  {
    id: "desainpakeai-prototipe",
    product: "DesainPakeAI",
    topic: "Prototipe dan pratinjau",
    keywords: [
      "prototipe",
      "prototype",
      "pratinjau",
      "preview",
      "antar layar",
      "interaksi",
    ],
    answer:
      "Untuk membuat prototipe, pilih elemen lalu tarik panah interaksi ke layar tujuan di mode Prototipe. Tombol Putar membuka pratinjau di tab baru, dan tautan pratinjau bisa dibagikan ke klien tanpa akun. Interaksi yang didukung: klik, hover, dan transisi geser atau pudar.",
  },
  {
    id: "desainpakeai-ekspor",
    product: "DesainPakeAI",
    topic: "Ekspor desain ke PNG, SVG, dan Figma",
    keywords: ["png", "svg", "figma", "ekspor desain", "export desain"],
    answer:
      "Pilih frame lalu Ekspor di panel kanan untuk mengunduh PNG, JPG, SVG, atau PDF. Ekspor resolusi 2x dan 3x serta ekspor tanpa watermark tersedia untuk member Pro. Untuk dipindah ke Figma, ekspor SVG per frame lalu impor di Figma; teks tetap bisa diedit selama font yang sama terpasang.",
  },
  {
    id: "desainpakeai-sertifikat",
    product: "DesainPakeAI",
    topic: "Sertifikat kelas",
    keywords: ["sertifikat", "certificate", "lulus", "selesai kelas"],
    answer:
      "Sertifikat terbit otomatis setelah semua modul ditandai selesai dan kuis akhir mendapat nilai minimal 70. Sertifikat bisa diunduh dari halaman kelas, bagian Sertifikat, dan memuat nama sesuai profil akun. Ubah nama di Profil sebelum mengunduh; sertifikat yang sudah terbit bisa diterbitkan ulang sekali.",
  },
  {
    id: "desainpakeai-video",
    product: "DesainPakeAI",
    topic: "Video kelas tidak bisa diputar",
    keywords: [
      "video",
      "tidak bisa diputar",
      "buffering",
      "patah-patah",
      "materi kelas",
    ],
    answer:
      "Jika video kelas tidak berputar atau patah-patah, turunkan kualitas video di ikon roda gigi, muat ulang halaman, dan matikan VPN. Video membutuhkan koneksi minimal sekitar 3 Mbps untuk kualitas 720p. Bila hanya satu video yang bermasalah, kirim nama kelas dan nomor modulnya.",
  },
  {
    id: "desainpakeai-jadwal-live",
    product: "DesainPakeAI",
    topic: "Kelas live dan rekaman",
    keywords: [
      "jadwal",
      "kelas live",
      "rekaman",
      "zoom",
      "webinar",
      "sesi live",
    ],
    answer:
      "Jadwal kelas live ada di halaman DesainPakeAI, tab Live, dan tautan bergabung dikirim ke email satu jam sebelum sesi. Rekaman tersedia di tab yang sama paling lambat dua hari kerja setelah sesi. Kelas live terbuka untuk member Pro aktif.",
  },
  {
    id: "desainpakeai-aset",
    product: "DesainPakeAI",
    topic: "Font, ikon, dan lisensi aset",
    keywords: ["font", "ikon", "aset", "lisensi aset", "gambar stok"],
    answer:
      "Font, ikon, dan gambar di pustaka DesainPakeAI boleh dipakai untuk proyek pribadi maupun komersial selama tidak dijual ulang sebagai aset terpisah. Font unggahan sendiri hanya tersedia di akun pengunggah. Aset bertanda Pro hanya bisa dipakai saat membership Pro aktif.",
  },
  {
    id: "desainpakeai-mode-gelap",
    product: "DesainPakeAI",
    topic: "Mode gelap dan permintaan fitur",
    keywords: ["mode gelap", "dark mode", "tema gelap", "fitur baru"],
    answer:
      "Mode gelap untuk editor DesainPakeAI belum tersedia. Permintaan fitur dicatat tim produk dan dipakai untuk menyusun prioritas; pembaruan diumumkan di kanal pengumuman Discord dan catatan rilis. Tim support tidak bisa menjanjikan tanggal rilis fitur.",
  },
];

const ANDALAI: KnowledgeEntry[] = [
  {
    id: "andalai-team",
    product: "AndalAI",
    topic: "Paket AndalAI untuk tim",
    keywords: ["andalai", "tim", "starter", "paket", "anggota"],
    answer:
      "AndalAI punya paket Starter untuk perorangan dan Pro untuk tim. Starter memakai satu kursi dengan ruang kerja pribadi; Pro memberi ruang kerja tim, kursi tambahan per anggota, basis pengetahuan bersama, dan panel admin. Untuk tim lima orang, Pro diperlukan agar riwayat dan dokumen bisa dipakai bersama. Detail kuota dan harga terbaru ada di halaman Harga Bikinpakeai.",
  },
  {
    id: "andalai-undang-anggota",
    product: "AndalAI",
    topic: "Mengundang anggota tim",
    keywords: [
      "undang anggota",
      "tambah anggota",
      "seat",
      "kursi",
      "anggota tim",
      "hapus anggota",
    ],
    answer:
      "Admin ruang kerja mengundang anggota dari Pengaturan Tim, Anggota, lalu Undang. Setiap anggota memakai satu kursi; kursi tambahan ditagihkan prorata sampai tanggal tagihan berikutnya. Anggota yang dihapus langsung kehilangan akses, dan kursinya bisa dipakai orang lain.",
  },
  {
    id: "andalai-kuota",
    product: "AndalAI",
    topic: "Kuota pesan AndalAI",
    keywords: ["kuota", "batas pesan", "limit", "pesan habis", "sisa pesan"],
    answer:
      "Kuota pesan AndalAI dihitung per kursi setiap bulan dan di-reset pada tanggal tagihan. Sisa kuota terlihat di bawah kotak chat. Pesan dengan lampiran besar atau dokumen panjang memakai kuota lebih banyak. Admin tim Pro bisa membeli paket kuota tambahan dari Pengaturan Tim.",
  },
  {
    id: "andalai-unggah-dokumen",
    product: "AndalAI",
    topic: "Unggah dokumen ke basis pengetahuan",
    keywords: [
      "unggah",
      "upload",
      "dokumen",
      "file pdf",
      "basis pengetahuan",
      "knowledge base",
    ],
    answer:
      "Dokumen PDF, DOCX, TXT, dan CSV bisa diunggah ke basis pengetahuan dari menu Pengetahuan, hingga 20 MB per file. Dokumen diproses beberapa menit sebelum bisa dipakai menjawab; statusnya terlihat di daftar dokumen. File hasil pindaian tanpa teks perlu diproses OCR lebih dulu agar terbaca.",
  },
  {
    id: "andalai-integrasi",
    product: "AndalAI",
    topic: "Integrasi WhatsApp, Slack, dan akses API",
    keywords: [
      "integrasi",
      "api key",
      "akses api",
      "whatsapp",
      "slack",
      "webhook",
    ],
    answer:
      "Integrasi Slack dan WhatsApp Business tersedia di paket Pro dari menu Integrasi. Akses API dibuat oleh admin di Pengaturan Tim, Kunci API; kunci hanya ditampilkan sekali saat dibuat. Jangan pernah mengirim kunci API lewat chat support; bila bocor, cabut lalu buat kunci baru.",
  },
  {
    id: "andalai-jawaban-salah",
    product: "AndalAI",
    topic: "Jawaban AndalAI kurang akurat",
    keywords: [
      "jawaban salah",
      "ngawur",
      "halusinasi",
      "tidak akurat",
      "jawabannya salah",
    ],
    answer:
      "AndalAI menjawab berdasarkan dokumen di basis pengetahuan tim. Jika jawaban kurang akurat, pastikan dokumen rujukannya sudah diunggah dan berstatus siap, lalu ajukan pertanyaan yang menyebut konteks spesifik. Tandai jawaban dengan tombol jempol bawah agar tim bisa meninjau contohnya.",
  },
  {
    id: "andalai-riwayat-tim",
    product: "AndalAI",
    topic: "Riwayat percakapan dalam tim",
    keywords: [
      "riwayat chat",
      "percakapan tim",
      "admin tim",
      "lihat chat",
      "chat pribadi",
    ],
    answer:
      "Percakapan pribadi hanya terlihat oleh anggota yang membuatnya. Percakapan di ruang bersama terlihat oleh semua anggota ruang itu. Admin tim bisa melihat statistik pemakaian dan mengelola ruang, tetapi tidak membaca percakapan pribadi anggota.",
  },
  {
    id: "andalai-tagihan-tim",
    product: "AndalAI",
    topic: "Tagihan untuk tim",
    keywords: [
      "tagihan tim",
      "bayar untuk tim",
      "pemilik ruang kerja",
      "admin pembayaran",
      "pindah pemilik",
    ],
    answer:
      "Tagihan AndalAI Pro dibayar oleh pemilik ruang kerja untuk semua kursi sekaligus. Kepemilikan bisa dipindahkan ke admin lain dari Pengaturan Tim, Pemilik; tagihan berikutnya memakai metode pembayaran pemilik baru. Anggota tim tidak menerima tagihan terpisah.",
  },
];

const TEMPLATE: KnowledgeEntry[] = [
  {
    id: "template-download",
    product: "Template",
    topic: "Unduh template yang dibeli",
    keywords: ["template", "unduh", "download", "beli", "tombol"],
    answer:
      "Template yang dibeli bisa diunduh ulang tanpa batas dari menu Pembelian Saya. Jika tombol unduh tidak merespons, muat ulang halaman dan matikan pemblokir iklan; bila tetap gagal, kirim nomor invoice dan nama template.",
  },
  {
    id: "template-lisensi",
    product: "Template",
    topic: "Lisensi pemakaian template",
    keywords: [
      "lisensi",
      "komersial",
      "untuk klien",
      "jual ulang",
      "hak pakai",
    ],
    answer:
      "Lisensi standar mengizinkan template dipakai untuk proyek sendiri dan proyek klien tanpa batas jumlah, termasuk proyek komersial. Template tidak boleh dijual ulang atau dibagikan sebagai template, baik utuh maupun dimodifikasi. Lisensi berlaku untuk akun pembeli dan tidak bisa dipindahkan.",
  },
  {
    id: "template-edit",
    product: "Template",
    topic: "Mengubah isi template",
    keywords: [
      "edit template",
      "ubah template",
      "kustom",
      "sesuaikan",
      "ganti warna",
    ],
    answer:
      "Setiap template menyertakan panduan di file README atau halaman pertama. Template Figma diedit lewat komponen dan style warna, template Notion lewat Duplikat ke ruang kerja Anda, dan template kode lewat file konfigurasi tema. Ganti warna dan font utama di satu tempat agar seluruh halaman ikut berubah.",
  },
  {
    id: "template-pembaruan",
    product: "Template",
    topic: "Pembaruan versi template",
    keywords: [
      "versi terbaru",
      "update template",
      "pembaruan template",
      "changelog",
    ],
    answer:
      "Pembaruan template gratis untuk pembeli. Versi terbaru selalu tersedia di menu Pembelian Saya, dan catatan perubahannya ada di halaman produk. Unduh versi baru ke folder terpisah agar perubahan Anda di versi lama tidak tertimpa.",
  },
  {
    id: "template-file-rusak",
    product: "Template",
    topic: "File template rusak atau tidak bisa dibuka",
    keywords: ["file rusak", "tidak bisa dibuka", "zip", "ekstrak", "corrupt"],
    answer:
      "Ekstrak file ZIP lebih dulu sebelum membuka isinya; membuka langsung dari dalam ZIP sering gagal. Jika ekstraksi gagal, unduh ulang karena unduhan bisa terputus. Template Figma dibuka dengan Impor di Figma, bukan klik dua kali. Bila tetap rusak, kirim nama template dan pesan galatnya.",
  },
  {
    id: "template-email-berbeda",
    product: "Template",
    topic: "Pembelian tidak muncul di akun",
    keywords: [
      "beda email",
      "email lain",
      "tidak muncul di pembelian",
      "pembelian hilang",
      "beli tanpa akun",
    ],
    answer:
      "Pembelian tercatat di akun dengan email yang dipakai saat checkout. Jika membeli dengan email lain atau tanpa masuk, buat atau masuk ke akun dengan email itu, atau minta tim memindahkan pembelian dengan mengirim nomor invoice dan email tujuan.",
  },
  {
    id: "template-kode",
    product: "Template",
    topic: "Menjalankan template kode",
    keywords: [
      "npm",
      "next.js",
      "install",
      "jalankan template",
      "kode sumber",
      "source code",
    ],
    answer:
      "Template kode membutuhkan Node.js versi LTS. Ekstrak file, jalankan perintah instal dependensi lalu perintah dev sesuai README, kemudian buka alamat lokal yang ditampilkan. Galat instalasi biasanya karena versi Node terlalu lama. Tim support membantu masalah template, bukan modifikasi kode pelanggan.",
  },
  {
    id: "template-permintaan",
    product: "Template",
    topic: "Permintaan template baru",
    keywords: [
      "request template",
      "template baru",
      "landing page",
      "rencana bikin",
    ],
    answer:
      "Usulan template baru dicatat tim produk; usulan dengan banyak dukungan diprioritaskan. Template baru diumumkan di halaman Template dan kanal pengumuman Discord. Tim support tidak bisa menjanjikan jadwal rilis atau membuat template khusus per pelanggan.",
  },
];

const KOMUNITAS: KnowledgeEntry[] = [
  {
    id: "community-discord",
    product: "Komunitas",
    topic: "Bergabung ke Discord komunitas",
    keywords: ["discord", "komunitas", "gabung", "server", "undangan"],
    answer:
      "Tautan undangan Discord ada di dasbor member. Masuk dengan akun membership aktif lalu pilih Gabung Komunitas dan hubungkan akun Discord Anda. Jika email akun berubah atau tautan kedaluwarsa, minta undangan baru ke tim support.",
  },
  {
    id: "komunitas-role",
    product: "Komunitas",
    topic: "Role member dan channel terkunci",
    keywords: [
      "role",
      "channel terkunci",
      "channel member",
      "verifikasi discord",
      "tidak bisa chat",
    ],
    answer:
      "Role Member diberikan otomatis setelah akun Discord dihubungkan dari dasbor member, biasanya dalam beberapa menit. Jika channel member masih terkunci, putuskan lalu hubungkan ulang akun Discord dari dasbor. Role dicabut otomatis saat membership berakhir dan kembali saat diperpanjang.",
  },
  {
    id: "komunitas-acara",
    product: "Komunitas",
    topic: "Acara dan meetup komunitas",
    keywords: ["acara", "event", "meetup", "kopdar", "jadwal komunitas"],
    answer:
      "Acara komunitas (sesi online bulanan dan meetup kota) diumumkan di channel acara Discord dan halaman Komunitas. Pendaftaran dibuka sekitar dua minggu sebelumnya dengan kuota terbatas. Rekaman sesi online tersedia untuk member di channel arsip.",
  },
  {
    id: "komunitas-aturan",
    product: "Komunitas",
    topic: "Aturan komunitas dan laporan pelanggaran",
    keywords: [
      "aturan komunitas",
      "peraturan",
      "spam",
      "laporkan",
      "pelanggaran",
      "banned",
      "dikeluarkan",
    ],
    answer:
      "Aturan komunitas melarang spam, promosi tanpa izin, ujaran kebencian, dan membagikan materi berbayar. Laporkan pelanggaran dengan perintah lapor di Discord atau kirim tautan pesannya ke tim support. Banding atas pembatasan akun diajukan ke tim support dan ditinjau moderator manusia.",
  },
  {
    id: "komunitas-showcase",
    product: "Komunitas",
    topic: "Berbagi karya dan minta masukan",
    keywords: [
      "showcase",
      "pamer karya",
      "minta feedback",
      "review karya",
      "portofolio",
    ],
    answer:
      "Bagikan karya di channel showcase dengan deskripsi singkat dan jenis masukan yang diinginkan. Sesi review karya oleh mentor diadakan dua kali sebulan untuk member; pendaftarannya lewat formulir yang dipasang di channel pengumuman.",
  },
  {
    id: "komunitas-mentoring",
    product: "Komunitas",
    topic: "Sesi mentoring dan office hour",
    keywords: [
      "mentor",
      "mentoring",
      "office hour",
      "konsultasi",
      "tanya jawab",
    ],
    answer:
      "Office hour bersama mentor berlangsung setiap minggu di voice channel Discord dan terbuka untuk member Pro. Jadwal dan topik diumumkan di channel acara. Konsultasi privat satu lawan satu belum tersedia.",
  },
];

export const KNOWLEDGE: KnowledgeEntry[] = [
  ...UMUM,
  ...MEMBERSHIP,
  ...PRDTASK,
  ...DESAINPAKEAI,
  ...ANDALAI,
  ...TEMPLATE,
  ...KOMUNITAS,
];
