const mongoose = require('mongoose');
const fs = require('fs');
const csv = require('csv-parser');

const HotelSchema = new mongoose.Schema({
  location: { type: String, required: true },
  pricePerNight: { type: Number, required: true }
});
const Hotel = mongoose.model('Hotel', HotelSchema);

mongoose.connect(process.env.MONGO_URI || 'mongodb://mongo:27017/makemytrip', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('Connected to MongoDB for import'))
  .catch((err) => console.error('MongoDB connection error:', err));

const hotels = [];
fs.createReadStream('city_hotels_with_ratings_prices.csv')
  .pipe(csv())
  .on('data', (row) => {
    hotels.push({
      location: row.City,
      pricePerNight: parseFloat(row.Price_Per_Night)
    });
  })
  .on('end', async () => {
    try {
      await Hotel.deleteMany({});
      await Hotel.insertMany(hotels);
      console.log(`${hotels.length} hotels imported successfully`);
      mongoose.connection.close();
    } catch (error) {
      console.error('Error importing hotels:', error);
      mongoose.connection.close();
    }
  });