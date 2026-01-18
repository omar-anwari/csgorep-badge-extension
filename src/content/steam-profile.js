(function() {
  'use strict';

  // Use browser API (Firefox) or chrome API
  const hasBrowserRuntime = typeof browser !== 'undefined' &&
    browser.runtime &&
    typeof browser.runtime.sendMessage === 'function';
  const runtimeAPI = hasBrowserRuntime ? browser.runtime : chrome.runtime;

  // Normalize sendMessage across Promise-based (Firefox) and callback-based (Chrome) APIs
  function sendRuntimeMessage(message) {
    if (hasBrowserRuntime) {
      return runtimeAPI.sendMessage(message);
    }

    return new Promise((resolve, reject) => {
      runtimeAPI.sendMessage(message, response => {
        const lastError = runtimeAPI.lastError;
        if (lastError) {
          reject(lastError);
          return;
        }
        resolve(response);
      });
    });
  }

  /**
   * Extract Steam ID from the current profile page
   */
  function getSteamId() {
    // Try to get from Steam global variable
    if (typeof g_rgProfileData !== 'undefined' && g_rgProfileData.steamid) {
      return g_rgProfileData.steamid;
    }

    // Try to extract from data attribute
    const profilePage = document.querySelector('[data-steamid]');
    if (profilePage) {
      return profilePage.dataset.steamid;
    }

    // Try to extract from page scripts
    const scripts = document.querySelectorAll('script');
    for (const script of scripts) {
      const match = script.textContent.match(/"steamid":"(\d+)"/);
      if (match) {
        return match[1];
      }
    }

    // Try URL for profiles/STEAMID format
    const urlMatch = window.location.pathname.match(/\/profiles\/(\d+)/);
    if (urlMatch) {
      return urlMatch[1];
    }

    return null;
  }

  /**
   * Create the CSGORep badge on the profile
   */
  function createBadge(data) {
    const badge = document.createElement('div');
    badge.className = 'csgorep-badge';

    const createHeader = () => {
      const header = document.createElement('div');
      header.className = 'csgorep-badge__header';

      const logo = document.createElement('span');
      logo.className = 'csgorep-badge__logo';
      logo.textContent = 'CSGORep';

      header.appendChild(logo);
      return header;
    };

    if (data && data.loading) {
      badge.classList.add('csgorep-badge--loading');

      const header = createHeader();
      const content = document.createElement('div');
      content.className = 'csgorep-badge__content';

      const loading = document.createElement('span');
      loading.className = 'csgorep-badge__loading';
      loading.textContent = 'Loading...';

      content.appendChild(loading);
      badge.appendChild(header);
      badge.appendChild(content);
      return badge;
    }

    if (!data || !data.success || !data.profile) {
      badge.classList.add('csgorep-badge--not-found');

      const header = createHeader();
      const content = document.createElement('div');
      content.className = 'csgorep-badge__content';

      const status = document.createElement('span');
      status.className = 'csgorep-badge__status';
      status.textContent = 'No profile found';

      content.appendChild(status);
      badge.appendChild(header);
      badge.appendChild(content);
      return badge;
    }

    const { profile, ban, reps } = data;
    const feedback = profile.feedback || {};
    const isBanned = ban !== null;
    const roleId = Number(profile.role_id);
    const isStaff = roleId === 3 || roleId === 4;
    const totalReviews = (reps && typeof reps.total !== 'undefined') ? reps.total : 0;

    if (isBanned) {
      badge.classList.add('csgorep-badge--banned');
    } else if (feedback.positive > 100) {
      badge.classList.add('csgorep-badge--trusted');
    }

    if (isStaff) {
      badge.classList.add('csgorep-badge--staff');
    }

    const link = document.createElement('a');
    link.href = `https://csgo-rep.com/profile/${profile.steam_id}`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.className = 'csgorep-badge__link';

    const header = createHeader();

    if (isStaff || isBanned) {
      const tags = document.createElement('div');
      tags.className = 'csgorep-badge__tags';

      if (isStaff) {
        const staffTag = document.createElement('span');
        staffTag.className = 'csgorep-badge__staff-tag';
        staffTag.textContent = 'STAFF';
        tags.appendChild(staffTag);
      }

      if (isBanned) {
        const banTag = document.createElement('span');
        banTag.className = 'csgorep-badge__ban-tag';
        banTag.textContent = 'BANNED';
        tags.appendChild(banTag);
      }

      header.appendChild(tags);
    }

    const content = document.createElement('div');
    content.className = 'csgorep-badge__content';

    const stats = document.createElement('div');
    stats.className = 'csgorep-badge__stats';

    const positive = document.createElement('div');
    positive.className = 'csgorep-badge__stat csgorep-badge__stat--positive';

    const positiveValue = document.createElement('span');
    positiveValue.className = 'csgorep-badge__stat-value';
    positiveValue.textContent = `+${feedback.positive || 0}`;

    const positiveLabel = document.createElement('span');
    positiveLabel.className = 'csgorep-badge__stat-label';
    positiveLabel.textContent = 'Positive';

    positive.appendChild(positiveValue);
    positive.appendChild(positiveLabel);

    const neutral = document.createElement('div');
    neutral.className = 'csgorep-badge__stat csgorep-badge__stat--neutral';

    const neutralValue = document.createElement('span');
    neutralValue.className = 'csgorep-badge__stat-value';
    neutralValue.textContent = `${feedback.neutral || 0}`;

    const neutralLabel = document.createElement('span');
    neutralLabel.className = 'csgorep-badge__stat-label';
    neutralLabel.textContent = 'Neutral';

    neutral.appendChild(neutralValue);
    neutral.appendChild(neutralLabel);

    stats.appendChild(positive);
    stats.appendChild(neutral);

    const breakdown = document.createElement('div');
    breakdown.className = 'csgorep-badge__breakdown';

    const cash = document.createElement('span');
    cash.title = 'Cash trades';
    cash.textContent = `💵 ${feedback.cash || 0}`;

    const crypto = document.createElement('span');
    crypto.title = 'Crypto trades';
    crypto.textContent = `🪙 ${feedback.crypto || 0}`;

    const balance = document.createElement('span');
    balance.title = 'Balance trades';
    balance.textContent = `💰 ${feedback.balance || 0}`;

    breakdown.appendChild(cash);
    breakdown.appendChild(crypto);
    breakdown.appendChild(balance);

    const total = document.createElement('div');
    total.className = 'csgorep-badge__total';
    total.textContent = `Total Reviews: ${totalReviews}`;

    content.appendChild(stats);
    content.appendChild(breakdown);
    content.appendChild(total);

    link.appendChild(header);
    link.appendChild(content);
    badge.appendChild(link);

    return badge;
  }


  function positionPopover(anchor) {
    const popover = anchor._csgorepPopover;
    const icon = anchor._csgorepIcon;
    if (!popover || !icon) {
      return;
    }

    const iconRect = icon.getBoundingClientRect();
    const anchorElement = anchor._csgorepAnchorElement || icon;
    const anchorRect = anchorElement.getBoundingClientRect();
    const top = Math.round(iconRect.bottom + 8);
    let left = Math.round(anchorRect.left + anchorRect.width / 2);

    const popoverWidth = popover.offsetWidth;
    if (popoverWidth) {
      const halfWidth = popoverWidth / 2;
      const padding = 8;
      const minLeft = padding + halfWidth;
      const maxLeft = window.innerWidth - padding - halfWidth;
      left = Math.min(Math.max(left, minLeft), maxLeft);
    }

    popover.style.top = `${top}px`;
    popover.style.left = `${left}px`;
  }

  function showPopover(anchor) {
    const popover = anchor._csgorepPopover;
    if (!popover) {
      return;
    }

    positionPopover(anchor);
    popover.classList.add('csgorep-badge--open');
  }

  function hidePopover(anchor) {
    const popover = anchor._csgorepPopover;
    if (!popover) {
      return;
    }

    popover.classList.remove('csgorep-badge--open');
  }

  function attachPopoverHover(anchor, popover) {
    if (!anchor._csgorepCancelHide || !anchor._csgorepScheduleHide) {
      return;
    }

    popover.addEventListener('mouseenter', anchor._csgorepCancelHide);
    popover.addEventListener('mouseleave', anchor._csgorepScheduleHide);
  }

  /**
   * Create the CSGORep badge icon + popover wrapper
   */
  function createBadgeAnchor(data) {
    const anchor = document.createElement('span');
    anchor.className = 'csgorep-badge-anchor';

    const icon = document.createElement('span');
    icon.className = 'csgorep-badge-icon';
    icon.setAttribute('title', 'CSGORep reputation');
    icon.setAttribute('role', 'button');
    icon.setAttribute('tabindex', '0');
    icon.setAttribute('aria-label', 'CSGORep reputation');

    const iconImg = document.createElement('img');
    iconImg.src = runtimeAPI.getURL('icons/logo.png');
    iconImg.alt = 'CSGORep';
    iconImg.width = 16;
    iconImg.height = 16;
    icon.appendChild(iconImg);

    const popover = createBadge(data);
    popover.classList.add('csgorep-badge--popover');

    anchor.appendChild(icon);
    document.body.appendChild(popover);

    anchor._csgorepPopover = popover;
    anchor._csgorepIcon = icon;

    let hideTimer = null;

    const cancelHide = () => {
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
    };

    const scheduleHide = () => {
      cancelHide();
      hideTimer = setTimeout(() => hidePopover(anchor), 120);
    };

    anchor._csgorepCancelHide = cancelHide;
    anchor._csgorepScheduleHide = scheduleHide;

    anchor.addEventListener('mouseenter', () => {
      cancelHide();
      showPopover(anchor);
    });
    anchor.addEventListener('mouseleave', scheduleHide);
    anchor.addEventListener('focusin', () => {
      cancelHide();
      showPopover(anchor);
    });
    anchor.addEventListener('focusout', scheduleHide);

    attachPopoverHover(anchor, popover);

    window.addEventListener('scroll', () => {
      const currentPopover = anchor._csgorepPopover;
      if (currentPopover && currentPopover.classList.contains('csgorep-badge--open')) {
        positionPopover(anchor);
      }
    }, true);

    window.addEventListener('resize', () => {
      const currentPopover = anchor._csgorepPopover;
      if (currentPopover && currentPopover.classList.contains('csgorep-badge--open')) {
        positionPopover(anchor);
      }
    });

    return anchor;
  }

  /**
   * Replace the badge content inside the popover
   */
  function updateBadgeAnchor(anchor, data) {
    const popover = createBadge(data);
    popover.classList.add('csgorep-badge--popover');

    const currentPopover = anchor._csgorepPopover;
    if (currentPopover) {
      currentPopover.replaceWith(popover);
    } else {
      document.body.appendChild(popover);
    }

    anchor._csgorepPopover = popover;
    attachPopoverHover(anchor, popover);

    if (anchor.matches(':hover') || anchor.matches(':focus-within')) {
      showPopover(anchor);
    }
  }

  /**
   * Insert the badge icon next to the Steam profile name
   */
  function insertBadge(badgeAnchor) {
    const nameSelectors = [
      '.actual_persona_name',
      '.profile_header_centered_persona .persona_name_text_content',
      '.profile_header .persona_name_text_content'
    ];

    for (const selector of nameSelectors) {
      const target = document.querySelector(selector);
      if (target) {
        target.appendChild(badgeAnchor);
        badgeAnchor._csgorepAnchorElement = target;
        return true;
      }
    }

    const badgeRow = document.querySelector('.profile_header_badge');
    const actionsRow = document.querySelector('.profile_header_actions');
    const anchorCandidates = [badgeRow, actionsRow].filter(Boolean);

    if (anchorCandidates.length) {
      let anchor = null;
      for (const candidate of anchorCandidates) {
        if (!anchor) {
          anchor = candidate;
          continue;
        }
        const anchorTop = anchor.getBoundingClientRect().top;
        const candidateTop = candidate.getBoundingClientRect().top;
        if (candidateTop > anchorTop) {
          anchor = candidate;
        }
      }

      if (anchor && anchor.parentNode) {
        anchor.parentNode.insertBefore(badgeAnchor, anchor.nextSibling);
        return true;
      }
    }

    const targetSelectors = [
      '.profile_header_centered_persona',
      '.profile_header_content',
      '.playerAvatarAutoSizeInner',
      '.profile_header'
    ];

    for (const selector of targetSelectors) {
      const target = document.querySelector(selector);
      if (target && target.parentNode) {
        target.parentNode.insertBefore(badgeAnchor, target.nextSibling);
        return true;
      }
    }

    const profileContent = document.querySelector('.profile_content');
    if (profileContent) {
      profileContent.insertBefore(badgeAnchor, profileContent.firstChild);
      return true;
    }

    return false;
  }

  /**
   * Main initialization
   */
  async function init() {
    if (!window.location.pathname.includes('/id/') &&
        !window.location.pathname.includes('/profiles/')) {
      return;
    }

    if (document.querySelector('.csgorep-badge-anchor')) {
      return;
    }

    const steamId = getSteamId();
    if (!steamId) {
      console.warn('CSGORep Badge: Could not extract Steam ID');
      return;
    }

    console.log('CSGORep Badge: Fetching data for', steamId);

    const badgeAnchor = createBadgeAnchor({ loading: true });
    if (!insertBadge(badgeAnchor)) {
      return;
    }

    // Fetch data from background script
    try {
      const response = await sendRuntimeMessage({
        action: 'fetchCSGORepData',
        steamId: steamId
      });
      updateBadgeAnchor(badgeAnchor, response || { success: false });
    } catch (error) {
      console.error('CSGORep Badge: Error fetching data', error);
      updateBadgeAnchor(badgeAnchor, { success: false });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
