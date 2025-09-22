# 🔧 Chat App Backend

> Real-time messaging API built with Node.js, Express, MongoDB, Redis, and Socket.IO

[![Node.js](https://img.shields.io/badge/Node.js-18+-green?style=flat-square&logo=node.js)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4+-black?style=flat-square&logo=express)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6+-green?style=flat-square&logo=mongodb)](https://mongodb.com/)
[![Redis](https://img.shields.io/badge/Redis-7+-red?style=flat-square&logo=redis)](https://redis.io/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4+-blue?style=flat-square&logo=socket.io)](https://socket.io/)

---

## ✨ Features

🚀 **Real-time messaging** with Socket.IO  
📊 **MongoDB** for data storage  
⚡ **Redis** for caching and sessions  
🐳 **Docker ready**

---

## 🛠️ Tech Stack

- **Node.js** - JavaScript runtime
- **Express.js** - Web framework  
- **MongoDB** - Database
- **Redis** - Cache & sessions
- **Socket.IO** - Real-time communication

---

## 🎯 Prerequisites

```bash
✅ Node.js (v18+)
✅ MongoDB
✅ Redis (running locally)
✅ Docker (optional)
```

---

## ⚙️ Environment Setup

Create `.env` file in project root:

```bash
MONGODB_URI=Enter your mongodb url
```

---

## 🚀 Getting Started

### Local Development

```bash
# Clone repository
git clone https://github.com/Samanvith20/chat-app-backend.git
cd chat-app-backend

# Install dependencies
npm install

# Start Redis locally (in separate terminal)
redis-server

# Start development server
npm run dev
```

Server runs at: `http://localhost:5000`

### 🐳 Docker Setup

```bash
# Build Docker image
docker build -t chat-app-backend .

# Run container (Redis must be running locally)
docker run -p 5000:5000 --env-file .env chat-app-backend
```

---

## 📁 Project Structure

```
chat-app-backend/
├── src/
│   ├── controllers/
│   ├── models/
│   ├── routes/
├── Dockerfile
├── server.js
└── package.json
```

---

## 🛠️ Available Scripts

```bash
npm run devstart      # Development with nodemon
npm start        # Production server
npm test         # Run tests
```

---


## 📞 Contact

- 📧 **Email**:Samanvith2005@gmail.com


---

<div align="center">

**Happy Coding! 🎉**

[⭐ Star this repo](https://github.com/Samanvith20/chat-app-backend) 

</div>
