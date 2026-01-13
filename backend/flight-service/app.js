const { SQSClient, SendMessageCommand } = require("@aws-sdk/client-sqs");
const { Op } = require('sequelize');
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cron = require('node-cron');
require('dotenv').config();

// Modeller
const Flight = require('./models/Flight');
const Booking = require('./models/Booking');
const UserProfile = require('./models/User'); 

// AWS SQS Yapılandırması
const sqsClient = new SQSClient({
    region: "eu-north-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});
//const QUEUE_URL = "https://sqs.eu-north-1.amazonaws.com/684210808058/AirlineNotificationQueue";

const sqs = new SQSClient({ region: "eu-north-1" });
const QUEUE_URL = "https://sqs.eu-north-1.amazonaws.com/684210808058/AirlineNotificationQueue";

// Modeller arası ilişkiler
Booking.belongsTo(Flight, { foreignKey: 'flightId' });
Flight.hasMany(Booking, { foreignKey: 'flightId' });

const app = express();

// CORS yapılandırmasına v1 adreslerini de kapsayacak şekilde
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001']
}));
app.use(express.json());


Flight.sequelize.sync().then(() => {
    console.log("🚀 AWS RDS: Tüm tablolar güncellendi ve hazır!");
});

// --- API VERSIONING (v1) ---
const v1Router = express.Router();
app.use('/api/v1', v1Router);



// KULLANICI KAYIT / SADAKAT PROGRAMI
v1Router.post('/user/register-loyalty', async (req, res) => {
    const { email, wantsMembership } = req.body;
    try {
        if (wantsMembership) {
            const [profile, created] = await UserProfile.findOrCreate({
                where: { email: email },
                defaults: { milesBalance: 0, membershipType: 'Classic' }
            });

            if (created) {
                await sqsClient.send(new SendMessageCommand({
                    QueueUrl: QUEUE_URL,
                    MessageBody: JSON.stringify({
                        email: email,
                        type: "WELCOME_EMAIL",
                        message: "Aramıza hoş geldiniz! Miles & Smiles üyeliğiniz başlatıldı."
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

// ADMIN: Yeni uçuş ekleme
v1Router.post('/flights', async (req, res) => {
    const role = req.headers['x-user-role'];
    if (role !== 'ADMIN') return res.status(403).json({ error: "Yetki reddedildi." });

    try {
        const newFlight = await Flight.create(req.body); 
        res.status(201).json({ message: "Uçuş başarıyla eklendi!", flight: newFlight });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// UÇUŞ ARAMA 
v1Router.get('/flights/search', async (req, res) => {
    
    const { from, to, date, flexible, passengers, page = 1, limit = 10, directOnly } = req.query;
    
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = {
        fromCity: from,
        toCity: to,
        capacity: { [Op.gte]: parseInt(passengers) || 1 }
    };

    
    if (date && date !== "") {
        if (flexible === 'true' || flexible === true) {
            // Esnek tarih: +/- 3 gün aralığı
            const d = new Date(date);
            const startDate = new Date(d);
            startDate.setDate(d.getDate() - 3);
            const endDate = new Date(d);
            endDate.setDate(d.getDate() + 3);

            whereClause.flightDate = {
                [Op.between]: [
                    startDate.toISOString().split('T')[0],
                    endDate.toISOString().split('T')[0]
                ]
            };
        } else {
            // Kesin tarih
            whereClause.flightDate = date;
        }
    }

    if (directOnly === 'true') {
        whereClause.stops = 'zero'; 
    }

    try {
        const { count, rows } = await Flight.findAndCountAll({ 
            where: whereClause,
            limit: parseInt(limit),
            offset: offset,
            order: [['flightDate', 'ASC']]
        });

        res.json({
            totalItems: count,
            totalPages: Math.ceil(count / limit),
            currentPage: parseInt(page),
            flights: rows 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// BİLET SATIN ALMA
v1Router.post('/flights/book/:id', async (req, res) => {
    const flightId = req.params.id;
    const { email, useMiles, passengers } = req.body;
    const passengerCount = parseInt(passengers) || 1;

    try {
        const flight = await Flight.findByPk(flightId);
        if (!flight || flight.capacity < passengerCount)
            throw new Error("Kapasite yetersiz.");

        await Flight.sequelize.transaction(async (t) => {
            if (useMiles) {
                const profile = await UserProfile.findOne({
                    where: { email },
                    transaction: t
                });

                const requiredMiles = (flight.price * 10) * passengerCount;
                if (!profile || profile.milesBalance < requiredMiles)
                    throw new Error("Yetersiz mil.");

                await profile.decrement('milesBalance', {
                    by: requiredMiles,
                    transaction: t
                });
            }

            await flight.update(
                { capacity: flight.capacity - passengerCount },
                { transaction: t }
            );

            await Booking.create({
                flightId: flight.id,
                userEmail: email,
                status: 'CONFIRMED'
            }, { transaction: t });
        });

        // ✅ TRANSACTION BAŞARILI → MAIL TETİKLE
        await sqs.send(new SendMessageCommand({
            QueueUrl: QUEUE_URL,
            MessageBody: JSON.stringify({
                email,
                message: `✈️ ${flight.flightCode} uçuşu için biletiniz başarıyla satın alındı.`
            })
        }));

        res.json({ message: "Biletiniz onaylandı." });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// PROFİL VE REZERVASYONLAR
v1Router.get('/user/profile/:email', async (req, res) => {
    try {
        const email = req.params.email;
        const profile = await UserProfile.findOne({ where: { email } });
        const bookings = await Booking.findAll({
            where: { userEmail: email },
            include: [{ model: Flight }]
        });

        res.json({
            milesBalance: profile ? profile.milesBalance : 0,
            membershipType: profile ? profile.membershipType : 'Misafir',
            bookings: bookings
        });
    } catch (error) {
        res.status(500).json({ error: "Profil hatası." });
    }
});

// DIŞ SERVİS (AUTHENTICATED)
v1Router.post('/external/update-miles', async (req, res) => {
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== process.env.EXTERNAL_AIRLINE_KEY) return res.status(401).json({ error: "Yetkisiz." });

    const { email, milesToAdd } = req.body;
    try {
        const profile = await UserProfile.findOne({ where: { email } });
        if (profile) {
            await profile.increment('milesBalance', { by: milesToAdd });
            res.json({ message: "Miller eklendi (v1)." });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
//notification worker a koyduğum için yoruma aldım 
/*
// CRON JOB: Her gece 00:00'da çalışır
cron.schedule('0 0 * * *', async () => {
    console.log("🌙 Nightly Process: Günlük uçuş milleri hesaplanıyor...");
    
    try {
        
        const today = new Date().toISOString().split('T')[0];

        
        const completedBookings = await Booking.findAll({
            where: { status: 'CONFIRMED' },
            include: [{
                model: Flight,
                where: { flightDate: today } 
            }]
        });

        if (completedBookings.length === 0) {
            console.log("🛬 Bugün tamamlanmış uçuş veya rezervasyon bulunamadı.");
            return;
        }

        console.log(`📊 Bugün tamamlanan ${completedBookings.length} bilet işlemi bulundu. Miller aktarılıyor...`);

        for (const booking of completedBookings) {
            const userEmail = booking.userEmail;
            const flightPrice = booking.Flight.price; 
            const earnedMiles = Math.floor(flightPrice * 0.10); 

            
            const profile = await UserProfile.findOne({ where: { email: userEmail } });

            if (profile && earnedMiles > 0) {
                await profile.increment('milesBalance', { by: earnedMiles });
                console.log(`✅ ${userEmail} adresine ${earnedMiles} mil eklendi. (Uçuş: ${booking.Flight.flightCode})`);

                // SQS ile bildirim gönder
                await sqsClient.send(new SendMessageCommand({
                    QueueUrl: QUEUE_URL,
                    MessageBody: JSON.stringify({
                        email: userEmail,
                        type: "FLIGHT_MILES_EARNED",
                        message: `Sayın üyemiz, bugün tamamladığınız ${booking.Flight.flightCode} sefer sayılı uçuşunuzdan ${earnedMiles} mil kazandınız!`
                    })
                }));
            }
        }
        console.log("✅ Gece işlemi başarıyla tamamlandı.");

    } catch (error) {
        console.error("❌ Cron Job Hatası:", error);
    }
});*/
const PORT = 5000;
app.listen(PORT, () => console.log(`✅ Flight Service v1 Aktif: ${PORT}`));