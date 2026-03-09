# YouTube Research Suite

A powerful YouTube SEO and viral discovery tool built for Firebase.

## System Architecture

### Frontend (Vanilla JS + HTML + CSS)
- **Modular UI**: Sidebar navigation for switching between tools (Shorts Finder, Viral Collector, etc.)
- **State Management**: LocalStorage for API Key persistence; in-memory state for results.
- **Data Rendering**: Dynamic table generation with keyword highlighting and sortable columns.
- **Export System**: Client-side generation of CSV and JSON blobs for instant download.

### Backend (Firebase Functions - Node.js)
- **Proxy Layer**: Securely handles YouTube Data API v3 requests to protect user keys (optional) and perform complex data transformations.
- **Video Detailer**: Efficiently hydration of search results using bulk `videos.list` calls to minimize quota usage.
- **Viral Algorithms**: Custom logic to calculate "Viral Scores" based on view velocity, engagement ratios, and time-decay factors.

### Database (Firebase Firestore)
- **Search History**: Stores keyword trends and result counts for niche analysis.
- **Channel Database**: Tracks high-performing channels discovered during research.

## API Request Flow
1. **Frontend**: Collects API Key and Keyword.
2. **Frontend**: Calls HTTPS Callable Firebase Function (e.g., `searchShorts`).
3. **Backend**: Calls `youtube.search.list` to get IDs.
4. **Backend**: Calls `youtube.videos.list` to get metrics (Views, Likes, Tags).
5. **Backend**: Calculates Viral Score and saves search metadata to Firestore.
6. **Frontend**: Receives structured JSON and renders the results table.

## Deployment Instructions

1. **Prerequisites**:
   - Install Firebase CLI: `npm install -g firebase-tools`
   - Create a project in the [Firebase Console](https://console.firebase.google.com/).
   - Enable the [YouTube Data API v3](https://console.cloud.google.com/apis/library/youtube.googleapis.com) in your Google Cloud Console.

2. **Setup**:
   - Run `firebase login`
   - Run `firebase init` (Select Functions, Firestore, and Hosting)
   - Copy the files in this repo to your project directory.

3. **Deploy**:
   - Run `firebase deploy`

4. **Connect API Key**:
   - Open the deployed web app.
   - Enter your YouTube Data API Key in the top bar and click "Save Key".

## YouTube API Quota Optimization

The YouTube API operates on a "unit" system (10,000 units per day default).

- **Search Query**: 100 units per request.
- **Video/Channel Detail Query**: 1 unit per request.

**How we optimize:**
1. **Bulk Requests**: We fetch 50 IDs in one search call (100 units) and then get details for all 50 in ONE video call (1 unit). Total: 101 units for 50 detailed results.
2. **Avoid Redundant Calls**: We only fetch the `statistics` and `snippet` parts we actually need.
3. **Caching**: Search results are stored in state so switching between "Dashboard" and "Tag Analyzer" doesn't trigger new API calls.

## Viral Score Formula
For Shorts and Viral Videos, we use the following weighted formula:
`Viral Score = (Views * 0.6) + (Likes * 0.3) + (Comments * 0.1)`
*Note: In the Viral Collector, we also factor in "Velocity" (Views / Days since published) to find trending content vs. old viral hits.*
