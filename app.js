let kategoriler = [
    { id: 1, ad: "Satranç" },
    { id: 2, ad: "Sinema" },
    { id: 3, ad: "Almanca" },
    { id: 4, ad: "Antrenman" }
];

let altKategoriler = [
    { id: 101, ad: "Açılış Çalışmaları", ustId: 1 },
    { id: 102, ad: "Film Analizleri", ustId: 2 },
    { id: 103, ad: "CASA Kelime Listesi", ustId: 3 },
    { id: 104, ad: "Makro Takibi", ustId: 4 }
];

let icerikler = [
    { id: 1001, baslik: "Caro-Kann İncelemesi", altId: 101, tur: "not", pdfUrl: "", notlar: "Merkez kontrolü notları..." }
];

let aktifKat = null;
let aktifAltKat = null;
let acikIcerikId = null;

const grid = document.getElementById('kutuphaneGrid');
const breadcrumb = document.getElementById('breadcrumb');
const detayModal = document.getElementById('detayModal');
const yeniIcerikModal = document.getElementById('yeniIcerikModal');
const klasorModal = document.getElementById('klasorModal'); // YENİ EKLENDİ

function ekranıGuncelle() {
    grid.innerHTML = '';
    
    let navHtml = `<span class="yol-elemani" onclick="gitAnaSayfa()">Ana Sayfa</span>`;
    if (aktifKat) navHtml += `<span class="ayirici">/</span><span class="yol-elemani" onclick="gitKategori()">${aktifKat.ad}</span>`;
    if (aktifAltKat) navHtml += `<span class="ayirici">/</span><span class="yol-elemani">${aktifAltKat.ad}</span>`;
    breadcrumb.innerHTML = navHtml;

    if (!aktifKat) {
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

function silKategori(e, id) { e.stopPropagation(); if(confirm("Klasör silinsin mi?")) { kategoriler = kategoriler.filter(k => k.id !== id); ekranıGuncelle(); } }
function silAltKategori(e, id) { e.stopPropagation(); if(confirm("Alt klasör silinsin mi?")) { altKategoriler = altKategoriler.filter(ak => ak.id !== id); ekranıGuncelle(); } }
function silIcerik(e, id) { e.stopPropagation(); if(confirm("İçerik silinsin mi?")) { icerikler = icerikler.filter(ic => ic.id !== id); ekranıGuncelle(); } }

function gitAnaSayfa() { aktifKat = null; aktifAltKat = null; ekranıGuncelle(); }
function gitKategori() { aktifAltKat = null; ekranıGuncelle(); }

// --- YENİ KLASÖR MODALI MANTIĞI ---
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

// Klasör Oluşturma Butonu
document.getElementById('klasorOlusturBtn').addEventListener('click', () => {
    const ad = document.getElementById('klasorAdInput').value.trim();
    if(!ad) { alert("Lütfen bir isim girin."); return; }

    if (!aktifKat) {
        kategoriler.push({ id: Date.now(), ad });
    } else if (!aktifAltKat) {
        altKategoriler.push({ id: Date.now(), ad, ustId: aktifKat.id });
    }
    klasorModal.style.display = 'none';
    ekranıGuncelle();
});

// --- İÇERİK MODALI MANTIĞI ---
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

document.getElementById('olusturBtn').addEventListener('click', () => {
    const baslik = document.getElementById('yeniBaslik').value;
    const tur = document.querySelector('input[name="icerikTuru"]:checked').value;
    if(!baslik) { alert("Lütfen bir başlık girin."); return; }

    let yeni = { id: Date.now(), baslik: baslik, altId: aktifAltKat.id, tur: tur, notlar: "", pdfUrl: "" };

    if (tur === 'not') {
        yeni.notlar = document.getElementById('yeniNot').value;
    } else {
        const fileInput = document.getElementById('yeniPdfDosya');
        if (fileInput.files.length > 0) {
            yeni.pdfUrl = URL.createObjectURL(fileInput.files[0]); 
        } else {
            alert("Lütfen bir PDF dosyası seçin!"); return;
        }
    }
    icerikler.push(yeni);
    yeniIcerikModal.style.display = 'none';
    ekranıGuncelle();
});

function detaylariAc(icerik) {
    acikIcerikId = icerik.id;
    document.getElementById('modalBaslik').innerText = icerik.baslik;
    document.getElementById('modalNotlar').value = icerik.notlar || "";
    
    const pdfGoruntule = document.getElementById('pdfGoruntuleAlani');
    const pdfAcBtn = document.getElementById('pdfAcBtn');

    if (icerik.tur === 'pdf') {
        pdfGoruntule.style.display = 'block';
        pdfAcBtn.href = icerik.pdfUrl;
    } else {
        pdfGoruntule.style.display = 'none';
    }
    detayModal.style.display = 'flex';
}

document.getElementById('kaydetBtn').addEventListener('click', () => {
    const ic = icerikler.find(i => i.id === acikIcerikId);
    if(ic) { ic.notlar = document.getElementById('modalNotlar').value; detayModal.style.display = 'none'; }
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

const temaBtn = document.getElementById('temaBtn');
temaBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    temaBtn.innerText = document.body.classList.contains('dark-mode') ? "☀️ Açık Mod" : "🌙 Koyu Mod";
});

ekranıGuncelle();
