# Daily Tracker Dashboard

A full-stack personal productivity web app to track your daily tasks and habits, and see your progress through charts.

🔗 **Live demo:** [add your Render.com link here]

![Dashboard screenshot](./screenshots/dashboard.png)
<!-- Add 1-2 screenshots in a /screenshots folder and update the path above -->

## Features

- 🔐 Secure signup and login with JWT authentication
- ✅ Add, update and delete daily tasks / entries
- 📊 Progress charts built with Chart.js
- 👤 Each user sees only their own data
- ☁️ Data stored in MongoDB Atlas
- 🚀 Deployed on Render.com

<!-- Edit this list to match exactly what your app does -->

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | HTML, CSS, Vanilla JavaScript, Chart.js |
| Backend | Node.js, Express.js |
| Database | MongoDB Atlas (Mongoose) |
| Auth | JSON Web Tokens (JWT), bcrypt password hashing |
| Hosting | Render.com |

## Project Structure

```
daily-tracker/
├── public/          # Frontend (HTML, CSS, JS)
├── routes/          # API routes
├── models/          # MongoDB schemas
├── middleware/      # Auth middleware
├── server.js        # Entry point
├── .env.example     # Sample environment variables
└── package.json
```

<!-- Adjust folder names to match your repo -->

## Getting Started

### Prerequisites

- Node.js (v18 or above)
- A MongoDB Atlas account (free tier works)

### Installation

```bash
# 1. Clone the repo
git clone https://github.com/<your-username>/<repo-name>.git
cd <repo-name>

# 2. Install dependencies
npm install

# 3. Create your .env file
cp .env.example .env
```

### Environment Variables

Add these to your `.env` file:

```
MONGO_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_long_random_secret
PORT=5000
```

> ⚠️ Never commit your real `.env` file. It is listed in `.gitignore`.

### Run the app

```bash
npm start
```

Open `http://localhost:5000` in your browser.

## API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create a new account |
| POST | `/api/auth/login` | Login and receive a JWT |
| GET | `/api/...` | Fetch the user's entries |
| POST | `/api/...` | Add a new entry |
| PUT | `/api/.../:id` | Update an entry |
| DELETE | `/api/.../:id` | Delete an entry |

<!-- Replace /api/... with your actual routes -->

## Deployment

The app is deployed on Render.com. To deploy your own copy:

1. Push the repo to GitHub
2. Create a new **Web Service** on Render and connect the repo
3. Set the build command to `npm install` and the start command to `npm start`
4. Add `MONGO_URI` and `JWT_SECRET` in Render's environment settings

## Future Improvements

- [ ] Streaks and reminders
- [ ] Weekly / monthly reports
- [ ] Dark mode
- [ ] Mobile-friendly PWA

## Contributing

Suggestions and pull requests are welcome. Please open an issue first to discuss what you would like to change.

## Author

**Srishti**
B.Tech CSE, United College of Engineering and Research, Prayagraj
[GitHub](https://github.com/<your-username>) · [LinkedIn](https://linkedin.com/in/<your-username>)
