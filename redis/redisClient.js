// redis/redisClient.js
import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
export const redis = new Redis(REDIS_URL);
export const pub = new Redis(REDIS_URL);
export const sub = new Redis(REDIS_URL);

const PRESENCE_CHANNEL = "presence:channel";
const SOCKET_TTL_SECONDS = 60;
const ONLINE_SET = "ONLINE_USERS";

/* Basic connection logs */
[redis, pub, sub].forEach((c, i) => {
  const name = i === 0 ? "redis" : i === 1 ? "pub" : "sub";
  c.on("connect", () => console.log(`[${name}] connect`));
  c.on("ready", () => console.log(`[${name}] ready`));
  c.on("error", (e) => console.error(`[${name}] error`, e && e.message ? e.message : e));
  c.on("close", () => console.log(`[${name}] close`));
});

/* Helper: cleanup stale socket ids in user's set */
async function removeStaleSocketsFromSet(username) {
  const key = `user:${username}:sockets`;
  const members = await redis.smembers(key);
  if (!members || members.length === 0) return;
  
  for (const sId of members) {
    const exists = await redis.exists(`socket:${sId}`);
    if (!exists) {
      console.log(`[cleanup] removing stale socket ${sId} from ${key}`);
      await redis.srem(key, sId);
    }
  }
}

export async function addSocketForUser(username, socketId) {
  try {
    console.log(`[addSocketForUser] called for ${username} socket ${socketId}`);
    
    const key = `user:${username}:sockets`;
    const metaKey = `user:${username}:meta`;

    // Set per-socket key with TTL
    await redis.set(`socket:${socketId}`, username, "EX", SOCKET_TTL_SECONDS);

    // Add to socket set
    await redis.sadd(key, socketId);

    // Cleanup stale entries
    await removeStaleSocketsFromSet(username);

    // Get socket count after cleanup
    const socketCount = await redis.scard(key);
    console.log(`[addSocketForUser] socket count for ${username}: ${socketCount}`);

    // Check current status
    const currentStatus = await redis.hget(metaKey, "status");
    console.log(`[addSocketForUser] currentStatus for ${username}:`, currentStatus);

    // Always update if user wasn't online or this is their first socket
    const wasOnline = await redis.sismember(ONLINE_SET, username);
    console.log(`[addSocketForUser] ${username} was in ONLINE_SET:`, wasOnline);

    if (!wasOnline || currentStatus !== "online") {
      // Mark user as online
      await redis.hset(metaKey, "status", "online", "lastSeen", Date.now());
      await redis.sadd(ONLINE_SET, username);
      
      const payload = JSON.stringify({ 
        username, 
        status: "online",
        timestamp: Date.now()
      });
      
      console.log(`[addSocketForUser] publishing online status for ${username}`);
      const receivers = await pub.publish(PRESENCE_CHANNEL, payload);
      console.log(`[addSocketForUser] published online for ${username}, receivers:`, receivers);
      
      if (receivers === 0) {
        console.warn(`[addSocketForUser] WARNING: No subscribers received the message for ${username}`);
      }
    } else {
      console.log(`[addSocketForUser] ${username} already marked online, skipping publish`);
    }

  } catch (err) {
    console.error("[addSocketForUser] error", err);
    throw err;
  }
}

export async function removeSocketForUser(username, socketId) {
  try {
    console.log(`[removeSocketForUser] called for ${username} socket ${socketId}`);
    
    const key = `user:${username}:sockets`;
    const metaKey = `user:${username}:meta`;

    // Remove socket from set
    await redis.srem(key, socketId);
    
    // Delete the per-socket key
    await redis.del(`socket:${socketId}`);

    // Cleanup stale entries
    await removeStaleSocketsFromSet(username);

    // Check remaining sockets
    const remaining = await redis.scard(key);
    console.log(`[removeSocketForUser] remaining sockets for ${username}:`, remaining);

    if (remaining === 0) {
      const ts = Date.now();
      
      // Mark user as offline
      await redis.hset(metaKey, "status", "offline", "lastSeen", ts);
      await redis.srem(ONLINE_SET, username);
      
      const payload = JSON.stringify({ 
        username, 
        status: "offline", 
        lastSeen: ts,
        timestamp: ts
      });
      
      console.log(`[removeSocketForUser] publishing offline status for ${username}`);
      const receivers = await pub.publish(PRESENCE_CHANNEL, payload);
      console.log(`[removeSocketForUser] published offline for ${username}, receivers:`, receivers);
      
      if (receivers === 0) {
        console.warn(`[removeSocketForUser] WARNING: No subscribers received the message for ${username}`);
      }
    } else {
      console.log(`[removeSocketForUser] ${username} still has ${remaining} active sockets, staying online`);
    }

  } catch (err) {
    console.error("[removeSocketForUser] error", err);
    throw err;
  }
}

export async function isUserOnline(username) {
  try {
    const inSet = await redis.sismember(ONLINE_SET, username);
    console.log(`[isUserOnline] ${username} in ONLINE_USERS set:`, inSet === 1);
    
    // Double check with socket count for debugging
    const socketCount = await redis.scard(`user:${username}:sockets`);
    const metaStatus = await redis.hget(`user:${username}:meta`, "status");
    
    console.log(`[isUserOnline] ${username} - inSet: ${inSet === 1}, socketCount: ${socketCount}, metaStatus: ${metaStatus}`);
    
    return inSet === 1;
  } catch (err) {
    console.error("[isUserOnline] error", err);
    return false;
  }
}

/* Subscribe and emit presence updates */
export async function subscribeToPresence(io) {
  try {
    console.log("[subscribeToPresence] subscribing to", PRESENCE_CHANNEL);
    const res = await sub.subscribe(PRESENCE_CHANNEL);
    console.log(`[subscribeToPresence] subscribe result:`, res);
  } catch (err) {
    console.error("[subscribeToPresence] subscribe error", err);
  }

  sub.on("message", (channel, message) => {
    console.log(`[sub.on message] channel=${channel}, message=${message}`);
    
    if (channel !== PRESENCE_CHANNEL) {
      console.log(`[sub.on message] ignoring message from channel ${channel}`);
      return;
    }
    
    try {
      const data = JSON.parse(message);
      console.log("[sub.on message] parsed data:", data);
      console.log("[sub.on message] emitting 'presence-update' to all clients");
      
      // Emit to all connected clients
      io.emit("presence-update", data);
      
      console.log("[sub.on message] presence-update emitted successfully");
    } catch (e) {
      console.error("[sub.on message] failed to parse JSON:", message, e);
    }
  });

  sub.on("subscribe", (channel, count) => {
    console.log(`[sub] successfully subscribed to ${channel}, total subscriptions: ${count}`);
  });

  sub.on("error", (err) => {
    console.error("[sub] subscription error:", err);
  });
}

/* Utility function to get all online users */
export async function getAllOnlineUsers() {
  try {
    const onlineUsers = await redis.smembers(ONLINE_SET);
    console.log("[getAllOnlineUsers] online users:", onlineUsers);
    return onlineUsers;
  } catch (err) {
    console.error("[getAllOnlineUsers] error", err);
    return [];
  }
}

/* Utility function to clean up all stale data (useful for debugging) */
export async function cleanupAllStaleData() {
  try {
    console.log("[cleanupAllStaleData] starting cleanup...");
    
    const onlineUsers = await redis.smembers(ONLINE_SET);
    
    for (const username of onlineUsers) {
      const socketCount = await redis.scard(`user:${username}:sockets`);
      
      if (socketCount === 0) {
        console.log(`[cleanupAllStaleData] removing ${username} from ONLINE_SET (no sockets)`);
        await redis.srem(ONLINE_SET, username);
        await redis.hset(`user:${username}:meta`, "status", "offline", "lastSeen", Date.now());
      } else {
        // Clean up stale sockets for this user
        await removeStaleSocketsFromSet(username);
        const newSocketCount = await redis.scard(`user:${username}:sockets`);
        
        if (newSocketCount === 0) {
          console.log(`[cleanupAllStaleData] removing ${username} from ONLINE_SET after socket cleanup`);
          await redis.srem(ONLINE_SET, username);
          await redis.hset(`user:${username}:meta`, "status", "offline", "lastSeen", Date.now());
        }
      }
    }
    
    console.log("[cleanupAllStaleData] cleanup completed");
  } catch (err) {
    console.error("[cleanupAllStaleData] error", err);
  }
}