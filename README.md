# Task Manager App

A full-stack task management app built with **Spring Boot** and **React**. Users register, log in, and manage a personal task list with support for custom categories. All data is persisted to a **PostgreSQL** database (hosted on Supabase) and is fully scoped to the authenticated user.

🔗 **[Live Demo](https://task-manager-app-iota-pied.vercel.app)**

---

## Features

- User registration and login with BCrypt password hashing
- JWT authentication — stateless, token-based sessions (24h expiry)
- Full CRUD for tasks and categories
- Tag tasks with multiple categories using a **bitmask system** — each user can have up to 32 categories, each mapped to a bit position, so category membership is stored as a single integer on the task
- Filter tasks by category with **Any** or **All** match modes
- Paginated task list (5 per page)
- All data is user-scoped — no cross-user data access
- React frontend with a dark-themed UI and inline editing
- CORS configured to support both local dev and the deployed frontend URL via environment variable

---

## Tech Stack

**Backend**
- Java 17
- Spring Boot
- Spring Security (stateless JWT via custom `JwtFilter`)
- Spring Data JPA
- PostgreSQL (Supabase)
- Lombok

**Frontend**
- React (Vite)
- Axios
- Inline CSS with a shared theme object

**Deployment**
- Frontend: Vercel (`VITE_API_URL` env var points to backend)
- Backend: configured via `app.frontend.url` env var for CORS

---

## How the Category System Works

Rather than storing a join table of task-category relationships, each task stores a single `categoryMask` integer. Each category has a `slot` (0–31), and that slot corresponds to a bit position in the mask.

For example, if a user has categories at slots 0, 2, and 4, and a task belongs to the first two:

```
categoryMask = 0b00000101  →  slots 0 and 2 are set
```

Checking membership is a simple bitwise AND, and the frontend uses this for filtering with both "Any" (OR logic) and "All" (AND logic) modes. Up to 32 categories per user are supported.

---

## Project Structure

```
TaskManagerApp/
├── backend/
│   └── src/main/java/com/example/demo/
│       ├── config/
│       │   ├── JwtFilter.java          # Validates JWT on every request
│       │   └── SecurityConfig.java     # Spring Security + CORS config
│       ├── controller/
│       │   ├── AuthController.java     # /auth/register, /auth/login
│       │   ├── TaskController.java     # /tasks CRUD
│       │   └── CategoryController.java # /categories CRUD
│       ├── service/
│       │   ├── UserService.java
│       │   ├── TaskService.java
│       │   └── CategoryService.java
│       ├── repository/
│       │   ├── UserRepository.java
│       │   ├── TaskRepository.java
│       │   └── CategoryRepository.java
│       ├── model/
│       │   ├── User.java
│       │   ├── Task.java
│       │   └── Category.java
│       └── dto/
│           ├── LoginRequest.java
│           ├── TaskRequest.java
│           └── CategoryRequest.java
└── frontend/
    └── src/
        └── App.jsx
```

---

## API Endpoints

### Auth
| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| POST | `/auth/register` | No | Register a new user |
| POST | `/auth/login` | No | Log in, receive JWT |

### Tasks
| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | `/tasks` | Yes | Get all tasks for current user |
| POST | `/tasks` | Yes | Create a new task |
| PUT | `/tasks/{id}` | Yes | Update a task (ownership verified) |
| DELETE | `/tasks/{id}` | Yes | Delete a task (ownership verified) |

### Categories
| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | `/categories` | Yes | Get all categories for current user |
| POST | `/categories` | Yes | Create a category (max 32) |
| PUT | `/categories/{id}` | Yes | Rename a category (ownership verified) |
| DELETE | `/categories/{id}` | Yes | Delete a category (ownership verified) |

---

## Running Locally

### Prerequisites
- Java 17+
- Node.js 18+
- Maven
- A PostgreSQL database (or Supabase project)

### Backend

Configure your database connection via environment variables or `application.properties`:

```properties
spring.datasource.url=${DATABASE_URL}
spring.datasource.username=${DATABASE_USERNAME}
spring.datasource.password=${DATABASE_PASSWORD}
spring.jpa.hibernate.ddl-auto=update

app.frontend.url=http://localhost:5173
```

Then run:

```bash
cd backend
./mvnw spring-boot:run
```

The API will be available at `http://localhost:8080`.

### Frontend

Create a `.env` file in the frontend directory:

```
VITE_API_URL=http://localhost:8080
```

Then run:

```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## Data Models

**User** — `users` table

| Field | Type |
|-------|------|
| id | Long (auto) |
| username | String |
| password | String (BCrypt hashed) |

**Task** — `tasks` table

| Field | Type | Notes |
|-------|------|-------|
| id | Long (auto) | |
| title | String | |
| description | String | |
| completed | boolean | |
| categoryMask | int | Bitmask of assigned category slots |
| user | User | ManyToOne |

**Category** — `categories` table

| Field | Type | Notes |
|-------|------|-------|
| id | Long (auto) | |
| name | String | |
| slot | int | 0–31, maps to a bit in task's categoryMask |
| user | User | ManyToOne |
