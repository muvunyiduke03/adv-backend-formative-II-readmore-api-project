const express = require('express');
const {createAuthor, getAuthors, getAuthorsbyId, updateAuthor, deleteAuthor, getAuthorbyId} = require('../controllers/authorController');
const router = express.Router()

router.post('/', createAuthor);
router.get('/', getAuthors);
router.get('/:id', getAuthorbyId);
router.put('/:id', updateAuthor);
router.delete('/:id', deleteAuthor);

module.exports = router;