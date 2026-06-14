// FIREBASE MODÜLLERİNİ İÇE AKTAR (Güvenilir 10.12.0 Sürümü)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// GÖNDERDİĞİN FIREBASE ANAHTARLARI
const firebaseConfig = {
    apiKey: "AIzaSyCK3hB5I7XP4EETba2PjqChBeQR1rbbGdU",
    authDomain: "shelvd-d99e0.firebaseapp.com",
    projectId: "shelvd-d99e0",
    storageBucket: "shelvd-d99e0.firebasestorage.app",
    messagingSenderId: "392384969338",
    appId: "1:392384969338:web:35a290865aa081c7fad9c3"
};

// FIREBASE'İ BAŞLAT
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// UYGULAMA VERİLERİ
let currentUser = null;
let kategoriler = [];
let altKategoriler = [];
let icerikler = [];

let aktifKat = null;
let aktifAltKat = null;
let acikIcerikId = null;

// HTML ELEMENTLERİ
const authEkrani = document.getElementById('authEkrani');
const authEmail = document.getElementById('authEmail');
const authSifre = document.getElementById('authSifre');
const authHata = document.getElementById('authHata');
const grid = document.getElementById('kutuphaneGrid');
const breadcrumb = document.getElementById('breadcrumb');
const detayModal = document.getElementById('detayModal');
const yeniIcerikModal = document.getElementById('yeniIcerikModal');
const klasorModal = document.getElementById('klasorModal');

// ==========================================
// 1. KİMLİK DOĞRULAMA (GİRİŞ / ÇIKIŞ)
// ==========================================

// Kullanıcı durumu değiştiğinde (Girdi mi / Çıktı mı)
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        authEkrani.style.display = 'none'; // Giriş ekranını gizle
        await verileriBuluttanGetir(); // Verileri Firestore'dan çek
    } else {
        currentUser = null;
        authEkrani.style.display = 'flex'; // Giriş ekranını göster
        kategoriler = []; altKategoriler = []; icerikler = []; // Ekranı temizle
    }
});

// Kayıt Ol Butonu
document.getElementById('kayitBtn').addEventListener('click', () => {
    const email = authEmail.value;
    const sifre = authSifre.value;
    createUserWithEmailAndPassword(auth, email, sifre)
        .catch(error => { authHata.innerText = "Kayıt Hatası: " + error.message; authHata.style.display = 'block'; });
});

// Giriş Yap Butonu
document.getElementById('girisBtn').addEventListener('click', () => {
    const email = authEmail.value;
    const sifre = authSifre.value;
    signInWithEmailAndPassword(auth, email, sifre)
        .catch(error => { authHata.innerText = "Giriş Hatası: Yanlış e-posta veya şifre."; authHata.style.display = 'block'; });
});

// Çıkış Yap Butonu
document.getElementById('cikisBtn').addEventListener('click', () => {
    signOut(auth);
});

// ==========================================
// 2. BULUT VERİTABANI İŞLEMLERİ (FIRESTORE)
// ==========================================

async function verileriBuluttanGetir() {
    if (!currentUser) return;
    try {
        const docRef = doc(db, "users", currentUser.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            kategoriler = data.kategoriler || [];
            altKategoriler = data.altKategoriler || [];
            icerikler = data.icerikler || [];
        }
        ekranıGuncelle();
    } catch (e) {
        console.error("Veri çekme hatası:", e);
    }
}

// Her değişiklikte Firestore'u güncelleyen fonksiyon
async function verileriBulutaKaydet() {
    if (!currentUser) return;
    try {
        await setDoc(doc(db, "users", currentUser.uid), {
            kategoriler: kategoriler,
            altKategoriler: altKategoriler,
            icerikler: icerikler
        });
    } catch (e) {
        console.error("Kaydetme hatası:", e);
    }
}

// ==========================================
// 3. PDF İÇİN YEREL HAFIZA (INDEXED-DB)
// ==========================================
let localDB;
const request = indexedDB.open("StuffdDB", 1);
request.onupgradeneeded = (e) => {
    localDB = e.target.result;
    if (!localDB.objectStoreNames.contains("pdfs")) localDB.createObjectStore("pdfs");
};
request.onsuccess = (e) => { localDB = e.target.result; };

function pdfKaydet(id, file) {
    const transaction = localDB.transaction(["pdfs"], "readwrite");
    const store = transaction.objectStore("pdfs");
    store.put(file, id);
}
function pdfSil(id) {
    const transaction = localDB.transaction(["pdfs"], "readwrite");
    const store = transaction.objectStore("pdfs");
    store.delete(id);
}

// ==========================================
// 4. ARAYÜZ (UI) MANTIĞI
// ==========================================

function ekranıGuncelle() {
    grid.innerHTML = '';
    
    let navHtml = `<span class="yol-elemani" onclick="gitAnaSayfa()">Ana Sayfa</span>`;
    if (aktifKat) navHtml += `<span class="ayirici">/</span><span class="yol-elemani" onclick="gitKategori()">${aktifKat.ad}</span>`;
    if (aktifAltKat) navHtml += `<span class="ayirici">/</span><span class="yol-elemani">${aktifAltKat.ad}</span>`;
    breadcrumb.innerHTML = navHtml;

    if (!aktifKat) {
        if(kategoriler.length === 0) grid.innerHTML = '<p style="color:var(--text-muted);">Henüz klasör yok. Yeni ekle butonundan başlayabilirsin.</p>';
        kategoriler.forEach(kat => {
            const card = document.createElement('div'); card.className = 'card';
            card.innerHTML = `<button class="sil-btn" onclick="silKategori(event, ${kat.id})">&times;</button><div class="folder-icon">📁</div><h2 class="title">${kat.ad}</h2>`;
            card.onclick = () => { aktifKat = kat; ekranıGuncelle(); };
            grid.appendChild(card);
        });
    } else if (!aktifAltKat) {
        const buKlasordekiler = altKategoriler.filter(ak => ak.ustId === aktifKat.id);
        if(buKlasordekiler.length === 0) grid.innerHTML = '<p style="color:var(--text-muted);">Bu klasör boş.</p>';
        buKlasordekiler.forEach(altKat => {
            const card = document.createElement('div'); card.className = 'card';
            card.innerHTML = `<button class="sil-btn" onclick="silAltKategori(event, ${altKat.id})">&times;</button><div class="folder-icon">📂</div><h2 class="title">${altKat.ad}</h2>`;
            card.onclick = () => { aktifAltKat = altKat; ekranıGuncelle(); };
            grid.appendChild(card);
        });
    } else {
        const buIcerikler = icerikler.filter(ic => ic.altId === aktifAltKat.id);
        if(buIcerikler.length === 0) grid.innerHTML = '<p style="color:var(--text-muted);">Henüz içerik eklenmemiş.</p>';
        buIcerikler.forEach(icerik => {
            const card = document.createElement('div'); card.className = 'card';
            const etiketMetni = icerik.tur === 'pdf' ? "📄 PDF" : "📝 Not";
            card.innerHTML = `<button class="sil-btn" onclick="silIcerik(event, ${icerik.id})">&times;</button><span class="tag">${etiketMetni}</span><h2 class="title">${icerik.baslik}</h2>`;
            card.onclick = () => detaylariAc(icerik);
            grid.appendChild(card);
        });
    }
}

// Module mimarisi kullandığımız için fonksiyonları globale bağlamamız gerekiyor
window.gitAnaSayfa = () => { aktifKat = null; aktifAltKat = null; ekranıGuncelle(); };
window.gitKategori = () => { aktifAltKat = null; ekranıGuncelle(); };

window.silKategori = (e, id) => { e.stopPropagation(); if(confirm("Klasör silinsin mi?")) { kategoriler = kategoriler.filter(k => k.id !== id); verileriBulutaKaydet(); ekranıGuncelle(); } };
window.silAltKategori = (e, id) => { e.stopPropagation(); if(confirm("Alt klasör silinsin mi?")) { altKategoriler = altKategoriler.filter(ak => ak.id !== id); verileriBulutaKaydet(); ekranıGuncelle(); } };
window.silIcerik = (e, id) => { 
    e.stopPropagation(); 
    if(confirm("İçerik silinsin mi?")) { 
        const silinecek = icerikler.find(ic => ic.id === id);
        if (silinecek && silinecek.tur === 'pdf') pdfSil(id);
        icerikler = icerikler.filter(ic => ic.id !== id); 
        verileriBulutaKaydet(); 
        ekranıGuncelle(); 
    } 
};

// YENİ EKLEME İŞLEMLERİ
document.getElementById('yeniEkleBtn').addEventListener('click', () => {
    if (!aktifKat || !aktifAltKat) {
        document.getElementById('klasorModalBaslik').innerText = !aktifKat ? "Yeni Ana Klasör" : "Yeni Alt Klasör";
        document.getElementById('klasorAdInput').value = "";
        klasorModal.style.display = 'flex';
    } else {
        yeniIcerikModal.style.display = 'flex';
        document.getElementById('yeniBaslik').value = '';
        document.getElementById('yeniNot').value = '';
        document.getElementById('yeniPdfDosya').value = '';
    }
});

document.getElementById('klasorOlusturBtn').addEventListener('click', () => {
    const ad = document.getElementById('klasorAdInput').value.trim();
    if(!ad) return;
    if (!aktifKat) { kategoriler.push({ id: Date.now(), ad }); } 
    else if (!aktifAltKat) { altKategoriler.push({ id: Date.now(), ad, ustId: aktifKat.id }); }
    verileriBulutaKaydet();
    klasorModal.style.display = 'none';
    ekranıGuncelle();
});

document.querySelectorAll('input[name="icerikTuru"]').forEach(btn => {
    btn.addEventListener('change', (e) => {
        document.getElementById('yaziliNotAlani').style.display = e.target.value === 'not' ? 'block' : 'none';
        document.getElementById('pdfYuklemeAlani').style.display = e.target.value === 'not' ? 'none' : 'block';
    });
});

document.getElementById('olusturBtn').addEventListener('click', () => {
    const baslik = document.getElementById('yeniBaslik').value;
    const tur = document.querySelector('input[name="icerikTuru"]:checked').value;
    if(!baslik) return;
    const icerikId = Date.now();
    let yeni = { id: icerikId, baslik: baslik, altId: aktifAltKat.id, tur: tur, notlar: "" };

    if (tur === 'not') yeni.notlar = document.getElementById('yeniNot').value;
    else {
        const fileInput = document.getElementById('yeniPdfDosya');
        if (fileInput.files.length > 0) pdfKaydet(icerikId, fileInput.files[0]);
        else { alert("Lütfen bir PDF seçin."); return; }
    }
    icerikler.push(yeni);
    verileriBulutaKaydet();
    yeniIcerikModal.style.display = 'none';
    ekranıGuncelle();
});

function detaylariAc(icerik) {
    acikIcerikId = icerik.id;
    document.getElementById('modalBaslik').innerText = icerik.baslik;
    document.getElementById('modalNotlar').value = icerik.notlar || "";
    
    const pdfGoruntule = document.getElementById('pdfGoruntuleAlani');
    const pdfAcBtn = document.getElementById('pdfAcBtn');
    const pdfIframe = document.getElementById('pdfIframe');

    if (icerik.tur === 'pdf') {
        pdfGoruntule.style.display = 'block'; pdfIframe.style.display = 'none'; pdfAcBtn.style.display = 'block';
        pdfAcBtn.onclick = (e) => {
            e.preventDefault();
            const req = localDB.transaction(["pdfs"], "readonly").objectStore("pdfs").get(icerik.id);
            req.onsuccess = (e) => {
                if (e.target.result) { pdfIframe.src = URL.createObjectURL(e.target.result) + "#view=FitH"; pdfIframe.style.display = 'block'; pdfAcBtn.style.display = 'none'; } 
                else alert("PDF bulunamadı.");
            };
        };
    } else { pdfGoruntule.style.display = 'none'; pdfIframe.src = ""; }
    detayModal.style.display = 'flex';
}

document.getElementById('kaydetBtn').addEventListener('click', () => {
    const ic = icerikler.find(i => i.id === acikIcerikId);
    if(ic) { ic.notlar = document.getElementById('modalNotlar').value; verileriBulutaKaydet(); detayModal.style.display = 'none'; }
});

// PENCERELERİ KAPATMA
['kapatDetayBtn', 'kapatYeniBtn', 'kapatKlasorBtn'].forEach(id => {
    document.getElementById(id).addEventListener('click', (e) => e.target.closest('.modal').style.display = 'none');
});

// KOYU MOD
const temaBtn = document.getElementById('temaBtn');
temaBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    temaBtn.innerText = document.body.classList.contains('dark-mode') ? "☀️ Açık Mod" : "🌙 Koyu Mod";
    localStorage.setItem('kutuphaneTema', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
});
if (localStorage.getItem('kutuphaneTema') === 'dark') { document.body.classList.add('dark-mode'); temaBtn.innerText = "☀️ Açık Mod"; }
