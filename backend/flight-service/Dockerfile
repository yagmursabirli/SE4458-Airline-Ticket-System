FROM node:18

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Backend portunu aç
EXPOSE 5000

CMD ["node", "app.js"]