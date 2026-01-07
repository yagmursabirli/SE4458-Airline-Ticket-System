//backend/flight-service//app.js
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
const QUEUE_URL = "https://sqs.eu-north-1.amazonaws.com/684210808058/AirlineNotificationQueue";

// Modeller arası ilişkiler
Booking.belongsTo(Flight, { foreignKey: 'flightId' });
Flight.hasMany(Booking, { foreignKey: 'flightId' });

const app = express();
app.use(cors());
app.use(express.json());

// Veritabanı Senkronizasyonu
Flight.sequelize.sync().then(() => {
    console.log("🚀 AWS RDS: Tüm tablolar güncellendi ve hazır!");
});

// --- ENDPOINT'LER ---


app.post('/api/user/register-loyalty', async (req, res) => {
    const { email, wantsMembership } = req.body;

    try {
        if (wantsMembership) {
            const [profile, created] = await UserProfile.findOrCreate({
                where: { email: email },
                defaults: { milesBalance: 0, membershipType: 'Classic' }
            });

            if (created) {
                // SQS üzerinden hoş geldin maili gönder
                await sqsClient.send(new SendMessageCommand({
                    QueueUrl: QUEUE_URL,
                    MessageBody: JSON.stringify({
                        email: email,
                        type: "WELCOME_EMAIL",
                        message: "Aramıza hoş geldiniz! Kayıt sırasında yaptığınız tercih ile Miles & Smiles üyeliğiniz başlatıldı."
                    })
                }));
            }
            return res.json({ message: "Üyelik oluşturuldu ve hoş geldin maili sıraya alındı." });
        }
        res.json({ message: "Üyelik tercih edilmedi." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ADMIN: Yeni uçuş ekleme
app.post('/api/flights', async (req, res) => {
    // Rol kontrolü (Normalde JWT/IAM üzerinden yapılır [cite: 157])
    const role = req.headers['x-user-role'];
    
    if (role !== 'ADMIN') {
        return res.status(403).json({ error: "Sadece Admin uçuş ekleyebilir! [cite: 31]" });
    }

    try {
        // PDF: Duration ve Capacity alanları zorunludur [cite: 16, 25]
        const newFlight = await Flight.create(req.body); 
        res.status(201).json({ message: "Uçuş başarıyla eklendi!", flight: newFlight });
    } catch (error) {
        res.status(400).json({ error: "Eksik veri: " + error.message });
    }
});

// Uçuş Arama
app.get('/api/flights/search', async (req, res) => {
    try {
        const { from, to, date } = req.query;
        const flights = await Flight.findAll({
            where: {
                fromCity: { [Op.iLike]: `%${from.trim()}%` },
                toCity: { [Op.iLike]: `%${to.trim()}%` },
                flightDate: date
            }
        });
        res.json(flights);
    } catch (error) {
        res.status(500).json({ error: "Arama hatası" });
    }
});

// BİLET ALMA (MİLLER VE ÜYELİK DAHİL)
app.post('/api/flights/book/:id', async (req, res) => {
    const flightId = req.params.id;
    const { email, useMiles, isMemberRequest } = req.body; 

    try {
        const flight = await Flight.findByPk(flightId);
        if (!flight) return res.status(404).json({ error: "Uçuş bulunamadı" });
        if (!email) return res.status(400).json({ error: "E-posta gerekli." });

        const ticketPrice = parseFloat(flight.price);
        const requiredMiles = ticketPrice * 10; // 1$ = 10 Mil kuralı

        // Transaction Başlat
        await Flight.sequelize.transaction(async (t) => {
            
            // 1. Üyelik İşlemi (İsteyen üye olur)
            if (isMemberRequest) {
                const [userProfile, created] = await UserProfile.findOrCreate({
                    where: { email: email },
                    defaults: { milesBalance: 0, membershipType: 'Classic' },
                    transaction: t
                });

                // Yeni üye ise SQS üzerinden Hoş Geldin maili
                if (created) {
                    await sqsClient.send(new SendMessageCommand({
                        QueueUrl: QUEUE_URL,
                        MessageBody: JSON.stringify({
                            email: email,
                            type: "WELCOME_EMAIL",
                            message: "Miles & Smiles dünyasına hoş geldiniz! Üyeliğiniz başarıyla oluşturuldu."
                        })
                    }));
                }
            }

            // 2. Ödeme Yöntemi Kontrolü
            if (useMiles) {
                const profile = await UserProfile.findOne({ where: { email }, transaction: t });
                if (!profile) throw new Error("Mil harcamak için Miles&Smiles üyesi olmalısınız!");
                if (profile.milesBalance < requiredMiles) {
                    throw new Error(`Yetersiz mil! Gereken: ${requiredMiles}, Mevcut: ${profile.milesBalance}`);
                }
                await profile.decrement('milesBalance', { by: requiredMiles, transaction: t });
            }

            // 3. Kapasite ve Rezervasyon
            await flight.update({ capacity: flight.capacity - 1 }, { transaction: t });
            await Booking.create({ 
                flightId: flight.id, 
                userEmail: email, 
                status: 'CONFIRMED' 
            }, { transaction: t });
        });

        // 4. Bilet Onay Maili (SQS üzerinden)
        await sqsClient.send(new SendMessageCommand({
            QueueUrl: QUEUE_URL,
            MessageBody: JSON.stringify({
                email: email,
                type: "TICKET_CONFIRMATION",
                message: useMiles 
                    ? `Tebrikler! ${requiredMiles} mil kullanarak biletinizi aldınız.`
                    : `${flight.flightCode} uçuşu için biletiniz onaylanmıştır.`
            })
        }));

        res.json({ message: useMiles ? "Millerinizle bilet alındı! 🎫" : "Biletiniz onaylandı! ✈️" });

    } catch (error) {
        console.error("İşlem Hatası:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// NIGHTLY PROCESS (Her dakika başında çalışır)
cron.schedule('* * * * *', async () => {
    console.log("🌙 Nightly Process: Mil Hesaplaması Başladı...");
    try {
        const today = new Date().toISOString().split('T')[0];
        const pastBookings = await Booking.findAll({
            include: [{ model: Flight, where: { flightDate: { [Op.lt]: today } } }]
        });

        for (let booking of pastBookings) {
            const flight = booking.Flight;
            const earnedMiles = Math.floor(flight.price * 0.1);
            
            // Sadece sistemde profili olan (üye olan) kullanıcılara mil yükle
            const profile = await UserProfile.findOne({ where: { email: booking.userEmail } });
            
            if (profile) {
                await profile.increment('milesBalance', { by: earnedMiles });
                console.log(`✅ ${booking.userEmail} için ${earnedMiles} mil yüklendi.`);
            }
        }
    } catch (error) {
        console.error("❌ Nightly Process Hatası:", error);
    }
});

// KULLANICI PROFİLİ GETİR
app.get('/api/user/profile/:email', async (req, res) => {
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
        res.status(500).json({ error: "Profil bilgileri alınamadı." });
    }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`✅ Flight Service Aktif: ${PORT}`));