const mongoose = require('mongoose');
const Author = require('../models/author');
const Book = require('../models/book');

// These will help the functions to handle errors
const invalidId = (res) =>
  res.status(400).json({
    message: "Invalid author id, Please try again!!"
  });

const handleError = (res, err) => {
  if(err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      message: 'Validation failed', errors
    });
  }
  console.error(err);
  return res.status(500).json({
    message: 'Server Error'
  });
};

// POST /authors
const createAuthor = async(req, res) => {
  try{
    const {name, country, bio} = req.body;
    const author = await Author.create({name, country, bio});
    res.status(201).json(author);
  } catch(err){
    handleError(res, err);
  }
};

// GET /authors
const getAuthors = async (req, res) => {
  try {
    const authors = await Author.find();
    res.status(200).json(authors);
  } catch (err){
    handleError(res, err);
  }
};

// GET /authors/:id
const getAuthorbyId = async(req, res) => {
  try{
    const {id} = req.params;
    if (!mongoose.isValidObjectId(id)){
      return invalidId(res);
    };

    const author = await Author.findById(id);
    if (!author){
      return res.status(404).json({
        message: `No author found with the id ${id}`
      });
    }
    res.status(200).json(author);
  } catch(err){
    handleError(res, err);
  }
};

// PUT /authors/:id
const updateAuthor = async(req, res) => {
  try{
    const {id} = req.params;
    if (!mongoose.isValidObjectId(id)){
      return invalidId(res);
    };

    const {name, country, bio} = req.body;
    const author = await Author.findByIdAndUpdate(
      id,
      {name, country, bio},
      {new: true, runValidators: true}
    );

    if (!author){
      return res.status(404).json({
        message: `No author was found with the id: ${id}`
      });
    }
    res.status(200).json(author);
  } catch(err){
    handleError(res, err);
  }
};

// DELETE /authors/:id (I went with the option A: It returns 409 when there is still a book by the author)
const deleteAuthor = async(req, res) => {
  try{
    const {id} = req.params;
    if (!mongoose.isValidObjectId(id)){
      return invalidId(res);
    };

    const author = await Author.findById(id);
    if (!author){
      return res.status(404).json({
        message: `No author found with the ID: ${id}`
      });
    }

    const bookCount = await Book.countDocuments({author: id});
    if (bookCount > 0){
      return res.status(409).json({
        message: `Cannot delete ${author.name}: they still have ${bookCount} book(s). You have to delete them first.`
      });
    }

    await author.deleteOne();
    res.status(200).json({
      message: 'Author Deleted Successfully!!', author
    });
  } catch(err){
    handleError(res, err);
  }
};

// GET /authors/:id/books
const getBooksByAuthor = async(req, res) => {
  try{
    const {id} = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return invalidId(res);
    };

    const author = await Author.findById(id);
    if (!author){
      return res.status(404).json({
        message: `No author found with id: ${id}`
      });
    }

    const books = await Book.find({author: id});
    res.status(200).json({author, books});
  } catch (err){
    handleError(res, err);
  }
};

// GET /authors/:id/stats
const getAuthorStats = async(req, res) => {
  try{
    const {id} = req.params;
    if (!mongoose.isValidObjectId(id)){
      return invalidId(res);
    };

    const author = await Author.findById(id);
    if (!author){
      return res.status(404).json({
        message: `No author found with id: ${id}`
      });
    }

    // This will help to sort by price
    const [stats] = await Book.aggregate([
      {$match: {author: author._id}},
      {$sort: {price: 1, title: 1}},
      {$group: {
        _id: null,
        bookCount: {$sum: 1},
        avgPrice: {$avg: '$price'},
        cheapestBook: {$first: '$title'},
        expensiveBook: {$last: '$title'}
      }}
    ]);

    // This is for when author has no books.
    if (!stats){
      return res.status(200).json({
        author: author.name,
        bookCount: 0,
        averagePrice: null,
        cheapestBook: null,
        expensiveBook: null
      });
    }

    res.status(200).json({
      author: author.name,
      bookCount: stats.bookCount,
      avgPrice: Math.round(stats.avgPrice * 100) / 100,
      cheapestBook: stats.cheapestBook,
      expensiveBook: stats.expensiveBook
    });
  } catch (err){
    handleError(res, err);
  }
};

module.exports = {createAuthor, getAuthors, getAuthorbyId, updateAuthor, deleteAuthor, getBooksByAuthor, getAuthorStats};
