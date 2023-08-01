// Create web server
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const cors = require('cors');
const { randomBytes } = require('crypto');

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Create comments object
const commentsByPostId = {};

// Get all comments by post id
app.get('/posts/:id/comments', (req, res) => {
  res.send(commentsByPostId[req.params.id] || []);
});

// Create comment by post id
app.post('/posts/:id/comments', async (req, res) => {
  const commentId = randomBytes(4).toString('hex');

  // Get post id
  const { id } = req.params;

  // Get comment
  const { content } = req.body;

  // Get comments
  const comments = commentsByPostId[id] || [];

  // Add comment
  comments.push({ id: commentId, content, status: 'pending' });

  // Set comments
  commentsByPostId[id] = comments;

  // Send event to event bus
  await axios.post('http://event-bus-srv:4005/events', {
    type: 'CommentCreated',
    data: { id: commentId, content, postId: id, status: 'pending' },
  });

  // Send response
  res.status(201).send(comments);
});

// Send event to event bus
app.post('/events', async (req, res) => {
  console.log('Event Received:', req.body.type);

  // Get type
  const { type } = req.body;

  // Check type
  if (type === 'CommentModerated') {
    // Get data
    const { id, postId, status, content } = req.body.data;

    // Get comments
    const comments = commentsByPostId[postId];

    // Get comment
    const comment = comments.find((comment) => comment.id === id);

    // Set status
    comment.status = status;

    // Send event to event bus
    await axios.post('http://event-bus-srv:4005/events', {
      type: 'CommentUpdated',
      data: { id, postId, status, content },
    });
  }

  // Send response
  res.send({});
});

// Listen on port 4001
app.listen(4001, ()