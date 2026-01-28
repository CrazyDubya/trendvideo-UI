# 🎬 Trend Video Tracker UI

A web-based GUI application for tracking and displaying the top 25 trending TikTok and YouTube videos daily using the Virlo API.

## Features

- ⏰ **Scheduled Fetching**: Set multiple daily times to automatically fetch trending videos
- 🎵 **TikTok Integration**: Get the top 25 trending TikTok videos
- 📺 **YouTube Shorts Integration**: Get the top 25 trending YouTube Shorts
- 💾 **Local Caching**: Results are cached locally for 24 hours
- 🎨 **Responsive Design**: Works beautifully on desktop and mobile devices
- 🔄 **Real-time Updates**: Automatic scheduled fetching at configured times

## Prerequisites

- A Virlo API key from [https://dev.virlo.ai](https://dev.virlo.ai)
- A modern web browser (Chrome, Firefox, Safari, or Edge)
- No server setup required - runs entirely in the browser!

## Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/CrazyDubya/trendvideo-UI.git
   cd trendvideo-UI
   ```

2. **Open the application**
   - Simply open `index.html` in your web browser
   - Or use a local server (recommended):
     ```bash
     # Using Python 3
     python3 -m http.server 8000
     
     # Using Node.js (with http-server)
     npx http-server
     ```
   - Navigate to `http://localhost:8000` in your browser

3. **Configure your API key**
   - Get your API key from [Virlo Developer Portal](https://dev.virlo.ai)
   - Enter your API key in the "API Configuration" section
   - Click "Save API Key"

4. **Set up scheduled times** (Optional)
   - Select a time using the time picker
   - Click "Add Time" to schedule automatic fetching
   - Add multiple times if needed

5. **Fetch trending videos**
   - Click "Fetch Top 25 TikTok Videos" for TikTok content
   - Click "Fetch Top 25 YouTube Shorts" for YouTube content
   - Click "Fetch Both Platforms" to get both at once

## How It Works

### Virlo API Integration

The application uses the Virlo API to fetch trending videos:

1. **Queue a Keyword Search**
   ```javascript
   POST https://api.virlo.ai/orbit/keyword-search
   Body: {
     "name": "Trending Search",
     "keywords": ["trending", "viral", "fyp"],
     "platform": "tiktok" // or "youtube"
   }
   ```

2. **Fetch Results**
   ```javascript
   GET https://api.virlo.ai/orbit/results/:orbitId
   ```

3. **Display Top 25**
   - Results are sorted by virality score
   - Top 25 videos are displayed in a grid layout

### Scheduled Fetching

- The app checks every minute if it's time to fetch
- When a scheduled time matches the current time, it automatically fetches trending videos
- Results are cached locally to avoid redundant API calls

### Data Storage

All data is stored locally in your browser using `localStorage`:
- API key (encrypted in storage)
- Scheduled times
- Cached video results (24-hour expiry)
- Last fetch timestamp

## Project Structure

```
trendvideo-UI/
├── index.html          # Main HTML structure
├── styles.css          # All styling and responsive design
├── app.js              # Application logic and API integration
└── README.md           # This file
```

## API Endpoints Used

### Virlo API

- **Base URL**: `https://api.virlo.ai`
- **Authentication**: Bearer token in Authorization header
- **Endpoints**:
  - `POST /orbit/keyword-search` - Queue a search job
  - `GET /orbit/results/:orbitId` - Fetch search results

### Required Headers

```
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

## Features in Detail

### 1. Scheduler
- Set multiple daily run times
- Automatic background checking every minute
- Visual display of all scheduled times
- Easy removal of scheduled times

### 2. Video Display
- Grid layout showing 25 videos
- Video thumbnails with fallback images
- Video metadata (title, creator, views, likes)
- Ranking badges (#1 - #25)
- Click to open video in new tab

### 3. Status Messages
- Real-time feedback for all operations
- Color-coded messages (success, error, info, loading)
- Auto-dismiss for success messages

### 4. Local Caching
- 24-hour cache for fetched results
- Reduces API calls and improves load times
- Displays cached results on page load

## Browser Compatibility

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

## Security Notes

- API key is stored in browser's localStorage
- Never commit your API key to version control
- The app runs entirely client-side (no server required)
- All API calls are made directly from the browser

## Troubleshooting

### API Key Issues
- Make sure you have a valid API key from Virlo
- Check that the API key is saved (status message will confirm)
- Try refreshing the page and re-entering the key

### Videos Not Fetching
- Check your internet connection
- Verify your API key is valid
- Check browser console for error messages
- The API may take 15-30 seconds to process requests

### Scheduled Fetching Not Working
- Make sure the browser tab stays open
- Check that you've added at least one scheduled time
- Verify the time format is correct (HH:MM)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the MIT License.

## Credits

- Powered by [Virlo API](https://dev.virlo.ai)
- Built for tracking trending TikTok and YouTube content
- Using Virlo API to identify trending videos on YouTube and TikTok

## Support

For issues related to:
- **This UI**: Open an issue on GitHub
- **Virlo API**: Visit [https://dev.virlo.ai](https://dev.virlo.ai)

---

Made with ❤️ for tracking viral content
