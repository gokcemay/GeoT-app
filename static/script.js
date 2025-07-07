// static/script.js (HEM MOBİL HEM MASAÜSTÜ İÇİN DÜZELTİLMİŞ NİHAİ VERSİYON)

const imageUploader = document.getElementById('image-uploader');
const uploadedImage = document.getElementById('uploaded-image');
const canvas = document.getElementById('selection-canvas');
const analyzeButton = document.getElementById('analyze-button');
const explanationDiv = document.getElementById('explanation');
const loader = document.getElementById('loader');
const debugText = document.getElementById('debug-text');
const ctx = canvas.getContext('2d');

let selection = {};
let startPos = { x: 0, y: 0 };
let isDrawing = false;
let currentFile = null;

// --- YARDIMCI FONKSİYONLAR ---

// Fare veya Dokunma olayından X ve Y koordinatlarını alır
function getCoords(evt) {
    const rect = canvas.getBoundingClientRect();
    // Dokunma olayı mı, fare olayı mı kontrol et
    const touch = evt.touches ? evt.touches[0] : null; // Aktif dokunma
    const endTouch = evt.changedTouches ? evt.changedTouches[0] : null; // Biten dokunma

    if (touch) {
        return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }
    if (endTouch) {
        return { x: endTouch.clientX - rect.left, y: endTouch.clientY - rect.top };
    }
    // Değilse, bu bir fare olayıdır
    return { x: evt.clientX - rect.left, y: evt.clientY - rect.top };
}

// Çizimi bitiren ve butonu güncelleyen ortak fonksiyon
function finishDrawing(endPos) {
    if (!isDrawing) return;
    isDrawing = false;

    const x1 = startPos.x;
    const y1 = startPos.y;
    const x2 = endPos.x;
    const y2 = endPos.y;

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
        debugText.innerHTML = `Sonuç: (Genişlik: ${selection.width.toFixed(2)}, Yükseklik: ${selection.height.toFixed(2)})`;
    }

    if (selection.width > 1 && selection.height > 1) {
        analyzeButton.disabled = false;
    } else {
        analyzeButton.disabled = true;
        if(debugText) debugText.innerHTML += "<br><b>Geçersiz seçim. Buton pasif.</b>";
    }
}

// --- FARE OLAYLARI (Masaüstü) ---
canvas.addEventListener('mousedown', (e) => {
    isDrawing = true;
    startPos = getCoords(e);
});

canvas.addEventListener('mousemove', (e) => {
    if (!isDrawing) return;
    const currentPos = getCoords(e);
    const width = currentPos.x - startPos.x;
    const height = currentPos.y - startPos.y;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;
    ctx.strokeRect(startPos.x, startPos.y, width, height);
});

canvas.addEventListener('mouseup', (e) => {
    finishDrawing(getCoords(e));
});

canvas.addEventListener('mouseleave', () => {
    isDrawing = false;
});

// --- DOKUNMATİK EKRAN OLAYLARI (Mobil) ---
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    isDrawing = true;
    startPos = getCoords(e);
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (!isDrawing) return;
    const currentPos = getCoords(e);
    const width = currentPos.x - startPos.x;
    const height = currentPos.y - startPos.y;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;
    ctx.strokeRect(startPos.x, startPos.y, width, height);
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    finishDrawing(getCoords(e));
});


// --- SAYFA YÜKLEME VE KURULUM FONKSİYONLARI ---

window.addEventListener('load', setupCanvas);
window.addEventListener('resize', setupCanvas);
uploadedImage.addEventListener('load', setupCanvas);

function setupCanvas() {
    const renderedWidth = uploadedImage.clientWidth;
    const renderedHeight = uploadedImage.clientHeight;
    canvas.width = renderedWidth;
    canvas.height = renderedHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (debugText) {
        debugText.innerText = "Lütfen analiz için bir alan seçin.";
    }
}

imageUploader.addEventListener('change', (e) => {
    selection = {};
    analyzeButton.disabled = true;
    currentFile = e.target.files && e.target.files.length > 0 ? e.target.files[0] : null;
    if (currentFile) {
        const reader = new FileReader();
        reader.onload = (event) => {
            uploadedImage.src = event.target.result;
        };
        reader.readAsDataURL(currentFile);
    }
});

// Analiz butonu mantığı aynı kalıyor
analyzeButton.addEventListener('click', async () => {
    if (!selection.width || !selection.height) {
        alert("Lütfen geçerli bir alan seçin.");
        return;
    }
    loader.style.display = 'block';
    explanationDiv.innerText = '';
    const scaleX = uploadedImage.naturalWidth / uploadedImage.clientWidth;
    const scaleY = uploadedImage.naturalHeight / uploadedImage.clientHeight;
    const scaledSelection = {
        x: selection.x * scaleX,
        y: selection.y * scaleY,
        width: selection.width * scaleX,
        height: selection.height * scaleY,
    };
    const formData = new FormData();
    formData.append('selection', JSON.stringify(scaledSelection));
    if (currentFile) {
        formData.append('image', currentFile);
    } else {
        formData.append('default_image_url', uploadedImage.src);
    }
    try {
        const response = await fetch('/analyze', { method: 'POST', body: formData });
        const result = await response.json();
        if (result.error) {
            explanationDiv.innerText = `Hata: ${result.error}`;
        } else {
            explanationDiv.innerText = result.explanation;
        }
    } catch (error) {
        explanationDiv.innerText = `Bir hata oluştu: ${error}`;
    } finally {
        loader.style.display = 'none';
    }
});