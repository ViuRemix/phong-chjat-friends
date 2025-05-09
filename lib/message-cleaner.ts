import { redis } from "@/lib/redis";

export async function deleteExpiredMessages() {
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  const oldMessages = await redis.zrangebyscore("messages-index", {
    min: 0,
    max: oneWeekAgo,
  });

  for (const key of oldMessages) {
    await redis.del(key); // Xoá tin nhắn
    await redis.zrem("messages-index", key); // Xoá khỏi sorted set
  }

  console.log(`🧹 Đã xoá ${oldMessages.length} tin nhắn cũ hơn 1 tuần`);
}
