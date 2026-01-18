# 🚀 DSA Visualizer – Interactive Algorithm Learning Platform

A **world-class interactive DSA Visualizer** built to help students and developers **understand sorting and searching algorithms visually**, step by step, with smooth animations, real Python code execution, and fair algorithm comparison.

This project focuses on **clarity, correctness, and learning experience**, not just animations.

---

## ✨ Key Features

### 🎯 Algorithm Visualizations
**Sorting Algorithms**
- Bubble Sort
- Selection Sort
- Insertion Sort
- Merge Sort
- Quick Sort

**Searching Algorithms**
- Linear Search
- Binary Search

Each algorithm includes:
- Step-by-step execution
- Smooth animated indicators (compare, swap, pointers)
- Clear index visibility
- Stable UI during navigation

---

### 🧠 Learning Modes
- **Focus Mode**
  - One step at a time
  - Clean, distraction-free view
  - Best for beginners
- **Pictorial Mode**
  - Pass-wise + step-wise visualization
  - Same high-quality indicator animation as Focus Mode
  - Stable layout with guided auto-scroll

---

### 🔍 Debugger (Real Code)
- Displays **real Python code** for **all sorting and searching algorithms**
- Step-synced execution
- Highlights current executing lines
- Clean and readable for learning

❌ No pseudocode  
✅ Real Python implementations only

---

### ⚖️ Algorithm Comparison Mode
- Compare **Sorting vs Sorting** and **Searching vs Searching**
- Side-by-side **Focus-style visualization** (not confusing bar graphs)
- Fair comparison using:
  - Comparisons
  - Swaps
  - Passes
  - Relative Speed (`1x`, `1.25x`, etc.)
- **Fastest algorithm always sorts first**
- Correct tie handling (no false winners)

---

### 🎨 UI / UX Excellence
- Smooth Framer Motion animations
- Stable layout (no jumping or shifting)
- Clean, minimal, responsive design
- Fully optimized for:
  - Desktop
  - Tablet
  - Mobile

---

### 🌗 Dark & Light Mode
- Fully supported across:
  - Visualizer
  - Debugger
  - Comparison view
  - Preloader
- Theme preference persists automatically

---

### ⚡ World-Class Preloader
- Custom **DSA-themed animated preloader**
- Fast, attractive, and non-blocking
- Designed to impress users on every refresh
- Adaptive timing (never too slow)

---

## 🛠️ Tech Stack

### Frontend
- Next.js (App Router)
- React + TypeScript
- Tailwind CSS
- Framer Motion
- shadcn/ui

### Backend & Auth
- Next.js Route Handlers
- Auth.js (NextAuth)
- Google OAuth + Email/Password
- Prisma ORM
- PostgreSQL

---

## 🔐 Authentication & Access Control
- **Guest users**
  - Limited steps & passes
- **Logged-in users**
  - Full visualizer access
  - Full debugger access
  - Full comparison mode

---

## 📦 Installation & Setup

```bash
# Clone the repository
git clone https://github.com/<your-username>/algovista.git

# Install dependencies
npm install

# Run development server
npm run dev
