document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const feedContainer = document.getElementById('feed-container');
    const refreshBtn = document.getElementById('btn-refresh');
    const searchInput = document.getElementById('search-input');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const lastUpdatedSpan = document.getElementById('last-updated');
    const cacheBadge = document.getElementById('cache-badge');
    
    // Modal Elements
    const modalOverlay = document.getElementById('modal-overlay');
    const modalClose = document.getElementById('modal-close');
    const composerTextarea = document.getElementById('composer-textarea');
    const charCounter = document.getElementById('char-counter');
    const btnPostTweet = document.getElementById('btn-post-tweet');
    
    // Application State
    let allUpdates = [];
    let activeFilter = 'all';
    let searchQuery = '';
    const TWITTER_MAX_CHARS = 280;

    // Initialize application
    init();

    function init() {
        fetchReleases(false);

        // Event Listeners
        refreshBtn.addEventListener('click', () => fetchReleases(true));
        searchInput.addEventListener('input', handleSearch);
        
        filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                activeFilter = btn.dataset.type;
                renderFeed();
            });
        });

        // Modal close listeners
        modalClose.addEventListener('click', closeTweetModal);
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) closeTweetModal();
        });
        
        composerTextarea.addEventListener('input', updateCharCount);

        // Escape key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modalOverlay.classList.contains('active')) {
                closeTweetModal();
            }
        });
    }

    // Fetch release notes from backend API
    async function fetchReleases(forceRefresh = false) {
        setLoadingState(true);
        
        try {
            const response = await fetch(`/api/releases?refresh=${forceRefresh}`);
            if (!response.ok) throw new Error('Network response was not ok');
            
            const data = await response.json();
            allUpdates = data.updates || [];
            
            // Update timestamp
            const fetchDate = new Date(data.cached_at * 1000);
            lastUpdatedSpan.textContent = fetchDate.toLocaleTimeString();
            
            // Show Cache status badge
            if (data.is_cached) {
                cacheBadge.textContent = 'Cached';
                cacheBadge.style.background = 'rgba(255, 255, 255, 0.05)';
            } else {
                cacheBadge.textContent = 'Refreshed live';
                cacheBadge.style.background = 'rgba(16, 185, 129, 0.2)';
            }
            
            renderFeed();
        } catch (error) {
            console.error('Fetch error:', error);
            renderErrorState(error.message);
        } finally {
            setLoadingState(false);
        }
    }

    // UI Loading state helper
    function setLoadingState(isLoading) {
        if (isLoading) {
            refreshBtn.classList.add('loading');
            refreshBtn.disabled = true;
            renderSkeletons();
        } else {
            refreshBtn.classList.remove('loading');
            refreshBtn.disabled = false;
        }
    }

    // Render skeleton cards while loading
    function renderSkeletons() {
        feedContainer.innerHTML = '';
        for (let i = 0; i < 4; i++) {
            const skeleton = document.createElement('div');
            skeleton.className = 'skeleton-card';
            feedContainer.appendChild(skeleton);
        }
    }

    // Render error message
    function renderErrorState(message) {
        feedContainer.innerHTML = `
            <div class="empty-state error-state" id="error-view">
                <div class="empty-icon">⚠️</div>
                <h2>Failed to load release notes</h2>
                <p>${message}. Please check your connection or retry.</p>
                <button class="filter-btn active" onclick="location.reload()">Retry Connection</button>
            </div>
        `;
    }

    // Handle Search input changes with simple debouncing/instant response
    function handleSearch(e) {
        searchQuery = e.target.value.toLowerCase().trim();
        renderFeed();
    }

    // Render feed items based on filter and search parameters
    function renderFeed() {
        feedContainer.innerHTML = '';
        
        const filtered = allUpdates.filter(update => {
            // Filter by category
            const matchesFilter = activeFilter === 'all' || 
                update.type.toLowerCase() === activeFilter.toLowerCase();
            
            // Search text
            const matchesSearch = !searchQuery || 
                update.type.toLowerCase().includes(searchQuery) ||
                update.date.toLowerCase().includes(searchQuery) ||
                update.text.toLowerCase().includes(searchQuery);
                
            return matchesFilter && matchesSearch;
        });

        if (filtered.length === 0) {
            feedContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🔍</div>
                    <h2>No release notes found</h2>
                    <p>Try refining your search query or switching filters.</p>
                </div>
            `;
            return;
        }

        filtered.forEach(update => {
            const card = document.createElement('div');
            card.className = 'feed-card';
            
            // Setup style attributes dynamically based on update type
            const typeConfig = getTypeStyles(update.type);
            card.style.setProperty('--card-accent', typeConfig.color);
            card.style.setProperty('--badge-color', typeConfig.color);
            card.style.setProperty('--badge-bg', typeConfig.bg);

            // Create html block
            card.innerHTML = `
                <div class="card-header">
                    <div class="meta-group">
                        <span class="date-badge">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                            ${update.date}
                        </span>
                        <span class="type-badge">${update.type}</span>
                    </div>
                </div>
                <div class="card-content">
                    ${update.html}
                </div>
                <div class="card-actions">
                    <div class="secondary-actions">
                        <button class="btn-action btn-copy" data-id="${update.id}" title="Copier dans le presse-papier">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                            <span class="action-text">Copier</span>
                        </button>
                        <button class="btn-action btn-csv" data-id="${update.id}" title="Exporter au format CSV">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                            <span>Exporter CSV</span>
                        </button>
                    </div>
                    <button class="btn-tweet" data-id="${update.id}">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><g><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></g></svg>
                        Tweet this
                    </button>
                </div>
            `;

            // Attach event listener directly to tweet button
            card.querySelector('.btn-tweet').addEventListener('click', () => {
                openTweetModal(update);
            });

            // Attach copy action
            const copyBtn = card.querySelector('.btn-copy');
            copyBtn.addEventListener('click', () => {
                const textToCopy = `BigQuery Update (${update.date}) - [${update.type}]\n\n${update.text}\n\nRead more: ${update.link || "https://cloud.google.com/bigquery"}`;
                navigator.clipboard.writeText(textToCopy).then(() => {
                    const textSpan = copyBtn.querySelector('.action-text');
                    const originalText = textSpan.textContent;
                    copyBtn.classList.add('copied');
                    textSpan.textContent = 'Copié !';
                    
                    setTimeout(() => {
                        copyBtn.classList.remove('copied');
                        textSpan.textContent = originalText;
                    }, 2000);
                }).catch(err => {
                    console.error('Failed to copy text: ', err);
                });
            });

            // Attach CSV export action
            card.querySelector('.btn-csv').addEventListener('click', () => {
                const headers = ["Date", "Type", "Text Content", "Link"];
                const row = [update.date, update.type, update.text, update.link || "https://cloud.google.com/bigquery"];
                
                const escapeCSV = (val) => {
                    if (val === null || val === undefined) return '""';
                    return `"${val.toString().replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
                };
                
                const csvContent = headers.map(escapeCSV).join(",") + "\n" + row.map(escapeCSV).join(",");
                
                // Create a blob for safe downloading of special characters (UTF-8 with BOM)
                const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                
                const link = document.createElement("a");
                // Sanitize filename
                const sanitizedDate = update.date.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                const sanitizedType = update.type.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                
                link.setAttribute("href", url);
                link.setAttribute("download", `bq_release_${sanitizedDate}_${sanitizedType}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            });

            feedContainer.appendChild(card);
        });
    }

    // Helper: Map release types to styling details
    function getTypeStyles(type) {
        const t = type.toLowerCase();
        if (t === 'feature') {
            return { color: 'var(--color-feature)', bg: 'var(--bg-feature)' };
        } else if (t === 'issue' || t === 'bug fix' || t === 'bug') {
            return { color: 'var(--color-issue)', bg: 'var(--bg-issue)' };
        } else if (t === 'deprecation') {
            return { color: 'var(--color-deprecation)', bg: 'var(--bg-deprecation)' };
        } else {
            return { color: 'var(--color-general)', bg: 'var(--bg-general)' };
        }
    }

    // Open tweet composer with smart default text formatting
    function openTweetModal(update) {
        const prefix = `BigQuery Update (${update.date}): `;
        const hashtags = ` #BigQuery #GoogleCloud`;
        const link = update.link || "https://cloud.google.com/bigquery";
        
        // Link will count as 23 characters in X/Twitter
        const linkLength = 23;
        const reservedLength = prefix.length + hashtags.length + linkLength + 4; // 4 safety chars
        const availableTextLength = TWITTER_MAX_CHARS - reservedLength;
        
        let cleanedText = update.text
            .replace(/\s+/g, ' ')  // Collapse whitespaces
            .trim();

        if (cleanedText.length > availableTextLength) {
            cleanedText = cleanedText.substring(0, availableTextLength - 3) + "...";
        }

        const defaultTweet = `${prefix}"${cleanedText}"\n\nRead more: ${link}${hashtags}`;
        
        composerTextarea.value = defaultTweet;
        updateCharCount();
        
        // Open Modal
        modalOverlay.classList.add('active');
        composerTextarea.focus();
    }

    function closeTweetModal() {
        modalOverlay.classList.remove('active');
    }

    // Update Tweet character indicator and button availability
    function updateCharCount() {
        const text = composerTextarea.value;
        
        // Twitter counts URLs as 23 characters regardless of actual length
        // We will do a basic substitution to calculate actual Twitter counter length
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        let tweetLength = text.length;
        
        const urls = text.match(urlRegex) || [];
        urls.forEach(url => {
            tweetLength = tweetLength - url.length + 23;
        });

        const remaining = TWITTER_MAX_CHARS - tweetLength;
        charCounter.textContent = `${remaining} characters remaining`;

        // Style warnings based on remaining length
        charCounter.className = 'char-counter';
        if (remaining < 0) {
            charCounter.classList.add('danger');
            btnPostTweet.disabled = true;
        } else if (remaining < 30) {
            charCounter.classList.add('warning');
            btnPostTweet.disabled = false;
        } else {
            btnPostTweet.disabled = false;
        }

        // Handle button submit handler
        btnPostTweet.onclick = () => {
            const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
            window.open(tweetUrl, '_blank');
            closeTweetModal();
        };
    }
});
