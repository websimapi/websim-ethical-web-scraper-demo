const NodeCache = require('node-cache');

// Initialize cache with default TTL of 15 minutes
const cache = new NodeCache({
  stdTTL: 900,   // 15 minutes in seconds
  checkperiod: 120  // Check for expired keys every 2 minutes
});

/**
 * Get a value from cache
 */
async function cacheGet(key) {
  return cache.get(key);
}

/**
 * Store a value in cache
 */
async function cacheSet(key, value, ttlMs = null) {
  // Convert TTL from ms to seconds if provided
  const ttlSeconds = ttlMs ? Math.floor(ttlMs / 1000) : undefined;
  return cache.set(key, value, ttlSeconds);
}

/**
 * Delete a value from cache
 */
async function cacheDelete(key) {
  return cache.del(key);
}

/**
 * Clear the entire cache
 */
async function cacheClear() {
  return cache.flushAll();
}

module.exports = {
  cacheGet,
  cacheSet,
  cacheDelete,
  cacheClear
};

