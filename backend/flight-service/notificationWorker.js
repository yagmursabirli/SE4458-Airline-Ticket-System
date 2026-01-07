const { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } = require("@aws-sdk/client-sqs");
const nodemailer = require('nodemailer');
require('dotenv').config();

const client = new SQSClient({ region: "eu-north-1" });
const QUEUE_URL = "https://sqs.eu-north-1.amazonaws.com/684210808058/AirlineNotificationQueue";

// Mail Gönderici Ayarları
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
       user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

async function pollMessages() {
    console.log("📨 Notification Worker: Kuyruk dinleniyor ve mailler gönderilmeye hazır...");

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
                    
                    // Gerçek Mail Gönderme İşlemi
                    const mailOptions = {
                       from: process.env.EMAIL_USER,
                        to: data.email,
                        subject: 'Uçuş Rezervasyon Onayı ✈️',
                        text: data.message
                    };

                    await transporter.sendMail(mailOptions);
                    console.log(`📧 Başarılı: ${data.email} adresine mail gönderildi!`);

                    // Mesajı kuyruktan sil
                    await client.send(new DeleteMessageCommand({
                        QueueUrl: QUEUE_URL,
                        ReceiptHandle: message.ReceiptHandle
                    }));
                }
            }
        } catch (error) {
            console.error("Worker Hatası:", error);
        }
    }
}

pollMessages();