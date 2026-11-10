const mongoose = require('mongoose');
const Book = require('../models/book');
const Author = require('../models/author');

const invalidId = (res) =>
  res.status(400).json({
    message: 'Invalid book id format!'
  });

const handleError = (res, err) => {
  if (err.name === 'Validation Error'){
    const errors = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      message: 'Validation Failed',
      errors
    });
  }
  console.error(err);
  return res.status(500).json({
    message: 'Server Error'
  });
};

// POST /books
const createBook = async(req, res) => {
  try {
    const { title, genre, price, publishedYear, author} = req.body;

    if (!author){
      return res.status(400).json({
        message: 'Author id is required!'
      });
    }
    if (!mongoose.isValidObjectId(author)){
      return res.status(400).json({
        message: 'Invalid author id format!'
      });
    }

    const ExistingAuthor = await Author.exists({_id: author});
    if (!ExistingAuthor){
      return res.status(404).json({
        message: `No author found with id: ${author}`
      });
    }

    const book = await Book.create({title, genre, price, publishedYear, author});
    await book.populate('author');
    res.status(201).json(book);
  } catch (err){
    handleError(res, err);
  }
};

// GET /books
const getBooks = async(req, res) => {
  try {
    const books = await Book.find().populate('author');
    res.status(200).json(books);
  } catch (err){
    handleError(res, err);
  }
};

// GET /books/:id
const getBookById = async (req, res) => {
  try {
    const {id} = req.params;
    if (!mongoose.isValidObjectId(id)){
      return invalidId(res);
    };

    const book = await Book.findById(id).populate('author');
    if (!book){
      return res.status(404).json({
        message: `No book found with id: ${id}`
      });
    }
    res.status(200).json(book);
  } catch(err){
    handleError(res, err);
  }
};

// PUT /books/:id
const updateBook = async(req, res) => {
  try{
    const {id} = req.params;
    if (!mongoose.isValidObjectId(id)){
      return invalidId(res);
    };

    const {title, genre, price, publishedYear, author} = req.body;

    // If the author is being changed, the new one must exist
    if (author !== undefined){
      if(!mongoose.isValidObjectId(author)){
        return res.status(400).json({
          message: 'Invalid author id format'
        });
      }
      const authorExists = await Author.exists({_id: author});
      if (!existingAuthor){
        return res.status(404).json({
          message: `No author found with id: ${author}`
        });
      }
    }

    const book = await Book.findByIdAndUpdate(
      id,
      {title, genre, price, publishedYear, author},
      {new: true, runValidators: true}
    ).populate('author');

    if (!book){
      return res.status(404).json({
        message: `No book found with id: ${id}`
      });
    }
    res.status(200).json(book);
  } catch (err){
    handleError(res, err);
  }
};

// DELETE /books/:id
const deleteBook = async (req, res) => {
  try{
    const {id} = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return invalidId(res);
    };

    const book = await Book.findByIdAndDelete(id);
    if (!book){
      return res.status(404).json({
        message: `No book found with id: ${id}`
      });
    }
    return res.status(200).json({
      message: 'Book deleted successfully !!', book
    });
  } catch (err){
    handleError(res, err);
  }
};

module.exports = {createBook, getBooks, getBookById, updateBook, deleteBook};