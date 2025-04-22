const express = require('express');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/airline_db';
const DATABASE_NAME = process.env.DATABASE_NAME || 'airline_db';
const COLLECTION_NAME = 'passenger_stats';

app.use(express.json());

// Basic recommender endpoint
app.post('/recommend', async (req, res) => {
  const { geoRegion, priceCategory } = req.body;

  // Validate input
  if (!geoRegion || !priceCategory) {
    return res.status(400).json({ error: 'geoRegion and priceCategory are required' });
  }

  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    const db = client.db(DATABASE_NAME);
    const collection = db.collection(COLLECTION_NAME);

    // Find records for the latest period (202501) matching geoRegion and priceCategory
    const results = await collection.aggregate([
      {
        $match: {
          activityPeriod: 202501,
          geoRegion: geoRegion,
          priceCategoryCode: priceCategory
        }
      },
      {
        $group: {
          _id: {
            airline: '$operatingAirline',
            iataCode: '$operatingAirlineIataCode'
          },
          totalPassengers: { $sum: '$passengerCount' }
        }
      },
      {
        $sort: { totalPassengers: -1 }
      },
      {
        $limit: 3
      },
      {
        $project: {
          airline: '$_id.airline',
          iataCode: '$_id.iataCode',
          totalPassengers: 1,
          _id: 0
        }
      }
    ]).toArray();

    if (results.length === 0) {
      return res.status(404).json({ message: 'No airlines found for the specified criteria' });
    }

    res.json({
      recommendations: results
    });
  } catch (err) {
    console.error('Error in /recommend:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    await client.close();
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});