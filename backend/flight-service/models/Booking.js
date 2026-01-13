const { DataTypes } = require('sequelize');
const Flight = require('./Flight'); 


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


Flight.hasMany(Booking, { foreignKey: 'flightId' });
Booking.belongsTo(Flight, { foreignKey: 'flightId' });

module.exports = Booking;