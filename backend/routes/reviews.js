const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  createReview,
  createDirectReview,
  updateReview,
  getMyReviewFor,
  getUserReviews,
  getMyReviews,
} = require('../controllers/reviewController');

router.post('/',                         auth, createReview);
router.post('/direct',                   auth, createDirectReview);
router.put('/:id',                       auth, updateReview);
router.get('/my-review-for/:userId',     auth, getMyReviewFor);
router.get('/my-reviews',                auth, getMyReviews);
router.get('/user/:userId',              auth, getUserReviews);

module.exports = router;
