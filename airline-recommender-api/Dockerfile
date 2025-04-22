# Use official Node.js 18 LTS image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package.json .
RUN npm install

# Copy application files
COPY server.js .
COPY import_airline.js .
COPY .env .
COPY dataset/ ./dataset/

# Expose the application port
EXPOSE 3000

# Run the import script and start the server
CMD ["sh", "-c", "node import_airline.js && node server.js"]