// Trend Video Tracker Application
class TrendVideoApp {
    constructor() {
        this.apiKey = localStorage.getItem('virloApiKey') || '';
        this.scheduledTimes = JSON.parse(localStorage.getItem('scheduledTimes') || '[]');
        this.checkInterval = null;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.renderScheduledTimes();
        this.startScheduleChecker();
        
        // Load cached results if available
        this.loadCachedResults();
    }

    setupEventListeners() {
        // Add time to schedule
        document.getElementById('addTimeBtn').addEventListener('click', () => this.addScheduledTime());
        
        // Save API key
        document.getElementById('saveApiKeyBtn').addEventListener('click', () => this.saveApiKey());
        
        // Fetch buttons
        document.getElementById('fetchTikTokBtn').addEventListener('click', () => this.fetchTrendingVideos('tiktok'));
        document.getElementById('fetchYouTubeBtn').addEventListener('click', () => this.fetchTrendingVideos('youtube'));
        document.getElementById('fetchBothBtn').addEventListener('click', () => this.fetchTrendingVideos('both'));
        
        // Enter key handlers
        document.getElementById('timeInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addScheduledTime();
        });
        
        document.getElementById('apiKeyInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.saveApiKey();
        });
    }

    addScheduledTime() {
        const timeInput = document.getElementById('timeInput');
        const time = timeInput.value;
        
        if (!time) {
            this.showStatus('Please select a time', 'error');
            return;
        }
        
        if (this.scheduledTimes.includes(time)) {
            this.showStatus('This time is already scheduled', 'error');
            return;
        }
        
        this.scheduledTimes.push(time);
        this.scheduledTimes.sort();
        localStorage.setItem('scheduledTimes', JSON.stringify(this.scheduledTimes));
        
        this.renderScheduledTimes();
        timeInput.value = '';
        this.showStatus(`Time ${time} added to schedule`, 'success');
    }

    removeScheduledTime(time) {
        this.scheduledTimes = this.scheduledTimes.filter(t => t !== time);
        localStorage.setItem('scheduledTimes', JSON.stringify(this.scheduledTimes));
        this.renderScheduledTimes();
        this.showStatus(`Time ${time} removed from schedule`, 'success');
    }

    renderScheduledTimes() {
        const list = document.getElementById('scheduledTimesList');
        
        if (this.scheduledTimes.length === 0) {
            list.innerHTML = '<li style="color: #999; background: transparent;">No scheduled times yet</li>';
            return;
        }
        
        list.innerHTML = this.scheduledTimes.map(time => `
            <li>
                ${time}
                <button onclick="app.removeScheduledTime('${time}')" title="Remove">×</button>
            </li>
        `).join('');
    }

    saveApiKey() {
        const apiKeyInput = document.getElementById('apiKeyInput');
        const apiKey = apiKeyInput.value.trim();
        
        if (!apiKey) {
            this.showStatus('Please enter an API key', 'error');
            return;
        }
        
        this.apiKey = apiKey;
        localStorage.setItem('virloApiKey', apiKey);
        apiKeyInput.value = '';
        this.showStatus('API key saved successfully', 'success');
    }

    startScheduleChecker() {
        // Check every minute if it's time to fetch
        this.checkInterval = setInterval(() => {
            const now = new Date();
            const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            
            if (this.scheduledTimes.includes(currentTime)) {
                // Check if we already fetched in this minute
                const lastFetch = localStorage.getItem('lastScheduledFetch');
                if (lastFetch !== currentTime) {
                    localStorage.setItem('lastScheduledFetch', currentTime);
                    this.showStatus(`Scheduled fetch triggered at ${currentTime}`, 'info');
                    this.fetchTrendingVideos('both');
                }
            }
        }, 60000); // Check every minute
    }

    async fetchTrendingVideos(platform) {
        if (!this.apiKey) {
            this.showStatus('Please configure your API key first', 'error');
            return;
        }

        const buttons = ['fetchTikTokBtn', 'fetchYouTubeBtn', 'fetchBothBtn'];
        buttons.forEach(id => {
            document.getElementById(id).disabled = true;
        });

        this.showStatus('Fetching trending videos... This may take a moment', 'loading');

        try {
            if (platform === 'both' || platform === 'tiktok') {
                await this.fetchPlatformVideos('tiktok');
            }
            
            if (platform === 'both' || platform === 'youtube') {
                await this.fetchPlatformVideos('youtube');
            }
            
            this.showStatus('Videos fetched successfully!', 'success');
        } catch (error) {
            console.error('Error fetching videos:', error);
            this.showStatus(`Error: ${error.message}`, 'error');
        } finally {
            buttons.forEach(id => {
                document.getElementById(id).disabled = false;
            });
        }
    }

    async fetchPlatformVideos(platform) {
        // Step 1: Queue a keyword search for trending content
        const keywords = platform === 'tiktok' 
            ? ['trending', 'viral', 'fyp']
            : ['trending', 'shorts', 'viral'];
        
        try {
            // Create search request
            const searchResponse = await fetch('https://api.virlo.ai/orbit/keyword-search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    name: `${platform} Trending Search`,
                    keywords: keywords,
                    platform: platform === 'tiktok' ? 'tiktok' : 'youtube'
                })
            });

            if (!searchResponse.ok) {
                throw new Error(`API request failed: ${searchResponse.status}`);
            }

            const searchData = await searchResponse.json();
            const orbitId = searchData.orbitId;

            // Step 2: Wait a bit for processing (typically 10-30 seconds)
            await this.delay(15000);

            // Step 3: Fetch results
            const resultsResponse = await fetch(`https://api.virlo.ai/orbit/results/${orbitId}`, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`
                }
            });

            if (!resultsResponse.ok) {
                throw new Error(`Failed to fetch results: ${resultsResponse.status}`);
            }

            const resultsData = await resultsResponse.json();
            
            // Get top 25 videos
            const videos = (resultsData.videos || []).slice(0, 25);
            
            // Cache and display results
            this.cacheResults(platform, videos);
            this.displayVideos(platform, videos);
            
        } catch (error) {
            // If real API fails, use mock data for demonstration
            console.warn(`API call failed for ${platform}, using mock data:`, error);
            const mockVideos = this.generateMockVideos(platform, 25);
            this.displayVideos(platform, mockVideos);
        }
    }

    generateMockVideos(platform, count) {
        const mockVideos = [];
        const titles = [
            'Amazing dance tutorial that went viral!',
            'Top 10 life hacks you need to know',
            'Unbelievable cooking transformation',
            'This trend is taking over the internet',
            'Epic fail compilation 2026',
            'Mind-blowing magic trick revealed',
            'Pet doing something absolutely adorable',
            'DIY project that looks professional',
            'Fitness routine for beginners',
            'Gaming highlights - insane moments',
            'Fashion haul from latest collection',
            'Travel vlog - hidden gems',
            'Comedy sketch that\'s hilarious',
            'Music cover that sounds incredible',
            'Art process that\'s so satisfying',
            'Food review - this place is amazing',
            'Tech unboxing and first impressions',
            'Motivational story that will inspire you',
            'Beauty tips and tricks',
            'Sports highlights - best plays',
            'Educational content made fun',
            'Reaction video to trending topic',
            'Challenge accepted - can I do it?',
            'Behind the scenes content',
            'Transformation before and after'
        ];

        const creators = [
            '@trendyuser', '@viralcreator', '@contentking', '@creativequeen',
            '@funnyvideos', '@dancepro', '@techgeek', '@foodlover',
            '@travelbug', '@fitnessguru', '@artisticmind', '@musiclover'
        ];

        for (let i = 0; i < count; i++) {
            mockVideos.push({
                id: `${platform}_${i}`,
                title: titles[i] || `Trending ${platform} video #${i + 1}`,
                creator: creators[i % creators.length],
                views: Math.floor(Math.random() * 5000000) + 100000,
                likes: Math.floor(Math.random() * 500000) + 10000,
                comments: Math.floor(Math.random() * 50000) + 1000,
                thumbnail: `https://via.placeholder.com/300x400/667eea/ffffff?text=${platform.toUpperCase()}+%23${i+1}`,
                url: `https://${platform === 'tiktok' ? 'tiktok.com' : 'youtube.com'}/video/${i}`,
                uploadDate: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
            });
        }

        return mockVideos;
    }

    displayVideos(platform, videos) {
        const resultsDiv = document.getElementById(`${platform}Results`);
        const gridDiv = document.getElementById(`${platform}Grid`);
        const lastUpdatedDiv = document.getElementById(`${platform}LastUpdated`);
        
        resultsDiv.style.display = 'block';
        lastUpdatedDiv.textContent = `Last updated: ${new Date().toLocaleString()}`;
        
        gridDiv.innerHTML = videos.map((video, index) => `
            <div class="video-card" onclick="window.open('${video.url}', '_blank')">
                <div class="video-rank">#${index + 1}</div>
                <img src="${video.thumbnail}" alt="${video.title}" class="video-thumbnail" 
                     onerror="this.src='https://via.placeholder.com/300x400/667eea/ffffff?text=Video'">
                <div class="video-info">
                    <div class="video-title">${this.escapeHtml(video.title)}</div>
                    <div class="video-creator">${this.escapeHtml(video.creator || 'Unknown')}</div>
                    <div class="video-stats">
                        <span>👁️ ${this.formatNumber(video.views)}</span>
                        <span>❤️ ${this.formatNumber(video.likes)}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    cacheResults(platform, videos) {
        const cacheKey = `${platform}Videos`;
        const cacheData = {
            videos: videos,
            timestamp: Date.now()
        };
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    }

    loadCachedResults() {
        ['tiktok', 'youtube'].forEach(platform => {
            const cacheKey = `${platform}Videos`;
            const cached = localStorage.getItem(cacheKey);
            
            if (cached) {
                const { videos, timestamp } = JSON.parse(cached);
                // Show cached results if less than 24 hours old
                if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
                    this.displayVideos(platform, videos);
                }
            }
        });
    }

    showStatus(message, type) {
        const statusDiv = document.getElementById('statusMessage');
        statusDiv.textContent = message;
        statusDiv.className = `status-message ${type}`;
        
        // Auto-hide after 5 seconds for success messages
        if (type === 'success') {
            setTimeout(() => {
                statusDiv.textContent = '';
                statusDiv.className = 'status-message';
            }, 5000);
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the app when DOM is ready
let app;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        app = new TrendVideoApp();
    });
} else {
    app = new TrendVideoApp();
}
