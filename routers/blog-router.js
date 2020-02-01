const express = require('express')
const Post = require('../models/post-model')
const User = require('../models/user-model')
const adminAccess = require('../middleware/admin-access')
const authentication = require('../middleware/authentication')
const asyncForEach = require('../utils/async-forEach')
const router = new express.Router()

// takes the user to a page where they can compose a new blog post, if they are an administrator
router.get('/blog/compose', adminAccess, async (req, res) => {
    res.render('compose', {
        title: "Compose a New Post"
    })
})

// this currently just drops a static post into the database
router.post('/blog/post', adminAccess, async (req, res) => {

    try {
        const post = new Post({
            post_title: req.body.post_title,
            body: req.body.body
        })

        await post.save()
        res.status(201).redirect('/blog')
    } catch(error) {
        res.status(400).render('error', {
            error: "There was an error uploading the post.  Please try again.",
            title: "Error!"
        })
    }
})

// display all blog posts
router.get('/blog', adminAccess, async (req, res) => {
    
    const posts = await Post.find({})

    res.render('blog', {
        admin_access: admin_access,
        posts: posts,
        title: "Blog"
    })
})

// display blog posts related to search
router.get('/blog/search', async (req, res) => {
    
    const posts = await Post.find({ $text: { $search: req.query.topic_search } },
        { score: { $meta: "textScore" } })
        .sort({ score: { $meta: "textScore" } })

    res.render('blog', {
        posts: posts,
        title: "Blog"
    })
})

// read a specific article
router.get('/blog/article', async (req, res) => {

    const post = await Post.findById(req.query.article_id)
    var { comments } = post

    // this will display the user's account name, rather than their database ID, to the client
    await asyncForEach(comments, async (comment) => {
        var user = await User.findById(comment.author)
        comment.account_name = user.account_name
        comment.avatar = user.avatar
    })

    res.render('article', {
        title: post.post_title,
        createdAt: post.createdAt,
        body: post.body,
        post_id: post._id,
        comments: comments
    })
})

router.post('/blog/comment', authentication, async (req, res) => {

    const post = await Post.findById(req.body.post_id)
    const comment = {
        author: req.user._id,
        body: req.body.comment_body
    }

    post.comments.push(comment)
    await post.save()
    res.status(201).redirect('/blog/article?article_id=' + req.body.post_id)
})

module.exports = router