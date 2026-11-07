const dns = require('node:dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const app = express();

// This will let us read the JSON bodies from requests
app.use(express.json());

// For health check
app.get('/', (req, res) => {
  res.json({ message: 'Our ReadMore API is running well' });
});

const PORT = process.env.PORT || 3000;

// Have to connect first and connection succeeds for listening
mongoose.connect(process.env.MONGO_URI).then(() => {
  console.log('Connected Successfully to MongoDB');
  app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
}).catch((err) => {
  console.error('MongoDB connection failed:', err.message);
  process.exit(1);
});
