const { Sequelize, DataTypes } = require('sequelize');

// Bilgileri buraya direkt yaz (Test amaçlı)
const sequelize = new Sequelize(
  'postgres', // Veritabanı adın (genelde postgres)
  'postgres', // Master username
  'Badem300124!', // AWS'de belirlediğin şifre
  {
    host: 'airline-ticketing-db.c520kqeg2b1w.eu-north-1.rds.amazonaws.com', // RDS sayfasındaki Endpoint
    dialect: 'postgres',
    port: 5432,
    logging: console.log,
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
  predictedPrice: { type: DataTypes.DECIMAL(10, 2) }
});

sequelize.sync({ alter: true })
  .then(() => console.log('AWS RDS: Tablo başarıyla oluşturuldu!'))
  .catch(err => console.error('Bağlantı hatası:', err));

module.exports = Flight;