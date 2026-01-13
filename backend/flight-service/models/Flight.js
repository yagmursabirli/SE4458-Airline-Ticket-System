const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

require('dotenv').config({ path: path.join(process.cwd(), '.env') }); 


const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: 'postgres',
    port: process.env.DB_PORT,
    logging: false, 
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  }
);

const Flight = sequelize.define('Flight', {
  fromCity: { type: DataTypes.STRING, allowNull: false },
  toCity: { type: DataTypes.STRING, allowNull: false },
  flightDate: { type: DataTypes.DATEONLY, allowNull: false },
  flightCode: { type: DataTypes.STRING, allowNull: false, unique: true },
  duration: { type: DataTypes.STRING, allowNull: false },
  price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  capacity: { type: DataTypes.INTEGER, allowNull: false },
  predictedPrice: { type: DataTypes.DECIMAL(10, 2) },
  
  stops: { 
    type: DataTypes.STRING, 
    allowNull: false, 
    defaultValue: 'zero' 
  }
});

sequelize.sync({ alter: true })
  .then(() => console.log('AWS RDS: Tablo başarıyla oluşturuldu!'))
  .catch(err => console.error('Bağlantı hatası:', err));

module.exports = Flight;