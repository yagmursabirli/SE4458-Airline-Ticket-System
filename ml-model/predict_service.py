from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import pandas as pd

app = Flask(__name__)
CORS(app)


with open('model.pkl', 'rb') as f:
    model = pickle.load(f)
with open('encoders.pkl', 'rb') as f:
    encoders = pickle.load(f)

@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json()
    
    input_data = pd.DataFrame([{
        'airline': data.get('airline'), 
        'source_city': data.get('fromCity'),
        'departure_time': data.get('departure_time'), 
        'stops': data.get('stops'), 
        'arrival_time': 'Evening',
        'destination_city': data.get('toCity'),
        'class': 'Economy',
        'duration': float(data.get('duration', 2.0)),
        'days_left': 15 
    }])

  
    for col, le in encoders.items():
        if col in input_data.columns:
            
            input_data[col] = le.transform(input_data[col])

    prediction = model.predict(input_data)
    return jsonify({'predicted_price': round(float(prediction[0]), 2)})

if __name__ == '__main__':
   
    app.run(host='0.0.0.0', port=5001)
    
app.run(port=5001)