const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const userSockets = new Map();
let io = null;

function initializeSocketServer(httpServer) {
  if (io) {
    return io;
  }

  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    const requestedUserId = socket.handshake.auth?.userId;

    if (!token || !requestedUserId) {
      return next(new Error('Unauthorized'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (decoded.uid !== requestedUserId) {
        return next(new Error('Unauthorized'));
      }

      socket.data.userId = decoded.uid;
      next();
    } catch (error) {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const { userId } = socket.data;

    if (userId) {
      userSockets.set(userId, socket.id);
      socket.emit('socket_ready', { userId, socketId: socket.id });
    }

    socket.on('disconnect', () => {
      if (userId && userSockets.get(userId) === socket.id) {
        userSockets.delete(userId);
      }
    });
  });

  return io;
}

function emitToUser(userId, eventName, payload) {
  if (!io) {
    return;
  }

  const socketId = userSockets.get(userId);

  if (socketId) {
    io.to(socketId).emit(eventName, payload);
  }
}

module.exports = {
  emitToUser,
  initializeSocketServer,
  userSockets,
};
