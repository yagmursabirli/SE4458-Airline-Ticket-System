# Node.js 18 sürümünü kullan 
FROM node:18

# Konteyner içinde çalışma dizini oluştur
WORKDIR /app

# Bağımlılık dosyalarını kopyala ve yükle
COPY package*.json ./
RUN npm install

# Tüm Gateway kodunu kopyala
COPY . .

# Gateway portunu aç [cite: 308]
EXPOSE 8080

# Uygulamayı başlat
CMD ["node", "index.js"]