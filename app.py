# app.py (YEREL DOSYA KULLANIMI İÇİN GÜNCELLENMİŞ VERSİYON)

# 1. Adım: Tüm import'lar en başta yer alır
import os
import json
import io
import requests # Bu artık varsayılan resim için kullanılmayacak ama başka bir özellik için kalabilir.
import google.generativeai as genai
from google.api_core import exceptions
from flask import Flask, request, jsonify, render_template, session, redirect, url_for
from flask_babel import Babel, gettext as _
from dotenv import load_dotenv
from PIL import Image


# 2. Adım: Temel yapılandırmalar yapılır
load_dotenv()

# 3. Adım: Flask uygulaması ('app' nesnesi) oluşturulur
app = Flask(__name__)
app.secret_key = os.urandom(24)

# 4. Adım: Babel yapılandırması yapılır
app.config['BABEL_DEFAULT_LOCALE'] = 'tr'
app.config['BABEL_TRANSLATION_DIRECTORIES'] = 'translations'
app.config['LANGUAGES'] = {
    'en': 'English',
    'tr': 'Türkçe'
}

# 5. Adım: Dil seçme fonksiyonu tanımlanır ve Babel'e bildirilir
def get_locale():
    if request.args.get('lang') in app.config['LANGUAGES']:
        session['lang'] = request.args.get('lang')
    return session.get('lang', app.config['BABEL_DEFAULT_LOCALE'])

babel = Babel(app, locale_selector=get_locale)

# 6. Adım: Context processor tanımlanır
@app.context_processor
def inject_locale():
    return {'get_locale': get_locale}

# 7. Adım: Rota (route) tanımları yapılır
@app.route('/')
def index():
    return render_template('index.html')

# app.py dosyanızda bu fonksiyonu bulun ve aşağıdakiyle değiştirin

@app.route('/analyze', methods=['POST'])
def analyze():
    selection_str = request.form.get('selection')
    if not selection_str:
        return jsonify({'error': _('Seçim alanı koordinatları bulunamadı')}), 400
    
    image = None # 'image' değişkenini başlangıçta boş olarak tanımla
    
    # Resim ya yüklenen dosyadan ya da varsayılan dosyadan alınır
    if 'image' in request.files and request.files['image'].filename != '':
        file = request.files['image']
        image = Image.open(file.stream)
    elif request.form.get('use_default_image') == 'true':
        try:
            image_path = os.path.join(app.root_path, 'static', 'example.png')
            image = Image.open(image_path)
        except FileNotFoundError:
            return jsonify({'error': _('Varsayılan example.png dosyası static klasöründe bulunamadı.')}), 404
    
    # --- YENİ EKLENEN GÜVENLİK KONTROLÜ ---
    # Eğer yukarıdaki adımlardan sonra 'image' hala boş ise, hata ver ve devam etme
    if image is None:
        return jsonify({'error': _('Analiz edilecek geçerli bir resim bulunamadı.')}), 400
    # --- KONTROL BİTTİ ---

    # Artık 'image' değişkeninin dolu olduğundan emin olarak devam edebiliriz.
    try:
        scaled_selection = json.loads(selection_str)
        cropped_image = image.crop((
            int(scaled_selection['x']),
            int(scaled_selection['y']),
            int(scaled_selection['x'] + scaled_selection['width']),
            int(scaled_selection['y'] + scaled_selection['height'])
        ))

        api_key = os.environ.get("GOOGLE_API_KEY")
        if not api_key:
            return jsonify({'error': 'GOOGLE_API_KEY bulunamadı.'}), 500
        genai.configure(api_key=api_key)
        
        model = genai.GenerativeModel('gemini-1.5-flash')

        prompt = _("""Sen bir makine mühendisliği ve ASME Y14.5 geometrik toleranslandırma standardı uzmanısın. Sana bir teknik resimden kırpılmış bir görüntü vereceğim. Bu görüntü bir özellik kontrol çerçevesi içeriyor. Görüntüyü analiz et ve cevabını Markdown formatında, başlıklar ve listeler kullanarak açık ve anlaşılır bir şekilde sun. Cevabın şu bilgileri içermeli: 1. Geometrik Toleransın Adı. 2. Tolerans Değeri ve varsa çap sembolü. 3. Varsa Datum Referansları. 4. Bu toleransın pratikte ne anlama geldiğinin detaylı açıklaması.""")

        response = model.generate_content([prompt, cropped_image])

        return jsonify({'explanation': response.text})
        
    except exceptions.ResourceExhausted as e:
        user_friendly_message = _('Bu demo uygulama, günlük ücretsiz kullanım limitini doldurmuştur. Lütfen yarın tekrar deneyin.')
        return jsonify({'error': user_friendly_message}), 429
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# 8. Adım: Uygulama çalıştırılır
if __name__ == '__main__':
    app.run(debug=True)