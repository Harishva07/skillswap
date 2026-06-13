# SkillSwap 🔄 – Peer-to-Peer Skill Exchange Platform

> Exchange skills, grow together — no money needed.

SkillSwap is a full-stack web application that enables users to exchange skills with each other without monetary transactions. Users can offer skills they know and request skills they want to learn, get matched with compatible peers, and collaborate through real-time chat.

---

## 🚀 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React.js (Vite), React Router v6, Socket.io-client, Axios |
| **Backend** | Node.js, Express.js, Socket.io |
| **Database** | MySQL |
| **Auth** | JWT (jsonwebtoken) + bcryptjs |
| **File Upload** | Multer |
| **Styling** | Vanilla CSS (custom design system) |

---

## 📁 Project Structure

```
skillswap/
├── backend/
│   ├── config/          # Database connection pool
│   ├── controllers/     # Business logic (8 controllers)
│   ├── middleware/       # JWT auth, admin auth, file upload
│   ├── models/           # SQL query helpers
│   ├── routes/           # Express routes (8 route files)
│   ├── uploads/          # Profile pictures
│   ├── .env              # Environment variables
│   ├── database.sql      # MySQL schema + sample data
│   ├── package.json
│   └── server.js         # Express + Socket.io server
│
└── frontend/skillswap-frontend/
    ├── src/
    │   ├── components/
    │   │   ├── Auth/      # ProtectedRoute
    │   │   ├── Layout/    # Sidebar, Navbar, Layout
    │   │   └── common/    # Toast, Modal, Pagination, Utils
    │   ├── context/       # AuthContext, ThemeContext
    │   ├── pages/         # All 12 page components
    │   │   └── admin/     # AdminDashboard
    │   ├── services/      # API service layer (axios)
    │   ├── App.jsx        # Router + providers
    │   └── main.jsx
    ├── index.html         # SEO-optimized HTML
    ├── package.json
    └── vite.config.js     # Dev server + API proxy
```

---

## ⚙️ Prerequisites

- **Node.js** v18 or higher
- **MySQL** v8 or higher (running locally)
- **npm** v9 or higher

---

## 🛠️ Setup Instructions

### Step 1: Clone / Open the Project

```bash
cd C:\Users\haris\.gemini\antigravity\scratch\skillswap
```

### Step 2: Set Up the Database

1. Open your MySQL client (MySQL Workbench, command line, etc.)
2. Run the database schema:

```sql
source backend/database.sql;
```

Or via command line:
```bash
mysql -u root -p < backend/database.sql
```

This creates the `skillswap_db` database with all 8 tables and sample data.

### Step 3: Configure Backend Environment

Edit `backend/.env` with your MySQL password:

```env
PORT=5000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password_here   ← Change this!
DB_NAME=skillswap_db
JWT_SECRET=skillswap_super_secret_jwt_key_2024_please_change
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173
```

### Step 4: Install & Start the Backend

```bash
cd backend
npm install
npm run dev
```

You should see:
```
✅ MySQL database connected successfully
🚀 SkillSwap API Server Started!
🌐 Server:   http://localhost:5000
```

### Step 5: Install & Start the Frontend

In a new terminal:

```bash
cd frontend/skillswap-frontend
npm install
npm run dev
```

You should see:
```
  VITE v5.x  ready in xxx ms
  ➜  Local:   http://localhost:5173/
```

### Step 6: Open the App

Visit **http://localhost:5173** in your browser.

---

## 🔐 Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| **User** | alice@example.com | Test@123 |
| **Admin** | admin@skillswap.com | Admin@123 |

---

## 🗄️ Database Schema

### Tables

| Table | Description |
|-------|-------------|
| `users` | User accounts with profile info, rating, admin flag |
| `skills` | Global skill catalog with categories |
| `user_skills` | User-skill associations (offered/wanted) |
| `exchange_requests` | Skill exchange requests between users |
| `messages` | Chat messages between users |
| `reviews` | Post-exchange ratings and comments |
| `notifications` | User notifications |
| `admin_logs` | Admin action audit trail |

---

## 🌐 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|---------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login, get JWT token |
| GET | /api/auth/me | Get current user (protected) |
| POST | /api/auth/change-password | Change password (protected) |

### Users
| Method | Endpoint | Description |
|--------|---------|-------------|
| GET | /api/users | Get all users (search/filter) |
| GET | /api/users/dashboard | Dashboard stats |
| GET | /api/users/matches | Smart skill matches |
| GET | /api/users/my-skills | Current user's skills |
| PUT | /api/users/profile | Update profile |
| POST | /api/users/avatar | Upload profile picture |
| POST | /api/users/skills | Add a skill |
| DELETE | /api/users/skills/:id | Remove a skill |
| GET | /api/users/:id | Get user by ID |

### Skills
| Method | Endpoint | Description |
|--------|---------|-------------|
| GET | /api/skills | Browse skills (search/category) |
| GET | /api/skills/popular | Top 10 skills |
| POST | /api/skills | Create skill |

### Exchanges
| Method | Endpoint | Description |
|--------|---------|-------------|
| GET | /api/exchanges | Get user's exchanges |
| POST | /api/exchanges | Send exchange request |
| GET | /api/exchanges/:id | Get specific exchange |
| PATCH | /api/exchanges/:id/status | Accept/reject/complete |

### Messages
| Method | Endpoint | Description |
|--------|---------|-------------|
| GET | /api/messages/conversations | List conversations |
| GET | /api/messages/unread/count | Unread count |
| GET | /api/messages/:userId | Get messages with user |
| POST | /api/messages | Send message |

### Reviews
| Method | Endpoint | Description |
|--------|---------|-------------|
| POST | /api/reviews | Create review |
| GET | /api/reviews/user/:userId | Get user's reviews |
| GET | /api/reviews/my-reviews | My given reviews |

### Notifications
| Method | Endpoint | Description |
|--------|---------|-------------|
| GET | /api/notifications | Get notifications |
| PATCH | /api/notifications/read-all | Mark all as read |
| PATCH | /api/notifications/:id/read | Mark one as read |

### Admin (requires is_admin)
| Method | Endpoint | Description |
|--------|---------|-------------|
| GET | /api/admin/stats | Platform analytics |
| GET | /api/admin/users | All users |
| PATCH | /api/admin/users/:id/block | Block/unblock user |
| DELETE | /api/admin/users/:id | Delete user |
| GET | /api/admin/skills | All skills |
| GET | /api/admin/exchanges | All exchanges |
| GET | /api/admin/logs | Admin logs |

---

## ✨ Features

### User Features
- ✅ Registration with 2-step wizard + validation
- ✅ JWT authentication with 7-day tokens
- ✅ Profile with picture upload, bio, location, experience level
- ✅ Add/remove skills (offered and wanted)
- ✅ Smart matching algorithm based on skill compatibility
- ✅ Send/accept/reject/complete exchange requests
- ✅ Real-time chat with Socket.io + typing indicators
- ✅ Star rating and review system
- ✅ Dashboard with stats and recent activity
- ✅ Toast notifications and modal dialogs
- ✅ Dark/Light mode toggle
- ✅ Fully responsive design

### Admin Features
- ✅ Platform-wide analytics
- ✅ User management (block/unblock/delete)
- ✅ Skill catalog management
- ✅ Exchange monitoring
- ✅ Admin activity logs

---

## 🎨 Design System

- **Font**: Inter (Google Fonts)
- **Primary Color**: `#2563EB` (Blue)
- **Accent Color**: `#7C3AED` (Purple)
- **Theme**: White/Blue professional with dark mode support
- **CSS Variables**: Full token system in `index.css`
- **Components**: Cards, badges, buttons, forms, modals, toasts, pagination

---

## 🔒 Security

- Passwords hashed with **bcrypt** (10 salt rounds)
- JWT tokens with expiry (7 days default)
- Protected routes with middleware
- Admin-only routes with extra guard
- SQL queries use parameterized statements (MySQL2)
- CORS configured for specific frontend origin
- File uploads validated (images only, 5MB max)
- Blocked users cannot login or access API

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## 📄 License

MIT License — free to use and modify.

---

Built with ❤️ by the SkillSwap Team
