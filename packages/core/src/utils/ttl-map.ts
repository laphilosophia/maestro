/**
 * TTLMap - Time-to-live Map for ephemeral state (RFC-0 §2.3)
 *
 * Maestro MAY hold ephemeral decision metadata only.
 * Ephemeral metadata MUST:
 * - have bounded lifetime
 * - be discardable at any moment
 * - never be required for correctness
 */

interface TTLEntry<V> {
  value: V
  expiresAt: number
}

/**
 * Map with automatic TTL-based eviction
 *
 * @template K - Key type
 * @template V - Value type
 */
export class TTLMap<K, V> {
  private readonly store = new Map<K, TTLEntry<V>>()
  private readonly defaultTTL: number
  private readonly maxSize: number

  /**
   * @param defaultTTL - Default TTL in milliseconds
   * @param maxSize - Maximum entries (oldest evicted first when exceeded)
   */
  constructor(defaultTTL: number, maxSize: number = 10000) {
    this.defaultTTL = defaultTTL
    this.maxSize = maxSize
  }

  /**
   * Get value if exists and not expired
   */
  get(key: K): V | undefined {
    const entry = this.store.get(key)
    if (!entry) {
      return undefined
    }
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return undefined
    }
    return entry.value
  }

  /**
   * Set value with optional custom TTL
   */
  set(key: K, value: V, ttl?: number): void {
    // Evict if at max size
    if (this.store.size >= this.maxSize && !this.store.has(key)) {
      this.evictOldest()
    }

    this.store.set(key, {
      value,
      expiresAt: Date.now() + (ttl ?? this.defaultTTL),
    })
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: K): boolean {
    return this.get(key) !== undefined
  }

  /**
   * Delete entry
   */
  delete(key: K): boolean {
    return this.store.delete(key)
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.store.clear()
  }

  /**
   * Get current size (including potentially expired entries)
   */
  get size(): number {
    return this.store.size
  }

  /**
   * Evict all expired entries
   */
  prune(): number {
    const now = Date.now()
    let evicted = 0
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) {
        this.store.delete(key)
        evicted++
      }
    }
    return evicted
  }

  /**
   * Evict oldest entry by expiration time
   */
  private evictOldest(): void {
    let oldestKey: K | undefined
    let oldestExpiry = Infinity

    for (const [key, entry] of this.store) {
      if (entry.expiresAt < oldestExpiry) {
        oldestExpiry = entry.expiresAt
        oldestKey = key
      }
    }

    if (oldestKey !== undefined) {
      this.store.delete(oldestKey)
    }
  }
}
