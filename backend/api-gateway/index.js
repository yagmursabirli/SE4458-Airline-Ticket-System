const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const NodeCache = require('node-cache');
const axios = require('axios');

const app = express();
app.use(cors());

// Memory Cache Yapılandırması
const myCache = new NodeCache({ stdTTL: 3600 });
console.log('🚀 Memory Cache Aktif');

// ===========================================
// FLIGHT SEARCH (v1, CACHE’Lİ, PAGINATION DESTEKLİ)
// ===========================================
// PDF: REST services must be versionable. Artık /v1 üzerinden hizmet veriyoruz.
app.get('/api/v1/flights/search', async (req, res) => {
    const { from, to, date, passengers, flexible, directOnly, page = 1, limit = 10 } = req.query;

    // Cache anahtarına page ve limit ekledik ki farklı sayfalar birbirine karışmasın
    const cacheKey = `search-${from}-${to}-${date}-${passengers}-${flexible}-${directOnly}-p${page}-l${limit}`;
    const cached = myCache.get(cacheKey);

    if (cached) {
        console.log('⚡ CACHE HIT (v1):', cacheKey);
        return res.json(cached);
    }

    console.log('🐢 CACHE MISS (v1):', cacheKey);

    try {
        // Backend Flight Service (v1) çağrısı
        const response = await axios.get(
            'http://localhost:5000/api/v1/flights/search',
            { params: req.query }
        );

        myCache.set(cacheKey, response.data);
        console.log('💾 CACHE WRITE (v1)');

        res.json(response.data);
    } catch (err) {
        console.error("Gateway Search Error:", err.message);
        res.status(500).json({ error: 'v1 Flight search failed' });
    }
});

// ===================================
// DİĞER TÜM ENDPOINTLER → PROXY (v1)
// ===================================
// Proxy üzerinden v1 yönlendirmesi
app.use('/api/v1', createProxyMiddleware({
    target: 'http://localhost:5000/api/v1',
    changeOrigin: true
}));

const PORT = 8080;
app.listen(PORT, () =>
    console.log(`🛡️ Gateway v1 ${PORT} portunda aktif`)
);