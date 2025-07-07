// static/script.js (TÜMÜYLE GÜNCELLENMİŞ HALİ)

const imageUploader = document.getElementById('image-uploader');
const uploadedImage = document.getElementById('uploaded-image');
const canvas = document.getElementById('selection-canvas');
const analyzeButton = document.getElementById('analyze-button');
const explanationDiv = document.getElementById('explanation');
const loader = document.getElementById('loader');
const debugText = document.getElementById('debug-text'); // YENİ: Hata ayıklama paragrafı
const ctx = canvas.getContext('2d');

let selection = {};
let startPos = {}; // DEĞİŞTİ: Başlangıç pozisyonunu saklamak için
let isDrawing = false;
let currentFile = null;

imageUploader.addEventListener('change', (e) => {
    currentFile = e.target.files[0];
    if (currentFile) {
        const reader = new FileReader();
        reader.onload = (event) => {
            uploadedImage.src = event.target.result;
            uploadedImage.onload = () => {
                canvas.width = uploadedImage.clientWidth;
                canvas.height = uploadedImage.clientHeight;
                analyzeButton.disabled = true;
                debugText.innerText = "Resim yüklendi. Lütfen bir alan seçin.";
            }
        };
        reader.readAsDataURL(currentFile);
    }
});

canvas.addEventListener('mousedown', (e) => {
    isDrawing = true;
    startPos = { x: e.offsetX, y: e.offsetY };
});

canvas.addEventListener('mousemove', (e) => {
    if (isDrawing) {
        const width = e.offsetX - startPos.x;
        const height = e.offsetY - startPos.y;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        ctx.strokeRect(startPos.x, startPos.y, width, height);
    }
});

canvas.addEventListener('mouseup', (e) => {
    if (!isDrawing) return;
    isDrawing = false;

    // DEĞİŞTİ: Her yöne çizime izin veren daha sağlam hesaplama
    const x1 = startPos.x;
    const y1 = startPos.y;
    const x2 = e.offsetX;
    const y2 = e.offsetY;

    selection = {
        x: Math.min(x1, x2),
        y: Math.min(y1, y2),
        width: Math.abs(x1 - x2),
        height: Math.abs(y1 - y2)
    };

    // YENİ: Hata ayıklama bilgisini güncelle
    debugText.innerText = `Seçim yapıldı -> Genişlik: ${selection.width.toFixed(2)}, Yükseklik: ${selection.height.toFixed(2)}`;

    // Genişlik veya yükseklik sıfırsa butonu pasif bırak
    if (selection.width > 0 && selection.height > 0) {
        analyzeButton.disabled = false;
    } else {
        analyzeButton.disabled = true;
        debugText.innerText = "Geçersiz seçim. Lütfen bir kutu çizin.";
    }
});

analyzeButton.addEventListener('click', async () => {
    if (!currentFile || !selection.width || !selection.height) {
        alert("Lütfen bir resim yükleyin ve geçerli bir alan seçin.");
        return;
    }

    loader.style.display = 'block';
    explanationDiv.innerText = '';
    
    // YENİ: Orijinal resim boyutuna göre koordinatları ölçeklendirme
    // Bu, backend'in doğru alanı kırmasını sağlar.
    const scaleX = uploadedImage.naturalWidth / uploadedImage.clientWidth;
    const scaleY = uploadedImage.naturalHeight / uploadedImage.clientHeight;

    const scaledSelection = {
        x: selection.x * scaleX,
        y: selection.y * scaleY,
        width: selection.width * scaleX,
        height: selection.height * scaleY,
    };

    const formData = new FormData();
    formData.append('image', currentFile);
    formData.append('selection', JSON.stringify(scaledSelection)); // Ölçeklenmiş veriyi gönder

    try {
        const response = await fetch('/analyze', {
            method: 'POST',
            body: formData,
        });
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