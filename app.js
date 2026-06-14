// FIREBASE MODÜLLERİNİ İÇE AKTAR
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, sendEmailVerification, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// BURAYA KENDİ FIREBASE ANAHTARLARINI YAPIŞTIR
const firebaseConfig = {
    apiKey: "AIzaSyCK3hB5I7XP4EETba2PjqChBeQR1rbbGdU",
    authDomain: "shelvd-d99e0.firebaseapp.com",
    projectId: "shelvd-d99e0",
    storageBucket: "shelvd-d99e0.firebasestorage.app",
    messagingSenderId: "392384969338",
    appId: "1:392384969338:web:35a290865aa081c7fad9c3"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let kategoriler = []; let altKategoriler = []; let icerikler = [];
let aktifKat = null; let aktifAltKat = null; let acikIcerikId = null;

// EKRAN ELEMENTLERİ
const authEkrani = document.getElementById('authEkrani');
const anaUygulama = document.getElementById('anaUygulama');
const girisFormu = document.getElementById('girisFormu');
const kayitFormu = document.getElementById('kayitFormu');
const sifreFormu = document.getElementById('sifreFormu');
const authMesaj = document.getElementById('authMesaj');

// ==========================================
// 1. KİMLİK DOĞRULAMA (PRO MANTIK)
// ==========================================

// Mesaj Gösterme Fonksiyonu
function mesajGoster(metin, tur) {
    authMesaj.innerText = metin;
    authMesaj.className = tur === 'hata' ? 'mesaj-hata' : 'mesaj-basari';
    authMesaj.style.display = 'block';
}

// Şifre Gücü Kontrolü (En az 8 hane, 1 Büyük Harf, 1 Rakam)
function sifreGucluMu(sifre) {
    const kural = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
    return kural.test(sifre);
}

// Ekranlar Arası Geçiş Animasyonları
document.getElementById('gitKayitOl').onclick = () => { girisFormu.style.display = 'none'; kayitFormu.style.display = 'block'; authMesaj.style.display = 'none'; };
document.getElementById('gitGirisYap').onclick = () => { kayitFormu.style.display = 'none'; girisFormu.style.display = 'block'; authMesaj.style.display = 'none'; };
document.getElementById('gitSifreSifirla').onclick = () => { girisFormu.style.display = 'none'; sifreFormu.style.display = 'block'; authMesaj.style.display = 'none'; };
document.getElementById('gitGirisYap2').onclick = () => { sifreFormu.style.display = 'none'; girisFormu.style.display = 'block'; authMesaj.style.display = 'none'; };

// Kullanıcı Durumu Takibi
onAuthStateChanged(auth, async (user) => {
    if (user) {
        if (user.emailVerified) {
            currentUser = user;
            authEkrani.style.display = 'none';
            anaUygulama.style.display = 'block'; // Ana siteyi göster
            await verileriBuluttanGetir();
        } else {
            // E-postayı henüz onaylamamış
            authEkrani.style.display = 'flex';
            anaUygulama.style.display = 'none';
            mesajGoster("Lütfen gelen kutunuzdaki linke tıklayarak e-postanızı doğrulayın.", "hata");
            signOut(auth); // Zorla çıkış yaptır ki sayfada takılı kalmasın
        }
    } else {
        currentUser = null;
        authEkrani.style.display = 'flex';
        anaUygulama.style.display = 'none';
        kategoriler = []; altKategoriler = []; icerikler = [];
    }
});

// Yeni Kayıt İşlemi
document.getElementById('kayitBtn').addEventListener('click', () => {
    const email = document.getElementById('kayitEmail').value;
    const sifre = document.getElementById('kayitSifre').value;

    if (!sifreGucluMu(sifre)) {
        mesajGoster("Şifreniz zayıf! En az 8 karakter, 1 büyük harf ve 1 rakam içermelidir.", "hata");
        return;
    }

    createUserWithEmailAndPassword(auth, email, sifre)
        .then((userCredential) => {
            sendEmailVerification(userCredential.user).then(() => {
                kayitFormu.style.display = 'none';
                girisFormu.style.display = 'block';
                mesajGoster("Kayıt başarılı! Lütfen e-postanıza gönderilen doğrulama linkine tıklayın.", "basari");
                signOut(auth); // Doğrulayana kadar sisteme almamak için çıkış yaptır
            });
        })
        .catch(error => mesajGoster("Kayıt Hatası: " + error.message, "hata"));
});

// Giriş İşlemi
document.getElementById('girisBtn').addEventListener('click', () => {
    const email = document.getElementById('girisEmail').value;
    const sifre = document.getElementById('girisSifre').value;
    
    signInWithEmailAndPassword(auth, email, sifre)
        .catch(error => mesajGoster("Giriş Hatası: Bilgiler hatalı veya hesap yok.", "hata"));
});

// Şifre Sıfırlama İşlemi
document.getElementById('sifreSifirlaBtn').addEventListener('click', () => {
    const email = document.getElementById('sifreSifirlaEmail').value;
    if (!email) { mesajGoster("Lütfen kayıtlı e-posta adresinizi girin.", "hata"); return; }
    
    sendPasswordResetEmail(auth, email)
        .then(() => mesajGoster("Şifre sıfırlama linki e-posta adresinize gönderildi.", "basari"))
        .catch(error => mesajGoster("Hata: " + error.message, "hata"));
});

// Çıkış İşlemi
document.getElementById('cikisBtn').addEventListener('click', () => signOut(auth));


// ==========================================
// 2. BULUT VERİTABANI VE DİĞER FONKSİYONLAR (Aynı Kaldı)
// ==========================================
const grid = document.getElementById('kutuphaneGrid');
const breadcrumb = document.getElementById('breadcrumb');
const detayModal = document.getElementById('detayModal');
const yeniIcerikModal = document.getElementById('yeniIcerikModal');
const klasorModal = document.getElementById('klasorModal');

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
    } catch (e) { console.error("Veri çekme hatası:", e); }
}

async function verileriBulutaKaydet() {
    if (!currentUser) return;
    try { await setDoc(doc(db, "users", currentUser.uid), { kategoriler, altKategoriler, icerikler }); } 
    catch (e) { console.error("Kaydetme hatası:", e); }
}

let localDB;
const request = indexedDB.open("StuffdDB", 1);
request.onupgradeneeded = (e) => { localDB = e.target.result; if (!localDB.objectStoreNames.contains("pdfs")) localDB.createObjectStore("pdfs"); };
request.onsuccess = (e) => { localDB = e.target.result; };

function pdfKaydet(id, file) { const transaction = localDB.transaction(["pdfs"], "readwrite"); transaction.objectStore("pdfs").put(file, id); }
function pdfSil(id) { const transaction = localDB.transaction(["pdfs"], "readwrite"); transaction.objectStore("pdfs").delete(id); }

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
        verileriBulutaKaydet(); ekranıGuncelle(); 
    } 
};

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
    verileriBulutaKaydet(); klasorModal.style.display = 'none'; ekranıGuncelle();
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
    icerikler.push(yeni); verileriBulutaKaydet(); yeniIcerikModal.style.display = 'none'; ekranıGuncelle();
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

['kapatDetayBtn', 'kapatYeniBtn', 'kapatKlasorBtn'].forEach(id => {
    document.getElementById(id).addEventListener('click', (e) => e.target.closest('.modal').style.display = 'none');
});

const temaBtn = document.getElementById('temaBtn');
temaBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    temaBtn.innerText = document.body.classList.contains('dark-mode') ? "☀️ Açık Mod" : "🌙 Koyu Mod";
    localStorage.setItem('kutuphaneTema', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
});
if (localStorage.getItem('kutuphaneTema') === 'dark') { document.body.classList.add('dark-mode'); temaBtn.innerText = "☀️ Açık Mod"; }
