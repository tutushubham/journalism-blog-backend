# Blog Backend API

Express.js backend for the Medium-style blog application with PostgreSQL database and JWT authentication.

## 📋 Features

- **Authentication**: JWT-based authentication with secure password hashing
- **Posts Management**: Full CRUD operations for blog posts with slug generation
- **Comments System**: Nested commenting with user attribution
- **Likes System**: Toggle-based post likes with statistics
- **Image Upload**: Cloudinary integration with local fallback
- **Search**: Full-text search across posts
- **Pagination**: Efficient pagination for all list endpoints
- **Error Handling**: Comprehensive error handling and logging

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- Cloudinary account (optional, will use local storage if not configured)

### Installation

```bash
# Clone the repository
cd backend

# Install dependencies
npm install

# Copy environment file
cp env.example .env

# Configure your .env file
nano .env
```

### Environment Configuration

Create a `.env` file in the backend directory:

```env
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/blog_db

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# Server Configuration
PORT=5000
NODE_ENV=development

# CORS Configuration
FRONTEND_URL=http://localhost:3000

# Cloudinary Configuration (Optional)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Upload Configuration
MAX_FILE_SIZE=5242880
ALLOWED_IMAGE_TYPES=image/jpeg,image/png,image/webp
```

### Database Setup

1. **Create PostgreSQL Database**:
   ```sql
   CREATE DATABASE blog_db;
   ```

2. **Run the Application**:
   ```bash
   npm start
   ```

   The application will automatically create all necessary tables on first run.

### Development

```bash
# Run in development mode with auto-restart
npm run dev

# Check logs
tail -f logs/app.log  # if logging to file
```

## 📁 Project Structure

```
backend/
├── controllers/         # Route controllers
│   ├── authController.js
│   ├── postController.js
│   ├── commentController.js
│   ├── likeController.js
│   └── uploadController.js
├── middleware/          # Custom middleware
│   ├── auth.js
│   └── errorHandler.js
├── models/             # Data models
│   ├── User.js
│   ├── Post.js
│   ├── Comment.js
│   └── Like.js
├── routes/             # API routes
│   ├── auth.js
│   ├── posts.js
│   ├── comments.js
│   ├── likes.js
│   └── uploads.js
├── utils/              # Utility functions
│   ├── db.js
│   ├── logger.js
│   └── upload.js
├── uploads/            # Local file storage
├── server.js           # Server entry point
├── package.json
└── README.md
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get current user profile
- `PUT /api/auth/profile` - Update user profile
- `PUT /api/auth/change-password` - Change password
- `DELETE /api/auth/account` - Delete account

### Posts
- `GET /api/posts` - Get all published posts
- `GET /api/posts/trending` - Get trending posts
- `GET /api/posts/:identifier` - Get post by ID or slug
- `POST /api/posts` - Create new post (auth required)
- `PUT /api/posts/:id` - Update post (owner only)
- `DELETE /api/posts/:id` - Delete post (owner only)
- `PATCH /api/posts/:id/publish` - Toggle publish status (owner only)

### Comments
- `GET /api/comments/post/:postId` - Get comments for post
- `POST /api/comments/post/:postId` - Create comment (auth required)
- `PUT /api/comments/:id` - Update comment (owner only)
- `DELETE /api/comments/:id` - Delete comment (owner only)

### Likes
- `POST /api/likes/post/:postId/toggle` - Toggle like (auth required)
- `GET /api/likes/post/:postId/count` - Get like count
- `GET /api/likes/post/:postId/check` - Check if user liked post

### Uploads
- `POST /api/uploads/image` - Upload single image (auth required)
- `POST /api/uploads/images` - Upload multiple images (auth required)
- `DELETE /api/uploads/image` - Delete image (auth required)

## 🗄️ Database Schema

### Users Table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  avatar_url VARCHAR(500),
  bio TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Posts Table
```sql
CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  excerpt TEXT,
  body TEXT NOT NULL,
  image_url VARCHAR(500),
  slug VARCHAR(255) UNIQUE NOT NULL,
  tags TEXT[],
  published BOOLEAN DEFAULT false,
  views INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Comments Table
```sql
CREATE TABLE comments (
  id SERIAL PRIMARY KEY,
  post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Likes Table
```sql
CREATE TABLE likes (
  id SERIAL PRIMARY KEY,
  post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(post_id, user_id)
);
```

## 🚀 Deployment

### Railway Deployment

1. **Create Railway Account**: Sign up at [railway.app](https://railway.app)

2. **Deploy from GitHub**:
   ```bash
   # Connect your GitHub repository
   # Railway will auto-detect Node.js and deploy
   ```

3. **Add Environment Variables**:
   - Add all variables from your `.env` file
   - Railway provides PostgreSQL database automatically

4. **Database Migration**:
   ```bash
   # Tables are created automatically on first run
   ```

### Render Deployment

1. **Create Render Account**: Sign up at [render.com](https://render.com)

2. **Create PostgreSQL Database**:
   - Go to Dashboard → New → PostgreSQL
   - Copy the connection string

3. **Deploy Web Service**:
   - Go to Dashboard → New → Web Service
   - Connect your GitHub repository
   - Set build command: `npm install`
   - Set start command: `npm start`
   - Add environment variables

### Local PostgreSQL Setup

```bash
# Install PostgreSQL (macOS)
brew install postgresql
brew services start postgresql

# Create database
createdb blog_db

# Connect and verify
psql blog_db
```

## 🔐 Security Features

- **Password Hashing**: bcryptjs with salt rounds
- **JWT Authentication**: Secure token-based auth
- **Input Validation**: Comprehensive request validation
- **SQL Injection Prevention**: Parameterized queries
- **CORS Configuration**: Controlled cross-origin requests
- **File Upload Security**: Type and size validation

## 📊 Performance Optimizations

- **Database Indexing**: Optimized indexes for common queries
- **Connection Pooling**: PostgreSQL connection pool
- **Query Optimization**: Efficient JOIN operations
- **Pagination**: Limit large dataset queries
- **Image Optimization**: Automatic Cloudinary transformations

## 🐛 Debugging

### Enable Debug Logging
```bash
NODE_ENV=development npm start
```

### Common Issues

1. **Database Connection Fails**:
   - Check DATABASE_URL format
   - Verify PostgreSQL is running
   - Check firewall settings

2. **JWT Token Issues**:
   - Verify JWT_SECRET is set
   - Check token expiration
   - Ensure Authorization header format

3. **File Upload Fails**:
   - Check Cloudinary credentials
   - Verify file size limits
   - Check allowed file types

### Health Check

```bash
curl http://localhost:5000/health
```

## 📝 Testing

```bash
# Manual testing with curl
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123"}'

# Use Postman collection (see ../postman_collection.json)
```

## 🤝 Contributing

1. Follow the existing code style
2. Add tests for new features
3. Update documentation
4. Use meaningful commit messages

## 📄 License

MIT License - see LICENSE file for details. 