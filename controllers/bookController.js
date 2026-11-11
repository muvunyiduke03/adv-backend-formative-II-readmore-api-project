const mongoose = require('mongoose');
const Book = require('../models/book');
const Author = require('../models/author');

const invalidId = (res) =>
  res.status(400).json({
    message: 'Invalid book id format!'
  });

const SORT_FIELDS = ['price', 'title', 'publishedYear'];

// This will help to escape user text before using it.
const regexEscape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// This is for trimmed string or ''
const text = (v) => (typeof v === 'string' ? v.trim() : '');

// This is to transform into a number
const toNumber = (v) => (v === undefined || v === '' ? undefined : Number(v));

const handleError = (res, err) => {
  if (err.name === 'ValidationError'){
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

const duplicatedTitle = (authorId, title, excludeBookId) => {
  const filter = {
    author: authorId,
    title: title.trim()
  };
  if (excludeBookId) {
    filter._id = {$ne: excludeBookId};
  }
  return Book.findOne(filter).collation({
    locale: 'en',
    strength: 2
  });
};

const MIN_YEAR = 1450;

// Returns a list of issues. It checks fields that were not sent
const checkBookRules = ({price, publishedYear}) => {
  const errors = [];
  const currentYear = new Date().getFullYear();

  if (price !== undefined && (typeof price !== 'number' || !(price > 0))) {
    errors.push('price must be a number greater than 0');
  }

  if (publishedYear !== undefined){
    if (!Number.isInteger(publishedYear)){
      errors.push('publishedYear must be a whole number');
    } else if (publishedYear > currentYear){
      errors.push(`publishedYear cannot be in the future (The latest can be ${currentYear})`);
    } else if (publishedYear < MIN_YEAR){
      errors.push(`publishedYear cannot be brfore ${MIN_YEAR}`);
    }
  }
  return errors;
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
      return res.status(400).json({
        message: `We cannot save the book. No author found with id: ${author}`
      });
    }

    const ruleErrors = checkBookRules({price, publishedYear});
    if (ruleErrors.length){
      return res.status(422).json({
        message: 'This book breaks store rules',
        errors: ruleErrors
      });
    }

    if (typeof title === 'string' && title.trim()) {
      const duplicate = await duplicatedTitle(author, title);
      if (duplicate){
        return res.status(409).json({
          message: `This author already has a book titled "${duplicate.title}"`
        });
      }
    }

    const book = await Book.create({title, genre, price, publishedYear, author});
    await book.populate('author');
    res.status(201).json(book);
  } catch (err){
    handleError(res, err);
  }
};

// GET /books (Accept all query params)
const getBooks = async(req, res) => {
  try {
    const {genre, minPrice, maxPrice, author, search, sort, order} = req.query;

    // A key will be added when its param is sent...
    const filter = {};

    if (text(genre)){
      filter.genre = new RegExp(`^${regexEscape(text(genre))}$`, 'i');
    }

    if (text(search)){
      filter.title = new RegExp(regexEscape(text(search)), 'i');
    }

    if (author !== undefined){
      if (typeof author !== 'string' || !mongoose.isValidObjectId(author)){
        return res.status(400).json({
          message: 'Invalid author id format!'
        });
      }
      filter.author = author;
    }

    const min = toNumber(minPrice);
    const max = toNumber(maxPrice);
    if (Number.isNaN(min) || Number.isNaN(max)){
      return res.status(400).json({
        message: 'minPrice and maxPrice must be numbers'
      });
    }
    if (min !== undefined && max !== undefined && min > max){
      return res.status(400).json({
        message: 'minPrice cannot be greater than maxPrice'
      });
    }
    if (min !== undefined || max !== undefined){
      filter.price = {};
      if (min !== undefined) {
        filter.price.$gte = min;
      };

      if (max !== undefined) {
        filter.price.$lte = max;
      };
    }
    if (sort !== undefined && !SORT_FIELDS.includes(sort)){
      return res.status(400).json({
        message: `sort must be one of: ${SORT_FIELDS.join(', ')}`
      });
    }
    if (order !== undefined && !['asc', 'desc'].includes(order)){
      return res.status(400).json({
        message: 'order must be "ascending", or "descending" '
      });
    }

    // Pagination
    const paginate = req.query.page !== undefined || req.query.limit !== undefined;
    const pageNum = req.query.page === undefined ? 1 : Number(req.query.page);
    const limitNum = req.query.limit === undefined ? 10 : Number(req.query.limit);

    if (paginate && (
      !Number.isInteger(pageNum) || pageNum < 1 ||
      !Number.isInteger(limitNum) || limitNum < 1 || limitNum > 100
    )) {
      return res.status(400).json({
        message: 'Page must be a whole number >= 1. Whole number from 1 to 100 for limit.'
      });
    }

    // Books with equal values never repeat or disappear in between pages.
    const sortSpec = {_id: 1};
    if (sort){
      sortSpec[sort] = order === 'desc' ? -1 : 1;
    }

    let query = Book.find(filter)
      .populate('author')
      .sort(sortSpec)
      .collation({locale: 'en'});
    
    if (paginate){
      query = query.skip((pageNum - 1) * limitNum).limit(limitNum);
    }

    const [results, total] = await Promise.all([
      query,
      Book.countDocuments(filter)
    ]);
    res.status(200).json({
      page: pageNum,
      limit: paginate ? limitNum : total,
      total,
      totalPages: paginate ? Math.ceil(total / limitNum) : 1,
      results
    });

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
      if (!authorExists){
        return res.status(400).json({
          message: `No author found with id: ${author}`
        });
      }
    }

    const ruleErrors = checkBookRules({price, publishedYear});
    if (ruleErrors.length){
      return res.status(422).json({
        message: 'This book breaks store rules',
        errors: ruleErrors
      });
    }

    if (title !== undefined || author !== undefined) {
      const current = await Book.findById(id);
      if (!current) {
        return res.status(404).json({
          message: `No book found with id: ${id}`
        });
      }

      const finalAuthor = author ?? current.author;
      const finalTitle = typeof title === 'string' && title.trim() ? title: current.title;

      const duplicate = await duplicatedTitle(finalAuthor, finalTitle, id);
      if (duplicate){
        return res.status(409).json({
          message: `This author already has a book with title "${duplicate.title}"`
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