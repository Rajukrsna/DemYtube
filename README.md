# Idea Canvas - Online Learning Platform

A comprehensive online learning platform built with React, TypeScript, Express, and PostgreSQL.

## Features

- Course creation and management
- Video lessons with YouTube integration
- Progress tracking and certificates
- AI-powered quiz generation
- Chat assistant for courses
- User authentication with Clerk

## Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd idea-canvas
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Variables**

   Copy `.env` and fill in the required values:

   ```env
   # Database
   DATABASE_URL=your_postgresql_connection_string

   # Clerk Authentication
   VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
   CLERK_SECRET_KEY=your_clerk_secret_key

   # YouTube API (for video information)
   YOUTUBE_API_KEY=your_youtube_api_key

   # OpenAI API (for AI features)
   OPENAI_API_KEY=your_openai_api_key

   # Development
   NODE_ENV=development
   VITE_API_URL=http://localhost:5000
   ```

4. **YouTube API Setup**

   To enable YouTube video information fetching:

   1. Go to [Google Cloud Console](https://console.cloud.google.com/)
   2. Create a new project or select existing one
   3. Enable YouTube Data API v3
   4. Create credentials (API Key)
   5. Add the API key to your `.env` file as `YOUTUBE_API_KEY`

   **Note**: If no YouTube API key is provided, the app will use mock data for video information.

5. **Database Setup**

   ```bash
   # Push database schema
   npm run db:push

   # Generate migrations (if needed)
   npx drizzle-kit generate
   npx drizzle-kit migrate
   ```

6. **Run the application**

   ```bash
   # Start server
   npm run dev:server

   # Start client (in another terminal)
   npm run dev:client
   ```

## API Endpoints

### YouTube Integration

- `POST /api/youtube/info` - Fetch video title, duration, and thumbnail from YouTube API

### Course Management

- `GET /api/courses` - Get public courses
- `POST /api/courses` - Create new course
- `GET /api/courses/:id` - Get course details

### Progress Tracking

- `POST /api/progress/:lessonId/watch-time` - Update watch time
- `POST /api/progress/:lessonId/complete` - Mark lesson complete

### Certificates

- `GET /api/certificates/my` - Get user's certificates
- `GET /api/certificates/:id/pdf` - Download certificate PDF

## Technologies Used

- **Frontend**: React, TypeScript, Tailwind CSS, TanStack Query
- **Backend**: Express.js, Node.js
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Clerk
- **APIs**: YouTube Data API v3, OpenAI API
- **Deployment**: Replit

## Development

The application uses:
- **Drizzle ORM** for type-safe database operations
- **Clerk** for authentication and user management
- **YouTube API** for video metadata (optional)
- **OpenAI** for AI-powered features (optional)

## License

MIT