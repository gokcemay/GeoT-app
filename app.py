# app.py

import sys
import os


import google.generativeai as genai
from flask import Flask, request, jsonify, render_template
from PIL import Image
import io
import json
from dotenv import load_dotenv # YENİ: Bu satırı ekleyin

# .env dosyasındaki değişkenleri yükle
load_dotenv() # YENİ: Bu satırı ekleyin

# Flask uygulamasını başlat
app = Flask(__name__)

# --- ESKİ KISIM SİLİNDİ ---

# YENİ: API Anahtarını çevre değişkeninden güvenli bir şekilde al
api_key = os.environ.get("GOOGLE_API_KEY")

if not api_key:
    # Eğer anahtar bulunamazsa programı durdur ve hata mesajı ver
    raise ValueError("GOOGLE_API_KEY bulunamadı. Lütfen .env dosyanızı kontrol edin.")

genai.configure(api_key=api_key)


# Ana sayfayı (index.html) göstermek için route
@app.route('/')
def index():
    return render_template('index.html')

# Görüntüyü analiz edecek olan route
@app.route('/analyze', methods=['POST'])
def analyze():
    # ... (Bu fonksiyonun geri kalanı aynı kalıyor) ...
    if 'image' not in request.files:
        return jsonify({'error': 'Resim dosyası bulunamadı'}), 400

    file = request.files['image']
    selection_str = request.form.get('selection')
    
    if not selection_str:
        return jsonify({'error': 'Seçim alanı koordinatları bulunamadı'}), 400
        
    selection = json.loads(selection_str)

    try:
        image = Image.open(file.stream)
        
        x = int(selection['x'])
        y = int(selection['y'])
        width = int(selection['width'])
        height = int(selection['height'])
        
        cropped_image = image.crop((x, y, x + width, y + height))

        model = genai.GenerativeModel('gemini-1.5-flash')

        prompt = """
        Sen bir makine mühendisliği ve ASME Y14.5 geometrik toleranslandırma standardı uzmanısın.
        Sana bir teknik resimden kırpılmış bir görüntü vereceğim. Bu görüntü bir özellik kontrol çerçevesi içeriyor.
        Görüntüyü analiz et ve aşağıdaki bilgileri sağla:
        1.  Geometrik toleransın adı (örn: Konum Toleransı, Düzlemsellik vb.).
        2.  Tolerans değeri.
        3.  Varsa Datum referansları.
        4.  Bu toleransın, bir makine mühendisi veya teknisyen için pratikte ne anlama geldiğini basit ve anlaşılır bir dille açıkla.
        """

        response = model.generate_content([prompt, cropped_image])

        return jsonify({'explanation': response.text})

    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Uygulamayı çalıştır
if __name__ == '__main__':
    app.run(debug=True)