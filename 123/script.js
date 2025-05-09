function updateStatus(message, isError = false) {
    const statusBar = document.getElementById('status-bar');
    statusBar.textContent = message;
    statusBar.style.background = isError ? '#dc3545' : '#007bff';
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

    // Validate inputs
    if (!clientId || !clientSecret) {
        updateStatus('Please enter Client ID and Secret', true);
        return;
    }
    if (!subredditInput) {
        updateStatus('Please enter a subreddit or multireddit', true);
        return;
    }
    const limit = Math.min(Math.max(limitInput, 1), 100);

    const feedContainer = document.getElementById('feed-container');
    const nonMediaList = document.getElementById('non-media-items');
    feedContainer.innerHTML = '';
    nonMediaList.innerHTML = '';

    const posts = await fetchPosts(clientId, clientSecret, subredditInput, sort, limit, timeFilter);

    posts.forEach(post => {
        let url = normalizeImgurUrl(post.url.toLowerCase());
        const isMedia = url.endsWith('.gif') || url.endsWith('.jpg') || url.endsWith('.jpeg') || 
                        url.endsWith('.png') || url.endsWith('.mp4') || url.endsWith('.webm') || 
                        url.includes('gfycat.com') || url.includes('giphy.com') || 
                        url.includes('tenor.com') || url.includes('imgur.com') || 
                        url.includes('redgifs.com') || url.includes('i.redd.it') || 
                        url.includes('v.redd.it');

        if (isMedia) {
            const feedItem = document.createElement('div');
            feedItem.className = 'feed-item';
            feedContainer.appendChild(feedItem);

            // Create media element
            const isVideo = url.endsWith('.mp4') || url.endsWith('.webm') || 
                            url.includes('v.redd.it') || url.includes('redgifs.com') || 
                            url.includes('gfycat.com') || url.includes('giphy.com') || 
                            url.includes('tenor.com') || url.includes('imgur.com');
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
                updateStatus(`Failed to load media: ${url}`, true);
                feedContainer.removeChild(feedItem);
                const listItem = document.createElement('li');
                listItem.innerHTML = `Failed to load: <a href="https://reddit.com${post.permalink}" target="_blank">${post.permalink}</a> | URL: <a href="${post.url}" target="_blank">${post.url}</a>`;
                nonMediaList.appendChild(listItem);
            };

            // Create title
            const title = document.createElement('a');
            title.className = 'title';
            title.href            title.href = url;
            title.textContent = post.title.substring(0, 100);
            feedItem.appendChild(title);
        } else {
            const listItem = document.createElement('li');
            listItem.innerHTML = `Permalink: <a href="https://reddit.com${post.permalink}" target="_blank">${post.permalink}</a> | URL: <a href="${post.url}" target="_blank">${post.url}</a>`;
            nonMediaList.appendChild(listItem);
        }
    });
}

// Update layout and thumbnail size
function updateLayout() {
    const layout = document.querySelector('.layout-button.active')?.dataset.layout || 'grid';
    const columns = document.getElementById('columns-slider').value;
    const size = document.getElementById('size-slider').value;
    const feedContainer = document.getElementById('feed-container');

    feedContainer.className = layout;
    feedContainer.style.setProperty('--columns', columns);
    feedContainer.style.setProperty('--thumbnail-size', `${size}px`);
}

// Event listeners
function setupEventListeners() {
    const timeFilterDiv = document.querySelector('.time-filter');

    // Sort buttons
    document.querySelectorAll('.sort-button').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.sort-button').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            timeFilterDiv.style.display = button.dataset.sort === 'top' ? 'flex' : 'none';
            if (button.dataset.sort === 'top') {
                document.querySelector('.time-button[data-time="day"]').classList.add('active');
            }
            displayMedia();
        });
    });

    // Time filter buttons
    document.querySelectorAll('.time-button').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.time-button').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            displayMedia();
        });
    });

    // Layout buttons
    document.querySelectorAll('.layout-button').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.layout-button').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            updateLayout();
            displayMedia();
        });
    });

    // Sliders
    document.getElementById('columns-slider').addEventListener('input', updateLayout);
    document.getElementById('size-slider').addEventListener('input', updateLayout);

    // Inputs
    document.getElementById('client-id').addEventListener('change', displayMedia);
    document.getElementById('client-secret').addEventListener('change', displayMedia);
    document.getElementById('subreddit-input').addEventListener('change', displayMedia);
    document.getElementById('limit-input').addEventListener('change', displayMedia);
}

// Set defaults
document.querySelector('.sort-button[data-sort="best"]').classList.add('active');
document.querySelector('.layout-button[data-layout="grid"]').classList.add('active');

// Initialize
setupEventListeners();
updateLayout();
displayMedia();
