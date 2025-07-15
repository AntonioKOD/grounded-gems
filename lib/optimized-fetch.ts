// lib/optimized-fetch.ts - Production-Ready Fetch Utility
"use client"

import { log } from './logger'

interface FetchOptions extends RequestInit {
  timeout?: number
  retries?: number
  retryDelay?: number
  retryCondition?: (error: Error, attempt: number) => boolean
}

interface FetchResponse<T = any> {
  data: T
  response: Response
  fromCache?: boolean
}

interface CacheEntry {
  data: any
  response: Response
  timestamp: number
  ttl: number
}

// Remove any class or instance declaration of optimizedFetch
// Only export the async function optimizedFetch as previously defined

export async function optimizedFetch(input: RequestInfo, init?: RequestInit & { timeout?: number, retries?: number }) {
  const { timeout = 8000, retries = 2, ...fetchInit } = init || {};
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(input, { ...fetchInit, signal: controller.signal });
      clearTimeout(id);
      if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
      return response;
    } catch (err) {
      lastError = err;
      clearTimeout(id);
      if (attempt === retries) throw err;
    }
  }
  throw lastError;
} 