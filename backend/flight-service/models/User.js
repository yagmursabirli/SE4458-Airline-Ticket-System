const { DataTypes } = require('sequelize');
const Flight = require('./Flight'); 

const UserProfile = Flight.sequelize.define('UserProfile', {
    email: {
        type: DataTypes.STRING,
        primaryKey: true, 
        allowNull: false
    },
    milesBalance: {
        type: DataTypes.INTEGER,
        defaultValue: 0 
    },
    membershipType: {
        type: DataTypes.STRING, 
        defaultValue: 'Classic'
    }
});

module.exports = UserProfile;