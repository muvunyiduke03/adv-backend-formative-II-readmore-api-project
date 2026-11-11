# ReadMore API
 
A REST API for a bookstore, built with Express.js, MongoDB (Atlas) and Mongoose.
It manages two linked entities, **Author** and **Book**: one author has many books, and every book belongs to one author.
 
**Video walkthrough:** https://youtu.be/TT8emWR8q58

## Requirements

- Node.js 18+ (CommonJS modules)
- Express
- MongoDB Atlas + Mongoose
- dotenv, nodemon (development)
## Project structure
 
```
├── server.js          # Entry point: connects to MongoDB, then starts listening
├── models/            # Author and Book schemas
├── controllers/       # All the logic: rules, queries, status codes
├── routes/            # Wires URLs to controller functions only
├── .env               # Local secrets (not committed)
└── .env.example       # Template for .env
```

## Setup
 
1. Install dependencies:
```bash
   npm install
```
2. Copy `.env.example` to `.env` and fill in your values:
```
   PORT=3000
   MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/readmore?retryWrites=true&w=majority
```

3. Start the server:
```bash
   npm run dev
```
The server only starts listening after the MongoDB connection succeeds. If the connection fails, it prints the error and exits.
 
**Troubleshooting:** if you see `querySrv ECONNREFUSED`, your network is blocking Node's SRV DNS lookup. `server.js` sets Node's DNS servers to work around this. Also make sure your IP is allowed under Network Access in Atlas.

### Why `required` is not enough for rule 1
 
`required` only checks that a value exists, and the `ObjectId` type only checks its format. MongoDB has no foreign keys, so a made-up but well-formed id passes both. Only a lookup (`Author.exists`) proves the author is real.
 
### Rule 4: deleting an author (Option A, block)
 
I chose to block the delete with a 409 while the author still has books.
 
- **Why:** books are inventory and sales history. Blocking is the only option that never destroys or falsifies data. Cascade deletes inventory with one wrong request, and reassigning puts the wrong author name on a book.
- **Downside:** friction. The books must be removed first, one request at a time, and there is a tiny window where a book could be added between the count and the delete.

## Testing
 
All endpoints were tested manually in Postman, including the failure cases for each rule. The video above demonstrates the working endpoints.