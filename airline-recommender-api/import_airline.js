const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/airline_db';
const DATABASE_NAME = process.env.DATABASE_NAME || 'airline_db';
const DATASETS_DIR = './dataset';
const CSV_FILE = 'Air_Traffic_Passenger_Statistics.csv';
const COLLECTION_NAME = 'passenger_stats';

async function importCSVToMongo(filePath, collectionName, client) {
  console.log(`Importing ${filePath} into collection ${collectionName}...`);

  const records = [];
  const parser = fs
    .createReadStream(filePath)
    .pipe(parse({
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }));

  for await (const record of parser) {
    // Clean and convert data
    const cleanedRecord = {
      activityPeriod: Number(record['Activity Period']) || 0,
      activityPeriodStartDate: record['Activity Period Start Date'] ? new Date(record['Activity Period Start Date']) : null,
      operatingAirline: record['Operating Airline'] || '',
      operatingAirlineIataCode: record['Operating Airline IATA Code'] || '',
      publishedAirline: record['Published Airline'] || '',
      publishedAirlineIataCode: record['Published Airline IATA Code'] || '',
      geoSummary: record['GEO Summary'] || '',
      geoRegion: record['GEO Region'] || '',
      activityTypeCode: record['Activity Type Code'] || '',
      priceCategoryCode: record['Price Category Code'] || '',
      terminal: record['Terminal'] || '',
      boardingArea: record['Boarding Area'] || '',
      passengerCount: Number(record['Passenger Count']) || 0,
      dataAsOf: record['data_as_of'] ? new Date(record['data_as_of']) : null,
      dataLoadedAt: record['data_loaded_at'] ? new Date(record['data_loaded_at']) : null
    };

    // Validate record
    if (cleanedRecord.operatingAirline && cleanedRecord.passengerCount > 0) {
      records.push(cleanedRecord);
    }
  }

  if (records.length === 0) {
    console.warn(`No valid records found in ${filePath}`);
    return;
  }

  const db = client.db(DATABASE_NAME);
  const collection = db.collection(collectionName);

  // Drop existing collection to avoid duplicates
  await collection.deleteMany({});

  // Insert records
  const result = await collection.insertMany(records);
  console.log(`Imported ${result.insertedCount} documents into ${collectionName}`);
}

async function main() {
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const filePath = path.join(DATASETS_DIR, CSV_FILE);
    if (!fs.existsSync(filePath)) {
      console.error(`CSV file not found at ${filePath}`);
      process.exit(1);
    }

    await importCSVToMongo(filePath, COLLECTION_NAME, client);
  } catch (err) {
    console.error('Error during import:', err);
    process.exit(1);
  } finally {
    await client.close();
    console.log('MongoDB connection closed');
  }
}

main();