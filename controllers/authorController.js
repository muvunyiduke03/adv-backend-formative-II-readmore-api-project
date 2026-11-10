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

// DELETE /authors/:id
const deleteAuthor = async(req, res) => {
  try{
    const {id} = req.params;
    if (!mongoose.isValidObjectId(id)){
      return invalidId(res);
    };

    const author = await Author.findByIdAndDelete(id);
    if (!author){
      return res.status(404).json({
        message: `No author found with the ID: ${id}`
      });
    }
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

module.exports = {createAuthor, getAuthors, getAuthorbyId, updateAuthor, deleteAuthor, getBooksByAuthor};
