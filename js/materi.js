/* ============================================================
   materi.js — konten penjelasan tiap bahasa + logic tampilan
   ============================================================ */

const MATERI_DATA = {
  html: {
    title: 'HTML — HyperText Markup Language',
    badge: 'html',
    desc: 'HTML adalah bahasa markup untuk menyusun <b>struktur</b> sebuah halaman web: judul, paragraf, gambar, tombol, form, dll. HTML sendiri bukan "bahasa pemrograman" (tidak ada logika/perhitungan), tapi tanpanya browser tidak tahu apa yang harus ditampilkan.',
    points: [
      'Setiap elemen ditulis dengan tag pembuka <code>&lt;tag&gt;</code> dan penutup <code>&lt;/tag&gt;</code>.',
      'Dokumen HTML selalu diawali <code>&lt;!DOCTYPE html&gt;</code> lalu <code>&lt;html&gt;</code>, <code>&lt;head&gt;</code>, dan <code>&lt;body&gt;</code>.',
      'Atribut (seperti <code>class</code>, <code>id</code>, <code>src</code>) menambahkan info ekstra ke sebuah elemen.',
    ],
    code: `<!DOCTYPE html>
<html>
  <head>
    <title>Halaman Pertamaku</title>
  </head>
  <body>
    <h1>Halo, Sensei!</h1>
    <p>Ini paragraf pertamaku pakai HTML.</p>
    <button>Klik aku</button>
  </body>
</html>`,
  },
  css: {
    title: 'CSS — Cascading Style Sheets',
    badge: 'css',
    desc: 'CSS dipakai untuk mengatur <b>tampilan</b> dari elemen HTML: warna, ukuran, jarak, posisi, sampai animasi. Tanpa CSS, semua halaman HTML akan terlihat polos — cuma teks hitam di atas putih.',
    points: [
      'Selector menunjuk elemen mana yang mau distyle, misalnya <code>h1</code>, <code>.class</code>, atau <code>#id</code>.',
      'Setiap aturan berisi <code>properti: nilai;</code> di dalam kurung kurawal.',
      '"Cascading" artinya aturan bisa saling menimpa — yang lebih spesifik atau ditulis belakangan biasanya menang.',
    ],
    code: `h1 {
  color: #7c9eff;
  font-size: 2rem;
}

.card {
  background: #161c29;
  border-radius: 12px;
  padding: 20px;
}`,
  },
  js: {
    title: 'JavaScript',
    badge: 'js',
    desc: 'JavaScript adalah bahasa pemrograman yang berjalan di browser (dan juga server, lewat Node.js). Dengan JS, halaman bisa <b>bereaksi</b> terhadap klik, input pengguna, dan mengubah tampilan secara dinamis tanpa reload halaman.',
    points: [
      'Variabel dibuat dengan <code>let</code>, <code>const</code>, atau <code>var</code> (hindari <code>var</code> di kode baru).',
      'Fungsi bisa dipanggil ulang kapan saja, mengurangi kode yang berulang.',
      '<code>addEventListener</code> dipakai untuk "mendengarkan" aksi pengguna, misalnya klik tombol.',
    ],
    code: `const btn = document.querySelector('button');

btn.addEventListener('click', () => {
  alert('Tombolnya diklik, Sensei!');
});`,
  },
  git: {
    title: 'Git & GitHub',
    badge: 'git',
    desc: 'Git adalah sistem <b>version control</b>: mencatat setiap perubahan kode supaya bisa di-rollback atau dilihat riwayatnya. GitHub adalah layanan online untuk menyimpan repository Git dan berkolaborasi — sekaligus tempat kamu deploy project ini ke Vercel.',
    points: [
      '<code>git init</code> memulai repository baru di folder project.',
      '<code>git add .</code> lalu <code>git commit -m "pesan"</code> menyimpan perubahan sebagai satu "titik riwayat".',
      '<code>git push</code> mengunggah commit ke GitHub supaya bisa dihubungkan ke Vercel untuk auto-deploy.',
    ],
    code: `git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/username/repo.git
git push -u origin main`,
  },
  python: {
    title: 'Python',
    badge: 'py',
    desc: 'Python terkenal dengan sintaksnya yang bersih dan mudah dibaca, cocok banget buat pemula. Dipakai luas untuk automasi, data science, backend web, sampai AI.',
    points: [
      'Tidak pakai kurung kurawal — blok kode ditentukan oleh indentasi (spasi/tab).',
      'Tipe data fleksibel: variabel tidak perlu dideklarasikan tipenya di awal.',
      'Punya ekosistem library sangat besar lewat <code>pip install</code>.',
    ],
    code: `def sapa(nama):
    print(f"Halo, {nama}!")

sapa("Sensei")`,
  },
  terminal: {
    title: 'Terminal / Command Line',
    badge: 'term',
    desc: 'Terminal (CLI) adalah cara berinteraksi dengan komputer lewat perintah teks, bukan klik-klik mouse. Banyak tool programmer (git, npm, python) dijalankan lewat sini.',
    points: [
      '<code>cd nama-folder</code> pindah ke dalam folder, <code>cd ..</code> naik satu tingkat.',
      '<code>ls</code> (Mac/Linux) atau <code>dir</code> (Windows) menampilkan isi folder.',
      '<code>npm install</code> memasang semua dependency project berdasarkan <code>package.json</code>.',
    ],
    code: `cd folder-project
ls
npm install
npm run dev`,
  },
};

function renderMateriDetail(key) {
  const data = MATERI_DATA[key];
  const slot = document.getElementById('materi-detail-slot');
  if (!data || !slot) return;

  const pointsHtml = data.points.map(p => `<li>${p}</li>`).join('');

  slot.innerHTML = `
    <div class="materi-detail">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">
        <div class="logo-badge ${data.badge}">${data.badge === 'html' ? '&lt;/&gt;' : data.badge === 'css' ? '{ }' : data.badge === 'js' ? 'JS' : data.badge === 'git' ? 'git' : data.badge === 'py' ? 'py' : '$_'}</div>
        <h4>${data.title}</h4>
      </div>
      <p>${data.desc}</p>
      <ul>${pointsHtml}</ul>
      <pre><code>${KM.escapeHtml(data.code)}</code></pre>
    </div>
  `;
  slot.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

document.addEventListener('DOMContentLoaded', () => {
  const grid = document.getElementById('materi-grid');
  if (!grid) return;
  grid.addEventListener('click', (e) => {
    const card = e.target.closest('.materi-card');
    if (!card) return;
    renderMateriDetail(card.dataset.materi);
  });
});
