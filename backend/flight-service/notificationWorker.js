const { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } = require("@aws-sdk/client-sqs");
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const { Op } = require('sequelize'); 
const Flight = require('./models/Flight'); 
const Booking = require('./models/Booking');
const UserProfile = require('./models/User');
require('dotenv').config();

const client = new SQSClient({ region: "eu-north-1" });
const QUEUE_URL = "https://sqs.eu-north-1.amazonaws.com/684210808058/AirlineNotificationQueue";

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

async function pollMessages() {
    console.log("📨 SQS Dinleyici Aktif...");
    while (true) {
        try {
            const command = new ReceiveMessageCommand({
                QueueUrl: QUEUE_URL,
                MaxNumberOfMessages: 1,
                WaitTimeSeconds: 20
            });
            const response = await client.send(command);

            if (response.Messages) {
                for (const message of response.Messages) {
                    const data = JSON.parse(message.Body);
                    await transporter.sendMail({
                        from: process.env.EMAIL_USER,
                        to: data.email,
                        subject: 'İşlem Bilgilendirmesi ✈️',
                        text: data.message
                    });
                    console.log(`📧 Anlık mail gönderildi: ${data.email}`);
                    await client.send(new DeleteMessageCommand({
                        QueueUrl: QUEUE_URL,
                        ReceiptHandle: message.ReceiptHandle
                    }));
                }
            }
        } catch (error) { console.error("SQS Hatası:", error); }
    }
}

cron.schedule('0 0 * * *', async () => {
    console.log("🌙 Gece Süreci Başladı: Tamamlanan uçuşların milleri hesaplanıyor...");
    const today = new Date().toISOString().split('T')[0];

    try {
        // Bugünün uçuşlarını bul
        const completedFlights = await Flight.findAll({
            where: { flightDate: today }
        });

        for (const flight of completedFlights) {
            // Bu uçuşa ait onaylı tüm rezervasyonları bul
            const bookings = await Booking.findAll({
                where: { 
                    flightId: flight.id,
                    status: 'CONFIRMED' // Sadece satın alınmış/onaylı olanlar
                }
            });

            // %10 mil hesapla
            const earnedMiles = Math.floor(flight.price * 0.10); 

            for (const booking of bookings) {
                // UserProfile modelinde email PRIMARY KEY ise findByPk(email) kullanılır
                const profile = await UserProfile.findOne({ where: { email: booking.userEmail } });
                
                if (profile && earnedMiles > 0) {
                    // Milleri ekle
                    await profile.increment('milesBalance', { by: earnedMiles });
                    
                    // Statü güncelle (Tekrar mil kazanmasın diye opsiyonel olarak eklenebilir)
                    // await booking.update({ status: 'COMPLETED' });

                    // Mail gönder
                    await transporter.sendMail({
                        from: process.env.EMAIL_USER,
                        to: profile.email,
                        subject: 'Tebrikler, Milleriniz Yüklendi! ✈️',
                        text: `Sayın üyemiz, ${flight.flightCode} kodlu uçuşunuz tamamlanmıştır. ${earnedMiles} mil hesabınıza eklenmiştir.`
                    });
                    console.log(`✅ ${earnedMiles} mil eklendi ve mail gönderildi: ${profile.email}`);
                }
            }
        }
    } catch (error) {
        console.error("❌ Gece süreci hatası:", error);
    }
});

pollMessages();