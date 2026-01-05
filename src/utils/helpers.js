/**
 * Utility helper functions

/**
 * Format large numbers with commas
 */
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Debounce function to limit rapid calls
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Check if a Steam ID is valid (17-digit number)
 */
function isValidSteamId(steamId) {
  return /^\d{17}$/.test(steamId);
}

function createBadgeElement(reputationStats) {
    const badge = document.createElement('div');
    badge.className = 'csgorep-badge';
    badge.innerText = `Reputation: ${reputationStats.reputation}`;
    return badge;
}

function appendBadgeToProfile(badge) {
    const profileHeader = document.querySelector('.profile_header');
    if (profileHeader) {
        profileHeader.appendChild(badge);
    }
}

function formatReputationData(data) {
    return {
        reputation: data.reputation || 'N/A',
    };
}

export { createBadgeElement, appendBadgeToProfile, formatReputationData };