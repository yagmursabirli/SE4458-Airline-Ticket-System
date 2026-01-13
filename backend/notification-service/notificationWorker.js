const { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } = require("@aws-sdk/client-sqs");
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const { Op } = require('sequelize'); 
const Flight = require('./models/Flight'); 
const Booking = require('./models/Booking');
const UserProfile = require('./models/UserProfile');
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

// --- GÖREV 1: ANLIK KUYRUK İŞLEME (SQS) ---
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

// --- GÖREV 2: GECE MİL GÜNCELLEME (SCHEDULER) ---
cron.schedule('0 0 * * *', async () => {
    console.log("🌙 Gece Süreci: Uçuş fiyatına göre miller hesaplanıyor...");
    const today = new Date().toISOString().split('T')[0];

    try {
        // 1. Bugünün tarihli uçuşlarını bul
        const completedFlights = await Flight.findAll({
            where: { flightDate: today }
        });

        for (const flight of completedFlights) {
            // 2. Bu uçuşa ait tüm rezervasyonları bul
            const bookings = await Booking.findAll({
                where: { flightId: flight.id }
            });

            // 3. Mil Hesaplama: Uçuş fiyatının %10'u
            const earnedMiles = Math.floor(flight.price * 0.10); // 

            for (const booking of bookings) {
                // 4. Kullanıcının Miles&Smiles profilini bul ve mil ekle
                const profile = await UserProfile.findByPk(booking.userEmail);
                if (profile) {
                    await profile.increment('milesBalance', { by: earnedMiles });

                    // 5. Bilgilendirme Maili At
                    await transporter.sendMail({
                        from: process.env.EMAIL_USER,
                        to: profile.email,
                        subject: 'Tebrikler, Milleriniz Yüklendi! ✈️',
                        text: `Sayın üyemiz, ${flight.flightCode} kodlu uçuşunuz tamamlanmıştır. Uçuş bedelinin %10'u olan ${earnedMiles} mil hesabınıza eklenmiştir. Keyifli uçuşlar dileriz!`
                    });
                    console.log(`✅ ${earnedMiles} mil eklendi: ${profile.email}`);
                }
            }
        }
    } catch (error) {
        console.error("❌ Gece süreci hatası:", error);
    }
});

pollMessages();