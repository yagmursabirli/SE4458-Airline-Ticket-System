import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder
import pickle

# 1. Veriyi Yükle
df = pd.read_csv('Clean_Dataset.csv')

# 2. Gereksiz sütunları at (ID gibi)
df = df.drop(columns=['Unnamed: 0', 'flight'])

# 3. Metinleri Sayıya Çevir (Label Encoding)
# Tahmin sırasında da aynı sayıları kullanmak için encoder'ları kaydedeceğiz
encoders = {}
categorical_cols = ['airline', 'source_city', 'departure_time', 'stops', 'arrival_time', 'destination_city', 'class']

for col in categorical_cols:
    le = LabelEncoder()
    df[col] = le.fit_transform(df[col])
    encoders[col] = le

# 4. Eğitim ve Test Setini Ayır
X = df.drop('price', axis=1)
y = df['price']
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# 5. Modeli Eğit (Random Forest genellikle bu dataset için en iyisidir)
model = RandomForestRegressor(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

# 6. Modeli ve Encoder'ları Kaydet
with open('model.pkl', 'wb') as f:
    pickle.dump(model, f)
with open('encoders.pkl', 'wb') as f:
    pickle.dump(encoders, f)

print("Gerçek veriyle eğitim tamamlandı. R2 Skoru:", model.score(X_test, y_test))