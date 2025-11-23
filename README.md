# Synapse Server – Backend API for Student Alumni Networking Platform

The **Synapse Server** is the backend API powering the Synapse platform — a system that connects students and alumni through mentorship, messaging, events, jobs, and social features.  
This server handles authentication, role-based access, notifications, database operations, and all business logic that supports the platform.

Built with **Node.js**, **Express.js**, and **MongoDB**, the backend is optimized for performance, modularity, and secure API communication.

---

## 📑 Table of Contents

- [About the Backend](#-about-the-backend)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture Overview](#-architecture-overview)
- [Folder Structure](#-folder-structure)
- [Environment Variables](#-environment-variables)
- [Installation & Setup](#-installation--setup)
- [Available Scripts](#-available-scripts)
- [API Endpoints Overview](#-api-endpoints-overview)
- [Security & Best Practices](#-security--best-practices)
- [Deployment](#-deployment)
- [Future Enhancements](#-future-enhancements)
- [License](#-license)
- [Contact](#-contact)

---

## 🧩 About the Backend

The **Synapse Server** powers all core operations of the platform. It is responsible for:

- **Authentication** (JWT-based)  
- **User data** storage and retrieval  
- Managing **posts**, **comments**, and **connections**  
- Handling **mentorship workflows**  
- Delivering **real-time notifications**  
- Secure **admin operations**  
- Managing **events**, **jobs**, and **resources**  
- Supporting the **chat system**

The backend works efficiently with the frontend through a well-structured **REST API**.

---

## 🚀 Features

### **Core Server Features**

- Secure **JWT authentication**
- **Role-based authorization**
- Modular **REST API** architecture
- Optimized **MongoDB** queries
- **Input validation** middleware
- Clean and consistent **error handling**
- **CORS** and essential security middleware

### **Functional Modules**

- **User Management**
- **Posts & Comments**
- **Connections** (Request/Accept/Reject)
- **Mentorship Workflow**
- **Chat System**
- **Events**
- **Jobs**
- **Resources**
- **Admin Controls**
- **Notifications**

---

## 🛠 Tech Stack

### **Backend Framework**
- **Node.js**
- **Express.js**

### **Database**
- **MongoDB** (Atlas recommended)

### **Authentication & Security**
- **JWT-based authentication**
- **Helmet** for security headers
- **CORS** configuration
- **Rate limiting** for request protection
- **Cookie-parser** for handling HTTP-only cookies  
- **Environment variables** for secure config

### **Tools & Middleware**
- **Dotenv** for environment management
- **Morgan** for request logging
- **Firebase Admin SDK** *(if enabled for notifications or auth sync)*
- **Zod / Joi** for schema validation *(optional but supported)*
- **Custom error handlers** and structured middleware flow

---

## 🏗 Architecture Overview

The backend follows a **modular API-first architecture**:

- **Controllers** — Business logic  
- **Routes** — Endpoint definitions  
- **Middlewares** — Auth, validation, errors  
- **Models** — Database schemas  
- **Services** — Reusable logic  
- **Utils** — Helper functions  

This ensures clean scalability across modules.

---

## 📂 Folder Structure

```
synapse-server/
├── node_modules/       # Dependencies
├── routes/             # API route definitions
├── .env                # Environment variables
├── .gitignore          # Git ignore rules
├── db.js               # Database configuration
├── index.js            # Application entry point
├── LICENSE             # MIT License file
├── package-lock.json   # Dependency lock file
├── package.json        # Project dependencies and scripts
├── README.md           # Project documentation
└── vercel.json         # Vercel deployment configuration
```

---

## 🔐 Environment Variables

Create a `.env` file in the root:

```
DB_USER=
DB_PASSWORD=
ACCESS_TOKEN_SECRET=
```

---

## ⚙ Installation & Setup

### **1. Clone the Repository**

```
git clone https://github.com/Mehedi0101/synapse-server.git

cd synapse-server
```

### **2. Install Dependencies**

```
npm install
```

### **3. Add Environment Variables**

Create `.env` and fill in your values.

### **4. Start Development Server**

```
npm run dev
```

### **5. Start Production Server**

```
npm start
```


---

## 📜 Available Scripts

| Script                 | Description                                   |
| ---------------------- | --------------------------------------------- |
| `npm start`            | Run the server in production mode             |
| `npm test`             | Run tests (currently not configured)         |
| `node --watch index.js`| Run server in development mode with auto-reload|

---

## 🔗 API Endpoints Overview


### **Users Routes**

- **GET `/users/`** – Fetch all users with basic info, sorted by role.  

- **GET `/users/:userId`** – Fetch a user by their ID.  

- **POST `/users/email`** – Fetch a user by their email. 

- **GET `/users/available/:userId`** – Fetch users available for connection requests, excluding existing connections and admins. 

- **POST `/users/`** – Insert a new user. 

- **PATCH `/users/:userId`** – Update a user by ID.

- **DELETE `/users/:userId`** – Delete a user by ID.



### **Posts Routes**

- **GET `/posts/`** – Fetch all posts with author and comments info, sorted by newest first.

- **GET `/posts/author/:authorId`** – Fetch all posts by a specific author.  
- **POST `/posts/`** – Create a new post.

- **PATCH `/posts/:postId`** – Update a post content.
 
- **PATCH `/posts/comments/add/:postId`** – Add a comment to a post.

- **PATCH `/posts/comments/delete/:postId`** – Delete a comment from a post.

- **DELETE `/posts/:postId`** – Delete a post.

### **Connections Routes**

- **GET `/connections/received/:connectionId`** – Get all pending connection requests received by a user. Includes requester’s info (ID, name, department, role, avatar).

- **GET `/connections/sent/:userId`** – Get all pending connection requests sent by a user. Includes recipient’s info.

- **GET `/connections/accepted/:userId`** – Fetch all accepted connections for a user. Returns the other user’s info.

- **POST `/connections/`** – Send a new connection request. Automatically creates a notification for the recipient.

- **PATCH `/connections/accept`** – Accept a connection request. Updates status and creates a notification for the requester.

- **DELETE `/connections/:connectionId`** – Cancel a connection request or remove an existing connection.


### **Mentorships Routes**

- **GET `/mentorships/`** – Get all mentorship requests with mentor and student details.

- **GET `/mentorships/:id`** – Fetch details of a specific mentorship request, including mentor, student, and accepted mentorship count.

- **GET `/mentorships/student/:studentId`** – Get mentorship requests for a specific student (assigned, accepted, pending).

- **GET `/mentorships/mentor/:mentorId`** – Get mentorship requests for a specific mentor (assigned, accepted).

- **POST `/mentorships/`** – Create a new mentorship request. Requires `mentorId` and `studentId`.

- **PATCH `/mentorships/:id`** – Update mentorship status, steps, or current step. Sends notifications to related users based on status changes.

- **DELETE `/mentorships/:id`** – Remove a mentorship request.


### **Chat Routes**

- **GET `/chats/:userId`** – Fetch all chat summaries for a user

- **PATCH `/chats/read/:chatId/:userId`** – Mark all unread messages as read for a specific user in a chat.

### **Messages Routes**

- **GET `/messages/:userId/:friendId`** – Fetch all messages between two users. Returns an empty array if no chat exists.

- **POST `/messages/`** – Send a message between users. Automatically creates a chat if it doesn’t exist and updates `lastMessage`, `lastAt`, and `unreadCount`.


### **Events Routes**

- **GET `/events/`** – Fetch all events. Includes creator details and interested user count.

- **GET `/events/user/:userId`** – Get all events created by a specific user. Includes interested users and whether the current user is interested.

- **GET `/events/all/:userId`** – Fetch all events excluding those created by the specified user. Includes interested users and interest status.

- **GET `/events/details/:eventId?userId=<userId>`** – Get details of a single event. If `userId` is provided, returns whether the user is interested.

- **POST `/events/`** – Create a new event. Requires `creatorId`, `title`, `type`, `date`, and optional `banner`, `timeRange`, `location`.

- **PATCH `/events/:eventId`** – Update an event. Fields like `title`, `type`, `date`, etc. can be updated.

- **PATCH `/events/interested/:eventId`** – Toggle interest for a user on an event. Updates interested user list.

- **DELETE `/events/:eventId`** – Remove an event by ID.


### **Jobs Routes**

- **GET `/jobs/`** – Fetch all jobs along with author details.

- **GET `/jobs/:userId`** – Get all jobs excluding those posted by the specified user.

- **GET `/jobs/user/:userId`** – Get all jobs posted by a specific user.

- **GET `/jobs/details/:jobId`** – Fetch detailed information for a single job post, including author info.

- **POST `/jobs/`** – Create a new job post. Requires fields like `authorId`, `jobTitle`, `jobType`, `company`, etc.

- **PATCH `/jobs/:jobId`** – Update an existing job post.

- **DELETE `/jobs/:jobId`** – Delete a job post by ID.


### **Resources Routes**

- **GET `/resources/`** – Fetch all resources with author info, sorted by oldest first.  

- **GET `/resources/my/:userId`** – Fetch all resources contributed by a specific user.  

- **GET `/resources/all/:userId`** – Fetch all resources except those contributed by a specific user. 

- **GET `/resources/details/:resourceId`** – Fetch details of a specific resource.  

- **POST `/resources/`** – Insert a new resource.  

- **PATCH `/resources/:resourceId`** – Update a resource.  

- **DELETE `/resources/:resourceId`** – Delete a resource.


### **Admin Overview**

- **GET `/admin/overview`** – Fetches platform statistics for the dashboard (totals, user roles, job/event types, mentorship stats, top mentors, monthly connection growth).


### **Notifications Routes**

- **GET `/notifications/:userId`** – Fetch all notifications for a user, sorted by newest first.

- **POST `/notifications/`** – Add a new notification.

- **DELETE `/notifications/:userId`** – Delete all notifications for a user.

---

## 🔐 Security & Best Practices

- JWT-protected routes  
- Input validation  
- Rate limiting  
- Sanitized database operations  
- Centralized error handler  

---

## 🌐 Deployment

### **Hosting Platform**

- Frontend: **Firebase**
- Backend: **Vercel**
- Database: **MongoDB Atlas**

### **Production API Base URL**

```
https://synapse-server-flax.vercel.app/
```


---

## 📈 Future Enhancements

- Real-time WebSocket messaging  
- Redis caching  
- Improved analytics endpoints  
- Full Swagger documentation  
- Role-based endpoint restrictions (granular-level)  

---

## 📄 License

Licensed under the **MIT License**.

---

## 📬 Contact

**Developer:** Mehedi Hasan

### **Links:**

- GitHub: https://github.com/Mehedi0101
- LinkedIn: https://www.linkedin.com/in/mehedi0101/
- Email: mehedih2909@gmail.com
