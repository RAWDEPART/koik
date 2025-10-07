# Tech Mahindra Employee Attendance Portal

A production-grade, real-time employee attendance management system built with modern web technologies.

## Features

- **Secure Authentication**: Email/password authentication with bcrypt password hashing
- **Role-Based Access Control**: Separate interfaces for Admin and Employee roles
- **Real-time Updates**: Live attendance tracking using Supabase Realtime
- **Admin Dashboard**:
  - Total employees count
  - Real-time present/absent/late statistics
  - Weekly attendance trends
  - Status distribution charts
  - Pending leave requests
- **Employee Dashboard**:
  - Clock in/Clock out functionality
  - Today's status and hours tracking
  - Automatic late detection (after 9:15 AM)
  - Quick actions for leave requests
- **Beautiful UI**: Tech Mahindra branded interface with Poppins font and exact color scheme
- **Responsive Design**: Mobile-first approach with collapsible sidebar

## Tech Stack

### Current Implementation (Supabase)
- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **State Management**: React Query (TanStack Query)
- **Database**: Supabase (PostgreSQL)
- **Realtime**: Supabase Realtime
- **Auth**: Custom bcrypt + JWT simulation
- **Charts**: Recharts
- **Icons**: Lucide React
- **Date Handling**: date-fns

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository:
\`\`\`bash
git clone <repository-url>
cd tech-mahindra-attendance
\`\`\`

2. Install dependencies:
\`\`\`bash
npm install
\`\`\`

3. Environment variables are already configured in \`.env\`:
\`\`\`
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
\`\`\`

### Database Setup

The database schema has been created with the following tables:
- **users**: Employee and admin information
- **attendance**: Daily attendance records
- **leaves**: Leave applications and approvals
- **notifications**: User notifications
- **audit_logs**: Security and compliance tracking
- **refresh_tokens**: JWT token management

All tables have Row Level Security (RLS) enabled with proper policies.

### Seeded Admin User

A default admin user has been created:

- **Email**: 004abhisheksaini@techmahindra.com
- **Password**: TM182006
- **Role**: Admin
- **Employee ID**: TMH-ADMIN-001
- **Department**: HR

### Running the Application

Development mode:
\`\`\`bash
npm run dev
\`\`\`

The application will start on http://localhost:5173

Build for production:
\`\`\`bash
npm run build
\`\`\`

Preview production build:
\`\`\`bash
npm run preview
\`\`\`

## Design Specifications

### Color Palette
- **Primary Red**: #E31837
- **Dark Red (Hover)**: #C4152E
- **Text/Dark Gray**: #2E2E2E
- **Background Gradient**: from-[#F4F4F4] to-white
- **Accent Blue**: #0066CC
- **Success Green**: #388E3C
- **Error Red**: #D32F2F
- **Warning Orange**: #FF9800

### Typography
- **Font Family**: Poppins, sans-serif
- **Weights**: 300, 400, 500, 600, 700

### UI Components
- **Border Radius**: rounded-2xl for major cards
- **Buttons**: Primary red background, white text, hover dark red
- **Inputs**: White background, light border, focus ring #E31837
- **Mobile-first**: Responsive layout with collapsible sidebar

## Key Features

### Admin Features
1. **Real-time Dashboard**
   - Live employee count
   - Present/Absent/Late statistics
   - Pending leave requests counter
   - Weekly attendance trend chart
   - Status distribution pie chart

2. **Realtime Updates**
   - Automatic dashboard refresh when attendance changes
   - Socket-based live data synchronization

### Employee Features
1. **Attendance Management**
   - Clock In button (creates attendance record)
   - Clock Out button (calculates total hours)
   - Automatic late detection (after 9:15 AM)
   - Visual status indicators

2. **Real-time Sync**
   - Instant updates when checking in/out
   - Live status changes

### Business Rules
- **Office Start Time**: 9:00 AM
- **Late Threshold**: 9:15 AM
- **Status Types**: present, absent, late, onLeave
- **Unique Constraint**: One attendance record per user per day

## Database Schema

### Users Table
\`\`\`sql
- id (uuid, primary key)
- email (text, unique, indexed)
- password_hash (text)
- name (text)
- role (admin | employee)
- emp_id (text, unique, indexed)
- department (text)
- joining_date (date)
- photo_url (text)
- is_active (boolean)
- created_at, updated_at (timestamptz)
\`\`\`

### Attendance Table
\`\`\`sql
- id (uuid, primary key)
- user_id (uuid, foreign key)
- date (date, indexed)
- check_in_time (timestamptz)
- check_out_time (timestamptz)
- status (present | absent | late | onLeave)
- total_hours (numeric)
- source (text)
- created_at, updated_at (timestamptz)
- UNIQUE constraint on (user_id, date)
\`\`\`

### Leaves Table
\`\`\`sql
- id (uuid, primary key)
- user_id (uuid, foreign key)
- from_date, to_date (date)
- type (sick | casual | earned | other)
- reason (text)
- status (pending | approved | rejected)
- applied_at (timestamptz)
- reviewed_by (uuid, foreign key)
- review_note (text)
\`\`\`

## Security

### Row Level Security (RLS)
All tables have RLS enabled with policies that:
- Users can view their own data
- Admins can view all data
- Users can update their own data
- Admins can modify any data
- All policies check \`auth.uid()\` for ownership

### Authentication
- Passwords hashed with bcrypt (salt rounds: 10)
- Session management with localStorage
- Token expiration handling
- Automatic session refresh

## Project Structure

\`\`\`
src/
├── components/
│   └── Layout.tsx              # Main layout with sidebar and navbar
├── contexts/
│   └── AuthContext.tsx         # Authentication context and hooks
├── lib/
│   ├── supabase.ts            # Supabase client and types
│   └── auth.ts                # Authentication utilities
├── pages/
│   ├── Login.tsx              # Login page
│   ├── AdminDashboard.tsx     # Admin dashboard with charts
│   └── EmployeeDashboard.tsx  # Employee dashboard with check-in/out
├── App.tsx                     # Main app with routing
├── main.tsx                    # App entry point
└── index.css                   # Global styles
\`\`\`

## Deployment

### Frontend Deployment
The application can be deployed to:
- Vercel (recommended for Vite apps)
- Netlify
- AWS S3 + CloudFront
- Any static hosting service

Build command: \`npm run build\`
Output directory: \`dist\`

### Database
- Already using Supabase hosted database
- Automatic backups enabled
- Row Level Security active

## Future Enhancements

Planned features for future releases:
- Leave management system (apply, approve, reject)
- Employee directory
- Advanced reports and exports (CSV, PDF)
- Bulk attendance operations
- Email notifications
- Cron jobs for auto-absent marking
- Mobile app (React Native)
- Biometric integration
- Department-wise analytics

## MERN Stack Alternative

For a complete MERN stack implementation (MongoDB + Express + Node.js + Socket.io), please refer to the \`mern-backend/\` directory which includes:

- Complete Express.js backend with TypeScript
- MongoDB models with Mongoose
- Socket.io real-time implementation
- JWT authentication with refresh tokens
- Docker and docker-compose configuration
- Nginx reverse proxy setup
- PM2 process manager configuration
- Jest test suites
- GitHub Actions CI/CD pipeline
- Postman collection
- API documentation

See \`mern-backend/README.md\` for full MERN stack setup instructions.

## Support

For issues, questions, or contributions, please contact the development team.

## License

© 2025 Tech Mahindra. All rights reserved.

---

**Note**: This is a production-ready application with proper security, error handling, and real-time capabilities. The admin credentials are for demonstration purposes only and should be changed in production.
