const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Hotel Schema
const HotelSchema = new mongoose.Schema({
  location: {
    type: String,
    required: true
  },
  pricePerNight: {
    type: Number,
    required: true
  }
});
const Hotel = mongoose.model('Hotel', HotelSchema);

// Routes
// Add a hotel
app.post('/api/hotels', async (req, res) => {
  try {
    const { location, pricePerNight } = req.body;
    const hotel = new Hotel({ location, pricePerNight });
    await hotel.save();
    res.status(201).json(hotel);
  } catch (error) {
    res.status(400).json({ message: error.message }); // Changed to 400 for validation errors
  }
});

// Get recommended hotels based on budget and location
app.get('/api/recommend', async (req, res) => {
  try {
    const { location, budget } = req.query;

    // Validate location
    if (!location || location.trim() === '') {
      return res.status(400).json({ message: 'Location is required' });
    }

    // Validate budget
    let priceRange = {};
    if (budget === 'low') {
      priceRange = { $lte: 100 };
    } else if (budget === 'medium') {
      priceRange = { $gte: 100, $lte: 250 };
    } else if (budget === 'high') {
      priceRange = { $gte: 250 };
    } else {
      return res.status(400).json({ message: 'Invalid budget. Use low, medium, or high.' });
    }

    // Query hotels
    const query = { 
      location: { $regex: location, $options: 'i' }, // Case-insensitive partial match
      pricePerNight: priceRange 
    };
    const hotels = await Hotel.find(query).limit(5); // Limit to 5 recommendations
    res.json(hotels);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { 
  useNewUrlParser: true, 
  useUnifiedTopology: true 
})
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Start server
const PORT = process.env.PORT || 3005;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});