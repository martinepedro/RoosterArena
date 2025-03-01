// server.js
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

// Create Express app
const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Route for the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Store connected players
const players = {};

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);
  
  // Handle player joining
  socket.on('playerJoin', (data) => {
    console.log(`${data.name} joined the game with ID: ${socket.id}`);
    
    // Store player data
    players[socket.id] = {
      id: socket.id,
      name: data.name,
      position: { x: 0, y: 0, z: 0 },
      rotation: 0
    };
    
    // Send current players to the new player
    socket.emit('currentPlayers', players);
    
    // Notify all other players about the new player
    socket.broadcast.emit('playerJoined', {
      id: socket.id,
      name: data.name
    });
    
    // Update all players with the new list
    io.emit('updatePlayers', players);
  });
  
  // Handle player position updates
  socket.on('updatePosition', (data) => {
    if (players[socket.id]) {
      players[socket.id].position = data.position;
      players[socket.id].rotation = data.rotation;
      
      // Broadcast updated positions to all players
      socket.broadcast.emit('playersMoved', players);
    }
  });
  
  // Handle request for current positions
  socket.on('requestPosition', () => {
    socket.emit('playersMoved', players);
  });
  
  // Handle player disconnection
  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    
    // Remove the player from the list
    if (players[socket.id]) {
      delete players[socket.id];
      
      // Notify other players about the disconnection
      io.emit('playerLeft', socket.id);
      io.emit('updatePlayers', players);
    }
  });
  
  // Handle chat messages
  socket.on('chatMessage', (data) => {
    console.log(`Chat message from ${data.sender}: ${data.message}`);
    
    // Broadcast the message to all clients
    io.emit('chatMessage', {
      sender: data.sender,
      message: data.message
    });
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});