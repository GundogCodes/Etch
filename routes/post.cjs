const express = require('express')
const postController = require('../controllers/post.cjs')
const router = express.Router()

//post routes
router.post('/',  postController.createPost) //works
router.delete('/:id', postController.deletePost) //works
router.put('/:id',  postController.updatePost) //works
router.get('/:id',  postController.getPost) //works



module.exports = router