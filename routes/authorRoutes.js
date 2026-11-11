const express = require('express');
const {createAuthor, getAuthors, updateAuthor, deleteAuthor, getAuthorbyId, getBooksByAuthor, getAuthorStats} = require('../controllers/authorController');
const router = express.Router()

router.post('/', createAuthor);
router.get('/', getAuthors);
router.get('/:id', getAuthorbyId);
router.get('/:id/books', getBooksByAuthor);
router.get('/:id/stats', getAuthorStats);
router.put('/:id', updateAuthor);
router.delete('/:id', deleteAuthor);

module.exports = router;