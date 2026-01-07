const { DataTypes } = require('sequelize');
const Flight = require('./Flight'); // Flight.js zaten sequelize'ı içinde barındırıyor

// Flight modelinin içindeki sequelize bağlantısını kullanıyoruz
const Booking = Flight.sequelize.define('Booking', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    userEmail: {
        type: DataTypes.STRING,
        allowNull: false
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: 'CONFIRMED'
    },
    bookingDate: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
});

// İlişkiler (PDF Sayfa 4 gereği: Transaction ve Mile hesaplama için şart)
Flight.hasMany(Booking, { foreignKey: 'flightId' });
Booking.belongsTo(Flight, { foreignKey: 'flightId' });

module.exports = Booking;