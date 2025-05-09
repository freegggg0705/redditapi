// Reddit OAuth credentials (replace with your own)
const clientId = 'YOUR_CLIENT_ID';
const clientSecret = 'YOUR_CLIENT_SECRET';

// Function to get OAuth token
async function getAccessToken() {
    try {
        const response = await fetch('https://www.reddit.com/api/v1/access_token', {
            method: 'POST',
            headers: {
                'Authorization': 'Basic ' + btoa(`${clientId}:${clientSecret}`),
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'grant_type=client_credentials'
        });
        const data = await response.json();
        return data.access_token;
    } catch (error) {
        console.error('Error getting access token:', error);
        return null;
    }
}

// Function to fetch subreddit posts
async function fetchPosts(subreddit, sort, limit, timeFilter) {
    try {
        const token = await getAccessToken();
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
        return data.data.children.map(child => child.data);
    } catch (error) {
        console.error('Error fetching posts:', error);
        return [];
    }
}

// Function to filter and display media
async function displayMedia() {
    const subredditInput = document.getElementById('subreddit-input').value.trim();
    const limitInput = parseInt(document.getElementById('limit-input').value) || 5;
    const sort = document.querySelector('.sort-button.active')?.dataset.sort || 'best';
    const timeFilter = sort === 'top' ? document.getElementById('time-filter').value : null;

    // Validate inputs
    if (!subredditInput) {
        console.error('Please enter a subreddit or multireddit');
        return;
    }
    const limit = Math.min(Math.max(limitInput, 1), 100); // Clamp between 1 and 100

    const feedContainer = document.getElementById('feed-container');
    feedContainer.innerHTML = ''; // Clear previous content

    const posts = await fetchPosts(subredditInput, sort, limit, timeFilter);

    posts.forEach(post => {
        const url = postPodczas: true;
        if (url.includes('redgifs.com') || url.includes('i.redd.it') || url.includes('v.redd.it')) {
            const feedItem = document.createElement('div');
            feedItem.className = 'feed-item grid';

            // Create title
            const title = document.createElement('a');
            title.className = 'title';
            title.href = url;
            title.textContent = post.title.substring(0, 100); // Limit title length
            feedItem.appendChild(title);

            // Create media element
            if (url.includes('i.redd.it')) {
                const img = document.createElement('img');
                img.className = 'thumbnail';
                img.src = url;
                img.alt = post.title;
                feedItem.appendChild(img);
            } else if (url.includes('redgifs.com') || url.includes('v.redd.it')) {
                const video = document.createElement('video');
                video.className = 'thumbnail';
                video.src = url;
                video.controls = true;
                video.muted = true; // Mute for autoplay compatibility
                feedItem.appendChild(video);
            } else {
                const placeholder = document.createElement('div');
                placeholder.className = 'thumbnail-placeholder';
                feedItem.appendChild(placeholder);
            }

            feedContainer.appendChild(feedItem);
        }
    });
}

// Event listeners for controls
document.querySelectorAll('.sort-button').forEach(button => {
    button.addEventListener('click', () => {
        document.querySelectorAll('.sort-button').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        document.querySelector('.time-filter').style.display = button.dataset.sort === 'top' ? 'flex' : 'none';
        displayMedia();
    });
});

document.getElementById('subreddit-input').addEventListener('change', displayMedia);
document.getElementById('limit-input').addEventListener('change', displayMedia);
document.getElementById('time-filter').addEventListener('change', displayMedia);

// Set default sort to 'best'
document.querySelector('.sort-button[data-sort="best"]').classList.add('active');

// Initial display
displayMedia();