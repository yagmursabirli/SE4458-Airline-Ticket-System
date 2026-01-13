// backend/flight-service/app.js

const { SQSClient, SendMessageCommand } = require("@aws-sdk/client-sqs");
const { Op } = require('sequelize');
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
require('dotenv').config();

// =========================
// MODELLER
// =========================
const Flight = require('./models/Flight');
const Booking = require('./models/Booking');
const UserProfile = require('./models/User');

// =========================
// AWS SQS
// =========================
const sqsClient = new SQSClient({
    region: "eu-north-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

const QUEUE_URL = "https://sqs.eu-north-1.amazonaws.com/684210808058/AirlineNotificationQueue";

// =========================
// RELATIONSHIPS
// =========================
Booking.belongsTo(Flight, { foreignKey: 'flightId' });
Flight.hasMany(Booking, { foreignKey: 'flightId' });

// =========================
// APP INIT
// =========================
const app = express();
app.use(cors());
app.use(express.json());

// =========================
// DB SYNC
// =========================
Flight.sequelize.sync().then(() => {
    console.log("🚀 AWS RDS: Tüm tablolar güncellendi ve hazır!");
});

// =====================================================
// 🔥 API VERSIONING (v1)
// =====================================================
const v1Router = express.Router();
app.use('/api/v1', v1Router);

// =====================================================
// USER – LOYALTY REGISTRATION
// =====================================================
v1Router.post('/user/register-loyalty', async (req, res) => {
    const { email, wantsMembership } = req.body;

    try {
        if (wantsMembership) {
            const [profile, created] = await UserProfile.findOrCreate({
                where: { email },
                defaults: { milesBalance: 0, membershipType: 'Classic' }
            });

            if (created) {
                await sqsClient.send(new SendMessageCommand({
                    QueueUrl: QUEUE_URL,
                    MessageBody: JSON.stringify({
                        email,
                        type: "WELCOME_EMAIL",
                        message: "Miles & Smiles üyeliğiniz başarıyla oluşturuldu."
                    })
                }));
            }

            return res.json({ message: "Üyelik oluşturuldu (v1)." });
        }

        res.json({ message: "Üyelik tercih edilmedi." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// ADMIN – CREATE FLIGHT
// =====================================================
v1Router.post('/flights', async (req, res) => {
    const role = req.headers['x-user-role'];
    if (role !== 'ADMIN') {
        return res.status(403).json({ error: "Yetkisiz erişim." });
    }

    try {
        const flight = await Flight.create(req.body);
        res.status(201).json({ message: "Uçuş eklendi (v1).", flight });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// =====================================================
// FLIGHT SEARCH
// =====================================================
v1Router.get('/flights/search', async (req, res) => {
    const { from, to, date, flexible, directOnly, passengers } = req.query;
    const passengerCount = parseInt(passengers) || 1;

    let whereClause = {
        fromCity: from,
        toCity: to,
        capacity: { [Op.gte]: passengerCount }
    };

    // 📅 DATE FILTER (SAFE)
    if (date) {
        const start = new Date(`${date}T00:00:00`);
        const end = new Date(`${date}T23:59:59`);

        if (flexible === 'true') {
            start.setDate(start.getDate() - 3);
            end.setDate(end.getDate() + 3);
        }

        whereClause.flightDate = {
            [Op.between]: [start, end]
        };
    }

    // ✈️ DIRECT FLIGHT
    if (directOnly === 'true') {
        whereClause.isDirect = true;
    }

    try {
        const flights = await Flight.findAll({
            where: whereClause,
            order: [['flightDate', 'ASC']]
        });

        res.json(flights);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// BOOK FLIGHT
// =====================================================
v1Router.post('/flights/book/:id', async (req, res) => {
    const { email, useMiles, passengers } = req.body;
    const passengerCount = parseInt(passengers) || 1;

    try {
        const flight = await Flight.findByPk(req.params.id);
        if (!flight) return res.status(404).json({ error: "Uçuş bulunamadı." });
        if (flight.capacity < passengerCount) {
            return res.status(400).json({ error: "Yetersiz koltuk." });
        }

        await Flight.sequelize.transaction(async (t) => {
            if (useMiles) {
                const profile = await UserProfile.findOne({ where: { email }, transaction: t });
                const requiredMiles = flight.price * 10 * passengerCount;

                if (!profile || profile.milesBalance < requiredMiles) {
                    throw new Error("Yetersiz mil.");
                }

                await profile.decrement('milesBalance', { by: requiredMiles, transaction: t });
            }

            await flight.update(
                { capacity: flight.capacity - passengerCount },
                { transaction: t }
            );

            await Booking.create(
                { flightId: flight.id, userEmail: email, status: 'CONFIRMED' },
                { transaction: t }
            );
        });

        res.json({ message: "Bilet onaylandı (v1)." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// USER PROFILE
// =====================================================
v1Router.get('/user/profile/:email', async (req, res) => {
    try {
        const profile = await UserProfile.findOne({ where: { email: req.params.email } });
        const bookings = await Booking.findAll({
            where: { userEmail: req.params.email },
            include: [{ model: Flight }]
        });

        res.json({
            milesBalance: profile?.milesBalance || 0,
            membershipType: profile?.membershipType || 'Misafir',
            bookings
        });
    } catch {
        res.status(500).json({ error: "Profil alınamadı." });
    }
});

// =====================================================
// EXTERNAL SERVICE – UPDATE MILES
// =====================================================
v1Router.post('/external/update-miles', async (req, res) => {
    if (req.headers['x-api-key'] !== process.env.EXTERNAL_AIRLINE_KEY) {
        return res.status(401).json({ error: "Yetkisiz." });
    }

    const { email, milesToAdd } = req.body;

    try {
        const profile = await UserProfile.findOne({ where: { email } });
        if (!profile) return res.status(404).json({ error: "Üye yok." });

        await profile.increment('milesBalance', { by: milesToAdd });

        res.json({ message: "Miller güncellendi (v1)." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// NIGHTLY CRON
// =====================================================
cron.schedule('0 0 * * *', async () => {
    console.log("🌙 Nightly Process v1 çalışıyor...");
});

// =========================
// SERVER
// =========================
const PORT = 5000;
app.listen(PORT, () => {
    console.log(`✅ Flight Service v1 aktif: ${PORT}`);
});
