# Design Guidelines: YouTube Course Platform

## Design Approach

**Reference-Based:** Drawing from leading e-learning platforms (Udemy, Coursera, Skillshare) for familiarity, combined with modern SaaS aesthetics (Linear, Notion) for the dashboard and administrative interfaces.

**Core Principle:** Educational clarity with visual polish—prioritize content discoverability and learning flow while maintaining professional, trustworthy aesthetics that encourage course purchases.

---

## Typography System

**Font Family:**
- Primary: Inter (headings, UI elements, navigation)
- Secondary: System fonts for body text (optimal reading)

**Type Scale:**
- Hero headlines: text-5xl to text-6xl, font-bold
- Page titles: text-3xl to text-4xl, font-semibold
- Section headers: text-2xl, font-semibold
- Card titles: text-lg, font-semibold
- Body text: text-base, font-normal
- Metadata/captions: text-sm, font-medium
- Timestamps/labels: text-xs, font-medium, uppercase tracking-wide

---

## Layout System

**Spacing Primitives:** Use Tailwind units of **2, 4, 6, 8, 12, 16** for consistent rhythm
- Component padding: p-4 to p-8
- Section spacing: py-12 to py-20
- Card gaps: gap-6 to gap-8
- Container max-width: max-w-7xl

**Grid Strategy:**
- Marketplace: 3-column grid (lg:grid-cols-3, md:grid-cols-2, sm:grid-cols-1)
- Dashboard: 2-column split for stats/recent activity
- Course player: Fixed 60/40 split (not responsive - maintains aspect)

---

## Component Library

### Navigation
**Top Navigation Bar:**
- Fixed header with logo (left), search bar (center), user menu + "Create Course" CTA (right)
- Height: h-16
- Transparent on marketing pages, solid on app pages
- Dropdown mega-menu for "Browse Categories"

### Marketplace & Discovery
**Course Cards:**
- Thumbnail image (16:9 aspect ratio, rounded-lg)
- Overlay gradient for instructor name/rating at bottom
- Price badge (top-right corner with subtle backdrop-blur)
- Hover: subtle lift (transform scale-105) with shadow increase
- Content: Course title (2-line clamp), instructor, rating stars, enrollment count, price

**Hero Section (Marketing):**
- Full-width background with subtle gradient overlay
- Large hero image showcasing learning/students
- Centered headline (text-5xl) + subheadline + dual CTAs
- Search bar embedded in hero ("What do you want to learn?")
- Trust indicators below: "10,000+ courses" "50,000+ learners" stats

**Category Grid:**
- 6-column icon grid for popular categories
- Each: rounded icon container, category name, course count

### Course Player Interface (Core Experience)

**Split-Pane Layout:**
- Left (60%): YouTube embed fills height, controls below (mark complete, add note, playback speed)
- Right (40%): Tabbed interface with fixed height, scrollable content
  - Tab 1: Course Outline (accordion sections → lessons)
  - Tab 2: AI Assistant (chat interface)
  - Tab 3: Practice Quiz (question cards)
  - Tab 4: Notes & Resources

**Course Outline Accordion:**
- Section headers: bold, with completion progress (e.g., "3/5 completed")
- Lesson items: indented, checkbox for completion, duration badge, active state highlight
- Clickable to jump to video timestamp

**AI Assistant Chat:**
- Message bubbles (user: right-aligned, AI: left-aligned)
- Source citations below AI responses (clickable timestamp links)
- Input field at bottom with "Ask a question..." placeholder
- Auto-scroll to latest message

**Quiz Interface:**
- Question cards with radio buttons (MCQ) or text input (short answer)
- Submit button, immediate feedback (correct/incorrect indicators)
- Score display with retry option

### Dashboard ("My Learnings")

**Stats Overview:**
- 4-column card grid: Enrolled courses, Completed, Hours watched, Certificates earned
- Each card: large number (text-4xl), label, icon

**Course Progress Cards:**
- Horizontal card layout: thumbnail (left), title + progress bar + "Continue" button (right)
- Progress bar with percentage label
- Last watched timestamp

### Course Creation Flow

**Multi-Step Form:**
- Progress indicator (steps: Add Videos → Course Details → Sections → Review)
- URL input field with "+ Add another" button
- Drag-and-drop reordering for videos
- AI section suggestion button (generates recommended sections)
- Thumbnail upload with preview
- Rich text editor for description
- Tag input with autocomplete
- Price selector with "Free" toggle

### Admin Approval Interface

**Review Queue Table:**
- Columns: Thumbnail preview, Course title, Creator, Submitted date, Status, Actions
- Filter tabs: Pending, Approved, Rejected
- Expandable rows showing full course details
- Approve/Reject buttons with feedback modal

### Certificate Generation
- PDF preview modal before download
- Professional template with platform branding, course name, learner name, completion date, unique ID
- "Download PDF" and "Share" buttons

---

## Images

**Hero Section:** Use inspiring education imagery—students collaborating, online learning setup, or abstract knowledge visualization. Full-width background image with gradient overlay for text readability.

**Course Thumbnails:** 16:9 aspect ratio placeholders showcasing course topics (photography, coding, design). Use high-quality stock images until user uploads.

**Empty States:** Illustration-based placeholders for "No courses yet" (marketplace), "Start your first course" (dashboard).

**Category Icons:** Simple line icons for each course category (Design, Development, Business, etc.).

---

## Interaction Patterns

**Minimal Animation:**
- Hover states: subtle scale (1.02) and shadow transitions
- Page transitions: fade-in only, no elaborate animations
- Loading states: skeleton screens for course cards, spinner for AI responses
- Smooth scroll to sections when clicking outline items

**Sticky Elements:**
- Top navigation remains fixed
- Course player remains in viewport on scroll (right pane scrolls independently)

---

## Accessibility Standards

- Keyboard navigation for all interactive elements
- Focus indicators with visible outline (ring-2 ring-offset-2)
- ARIA labels for icons and interactive elements
- Video player controls accessible via keyboard
- High contrast text (WCAG AA minimum)
- Form validation with clear error messages

---

## Responsive Breakpoints

- Desktop (lg: 1024px+): Full split-pane course player
- Tablet (md: 768px): Stacked course player (video top, outline bottom)
- Mobile (base): Single column, collapsible sections, simplified navigation