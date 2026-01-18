(function() {
  'use strict';

  const CSGOREP_API_URL = 'https://api.csgo-rep.com/';
  const TRUSTED_SELLERS_PATH = 'https://omaranwari.com/trusted-sellers.json';
  const TRUSTED_SELLERS_CACHE_KEY = 'trustedSellersCache';
  const TRUSTED_SELLERS_CACHE_TTL_MS = 60 * 1000; // 60 seconds

  const API_HEADERS = {
    'Content-Type': 'application/json',
    'Origin': 'https://csgo-rep.com',
    'Referer': 'https://csgo-rep.com/'
  };

  // Use chrome or browser API depending on what's available
  const browserAPI = (typeof chrome !== 'undefined' && chrome.runtime) ? chrome : browser;

  let trustedSellersMemory = null;

  function storageGet(key) {
    if (!browserAPI.storage || !browserAPI.storage.local) {
      return Promise.resolve(null);
    }

    try {
      const result = browserAPI.storage.local.get(key);
      if (result && typeof result.then === 'function') {
        return result.then(items => items[key] || null);
      }
    } catch (error) {
      // Fall through to callback path.
    }

    return new Promise(resolve => {
      browserAPI.storage.local.get([key], items => {
        resolve(items ? items[key] : null);
      });
    });
  }

  function storageSet(key, value) {
    if (!browserAPI.storage || !browserAPI.storage.local) {
      return Promise.resolve();
    }

    try {
      const result = browserAPI.storage.local.set({ [key]: value });
      if (result && typeof result.then === 'function') {
        return result;
      }
    } catch (error) {
      // Fall through to callback path.
    }

    return new Promise(resolve => {
      browserAPI.storage.local.set({ [key]: value }, () => resolve());
    });
  }

  function isValidSteamId64(value) {
    return typeof value === 'string' && /^\d{17}$/.test(value);
  }

  function normalizeTrustedSellers(payload) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return null;
    }

    if (!Array.isArray(payload.sellers)) {
      return null;
    }

    const normalizedSellers = [];
    const now = Date.now();

    for (const seller of payload.sellers) {
      if (!seller || typeof seller !== 'object') {
        continue;
      }

      const steamId = typeof seller.steamId === 'string' ? seller.steamId.trim() : '';
      const displayName = typeof seller.displayName === 'string' ? seller.displayName.trim() : '';
      const status = seller.status;
      const reason = typeof seller.reason === 'string' ? seller.reason.trim() : '';
      const lastReviewedAt = typeof seller.lastReviewedAt === 'string' ? seller.lastReviewedAt : '';
      const expiresAt = typeof seller.expiresAt === 'string' ? seller.expiresAt : '';

      if (!isValidSteamId64(steamId) || !displayName || !reason || !lastReviewedAt) {
        continue;
      }

      if (status !== 'trusted' && status !== 'flagged') {
        continue;
      }

      if (expiresAt) {
        const expiresAtTime = Date.parse(expiresAt);
        if (!Number.isNaN(expiresAtTime) && expiresAtTime < now) {
          continue;
        }
      }

      const normalized = {
        steamId,
        displayName,
        status,
        reason,
        lastReviewedAt
      };

      if (typeof seller.addedAt === 'string') {
        normalized.addedAt = seller.addedAt;
      }

      if (expiresAt) {
        normalized.expiresAt = expiresAt;
      }

      if (Array.isArray(seller.tags)) {
        const tags = seller.tags
          .filter(tag => typeof tag === 'string' && tag.trim().length > 0)
          .map(tag => tag.trim())
          .slice(0, 8);

        if (tags.length > 0) {
          normalized.tags = Array.from(new Set(tags));
        }
      }

      if (Array.isArray(seller.evidence)) {
        const evidence = seller.evidence
          .filter(item => item && typeof item === 'object')
          .map(item => {
            const label = typeof item.label === 'string' ? item.label.trim() : '';
            const url = typeof item.url === 'string' ? item.url.trim() : '';
            if (!label || !url) {
              return null;
            }
            return { label, url };
          })
          .filter(Boolean)
          .slice(0, 5);

        if (evidence.length > 0) {
          normalized.evidence = evidence;
        }
      }

      normalizedSellers.push(normalized);
    }

    const normalizedList = {
      listVersion: Number.isInteger(payload.listVersion) ? payload.listVersion : 1,
      generatedAt: typeof payload.generatedAt === 'string' ? payload.generatedAt : new Date().toISOString(),
      sellers: normalizedSellers
    };

    if (typeof payload.issuer === 'string' && payload.issuer.trim().length > 0) {
      normalizedList.issuer = payload.issuer.trim();
    }

    return normalizedList;
  }

  function buildSellerIndex(sellers) {
    const index = {};
    for (const seller of sellers) {
      if (seller && seller.steamId) {
        index[seller.steamId] = seller;
      }
    }
    return index;
  }

  async function fetchTrustedSellersRemote() {
    const trustedUrl = TRUSTED_SELLERS_PATH.startsWith('http')
      ? TRUSTED_SELLERS_PATH
      : ((browserAPI.runtime && typeof browserAPI.runtime.getURL === 'function')
        ? browserAPI.runtime.getURL(TRUSTED_SELLERS_PATH)
        : TRUSTED_SELLERS_PATH);
    const response = await fetch(trustedUrl, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Trusted sellers fetch failed: ${response.status}`);
    }

    const payload = await response.json();
    const normalized = normalizeTrustedSellers(payload);
    if (!normalized) {
      throw new Error('Trusted sellers list is invalid');
    }

    return normalized;
  }

  async function getTrustedSellersList() {
    const now = Date.now();

    if (trustedSellersMemory && now - trustedSellersMemory.fetchedAt < TRUSTED_SELLERS_CACHE_TTL_MS) {
      return {
        data: trustedSellersMemory.data,
        fetchedAt: trustedSellersMemory.fetchedAt,
        source: 'memory',
        stale: false
      };
    }

    const stored = await storageGet(TRUSTED_SELLERS_CACHE_KEY);
    if (stored && stored.data && stored.fetchedAt) {
      const isFresh = now - stored.fetchedAt < TRUSTED_SELLERS_CACHE_TTL_MS;
      trustedSellersMemory = {
        data: stored.data,
        fetchedAt: stored.fetchedAt,
        index: buildSellerIndex(stored.data.sellers || [])
      };

      if (isFresh) {
        return {
          data: stored.data,
          fetchedAt: stored.fetchedAt,
          source: 'cache',
          stale: false
        };
      }
    }

    try {
      const data = await fetchTrustedSellersRemote();
      const fetchedAt = Date.now();
      trustedSellersMemory = {
        data,
        fetchedAt,
        index: buildSellerIndex(data.sellers || [])
      };

      await storageSet(TRUSTED_SELLERS_CACHE_KEY, { data, fetchedAt });

      return {
        data,
        fetchedAt,
        source: 'network',
        stale: false
      };
    } catch (error) {
      console.warn('Trusted sellers fetch failed:', error);

      if (trustedSellersMemory) {
        return {
          data: trustedSellersMemory.data,
          fetchedAt: trustedSellersMemory.fetchedAt,
          source: 'stale-cache',
          stale: true
        };
      }
    }

    return null;
  }

  async function getTrustedSellerStatus(steamId) {
    if (!isValidSteamId64(steamId)) {
      return { success: false, error: 'Invalid Steam ID' };
    }

    const listResult = await getTrustedSellersList();
    if (!listResult) {
      return { success: false, error: 'Trusted sellers list unavailable' };
    }

    const index = trustedSellersMemory && trustedSellersMemory.index
      ? trustedSellersMemory.index
      : buildSellerIndex(listResult.data.sellers || []);

    const seller = index[steamId] || null;

    return {
      success: true,
      status: seller ? seller.status : 'unknown',
      seller,
      listVersion: listResult.data.listVersion,
      generatedAt: listResult.data.generatedAt,
      source: listResult.source,
      stale: listResult.stale
    };
  }

  /**
   * Fetch user profile from CSGORep
   */
  async function fetchUserProfile(steamId) {
    const payload = {
      id: '206',
      query: { steam_id: steamId }
    };

    const response = await fetch(CSGOREP_API_URL, {
      method: 'POST',
      headers: API_HEADERS,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Profile fetch failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Fetch user reputation/feedback data from CSGORep
   */
  async function fetchUserReps(steamId, offset = 0, limit = 15) {
    const payload = {
      id: '204',
      query: {
        filter: { to_steam_id: steamId },
        view: 'creator',
        offset: offset,
        limit: limit,
        nulls_last: 1,
        order_by: [{ field: 'id', order: 'DESC' }]
      }
    };

    const response = await fetch(CSGOREP_API_URL, {
      method: 'POST',
      headers: API_HEADERS,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Reps fetch failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get complete CSGORep data for a user
   */
  async function getCSGORepData(steamId) {
    try {
      const [profileData, repsData] = await Promise.all([
        fetchUserProfile(steamId),
        fetchUserReps(steamId)
      ]);

      return {
        success: true,
        profile: profileData.profile || null,
        ban: profileData.ban || null,
        reps: {
          total: repsData.total || 0,
          filtered: repsData.filtered || 0,
          recent: repsData.data || []
        }
      };
    } catch (error) {
      console.error('CSGORep API error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Listen for messages from content script
  browserAPI.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'fetchCSGORepData') {
      console.log('Background: Received request for Steam ID:', request.steamId);
      
      getCSGORepData(request.steamId)
        .then(data => {
          console.log('Background: Sending response:', data);
          sendResponse(data);
        })
        .catch(error => {
          console.error('Background: Error:', error);
          sendResponse({ success: false, error: error.message });
        });
      
      return true; // Keep channel open for async response
    }

    if (request.action === 'getTrustedSellerStatus') {
      getTrustedSellerStatus(request.steamId)
        .then(result => sendResponse(result))
        .catch(error => {
          console.error('Background: Trusted sellers error:', error);
          sendResponse({ success: false, error: error.message });
        });

      return true;
    }
  });

  console.log('CSGORep Badge: Background script loaded');
})();




