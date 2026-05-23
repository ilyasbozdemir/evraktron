<div align="center">
  <img src="public/icon.png" alt="Evraktron Logo" width="120" />
  <h1>Evraktron</h1>
  <p><b>Modern, Offline ve Şablon Tabanlı Taşınabilir Evrak Yönetim Sistemi</b></p>
</div>

---

**Evraktron**, kurumlar, departmanlar ve bireysel kullanıcılar için
geliştirilmiş, tamamen yerel (offline) çalışan, hızlı ve esnek bir evrak takip
uygulamasıdır.

Tüm evrak kayıtlarınız, ayarlarınız, özel veri alanlarınız ve ekli dosyalarınız
tek bir `.etapp` (Evrak Takip Programı) dosyası içerisinde şifrelenmiş (SQLite +
Zip mimarisi) olarak saklanır. Bu sayede projenizi/veritabanınızı bir klasör
gibi USB bellekte taşıyabilir, istediğiniz bilgisayarda çift tıklayarak anında
çalıştırabilirsiniz.

## ✨ Temel Özellikler

- 🔒 **Tamamen Offline:** Verileriniz asla buluta gitmez. Tüm okuma, yazma ve
  arama işlemleri yerel cihazınızda gerçekleşir.
- 📁 **Tek Dosya Mimarisi (`.etapp`):** Veritabanı ve ek dosyalar (PDF, Word,
  Excel, vb.) tek bir paket (.etapp) dosyasında tutulur.
- ⚡ **Ultra Hızlı Gelişmiş Arama:** SQLite FTS5 (Full-Text Search) mimarisi
  sayesinde, binlerce evrak arasında "Ruhsat 2024", "Ada Parsel" gibi kelime
  bazlı, anlık, çoklu arama yapabilirsiniz.
- ⚙️ **Dinamik Proje Ayarları:**
  - Özel kurum adı atama.
  - Sık kullanılan klasör ismini sabitleme.
  - **Metadata Şablonlama:** Dosyalarınıza özgü "Ada, Parsel, Ruhsat No" gibi
    özel alanları bir kez tanımlayın, her "Yeni Evrak" oluşturduğunuzda bu
    alanlar doldurulmaya hazır bir form olarak karşınıza gelsin.
- 📊 **Dışa Aktarma:** Seçtiğiniz evrak listesini Excel (`.xlsx`), PDF (`.pdf`)
  ve `.csv` formatında saniyeler içinde raporlayın.
- 🎨 **Modern Arayüz & Temalar:** Göz yormayan, profesyonel "Dark Mode" odaklı
  arayüz (Light mode desteğiyle beraber). Radix UI ve TailwindCSS ile
  harmanlanmış cam görünümlü (Glassmorphism) modern tasarım.

## 🛠️ Kullanılan Teknolojiler

- **Core:** [Electron](https://www.electronjs.org/) +
  [React](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Veritabanı:** [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)
  (FTS5 & WAL Modu Aktif)
- **Stil & UI:** [TailwindCSS](https://tailwindcss.com/) +
  [Radix UI](https://www.radix-ui.com/) + Lucide Icons
- **Paketleyici:** [electron-builder](https://www.electron.build/) (NSIS
  Installer & Portable sürümleri)

## 🚀 Kurulum & Geliştirme

Projeyi yerel ortamınıza çekmek ve geliştirmeye başlamak için:

```bash
# 1. Depoyu klonlayın
git clone https://github.com/ilyas-bozdemir/evraktron.git
cd evraktron

# 2. Bağımlılıkları yükleyin (pnpm önerilir)
pnpm install

# 3. Geliştirme (Dev) sunucusunu başlatın
pnpm dev
```

## 📦 Derleme (Build & Release)

Uygulama, hem Kurulum (Setup) dosyası (Kayıt Defteri entegrasyonlu) hem de
Kurulumsuz (Portable) versiyon olarak çıktı verecek şekilde yapılandırılmıştır.

```bash
# Windows için NSIS Setup ve Portable sürümünü oluşturur
pnpm run build:win
```

_Derlenen dosyalar `dist-electron/` klasörü içerisinde bulunacaktır._

> **Not:** `.github/workflows/release.yml` dosyası sayesinde, Github deponuza
> `v1.x.x` formatında yeni bir "Tag" attığınızda GitHub Actions otomatik olarak
> Windows `.exe` dosyalarını oluşturup "Releases" sekmesinde yayınlar.

## 🪟 Windows Entegrasyonu

Evraktron'u kurduğunuzda Windows Kayıt Defteri (Registry) entegrasyonu otomatik
olarak yapılır:

- Masaüstünde Sağ Tık -> **Yeni -> Evrak Takip Programı Dosyası** kısayolu
  eklenir.
- `.etapp` uzantılı dosyalara Evraktron logoları tanımlanır.
- Dosyalara çift tıklandığında anında Evraktron uygulamasında açılır.

## 👨‍💻 Geliştirici

**İlyas Bozdemir** - GIS & Software Developer

---

_Bu proje MIT Lisansı ile lisanslanmıştır._
