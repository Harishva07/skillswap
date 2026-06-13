/**
 * SkillSwap - Review Controller
 * Handles rating and review system
 */

const db = require('../config/db');

/**
 * POST /api/reviews
 * Create a review for a completed exchange
 */
const createReview = async (req, res) => {
  try {
    const { exchange_id, rating, comment } = req.body;
    const reviewerId = req.user.id;

    if (!exchange_id || !rating) {
      return res.status(400).json({ success: false, message: 'exchange_id and rating are required.' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5.' });
    }

    // Verify exchange is completed and reviewer is part of it
    const [exchanges] = await db.execute(
      'SELECT * FROM exchange_requests WHERE id = ? AND status = "completed" AND (requester_id = ? OR recipient_id = ?)',
      [exchange_id, reviewerId, reviewerId]
    );

    if (exchanges.length === 0) {
      return res.status(400).json({ success: false, message: 'Exchange not found or not completed.' });
    }

    const exchange = exchanges[0];

    // Check for duplicate review
    const [existing] = await db.execute(
      'SELECT id FROM reviews WHERE reviewer_id = ? AND exchange_id = ?',
      [reviewerId, exchange_id]
    );
    if (existing.length > 0) return res.status(409).json({ success: false, message: 'You already reviewed this exchange.' });

    // Determine reviewee
    const revieweeId = exchange.requester_id === reviewerId ? exchange.recipient_id : exchange.requester_id;

    // Create review
    const [result] = await db.execute(
      'INSERT INTO reviews (reviewer_id, reviewee_id, exchange_id, rating, comment) VALUES (?, ?, ?, ?, ?)',
      [reviewerId, revieweeId, exchange_id, rating, comment || null]
    );

    // Update reviewee's average rating
    const [[{ avg_rating, total }]] = await db.execute(
      'SELECT AVG(rating) as avg_rating, COUNT(*) as total FROM reviews WHERE reviewee_id = ?',
      [revieweeId]
    );
    await db.execute(
      'UPDATE users SET rating = ?, total_reviews = ? WHERE id = ?',
      [parseFloat(avg_rating).toFixed(2), total, revieweeId]
    );

    res.status(201).json({ success: true, message: 'Review submitted! Thank you for your feedback.', id: result.insertId });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit review.' });
  }
};

/**
 * POST /api/reviews/direct
 * Create a direct review for any user (no exchange required)
 */
const createDirectReview = async (req, res) => {
  try {
    const { reviewee_id, rating, comment } = req.body;
    const reviewerId = req.user.id;

    if (!reviewee_id || !rating) {
      return res.status(400).json({ success: false, message: 'reviewee_id and rating are required.' });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5.' });
    }
    if (String(reviewee_id) === String(reviewerId)) {
      return res.status(400).json({ success: false, message: 'You cannot review yourself.' });
    }

    // Prevent duplicate direct review
    const [existing] = await db.execute(
      'SELECT id FROM reviews WHERE reviewer_id = ? AND reviewee_id = ? AND exchange_id IS NULL',
      [reviewerId, reviewee_id]
    );
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'You already reviewed this user. Use edit instead.' });
    }

    await db.execute(
      'INSERT INTO reviews (reviewer_id, reviewee_id, rating, comment) VALUES (?, ?, ?, ?)',
      [reviewerId, reviewee_id, rating, comment || null]
    );

    // Update reviewee average rating
    const [[{ avg_rating, total }]] = await db.execute(
      'SELECT AVG(rating) as avg_rating, COUNT(*) as total FROM reviews WHERE reviewee_id = ?',
      [reviewee_id]
    );
    await db.execute(
      'UPDATE users SET rating = ?, total_reviews = ? WHERE id = ?',
      [parseFloat(avg_rating).toFixed(2), total, reviewee_id]
    );

    res.status(201).json({ success: true, message: 'Review submitted! Thank you.' });
  } catch (error) {
    console.error('Direct review error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit review.' });
  }
};

/**
 * PUT /api/reviews/:id
 * Update an existing review (reviewer only)
 */
const updateReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const reviewerId = req.user.id;
    const { id } = req.params;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5.' });
    }

    // Verify ownership
    const [reviews] = await db.execute(
      'SELECT * FROM reviews WHERE id = ? AND reviewer_id = ?',
      [id, reviewerId]
    );
    if (reviews.length === 0) {
      return res.status(404).json({ success: false, message: 'Review not found or not yours.' });
    }

    await db.execute(
      'UPDATE reviews SET rating = ?, comment = ? WHERE id = ?',
      [rating, comment || null, id]
    );

    // Recalculate reviewee average
    const revieweeId = reviews[0].reviewee_id;
    const [[{ avg_rating, total }]] = await db.execute(
      'SELECT AVG(rating) as avg_rating, COUNT(*) as total FROM reviews WHERE reviewee_id = ?',
      [revieweeId]
    );
    await db.execute(
      'UPDATE users SET rating = ?, total_reviews = ? WHERE id = ?',
      [parseFloat(avg_rating).toFixed(2), total, revieweeId]
    );

    res.json({ success: true, message: 'Review updated!' });
  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({ success: false, message: 'Failed to update review.' });
  }
};

/**
 * GET /api/reviews/my-review-for/:userId
 * Get current user's review for a specific user (if exists)
 */
const getMyReviewFor = async (req, res) => {
  try {
    const [reviews] = await db.execute(
      'SELECT id, rating, comment, created_at FROM reviews WHERE reviewer_id = ? AND reviewee_id = ?',
      [req.user.id, req.params.userId]
    );
    res.json({ success: true, review: reviews[0] || null });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch.' });
  }
};

/**
 * GET /api/reviews/user/:userId
 * Get reviews for a specific user
 */
const getUserReviews = async (req, res) => {
  try {
    const { userId } = req.params;
    const pageNum = Math.max(1, parseInt(req.query.page) || 1);
    const limitNum = Math.min(50, parseInt(req.query.limit) || 10);
    const offset = (pageNum - 1) * limitNum;

    const [reviews] = await db.query(
      `SELECT r.id, r.rating, r.comment, r.created_at,
              u.id as reviewer_id, u.name as reviewer_name,
              u.profile_picture as reviewer_avatar
       FROM reviews r
       JOIN users u ON r.reviewer_id = u.id
       WHERE r.reviewee_id = ?
       ORDER BY r.created_at DESC
       LIMIT ${limitNum} OFFSET ${offset}`,
      [userId]
    );

    const [[{ total, avg }]] = await db.execute(
      'SELECT COUNT(*) as total, AVG(rating) as avg FROM reviews WHERE reviewee_id = ?',
      [userId]
    );

    res.json({
      success: true,
      reviews,
      stats: { total, average: parseFloat(avg || 0).toFixed(1) }
    });
  } catch (error) {
    console.error('Get user reviews error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch reviews.' });
  }
};

/**
 * GET /api/reviews/my-reviews
 * Get reviews written by current user
 */
const getMyReviews = async (req, res) => {
  try {
    const [reviews] = await db.execute(
      `SELECT r.id, r.rating, r.comment, r.created_at,
              u.name as reviewee_name, u.profile_picture as reviewee_avatar
       FROM reviews r
       JOIN users u ON r.reviewee_id = u.id
       WHERE r.reviewer_id = ?
       ORDER BY r.created_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, reviews });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch your reviews.' });
  }
};

module.exports = { createReview, createDirectReview, updateReview, getMyReviewFor, getUserReviews, getMyReviews };
