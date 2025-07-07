// static/script.js (TAM VE DÜZELTİLMİŞ NİHAİ VERSİYON)

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

// Sayfa yüklendiğinde veya yeniden boyutlandırıldığında canvası ayarla
window.addEventListener('load', setupCanvas);
window.addEventListener('resize', setupCanvas);
uploadedImage.addEventListener('load', setupCanvas);

// Canvas boyutunu resimle eşitleyen ana fonksiyon
function setupCanvas() {
    // Görüntünün render edilmiş boyutlarını al
    const renderedWidth = uploadedImage.clientWidth;
    const renderedHeight = uploadedImage.clientHeight;
    
    // Canvas boyutlarını bu render edilmiş boyutlarla eşitle
    canvas.width = renderedWidth;
    canvas.height = renderedHeight;
    
    // Çizim alanını temizle
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (debugText) {
        debugText.innerText = "Lütfen analiz için bir alan seçin.";
    }
}

// Kullanıcı yeni bir resim yüklerse
imageUploader.addEventListener('change', (e) => {
    // Önceki seçimi sıfırla
    selection = {};
    analyzeButton.disabled = true;

    currentFile = e.target.files && e.target.files.length > 0 ? e.target.files[0] : null;
    if (currentFile) {
        const reader = new FileReader();
        reader.onload = (event) => {
            uploadedImage.src = event.target.result;
            // 'load' olayı tetikleneceği için setupCanvas burada çağrılmıyor.
        };
        reader.readAsDataURL(currentFile);
    }
});

// Fare koordinatlarını almak için güvenilir fonksiyon
function getMousePos(canvas, evt) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top
    };
}

// Fareye tıklandığında
canvas.addEventListener('mousedown', (e) => {
    isDrawing = true;
    startPos = getMousePos(canvas, e);
});

// Fare hareket ettiğinde
canvas.addEventListener('mousemove', (e) => {
    if (!isDrawing) return;
    
    const mousePos = getMousePos(canvas, e);
    const width = mousePos.x - startPos.x;
    const height = mousePos.y - startPos.y;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;
    ctx.strokeRect(startPos.x, startPos.y, width, height);
});

// Fare bırakıldığında
canvas.addEventListener('mouseup', (e) => {
    if (!isDrawing) return;
    isDrawing = false;

    const mousePos = getMousePos(canvas, e);
    let x1 = startPos.x;
    let y1 = startPos.y;
    let x2 = mousePos.x;
    let y2 = mousePos.y;

    // Seçimin canvas sınırları içinde kalmasını sağla
    selection = {
        x: Math.max(0, Math.min(x1, x2)),
        y: Math.max(0, Math.min(y1, y2)),
        width: Math.abs(x1 - x2),
        height: Math.abs(y1 - y2)
    };
    
    // Seçimin taşan kısımlarını kırp
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
});

// Analiz butonuna tıklandığında
analyzeButton.addEventListener('click', async () => {
    if (!selection.width || !selection.height) {
        alert("Lütfen geçerli bir alan seçin.");
        return;
    }

    loader.style.display = 'block';
    explanationDiv.innerText = '';
    
    // Orijinal resim ve ekranda görünen resim arasındaki ölçek farkını hesapla
    const scaleX = uploadedImage.naturalWidth / uploadedImage.clientWidth;
    const scaleY = uploadedImage.naturalHeight / uploadedImage.clientHeight;

    // Seçim koordinatlarını orijinal resim boyutuna göre ölçekle
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