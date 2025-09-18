import express from "express"
import dotenv from "dotenv"
import http from "http"
import { Server } from "socket.io";
import cors from "cors";
import msgsRouter from "./routes/msgs.route.js"
import connectToMongoDB from "./db/connectdb.js"
import { addMsgToConversation } from "./controllers/msgs.contoller.js";
import {
  addSocketForUser,
  removeSocketForUser,
  subscribeToPresence,
  getAllOnlineUsers
} from "./redis/redisClient.js"



dotenv.config();
const port = process.env.PORT || 5000;
  
const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        allowedHeaders: ["*"],
        origin: "*"
      }
 });


 // Setup Redis subscription
subscribeToPresence(io);
const userSocketMap = {};


io.on('connection', async(socket) => {
    const username = socket.handshake.query.username;
    console.log('Username of connected client:', username);

    userSocketMap[username] = socket;

     await addSocketForUser(username, socket.id);
    


    socket.on('chat msg', (msg) => {
        console.log(msg.sender);
        console.log(msg.receiver);
        console.log(msg.text);
        console.log(msg);
        const receiverSocket = userSocketMap[msg.receiver];
        if(receiverSocket) {
         
          receiverSocket.emit('chat msg', msg);
        }
       

        addMsgToConversation([msg.sender, msg.receiver], {
                  text: msg.text,
                  sender:msg.sender,
                  receiver:msg.receiver
                }
        )
    });

    socket.on('user:disconnect', async () => {
    console.log('user:disconnect received for', username);
    await removeSocketForUser(username, socket.id);
    // close socket (server side)
    socket.disconnect(true);
  });
  socket.on('get:online:users', async () => {
    try {
      const onlineUsers = await getAllOnlineUsers();
      socket.emit('online-users', onlineUsers);
    } catch (error) {
      console.error('Error getting online users:', error);
      socket.emit('error', { message: 'Failed to get online users' });
    }

});

  // socket.io disconnect (fires on network drop, close, tab close, etc.)
  socket.on('disconnect', async (reason) => {
    console.log(`Socket disconnect for ${username}, reason: ${reason}`);
    try {
      await removeSocketForUser(username, socket.id);
    } catch (err) {
      console.error('Error removing socket for user', err);
    }
    // cleanup map
    if (userSocketMap[username] && userSocketMap[username].id === socket.id) {
      delete userSocketMap[username];
    }
  });

})

app.use('/msgs', msgsRouter);



app.get('/api/users/online', async (req, res) => {
  try {
    const onlineUsers = await getAllOnlineUsers();
    res.json({ onlineUsers });
  } catch (error) {
    console.error('Error getting online users:', error);
    res.status(500).json({ error: 'Failed to get online users' });
  }
});

app.get('/', (req, res) => {
  res.send('Congratulations ! Your server is running!');
});

server.listen(port, () => {
  connectToMongoDB()
  console.log(`Server is listening at http://localhost:${port}`);
});