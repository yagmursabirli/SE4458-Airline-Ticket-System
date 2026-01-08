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
    const { from, to, date, flexible, directOnly, passengers } = req.query;
    const passengerCount = parseInt(passengers) || 1;
    
    let whereClause = {
        fromCity: from,
        toCity: to,
        capacity: { [Op.gte]: passengerCount } // Seçilen yolcu sayısı kadar yer olmalı
    };

    if (date && date !== "") {
        if (flexible === 'true') { // Query params string gelir
            const searchDate = new Date(date);
            const startDate = new Date(searchDate);
            startDate.setDate(searchDate.getDate() - 3);
            const endDate = new Date(searchDate);
            endDate.setDate(searchDate.getDate() + 3);

            whereClause.flightDate = {
                [Op.between]: [
                    startDate.toISOString().split('T')[0], 
                    endDate.toISOString().split('T')[0]
                ]
            };
        } else {
            whereClause.flightDate = date;
        }
    }

    if (directOnly === 'true') {
        whereClause.isDirect = true; 
    }

    try {
        const flights = await Flight.findAll({ where: whereClause });
        res.json(flights);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// BİLET ALMA (MİLLER VE ÜYELİK DAHİL)
// Bilet Satın Alma Endpoint'i
app.post('/api/flights/book/:id', async (req, res) => {
    const flightId = req.params.id; // URL'den gelen uçuş ID'si
    const { email, useMiles, isMemberRequest, passengers } = req.body; 
    const passengerCount = parseInt(passengers) || 1;

    try {
        // Sadece URL'deki ID'ye sahip uçuşu getiriyoruz
        const flight = await Flight.findByPk(flightId); 
        
        if (!flight) return res.status(404).json({ error: "Uçuş bulunamadı" });

        if (flight.capacity < passengerCount) {
            return res.status(400).json({ error: `Yetersiz koltuk! Sadece ${flight.capacity} yer kaldı.` });
        }

        await Flight.sequelize.transaction(async (t) => {
            if (useMiles) {
                const profile = await UserProfile.findOne({ where: { email }, transaction: t });
                if (!profile) throw new Error("Mil kullanmak için üye olmalısınız!");
                // Mil maliyeti hesaplama ve düşme
                const requiredMiles = (flight.price * 10) * passengerCount;
                if (profile.milesBalance < requiredMiles) throw new Error("Yetersiz mil!");
                await profile.decrement('milesBalance', { by: requiredMiles, transaction: t });
            }

            // Sadece BULUNAN uçuşun kapasitesini azaltıyoruz
            await flight.update({ capacity: flight.capacity - passengerCount }, { transaction: t });
            
            // Rezervasyon kaydı
            await Booking.create({ 
                flightId: flight.id, 
                userEmail: email, 
                status: 'CONFIRMED' 
            }, { transaction: t });
        });

        res.json({ message: `${passengerCount} adet bilet onaylandı! ✈️` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// NIGHTLY PROCESS (Her dakika başında çalışır)
cron.schedule('0 0 * * *', async () => {
    console.log("🌙 Nightly Process Başladı...");
    try {
        const today = new Date().toISOString().split('T')[0];
        
        // 1. Uçuşu tamamlanmış biletleri bul
        const pastBookings = await Booking.findAll({
            where: { status: 'CONFIRMED' },
            include: [{ 
                model: Flight, 
                where: { flightDate: { [Op.lt]: today } } 
            }]
        });

        for (let booking of pastBookings) {
            const earnedMiles = Math.floor(booking.Flight.price * 0.1);
            const profile = await UserProfile.findOne({ where: { email: booking.userEmail } });

            if (profile) {
                // Milleri güncelle
                await profile.increment('milesBalance', { by: earnedMiles });
                await booking.update({ status: 'COMPLETED' });

                // PDF: Send email if points added
                await sqsClient.send(new SendMessageCommand({
                    QueueUrl: QUEUE_URL,
                    MessageBody: JSON.stringify({
                        email: booking.userEmail,
                        type: "MILES_ADDED",
                        subject: "Uçuşunuz Tamamlandı: Mil Kazandınız!",
                        message: `${booking.Flight.flightCode} uçuşunuz için ${earnedMiles} mil yüklendi. Keyifli harcamalar!`
                    })
                }));
            }
        }
    } catch (error) {
        console.error("❌ Scheduled Task Hatası:", error);
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

// Diğer havayollarının mil güncelleyebileceği servis
app.post('/api/external/update-miles', async (req, res) => {
    const apiKey = req.headers['x-api-key'];
    
    // PDF: This will be an authenticated service
    if (apiKey !== process.env.EXTERNAL_AIRLINE_KEY) {
        return res.status(401).json({ error: "Yetkisiz erişim!" });
    }

    const { email, milesToAdd } = req.body;
    try {
        const profile = await UserProfile.findOne({ where: { email } });
        if (!profile) return res.status(404).json({ error: "Üye bulunamadı" });

        await profile.increment('milesBalance', { by: milesToAdd });
        
        // SQS'e bildirim at (Mail gönderimi için)
        await sqsClient.send(new SendMessageCommand({
            QueueUrl: QUEUE_URL,
            MessageBody: JSON.stringify({
                email: email,
                type: "MILES_ADDED",
                subject: "Ortak Havayolundan Mil Kazandınız!",
                message: `Anlaşmalı havayolu uçuşunuzdan ${milesToAdd} mil hesabınıza yüklendi.`
            })
        }));

        res.json({ message: "Miller başarıyla güncellendi." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`✅ Flight Service Aktif: ${PORT}`));