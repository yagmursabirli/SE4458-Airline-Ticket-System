const { DataTypes } = require('sequelize');
const Flight = require('./Flight'); // Mevcut bağlantıyı kullanmak için

const UserProfile = Flight.sequelize.define('UserProfile', {
    email: {
        type: DataTypes.STRING,
        primaryKey: true, // Emaili anahtar yapıyoruz
        allowNull: false
    },
    milesBalance: {
        type: DataTypes.INTEGER,
        defaultValue: 0 // Yeni üyeler 0 mil ile başlar
    },
    membershipType: {
        type: DataTypes.STRING, // Classic, Gold, Elite (PDF İsteği)
        defaultValue: 'Classic'
    }
});

module.exports = UserProfile;