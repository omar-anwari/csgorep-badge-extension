(function() {
  'use strict';

  const CSGOREP_API_URL = 'https://api.csgo-rep.com/';

  const API_HEADERS = {
    'Content-Type': 'application/json',
    'Origin': 'https://csgo-rep.com',
    'Referer': 'https://csgo-rep.com/'
  };

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

  // Use chrome or browser API depending on what's available
  const browserAPI = (typeof chrome !== 'undefined' && chrome.runtime) ? chrome : browser;

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
  });

  console.log('CSGORep Badge: Background script loaded');
})();