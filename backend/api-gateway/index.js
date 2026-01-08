const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();
app.use(cors());

// Log ekleyelim ki nereye gittiğini görelim
app.use((req, res, next) => {
    console.log(`[GATEWAY] Gelen: ${req.url} -> Hedef: http://localhost:5000${req.url}`);
    next();
});

// En geniş kapsamlı yönlendirme: 
// 8080/api/... ile başlayan her şeyi doğrudan 5000/api/... adresine gönderir
app.use('/api', createProxyMiddleware({
    target: 'http://localhost:5000/api',
    changeOrigin: true,
    logLevel: 'debug' // Terminalde daha detaylı hata görmek için
}));

const PORT = 8080;
app.listen(PORT, () => console.log(`🛡️ Gateway 8080'de hazır!`));