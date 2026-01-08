const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const NodeCache = require('node-cache');
const axios = require('axios');

const app = express();
app.use(cors());

const myCache = new NodeCache({ stdTTL: 3600 });
console.log('🚀 Memory Cache Aktif');

// ===================================
// FLIGHT SEARCH (CACHE’Lİ, PROXY YOK)
// ===================================
app.get('/api/flights/search', async (req, res) => {
    const { from, to, date, passengers, flexible, directOnly } = req.query;

    const cacheKey = `search-${from}-${to}-${date}-${passengers}-${flexible}-${directOnly}`;
    const cached = myCache.get(cacheKey);

    if (cached) {
        console.log('⚡ CACHE HIT:', cacheKey);
        return res.json(cached);
    }

    console.log('🐢 CACHE MISS:', cacheKey);

    try {
        const response = await axios.get(
            'http://localhost:5000/api/flights/search',
            { params: req.query }
        );

        myCache.set(cacheKey, response.data);
        console.log('💾 CACHE WRITE');

        res.json(response.data);
    } catch (err) {
        res.status(500).json({ error: 'Flight search failed' });
    }
});

// ===================================
// DİĞER TÜM ENDPOINTLER → PROXY
// ===================================
app.use('/api', createProxyMiddleware({
    target: 'http://localhost:5000/api',
    changeOrigin: true
}));

const PORT = 8080;
app.listen(PORT, () =>
    console.log(`🛡️ Gateway ${PORT} portunda aktif`)
);
