from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import pandas as pd

app = Flask(__name__)
CORS(app)

# Modeli ve Encoder'ları yükle
with open('model.pkl', 'rb') as f:
    model = pickle.load(f)
with open('encoders.pkl', 'rb') as f:
    encoders = pickle.load(f)

@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json()
    
    # React'ten gelen verileri dataset formatına uyduralım
    # Not: React formunda olmayanlar için datasetin en sık kullanılan değerlerini (default) veriyoruz
    input_data = pd.DataFrame([{
        'airline': data.get('airline', 'Air_India'),
        'source_city': data.get('fromCity', 'Delhi'),
        'departure_time': 'Morning',
        'stops': 'one',
        'arrival_time': 'Evening',
        'destination_city': data.get('toCity', 'Mumbai'),
        'class': 'Economy',
        'duration': float(data.get('duration', 2.0)),
        'days_left': 10
    }])

    # Kategorik verileri sayıya çevir
    for col, le in encoders.items():
        if col in input_data.columns:
            # Eğer yeni bir şehir gelirse hata almamak için bilinmeyenleri 'Delhi' yapabiliriz
            input_data[col] = le.transform(input_data[col])

    prediction = model.predict(input_data)
    return jsonify({'predicted_price': round(float(prediction[0]), 2)})

app.run(port=5001)