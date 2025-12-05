# LearnTube - YouTube Course Platform

## Overview

LearnTube is a platform that transforms collections of YouTube videos into structured online courses, similar to Udemy. Creators can paste YouTube URLs, organize them into sections, generate AI-powered practice questions, and monetize their curated content. Learners can browse, purchase, and complete courses with features like progress tracking, RAG-based AI assistance, and certificate generation.

The platform operates on a marketplace model where:
- **Creators** curate YouTube content into courses and submit them for approval
- **Learners** browse, purchase/enroll in courses, and track their learning progress
- **Admins** review and approve submitted courses before they appear in the marketplace

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- **Framework**: React with TypeScript
- **Routing**: Wouter (lightweight client-side routing)
- **State Management**: TanStack Query (React Query) for server state
- **UI Components**: Shadcn UI (Radix UI primitives) with Tailwind CSS
- **Styling**: Tailwind CSS with custom design tokens

**Design Philosophy:**
- Reference-based design inspired by e-learning platforms (Udemy, Coursera) and modern SaaS aesthetics (Linear, Notion)
- Component library built on Radix UI primitives for accessibility
- Responsive layouts with defined breakpoints (mobile-first approach)
- Custom spacing primitives using Tailwind units (2, 4, 6, 8, 12, 16)

**Key Frontend Patterns:**
- Client-side routing with protected routes based on authentication state
- Optimistic UI updates with React Query mutations
- Form validation using React Hook Form with Zod schemas
- Theme system supporting light/dark modes with CSS variables
- Toast notifications for user feedback

**Page Structure:**
- Public pages: Landing, Marketplace, Course Details, Certificate viewer
- Authenticated pages: Dashboard, Course Player, Create Course, My Courses, Admin Panel
- Conditional rendering based on user authentication and role

### Backend Architecture

**Technology Stack:**
- **Runtime**: Node.js with Express.js
- **Database**: PostgreSQL via Drizzle ORM
- **Session Management**: Express sessions with PostgreSQL store (connect-pg-simple)
- **Authentication**: Passport.js session-based authentication
- **Build Tool**: ESBuild for server bundling, Vite for client bundling

**API Design:**
- RESTful API with `/api/*` prefix
- Session-based authentication (cookies, no JWT)
- Role-based access control (user, instructor, admin roles)
- Middleware for authentication checks (`isAuthenticated`, `isAdmin`)

**Database Schema Strategy:**
- Drizzle ORM for type-safe database queries
- Schema-first approach with TypeScript types generated from schema
- Core entities: users, courses, sections, lessons, enrollments, progress tracking, quizzes, certificates, transactions
- Relationships: courses → sections → lessons (hierarchical), enrollments linking users to courses

**Key Architectural Decisions:**

1. **Session Storage**: PostgreSQL-backed sessions instead of in-memory for production scalability
   - Pros: Persistent across server restarts, works in distributed environments
   - Cons: Additional database queries for session validation

2. **ORM Choice**: Drizzle instead of Prisma/TypeORM
   - Rationale: Lightweight, SQL-like syntax, better TypeScript inference
   - Trade-off: Less mature ecosystem but better performance

3. **Monolithic Structure**: Single repository with client/server/shared folders
   - Client: React application (Vite build)
   - Server: Express API (ESBuild bundle)
   - Shared: Common types, schemas, validation logic
   - Benefit: Shared TypeScript types between frontend/backend

4. **Build Strategy**: 
   - Development: Vite dev server with middleware mode for HMR
   - Production: Client built to `dist/public`, server bundled to `dist/index.cjs`
   - Allowlist for server dependencies to bundle (reduces cold start time)

5. **Static File Serving**: Express serves pre-built client from `dist/public` in production
   - SPA fallback to index.html for client-side routing

### Data Storage

**Primary Database**: PostgreSQL
- Connection pooling via `pg` library
- Schema migrations managed by Drizzle Kit
- Schema location: `shared/schema.ts`

**Database Tables:**
- `sessions`: Session storage for authentication
- `users`: User accounts with role-based permissions
- `courses`: Course metadata (title, description, pricing, status, instructor)
- `sections`: Course sections grouping related lessons
- `lessons`: Individual YouTube videos with metadata
- `enrollments`: User course enrollments with progress tracking
- `lesson_progress`: Per-lesson completion tracking
- `quizzes`: Practice tests for courses
- `questions`: Quiz questions with answers
- `quiz_attempts`: Student quiz submission records
- `chat_messages`: RAG-based AI assistant conversation history
- `certificates`: Generated completion certificates
- `transactions`: Payment/enrollment records

**Data Relationships:**
- Users → Courses (instructor relationship)
- Courses → Sections → Lessons (content hierarchy)
- Users → Enrollments → Courses (student learning)
- Enrollments → Lesson Progress (tracking)
- Courses → Quizzes → Questions (assessment)

### External Dependencies

**Required Services:**
- **PostgreSQL Database**: Primary data store (configured via `DATABASE_URL` environment variable)

**Optional Integrations** (functionality degrades gracefully without):
- **OpenAI API**: For AI-powered features (transcript analysis, question generation, RAG chat assistance)
  - Used in: Course section splitting, practice question generation, AI course assistant
  - Configured via: `OPENAI_API_KEY` environment variable
  - Fallback: Features disabled or manual alternatives available

**Development Tools:**
- **Replit Plugins**: Dev banner, runtime error overlay, cartographer (development only)

**Frontend Libraries:**
- **Radix UI**: Headless component primitives for accessible UI
- **TanStack Query**: Server state management and caching
- **Wouter**: Lightweight routing (alternative to React Router)
- **React Hook Form + Zod**: Form management and validation
- **Tailwind CSS**: Utility-first styling framework

**Backend Libraries:**
- **Drizzle ORM**: Type-safe database queries
- **Express**: Web framework
- **Passport.js**: Authentication middleware
- **Connect-pg-simple**: PostgreSQL session store

**Build Dependencies:**
- **Vite**: Frontend build tool and dev server
- **ESBuild**: Server bundling for production
- **TSX**: TypeScript execution for development server

**Authentication Flow:**
- Session-based authentication (no external OAuth currently, but extensible via Passport strategies)
- Sessions stored in PostgreSQL for persistence
- User object serialized/deserialized in session

**Payment Processing**: 
- Architecture supports Stripe integration (referenced in requirements)
- Not fully implemented in current codebase

**AI Features Dependency**:
- Optional OpenAI integration for enhanced features
- Platform functional without AI (creators can manually organize content)
- When enabled: automated section splitting, question generation, RAG-based chat