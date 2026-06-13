// HAFIZA SİSTEMİ (Boş Başlangıç)
let kategoriler = JSON.parse(localStorage.getItem('kutuphaneKategoriler')) || [];
let altKategoriler = JSON.parse(localStorage.getItem('kutuphaneAltKategoriler')) || [];
let icerikler = JSON.parse(localStorage.getItem('kutuphaneIcerikler')) || [];

function verileriKaydet() {
    localStorage.setItem('kutuphaneKategoriler', JSON.stringify(kategoriler));
    localStorage.setItem('kutuphaneAltKategoriler', JSON.stringify(altKategoriler));
    localStorage.setItem('kutuphaneIcerikler', JSON.stringify(icerikler));
}

// -----------------------------------------------------------
// YENİ: INDEXED-DB (PDF Gömme ve Kalıcı Saklama Sistemi)
let db;
const request = indexedDB.open("KutuphaneDB", 1);

request.onupgradeneeded = function(event) {
    db = event.target.result;
    if (!db.objectStoreNames.contains("pdfs")) {
        db.createObjectStore("pdfs");
    }
};

request.onsuccess = function(event) {
    db = event.target.result;
};

request.onerror = function(event) {
    console.error("Veritabanı hatası:", event.target.errorCode);
};

// PDF Kaydetme
function pdfKaydet(id, file) {
    const transaction = db.transaction(["pdfs"], "readwrite");
    const store = transaction.objectStore("pdfs");
    store.put(file, id);
}

// PDF Silme
function pdfSil(id) {
    const transaction = db.transaction(["pdfs"], "readwrite");
    const store = transaction.objectStore("pdfs");
    store.delete(id);
}
// -----------------------------------------------------------

let aktifKat = null;
let aktifAltKat = null;
let acikIcerikId = null;

const grid = document.getElementById('kutuphaneGrid');
const breadcrumb = document.getElementById('breadcrumb');
const detayModal = document.getElementById('detayModal');
const yeniIcerikModal = document.getElementById('yeniIcerikModal');
const klasorModal = document.getElementById('klasorModal');

// EKRANI ÇİZME FONKSİYONU
function ekranıGuncelle() {
    grid.innerHTML = '';
    
    let navHtml = `<span class="yol-elemani" onclick="gitAnaSayfa()">Ana Sayfa</span>`;
    if (aktifKat) navHtml += `<span class="ayirici">/</span><span class="yol-elemani" onclick="gitKategori()">${aktifKat.ad}</span>`;
    if (aktifAltKat) navHtml += `<span class="ayirici">/</span><span class="yol-elemani">${aktifAltKat.ad}</span>`;
    breadcrumb.innerHTML = navHtml;

    if (!aktifKat) {
        if(kategoriler.length === 0) grid.innerHTML = '<p style="color:var(--text-muted);">Henüz klasör yok. Yeni ekle butonundan başlayabilirsin.</p>';
        kategoriler.forEach(kat => {
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <button class="sil-btn" onclick="silKategori(event, ${kat.id})">&times;</button>
                <div class="folder-icon">📁</div>
                <h2 class="title">${kat.ad}</h2>
            `;
            card.onclick = () => { aktifKat = kat; ekranıGuncelle(); };
            grid.appendChild(card);
        });
    } 
    else if (!aktifAltKat) {
        const buKlasordekiler = altKategoriler.filter(ak => ak.ustId === aktifKat.id);
        if(buKlasordekiler.length === 0) grid.innerHTML = '<p style="color:var(--text-muted);">Bu klasör boş.</p>';
        buKlasordekiler.forEach(altKat => {
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <button class="sil-btn" onclick="silAltKategori(event, ${altKat.id})">&times;</button>
                <div class="folder-icon">📂</div>
                <h2 class="title">${altKat.ad}</h2>
            `;
            card.onclick = () => { aktifAltKat = altKat; ekranıGuncelle(); };
            grid.appendChild(card);
        });
    } 
    else {
        const buIcerikler = icerikler.filter(ic => ic.altId === aktifAltKat.id);
        if(buIcerikler.length === 0) grid.innerHTML = '<p style="color:var(--text-muted);">Henüz içerik eklenmemiş.</p>';
        buIcerikler.forEach(icerik => {
            const card = document.createElement('div');
            card.className = 'card';
            const etiketMetni = icerik.tur === 'pdf' ? "📄 PDF Belgesi" : "📝 Yazılı Not";
            card.innerHTML = `
                <button class="sil-btn" onclick="silIcerik(event, ${icerik.id})">&times;</button>
                <span class="tag">${etiketMetni}</span>
                <h2 class="title">${icerik.baslik}</h2>
            `;
            card.onclick = () => detaylariAc(icerik);
            grid.appendChild(card);
        });
    }
}

// SİLME İŞLEMLERİ 
function silKategori(e, id) { 
    e.stopPropagation(); 
    if(confirm("Klasör silinsin mi?")) { 
        kategoriler = kategoriler.filter(k => k.id !== id); 
        verileriKaydet(); 
        ekranıGuncelle(); 
    } 
}
function silAltKategori(e, id) { 
    e.stopPropagation(); 
    if(confirm("Alt klasör silinsin mi?")) { 
        altKategoriler = altKategoriler.filter(ak => ak.id !== id); 
        verileriKaydet(); 
        ekranıGuncelle(); 
    } 
}
function silIcerik(e, id) { 
    e.stopPropagation(); 
    if(confirm("İçerik silinsin mi?")) { 
        // Eğer PDF ise veritabanından da sil
        const silinecek = icerikler.find(ic => ic.id === id);
        if (silinecek && silinecek.tur === 'pdf') pdfSil(id);

        icerikler = icerikler.filter(ic => ic.id !== id); 
        verileriKaydet(); 
        ekranıGuncelle(); 
    } 
}

function gitAnaSayfa() { aktifKat = null; aktifAltKat = null; ekranıGuncelle(); }
function gitKategori() { aktifAltKat = null; ekranıGuncelle(); }

// YENİ KLASÖR MANTIĞI
document.getElementById('yeniEkleBtn').addEventListener('click', () => {
    if (!aktifKat) {
        document.getElementById('klasorModalBaslik').innerText = "Yeni Ana Klasör";
        document.getElementById('klasorAdInput').value = "";
        klasorModal.style.display = 'flex';
    } else if (!aktifAltKat) {
        document.getElementById('klasorModalBaslik').innerText = "Yeni Alt Klasör";
        document.getElementById('klasorAdInput').value = "";
        klasorModal.style.display = 'flex';
    } else {
        yeniIcerikModal.style.display = 'flex';
        document.getElementById('yeniBaslik').value = '';
        document.getElementById('yeniNot').value = '';
        document.getElementById('yeniPdfDosya').value = '';
    }
});

// KLASÖR OLUŞTURMA
document.getElementById('klasorOlusturBtn').addEventListener('click', () => {
    const ad = document.getElementById('klasorAdInput').value.trim();
    if(!ad) { alert("Lütfen bir isim girin."); return; }

    if (!aktifKat) {
        kategoriler.push({ id: Date.now(), ad });
    } else if (!aktifAltKat) {
        altKategoriler.push({ id: Date.now(), ad, ustId: aktifKat.id });
    }
    verileriKaydet();
    klasorModal.style.display = 'none';
    ekranıGuncelle();
});

// İÇERİK MODALI TÜR SEÇİMİ
const radioBtns = document.getElementsByName('icerikTuru');
radioBtns.forEach(btn => {
    btn.addEventListener('change', (e) => {
        if(e.target.value === 'not') {
            document.getElementById('yaziliNotAlani').style.display = 'block';
            document.getElementById('pdfYuklemeAlani').style.display = 'none';
        } else {
            document.getElementById('yaziliNotAlani').style.display = 'none';
            document.getElementById('pdfYuklemeAlani').style.display = 'block';
        }
    });
});

// YENİ İÇERİK (PDF / NOT) OLUŞTURMA
document.getElementById('olusturBtn').addEventListener('click', () => {
    const baslik = document.getElementById('yeniBaslik').value;
    const tur = document.querySelector('input[name="icerikTuru"]:checked').value;
    if(!baslik) { alert("Lütfen bir başlık girin."); return; }

    const icerikId = Date.now();
    let yeni = { id: icerikId, baslik: baslik, altId: aktifAltKat.id, tur: tur, notlar: "" };

    if (tur === 'not') {
        yeni.notlar = document.getElementById('yeniNot').value;
    } else {
        const fileInput = document.getElementById('yeniPdfDosya');
        if (fileInput.files.length > 0) {
            pdfKaydet(icerikId, fileInput.files[0]); // PDF'i IndexedDB'ye kaydet
        } else {
            alert("Lütfen bir PDF dosyası seçin!"); return;
        }
    }
    icerikler.push(yeni);
    verileriKaydet();
    yeniIcerikModal.style.display = 'none';
    ekranıGuncelle();
});

// DETAYLARI GÖRÜNTÜLEME VE PDF AÇMA
function detaylariAc(icerik) {
    acikIcerikId = icerik.id;
    document.getElementById('modalBaslik').innerText = icerik.baslik;
    document.getElementById('modalNotlar').value = icerik.notlar || "";
    
    const pdfGoruntule = document.getElementById('pdfGoruntuleAlani');
    const pdfAcBtn = document.getElementById('pdfAcBtn');

    if (icerik.tur === 'pdf') {
        pdfGoruntule.style.display = 'block';
        
        // Tıklanınca PDF'i IndexedDB'den çek ve aç
        pdfAcBtn.onclick = (e) => {
            e.preventDefault();
            const transaction = db.transaction(["pdfs"], "readonly");
            const store = transaction.objectStore("pdfs");
            const req = store.get(icerik.id);
            req.onsuccess = function(e) {
                const file = e.target.result;
                if (file) {
                    const url = URL.createObjectURL(file);
                    window.open(url, '_blank');
                } else {
                    alert("PDF dosyası bulunamadı. Lütfen tekrar yükleyin.");
                }
            };
        };
    } else {
        pdfGoruntule.style.display = 'none';
    }
    detayModal.style.display = 'flex';
}

// NOTLARI GÜNCELLEME
document.getElementById('kaydetBtn').addEventListener('click', () => {
    const ic = icerikler.find(i => i.id === acikIcerikId);
    if(ic) { 
        ic.notlar = document.getElementById('modalNotlar').value; 
        verileriKaydet(); 
        detayModal.style.display = 'none'; 
    }
});

// PENCERELERİ KAPATMA
document.getElementById('kapatDetayBtn').addEventListener('click', () => detayModal.style.display = 'none');
document.getElementById('kapatYeniBtn').addEventListener('click', () => yeniIcerikModal.style.display = 'none');
document.getElementById('kapatKlasorBtn').addEventListener('click', () => klasorModal.style.display = 'none');

window.addEventListener('click', (e) => { 
    if (e.target === detayModal) detayModal.style.display = 'none'; 
    if (e.target === yeniIcerikModal) yeniIcerikModal.style.display = 'none';
    if (e.target === klasorModal) klasorModal.style.display = 'none';
});

// KOYU MOD 
const temaBtn = document.getElementById('temaBtn');
temaBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    temaBtn.innerText = document.body.classList.contains('dark-mode') ? "☀️ Açık Mod" : "🌙 Koyu Mod";
    
    if(document.body.classList.contains('dark-mode')) {
        localStorage.setItem('kutuphaneTema', 'dark');
    } else {
        localStorage.setItem('kutuphaneTema', 'light');
    }
});

if (localStorage.getItem('kutuphaneTema') === 'dark') {
    document.body.classList.add('dark-mode');
    temaBtn.innerText = "☀️ Açık Mod";
}

ekranıGuncelle();
