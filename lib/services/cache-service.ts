// lib/services/cache-service.ts

interface CacheItem {
  value: any
  expiresAt: number
}

class CacheService {

  private cache:
    Map<string, CacheItem> =
      new Map()

  private defaultTTL =
    5 * 60 * 1000

  // ==========================================================
  // SET
  // ==========================================================

  set(
    key: string,
    value: any,
    ttl?: number
  ): void {

    const expiresAt =
      Date.now() +
      (
        ttl ??
        this.defaultTTL
      )

    this.cache.set(
      key,
      {
        value,
        expiresAt,
      }
    )
  }

  // ==========================================================
  // GET
  // ==========================================================

  get<T>(
    key: string
  ): T | null {

    const item =
      this.cache.get(key)

    if (!item) {
      return null
    }

    if (
      Date.now() >
      item.expiresAt
    ) {

      this.cache.delete(
        key
      )

      return null
    }

    return item.value as T
  }

  // ==========================================================
  // HAS
  // ==========================================================

  has(
    key: string
  ): boolean {

    return (
      this.get(key) !== null
    )
  }

  // ==========================================================
  // DELETE
  // ==========================================================

  delete(
    key: string
  ): void {

    this.cache.delete(
      key
    )
  }

  // ==========================================================
  // CLEAR
  // ==========================================================

  clear(): void {

    this.cache.clear()
  }

  // ==========================================================
  // INVALIDATE PREFIX
  // ==========================================================

  invalidatePrefix(
    prefix: string
  ): void {

    for (
      const key
      of this.cache.keys()
    ) {

      if (
        key.startsWith(prefix)
      ) {

        this.cache.delete(
          key
        )
      }
    }
  }
}

export const cache =
  new CacheService()