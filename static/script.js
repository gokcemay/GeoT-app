// static/script.js (MOBİL DOKUNMATİK DESTEĞİ EKLENMİŞ NİHAİ VERSİYON)

const imageUploader = document.getElementById('image-uploader');
const uploadedImage = document.getElementById('uploaded-image');
const canvas = document.getElementById('selection-canvas');
const analyzeButton = document.getElementById('analyze-button');
const explanationDiv = document.getElementById('explanation');
const loader = document.getElementById('loader');
const debugText = document.getElementById('debug-text');
const ctx = canvas.getContext('2d');

let selection = {};
let startPos = {};
let isDrawing = false;
let currentFile = null;

// --- OLAY YÖNETİCİLERİ (HEM MASAÜSTÜ HEM MOBİL İÇİN) ---

// Çizim başlangıcı
function handleDrawStart(coords) {
    isDrawing = true;
    startPos = coords;
}

// Çizim hareketi
function handleDrawMove(coords) {
    if (!isDrawing) return;
    
    const width = coords.x - startPos.x;
    const height = coords.y - startPos.y;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;
    ctx.strokeRect(startPos.x, startPos.y, width, height);
}

// Çizim sonu
function handleDrawEnd(coords) {
    if (!isDrawing) return;
    isDrawing = false;

    const x1 = startPos.x;
    const y1 = startPos.y;
    const x2 = coords.x;
    const y2 = coords.y;

    selection = {
        x: Math.max(0, Math.min(x1, x2)),
        y: Math.max(0, Math.min(y1, y2)),
        width: Math.abs(x1 - x2),
        height: Math.abs(y1 - y2)
    };

    if (selection.x + selection.width > canvas.width) {
        selection.width = canvas.width - selection.x;
    }
    if (selection.y + selection.height > canvas.height) {
        selection.height = canvas.height - selection.y;
    }
    
    if (debugText) {
        debugText.innerHTML = `
            Başlangıç: (x: ${x1.toFixed(2)}, y: ${y1.toFixed(2)})<br>
            Bitiş: (x: ${x2.toFixed(2)}, y: ${y2.toFixed(2)})<br>
            Sonuç: (Genişlik: ${selection.width.toFixed(2)}, Yükseklik: ${selection.height.toFixed(2)})
        `;
    }

    if (selection.width > 1 && selection.height > 1) {
        analyzeButton.disabled = false;
    } else {
        analyzeButton.disabled = true;
        if(debugText) debugText.innerHTML += "<br><b>Geçersiz seçim. Buton pasif.</b>";
    }
}

// --- FARE OLAYLARI ---
canvas.addEventListener('mousedown', (e) => handleDrawStart(getMousePos(e)));
canvas.addEventListener('mousemove', (e) => handleDrawMove(getMousePos(e)));
canvas.addEventListener('mouseup', (e) => handleDrawEnd(getMousePos(e)));
canvas.addEventListener('mouseleave', () => { if(isDrawing) isDrawing = false; }); // Fare canvas'tan çıkarsa çizmeyi durdur

// --- DOKUNMATİK EKRAN OLAYLARI (YENİ EKLENEN KISIM) ---
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault(); // Sayfanın kaymasını engelle
    handleDrawStart(getTouchPos(e));
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault(); // Sayfanın kaymasını engelle
    handleDrawMove(getTouchPos(e));
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    handleDrawEnd(getTouchPos(e, true));
});

// --- YARDIMCI FONKSİYONLAR ---

function getMousePos(evt) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top
    };
}

function getTouchPos(evt, isEnd = false) {
    const rect = canvas.getBoundingClientRect();
    // 'touchend' olayında, dokunma bilgisi 'touches' yerine 'changedTouches' içindedir.
    const touch = isEnd ? evt.changedTouches[0] : evt.touches[0];
    return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
    };
}

// --- SAYFA YÜKLEME VE KURULUM FONKSİYONLARI (DEĞİŞİKLİK YOK) ---

window.addEventListener('load', setupCanvas);
window.addEventListener('resize', setupCanvas);
uploadedImage.addEventListener('load', setupCanvas);

function setupCanvas() {
    const renderedWidth = uploadedImage.clientWidth;