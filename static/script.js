// static/script.js (ZAMANLAMA HATASI DÜZELTİLMİŞ NİHAİ VERSİYON)

document.addEventListener('DOMContentLoaded', () => {
    // Gerekli HTML elementlerini seç
    const imageUploader = document.getElementById('image-uploader');
    const uploadedImage = document.getElementById('uploaded-image');
    const canvas = document.getElementById('selection-canvas');
    const analyzeButton = document.getElementById('analyze-button');
    const explanationDiv = document.getElementById('explanation');
    const loader = document.getElementById('loader');
    const debugText = document.getElementById('debug-text');
    const ctx = canvas.getContext('2d');

    // Durum değişkenleri
    let selection = {};
    let startPos = { x: 0, y: 0 };
    let isDrawing = false;
    let currentFile = null;

    // --- KURULUM (SETUP) FONKSİYONU ---
    function setupCanvas() {
        const renderedWidth = uploadedImage.clientWidth;
        const renderedHeight = uploadedImage.clientHeight;

        // Sadece resim ekranda görünür bir boyuta sahipse canvası ayarla
        if (renderedWidth > 0 && renderedHeight > 0) {
            canvas.width = renderedWidth;
            canvas.height = renderedHeight;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if(debugText) debugText.innerText = "Lütfen analiz için bir alan seçin.";
        }
    }

    // --- OLAY YÖNETİCİLERİ ---
    function handleStart(e) {
        if (e.type.startsWith('touch')) e.preventDefault();
        isDrawing = true;
        startPos = getCoords(e);
        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleEnd);
        window.addEventListener('touchmove', handleMove, { passive: false });
        window.addEventListener('touchend', handleEnd, { passive: false });
    }

    function handleMove(e) {
        if (!isDrawing) return;
        if (e.type.startsWith('touch')) e.preventDefault();
        const currentPos = getCoords(e);
        const width = currentPos.x - startPos.x;
        const height = currentPos.y - startPos.y;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        ctx.strokeRect(startPos.x, startPos.y, width, height);
    }

    function handleEnd(e) {
        if (!isDrawing) return;
        if (e.type.startsWith('touch')) e.preventDefault();
        isDrawing = false;
        window.removeEventListener('mousemove', handleMove);
        window.removeEventListener('mouseup', handleEnd);
        window.removeEventListener('touchmove', handleMove);
        window.removeEventListener('touchend', handleEnd);
        
        const endPos = getCoords(e);
        selection = {
            x: Math.max(0, Math.min(startPos.x, endPos.x)),
            y: Math.max(0, Math.min(startPos.y, endPos.y)),
            width: Math.abs(startPos.x - endPos.x),
            height: Math.abs(startPos.y - endPos.y)
        };
        if (selection.x + selection.width > canvas.width) selection.width = canvas.width - selection.x;
        if (selection.y + selection.height > canvas.height) selection.height = canvas.height - selection.y;
        
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

    function getCoords(evt) {
        const rect = canvas.getBoundingClientRect();
        let point = evt;
        if (evt.type.startsWith('touch')) {
            point = (evt.type === 'touchend') ? evt.changedTouches[0] : evt.touches[0];
        }
        return { x: point.clientX - rect.left, y: point.clientY - rect.top };
    }

    // --- OLAYLARI ATAMA ---
    canvas.addEventListener('mousedown', handleStart);
    canvas.addEventListener('touchstart', handleStart, { passive: false });
    
    // YENİ KURULUM MANTIĞI
    // Resim (ister varsayılan, ister yeni yüklenen) yüklendiğinde canvası ayarla
    uploadedImage.addEventListener('load', setupCanvas);
    // Pencere yeniden boyutlandırıldığında canvası ayarla
    window.addEventListener('resize', setupCanvas);
    // Eğer resim önbellekten çok hızlı yüklenirse 'load' olayı kaçabilir, bu yüzden ek kontrol
    if (uploadedImage.complete && uploadedImage.naturalWidth > 0) {
        setupCanvas();
    }

    imageUploader.addEventListener('change', (e) => {
        selection = {};
        analyzeButton.disabled = true;
        currentFile = e.target.files?.[0] || null;
        if (currentFile) {
            const reader = new FileReader();
            reader.onload = (event) => { uploadedImage.src = event.target.result; };
            reader.readAsDataURL(currentFile);
        }
    });

    // Analiz butonu mantığı (Değişiklik yok)
    analyzeButton.addEventListener('click', async () => {
        if (!selection.width || !selection.height) {
            alert("Lütfen geçerli bir alan seçin."); return;
        }
        loader.style.display = 'block';
        explanationDiv.innerText = '';
        const scaleX = uploadedImage.naturalWidth / uploadedImage.clientWidth;
        const scaleY = uploadedImage.naturalHeight / uploadedImage.clientHeight;
        const scaledSelection = {
            x: selection.x * scaleX,
            y: selection.y * scaleY,
            width: selection.width * scaleX,
            height: selection.height * scaleY
        };
        const formData = new FormData();
        formData.append('selection', JSON.stringify(scaledSelection));
        if (currentFile) {
            formData.append('image', currentFile);
        } else {
            formData.append('use_default_image', 'true');
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
});