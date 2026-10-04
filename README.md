# SharedGoal

> A collaborative money-pooling platform that makes collecting, tracking, and managing shared contributions simple, transparent, and organized.

[![Live Website](https://img.shields.io/badge/Live%20Website-sharedgoal.vercel.app-7C3AED?style=for-the-badge)](https://sharedgoal.vercel.app)
[![GitHub](https://img.shields.io/badge/GitHub-Darpan0710%2FSharedGoal-181717?style=for-the-badge&logo=github)](https://github.com/Darpan0710/SharedGoal)

---

## 🌐 Live Demo

### [Visit SharedGoal →](https://sharedgoal.vercel.app)

---

## 📖 About The Project

SharedGoal is a collaborative money-pooling web application designed for situations where multiple people need to contribute money toward a common goal.

Whether it is collecting money for a birthday gift, wedding, farewell, trip, college event, festival, or helping someone in need, SharedGoal brings the entire process into one organized platform.

Instead of managing contributions through WhatsApp groups, spreadsheets, messages, and manual calculations, users can create a goal, invite contributors, track progress, manage contributions, and make group decisions from a single place.

---

## 🎯 Problem Statement

Collecting money from multiple people is often difficult to manage.

Common problems include:

- Tracking who has contributed and who has not
- Manually calculating the collected amount
- Losing contribution information in chats
- Managing group decisions for gifts
- Sharing payment or contribution details
- Finding trustworthy requests from people who need financial help
- Keeping everything organized in one place

SharedGoal aims to solve these problems through a simple collaborative platform.

---

## 💡 Solution

SharedGoal provides a centralized platform where users can:

1. Create a shared financial goal
2. Set a target amount and deadline
3. Invite people using a shareable link
4. Allow contributors to submit contributions
5. Confirm contributions before they are counted
6. Track the progress of the goal
7. Add and vote on gift suggestions
8. Finalize group decisions
9. Create and discover verified Help Someone requests
10. Manage help-request verification through an admin panel

---

## ✨ Features

### 🎯 Shared Goals

Create a goal for different occasions such as:

- Birthday
- Wedding
- Trip
- Farewell
- College Event
- Office Collection
- Festival
- Charity
- Medical Help
- Custom occasions

Each goal can include:

- Goal name
- Description
- Target amount
- Deadline
- Contribution settings
- Public or private visibility
- Members and contributors
- Contribution progress

---

### 🔐 Authentication

- Google Authentication through Supabase
- Secure user sessions
- Automatic profile creation
- OAuth state restoration
- Goal creation progress is preserved when authentication is required
- Help Request creation progress is also preserved during authentication

---

### 👥 Goal Members

SharedGoal supports collaborative participation through:

- Goal Creator
- Group Admins
- Contributors
- Viewers

Creators can share their goals using a simple invitation link.

---

### 💰 Contributions

Contributors can submit money toward a shared goal.

The system supports:

- Contribution amount tracking
- Contribution status
- Pending contributions
- Creator confirmation
- Confirmed contribution tracking
- Automatic progress calculation
- Contribution history
- Activity tracking

A contribution is only counted toward the goal after it has been confirmed by the appropriate creator.

---

### 🎁 Group Gift Decisions

For goals involving gifts, members can collaborate on the final choice.

Features include:

- Add gift suggestions
- Maximum suggestion limits
- Vote on suggestions
- Maximum voting limits
- Group approval threshold
- Creator-controlled finalization
- Selected gift tracking
- Finalized decision state

---

### ❤️ Help Someone

SharedGoal also provides a dedicated section for verified help requests.

Users can create requests for categories such as:

- Education
- Medical
- Basic Needs
- Assistance
- Other support requirements

Help requests include:

- Title
- Category
- Story
- Target amount
- Deadline
- Contribution progress
- Verification status

Only verified requests are publicly displayed.

---

### 🛡️ Admin Verification

The platform includes a dedicated admin verification panel.

Administrators can:

- View pending Help Someone requests
- Review request details
- Approve requests
- Verify requests before public visibility

Once a request is verified:

- It is stored as `Verified`
- It becomes visible on the public Help Someone page
- It is removed from the pending verification queue

Admin access is restricted to authorized administrator accounts.

---

### 🖼️ Dynamic Visuals

The application uses category and occasion based imagery.

Examples include:

- Birthday → Birthday artwork
- Wedding → Wedding artwork
- Trip → Travel artwork
- Farewell → Farewell artwork
- College Event → College artwork
- Festival → Festival artwork
- Education → Education artwork
- Medical → Medical artwork
- Basic Needs → Basic Needs artwork
- Assistance → Assistance artwork

This keeps the interface visually relevant to the user's goal or request.

---

### 📱 Responsive Design

SharedGoal is designed to work across:

- Desktop
- Laptop
- Tablet
- Mobile devices

The interface adapts layouts, cards, forms, navigation, and content for different screen sizes.

---

## 🧭 User Flow

### Create a Shared Goal

```text
Choose Occasion
      ↓
Enter Goal Details
      ↓
Set Target & Deadline
      ↓
Choose Contribution & Visibility
      ↓
Google Login
      ↓
Invite Members
      ↓
Review Goal
      ↓
Create SharedGoal
```

### Contribute to a Goal

```text
Open SharedGoal
      ↓
Join using Share Link
      ↓
Login
      ↓
View Goal
      ↓
Submit Contribution
      ↓
Creator Confirms Contribution
      ↓
Goal Progress Updates
```

### Help Someone

```text
Create Help Request
      ↓
Google Login
      ↓
Submit Request
      ↓
Admin Review
      ↓
Verification
      ↓
Public Help Someone Page
      ↓
Contributors Can Help
      ↓
Request Creator Confirms Contribution
```

---

## 🛠️ Tech Stack

### Frontend

- HTML5
- CSS3
- JavaScript

### Backend & Database

- Supabase
- PostgreSQL
- Supabase Authentication
- Row Level Security (RLS)
- PostgreSQL RPC Functions

### Admin Module

- PHP
- MySQL
- phpMyAdmin
- XAMPP

### Deployment

- Vercel
- GitHub

### Development Tools

- VS Code
- Git
- GitHub

---

## 🏗️ Project Architecture

```text
SharedGoal
│
├── Frontend
│   ├── HTML
│   ├── CSS
│   └── JavaScript
│
├── Supabase
│   ├── Authentication
│   ├── PostgreSQL Database
│   ├── Row Level Security
│   └── RPC Functions
│
├── Admin Module
│   ├── PHP
│   ├── MySQL
│   └── Verification Panel
│
└── Deployment
    ├── GitHub
    └── Vercel
```

---

## 📁 Project Structure

```text
SharedGoal/
│
├── admin/
│   ├── admin.php
│   ├── database.sql
│   └── style.css
│
├── assets/
│   └── images/
│
├── css/
│   └── style.css
│
├── js/
│   └── script.js
│
├── .gitignore
├── help.html
├── index.html
└── my-goals.html
```

---

## 🚀 Getting Started

### Prerequisites

Make sure you have:

- XAMPP
- Apache
- A Supabase project
- Git
- A modern web browser

### Installation

Clone the repository:

```bash
git clone https://github.com/Darpan0710/SharedGoal.git
```

Move the project into the XAMPP `htdocs` directory:

```text
C:\xampp\htdocs\SharedGoal
```

Start Apache from XAMPP.

Open the application:

```text
http://localhost/SharedGoal/
```

Open the Admin Panel:

```text
http://localhost/SharedGoal/admin/admin.php
```

Supabase configuration is required for authentication, database operations, and application functionality.

---

## 🔐 Security

SharedGoal uses multiple security mechanisms including:

- Supabase Authentication
- Row Level Security
- Database-level authorization
- Creator-only operations
- Contribution confirmation rules
- Restricted admin access
- Secure RPC functions
- Environment variables for sensitive configuration

Sensitive credentials are intentionally excluded from the GitHub repository.

---

## ☁️ Deployment

The production version of SharedGoal is deployed on Vercel.

### Production URL

**https://sharedgoal.vercel.app**

The project is connected to GitHub for deployment.

```text
GitHub
   ↓
SharedGoal Repository
   ↓
Vercel
   ↓
Production Website
```

---

## 🎓 Project Context

SharedGoal was developed as a Computer Science and Engineering project with the goal of building a practical collaborative financial platform using modern web technologies.

The project focuses on:

- Full-stack web development
- Authentication
- Database design
- Authorization
- Secure data access
- Collaborative workflows
- Responsive UI/UX
- Deployment
- Real-world problem solving

---

## 👨‍💻 Developers

### Darpan H. Jhaveri & Preksha Gajjar

Computer Science & Engineering  
Indus University

GitHub: [@Darpan0710](https://github.com/Darpan0710)

---

## 📄 License

This project is developed for educational and portfolio purposes.

---

<p align="center">
  Made with ❤️ by Darpan H. Jhaveri & Preksha Gajjar
</p>
