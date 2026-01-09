**Survey Application – Full Stack Project**

A Full Stack Survey & Feedback Application that allows users to create surveys, collect responses, and analyze results in real time.
This project demonstrates end-to-end development using React, FastAPI (Python), MongoDB, JWT authentication, real-time updates, and data visualization.

🚀 Features
🔐 Authentication

User registration and login
JWT-based authentication
Protected routes for survey creation and analytics

📋 Survey Management

Create surveys with custom questions
Supported question types:
Multiple Choice
Short Answer
Long Answer
Shareable survey links

📝 Response Collection

Users can submit survey responses
Secure storage of responses
Real-time response updates using WebSockets

📊 Analytics Dashboard

Total number of responses
Question-wise analytics
Graphical representation using Chart.js
Live response tracking (real-time)

🔄 Real-Time Updates

Live response count updates using Socket.io
Automatic dashboard refresh on new submissions

🛠️ Tech Stack:

Frontend:

React.js
Axios
Chart.js
Socket.io-client
Tailwind CSS / CSS

Backend:

Python (FastAPI)
JWT Authentication
Socket.io
RESTful APIs
Database: MongoDB

Version Control:
Git & GitHub

📂 Project Structure:
survey-app/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── App.js
│
├── backend/
│   ├── main.py
│   ├── auth.py
│   ├── survey.py
│   ├── response.py
│   └── database.py
│
└── README.md
