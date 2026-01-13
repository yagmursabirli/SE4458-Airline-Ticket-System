require('dotenv').config(); // ✅ EN ÜSTTE

const sequelize = require('./sequelize');

const { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } = require("@aws-sdk/client-sqs");
const nodemailer = require('nodemailer');
const cron = require('node-cron');

const path = require('path');

const Flight = require(
  path.join(__dirname, '../flight-service/models/Flight')
);
const Booking = require(
  path.join(__dirname, '../flight-service/models/Booking')
);
const UserProfile = require(
  path.join(__dirname, '../flight-service/models/User')
);

require('dotenv').config();

const client = new SQSClient({ region: "eu-north-1" });
const QUEUE_URL = "https://sqs.eu-north-1.amazonaws.com/684210808058/AirlineNotificationQueue";

// 🔌 DB TEST
(async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ DB bağlantısı başarılı');
  } catch (err) {
    console.error('❌ DB bağlantı hatası:', err);
    process.exit(1);
  }
})();


const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// 📩 SQS LISTENER
async function pollMessages() {
  console.log("📨 SQS Dinleyici Aktif...");
  while (true) {
    try {
      const response = await client.send(
        new ReceiveMessageCommand({
          QueueUrl: QUEUE_URL,
          MaxNumberOfMessages: 1,
          WaitTimeSeconds: 20
        })
      );

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

          await client.send(
            new DeleteMessageCommand({
              QueueUrl: QUEUE_URL,
              ReceiptHandle: message.ReceiptHandle
            })
          );
        }
      }
    } catch (err) {
      console.error("❌ SQS Hatası:", err);
    }
  }
}

// 🌙 CRON – GECE MİL
cron.schedule('0 0 * * *', async () => {
  console.log("🌙 Gece süreci başladı");

  const today = new Date().toISOString().split('T')[0];

  const flights = await Flight.findAll({ where: { flightDate: today } });

  for (const flight of flights) {
    const bookings = await Booking.findAll({
      where: { flightId: flight.id, status: 'CONFIRMED' }
    });

    const earnedMiles = Math.floor(flight.price * 0.1);

    for (const booking of bookings) {
      const profile = await UserProfile.findOne({
        where: { email: booking.userEmail }
      });

      if (profile && earnedMiles > 0) {
        await profile.increment('milesBalance', { by: earnedMiles });

        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: profile.email,
          subject: 'Tebrikler, Milleriniz Yüklendi! ✈️',
          text: `${flight.flightCode} uçuşundan ${earnedMiles} mil kazandınız.`
        });

        console.log(`✅ ${profile.email} → ${earnedMiles} mil`);
      }
    }
  }
});

pollMessages();