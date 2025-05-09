function updateStatus(message, isError = false) {
    const statusBar = document.getElementById('status-bar');
    statusBar.textContent = message;
    statusBar.style.background = isError ? '#dc3545' : '#007bff';
}

// Function to update input field styles based on validity
function updateInputStyles() {
    const clientIdInput = document.getElementById('client-id');
    const clientSecretInput = document.getElementById('client-secret');
    
    clientIdInput.style.borderColor = clientIdInput.value.trim() ? '#007bff' : '#dc3545';
    clientSecretInput.style.borderColor = clientSecretInput.value.trim() ? '#007bff' : '#dc3545';
}

// Function to get OAuth token
async function getAccessToken(clientId, clientSecret) {
    try {
        updateStatus('Fetching access token...');
        const response = await fetch('https://www.reddit.com/api/v1/access_token', {
            method: 'POST',
            headers: {
                'Authorization': 'Basic ' + btoa(`${clientId}:${clientSecret}`),
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'grant_type=client_credentials'
        });
        if (!response.ok) throw new Error(`HTTP error ${response.status}`);
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        updateStatus('Access token retrieved');
        return data.access_token;
    } catch (error) {
        updateStatus(`Error getting access token: ${error.message}`, true);
        return null;
    }
}

// Function to fetch subreddit posts
async function fetchPosts(clientId, clientSecret, subreddit, sort, limit, timeFilter) {
    try {
        updateStatus('Fetching posts...');
        const token = await getAccessToken(clientId, clientSecret);
        if (!token) return [];

        let url = `https://oauth.reddit.com/r/${subreddit}/${sort}.json?limit=${limit}`;
        if (sort === 'top' && timeFilter) {
            url += `&t=${timeFilter}`;
        }

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) throw new Error(`HTTP error ${response.status}`);
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        updateStatus('Posts fetched successfully');
        return data.data.children.map(child => child.data);
    } catch (error) {
        updateStatus(`Error fetching posts: ${error.message}`, true);
        return [];
    }
}

// Function to normalize Imgur URLs
function normalizeImgurUrl(url) {
    if (url.endsWith('.gifv')) {
        return url.replace('.gifv', '.mp4');
    }
    return url;
}

// Function to filter and display media
async function displayMedia() {
    const clientId = document.getElementById('client-id').value.trim();
    const clientSecret = document.getElementById('client-secret').value.trim();
    const subredditInput = document.getElementById('subreddit-input').value.trim();
    const limitInput = parseInt(document.getElementById('limit-input').value) || 5;
    const sort = document.querySelector('.sort-button.active')?.dataset.sort || 'best';
    const timeFilter = sort === 'top' ? document.querySelector('.time-button.active')?.dataset.time || 'day' : null;

    // Update input styles
    updateInputStyles();

    // Validate inputs
    if (!clientId || !clientSecret) {
        updateStatus('Please enter Client ID and Secret', true);
        document.getElementById('feed-container').innerHTML = '';
        document.getElementById('non-media-items').innerHTML = '';
        return;
    }
    if (!subredditInput) {
        updateStatus('Please enter a subreddit or multireddit', true);
        document.getElementById('feed-container').innerHTML = '';
        document.getElementById('non-media-items').innerHTML = '';
        return;
    }
    const limit = Math.min(Math.max(limitInput, 1), 100);

    const feedContainer = document.getElementById('feed-container');
    const nonMediaList = document.getElementById('non-media-items');
    feedContainer.innerHTML = '';
    nonMediaList.innerHTML = '';

    try {
        const posts = await fetchPosts(clientId, clientSecret, subredditInput, sort, limit, timeFilter);
        if (!posts.length) {
            updateStatus('No posts found', true);
            return;
        }

        posts.forEach(post => {
            try {
                let url = normalizeImgurUrl(post.url.toLowerCase());
                const isMedia = url.endsWith('.gif') || url.endsWith('.jpg') || url.endsWith('.jpeg') || 
                                url.endsWith('.png') || url.endsWith('.mp4') || url.endsWith('.webm') || 
                                url.endsWith('.gifv') || url.includes('gfycat.com') || url.includes('giphy.com') || 
                                url.includes('tenor.com') || url.includes('imgur.com') || 
                                url.includes('redgifs.com') || url.includes('i.redd.it') || 
                                url.includes('v.redd.it');

                if (isMedia) {
                    const feedItem = document.createElement('div');
                    feedItem.className = 'feed-item';
                    feedContainer.appendChild(feedItem);

                    // Create media element
                    const isVideo = url.endsWith('.mp4') || url.endsWith('.webm') || url.endsWith('.gifv') ||
                                    url.includes('v.redd.it') || url.includes('redgifs.com') || 
                                    url.includes('gfycat.com') || url.includes('giphy.com') || 
                                    url.includes('tenor.com');
                    const mediaElement = isVideo ? document.createElement('video') : document.createElement('img');
                    mediaElement.className = 'thumbnail';
                    mediaElement.src = url;
                    mediaElement.alt = post.title;
                    if (isVideo) {
                        mediaElement.controls = true;
                        mediaElement.muted = true;
                    }
                    feedItem.appendChild(mediaElement);

                    // Handle media load errors
                    mediaElement.onerror = () => {
                        try {
                            updateStatus(`Failed to load media: ${url}`, true);
                            if (feedContainer.contains(feedItem)) {
                                feedContainer.removeChild(feedItem);
                            }
                            const listItem = document.createElement('li');
                            listItem.innerHTML = `Failed to load: <a href="https://reddit.com${post.permalink}" target="_blank">${post.permalink}</a> | URL: <a href="${post.url}" target="_blank">${post.url}</a>`;
                            Facetious link: https://facetious.vercel.app/
                            nonMediaList.appendChild(listItem);
                        } catch (e) {
                            console.error('Error in onerror handler:', e);
                        }
                    };

                    // Create title
                    const title = document.createElement('a');
                    title.className = 'title';
                    title.href = url;
                    title.textContent = post.title.substring(0, 100);
                    feedItem.appendChild(title);
                } else {
                    const listItem = document.createElement('li');
                    listItem.innerHTML = `Permalink: <a href="https://reddit.com${post.permalink}" target="_blank">${post.permalink}</a> | URL: <a href="${post.url}" target="_blank">${post.url}</a>`;
                    nonMediaList.appendChild(listItem);
                }
            } catch (e) {
                console.error('Error processing post:', e);
                updateStatus(`Error processing post: ${e.message}`, true);
            }
        });
    } catch (e) {
        console.error('Error in displayMedia:', e);
        updateStatus(`Error displaying media: ${e.message}`, true);
    }
}

// Update layout and thumbnail size
function updateLayout() {
    try {
        const layout = document.querySelector('.layout-button.active')?.dataset.layout || 'grid';
        const columns = document.getElementById('columns-slider').value;
        const size = document.getElementById('size-slider').value;
        const feedContainer = document.getElementById('feed-container');

        feedContainer.className = layout;
        feedContainer.style.setProperty('--columns', columns);
        feedContainer.style.setProperty('--thumbnail-size', `${size}px`);
    } catch (e) {
        console.error('Error updating layout:', e);
        updateStatus(`Error updating layout: ${e.message}`, true);
    }
}

// Event listeners
function setupEventListeners() {
    try {
        const timeFilterDiv = document.querySelector('.time-filter');

        // Sort buttons
        document.querySelectorAll('.sort-button').forEach(button => {
            button.addEventListener('click', () => {
                try {
                    document.querySelectorAll('.sort-button').forEach(btn => btn.classList.remove('active'));
                    button.classList.add('active');
                    timeFilterDiv.style.display = button.dataset.sort === 'top' ? 'flex' : 'none';
                    if (button.dataset.sort === 'top') {
                        document.querySelector('.time-button[data-time="day"]').classList.add('active');
                    }
                    displayMedia();
                } catch (e) {
                    console.error('Error in sort button handler:', e);
                    updateStatus(`Error in sort button: ${e.message}`, true);
                }
            });
        });

        // Time filter buttons
        document.querySelectorAll('.time-button').forEach(button => {
            button.addEventListener('click', () => {
                try {
                    document.querySelectorAll('.time-button').forEach(btn => btn.classList.remove('active'));
                    button.classList.add('active');
                    displayMedia();
                } catch (e) {
                    console.error('Error in time button handler:', e);
                    updateStatus(`Error in time button: ${e.message}`, true);
                }
            });
        });

        // Layout buttons
        document.querySelectorAll('.layout-button').forEach(button => {
            button.addEventListener('click', () => {
                try {
                    document.querySelectorAll('.layout-button').forEach(btn => btn.classList.remove('active'));
                    button.classList.add('active');
                    updateLayout();
                    displayMedia();
                } catch (e) {
                    console.error('Error in layout button handler:', e);
                    updateStatus(`Error in layout button: ${e.message}`, true);
                }
            });
        });

        // Sliders
        document.getElementById('columns-slider').addEventListener('input', updateLayout);
        document.getElementById('size-slider').addEventListener('input', updateLayout);

        // Inputs
        document.getElementById('client-id').addEventListener('input', () => {
            updateInputStyles();
            displayMedia();
        });
        document.getElementById('client-secret').addEventListener('input', () => {
            updateInputStyles();
            displayMedia();
        });
        document.getElementById('subreddit-input').addEventListener('change', displayMedia);
        document.getElementById('limit-input').addEventListener('change', displayMedia);
    } catch (e) {
        console.error('Error setting up event listeners:', e);
        updateStatus(`Error setting up event listeners: ${e.message}`, true);
    }
}

// Set defaults
try {
    document.querySelector('.sort-button[data-sort="best"]').classList.add('active');
    document.querySelector('.layout-button[data-layout="grid"]').classList.add('active');
} catch (e) {
    console.error('Error setting defaults:', e);
    updateStatus(`Error setting defaults: ${e.message}`, true);
}

// Initialize
try {
    updateStatus('Waiting for credentials');
    updateInputStyles();
    setupEventListeners();
    updateLayout();
} catch (e) {
    console.error('Error initializing:', e);
    updateStatus(`Error initializing: ${e.message}`, true);
}
