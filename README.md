# NetWatch — Network Monitoring Trainer

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

**NetWatch** is an interactive network diagnosis training platform that teaches students and professionals how to monitor, analyze, and diagnose network incidents using real-world signals — without requiring prior networking infrastructure knowledge.

## 🎯 What Makes NetWatch Different

NetWatch focuses on **network monitoring and diagnosis**, not configuration or infrastructure building. Students learn to:
- Read and interpret telemetry data (latency, packet loss, CPU, throughput)
- Analyze network topology and device health
- Investigate packet captures and logs
- Connect multiple evidence sources to identify root causes
- Diagnose real-world network incidents through simulation

## 🚀 Features

### Two Learning Modes

#### 🎓 Teach Mode (Open Access)
- Explanations available for every device, metric, alert, and packet
- Self-check questions to confirm comprehension (ungraded)
- No login required
- Perfect for learning how to read network signals

#### 📝 Quiz Mode (Authenticated)
- Explanations hidden — investigate evidence independently
- Submit root-cause diagnosis from multiple-choice options
- Attempt-limited per scenario
- Results recorded server-side
- Requires student login

### Five Evidence Sources

Every network incident provides five complementary views:

1. **Topology** — Visual network map with real-time link health indicators
2. **Metrics** — Live telemetry charts (latency, packet loss, CPU, jitter, throughput)
3. **Alerts** — Timestamped event timeline with severity levels
4. **Packets** — Simulated packet captures with anomaly highlighting
5. **Logs** — Device-level timestamped events for incident reconstruction

### Interactive Dashboard

- Real-time network simulation engine
- Linux-inspired terminal aesthetic
- Light/dark theme support
- Responsive design
- Accessibility-compliant interface

## 📋 Prerequisites

- **Node.js** 18+ and **npm**
- **SQLite3** (bundled with Node.js)
- Modern web browser (Chrome, Firefox, Edge, Safari)

## 🔧 Installation

```powershell
# Clone the repository
git clone https://github.com/yourusername/netwatch.git
cd netwatch

# Install dependencies
npm install

# Initialize the database with sample data
npm run seed:student
```

## 🏃 Running the Application

### Development Mode (with auto-reload)
```powershell
npm run dev
```

### Production Mode
```powershell
npm start
```

The application will start on `http://localhost:3000`

## 📁 Project Structure

```
NetWatch/
├── backend/              # Express.js server
│   ├── routes/          # API endpoints (auth, admin, attempts, results)
│   ├── middleware/      # JWT authentication
│   ├── db.js           # SQLite database interface
│   ├── server.js       # Express app entry point
│   └── seed.js         # Database seeding script
├── src/                 # Frontend modules
│   ├── renderers/      # UI rendering components
│   ├── app.js          # Main application orchestrator
│   ├── auth.js         # Client-side authentication
│   ├── engine.js       # Network simulation engine
│   ├── lessons.js      # Lesson definitions and incident scripts
│   ├── scoring.js      # Quiz scoring logic
│   └── utils.js        # Shared utilities
├── public/
│   └── styles.css      # Application styles
├── tests/              # Vitest test suite
└── index.html          # Single-page application shell
```

## 🧪 Testing

```powershell
# Run all tests
npm test

# Run tests with coverage
npm run test -- --coverage
```

Test coverage includes:
- Backend API endpoints
- Simulation engine
- Scoring logic
- Authentication flows
- UI component rendering

## 🎓 Usage

### For Students

1. **Explore Teach Mode First** — Visit the landing page and click "Learn how it works"
2. **Select a Scenario** — Choose from available network incidents
3. **Watch the Incident Unfold** — Observe metrics, alerts, and device health in real-time
4. **Investigate Evidence** — Click on devices, alerts, and metrics for explanations
5. **Practice in Quiz Mode** — Log in and test your diagnostic skills

### For Instructors

1. **Access Admin Panel** — Click "Admin" in the footer
2. **Manage Students** — Add students, view results, reset attempts
3. **Monitor Progress** — Track student performance across scenarios
4. **Seed Instructor Account**:
   ```powershell
   npm run seed:instructor
   ```
   Default credentials: `instructor` / `instructor123`

## 🗃️ Database Schema

The application uses SQLite with three core tables:

- **users** — Student authentication and profiles
- **quiz_attempts** — Individual scenario attempts with timestamps
- **quiz_results** — Aggregate performance per student per lesson

## 🔐 Authentication

- **JWT-based** authentication with HttpOnly cookies
- **Bcrypt** password hashing
- Role-based access (student/instructor)
- Session persistence across browser restarts

## 🎨 Customization

### Adding New Scenarios

Edit `src/lessons.js` to define new network topologies and incident scripts:

```javascript
export const LESSONS = [
  {
    id: 'my-scenario',
    title: 'My Custom Scenario',
    topology: 'branch_office',
    difficulty: 'medium',
    skillCards: [...],
    incident: { /* scripted events */ },
    diagnoses: [...],
    correctIndex: 0
  }
];
```

### Styling

All styles are in `public/styles.css` with CSS custom properties for theming:

```css
:root {
  --accent: #4a9ebb;
  --warning: #c8893a;
  --critical: #c85a4a;
  /* ... */
}
```

## 🛠️ API Endpoints

### Authentication
- `POST /api/auth/login` — Student login
- `POST /api/auth/logout` — End session
- `GET /api/auth/status` — Check authentication

### Attempts & Results
- `POST /api/attempts/submit` — Submit quiz diagnosis
- `GET /api/attempts/check/:lessonId` — Check remaining attempts
- `GET /api/results` — Get student results summary

### Admin
- `POST /api/admin/students` — Add new student
- `GET /api/admin/students` — List all students
- `DELETE /api/admin/students/:id` — Remove student
- `POST /api/admin/reset-attempts` — Reset student attempts

## 🚦 Environment Variables

Create a `.env` file in the project root:

```env
# Server
PORT=3000
NODE_ENV=development

# JWT
JWT_SECRET=your-secret-key-here

# Database
DB_PATH=./netwatch.db
```

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

## 👤 Author

**IQBAL**

## 🙏 Acknowledgments

- Network simulation inspired by real-world NOC (Network Operations Center) workflows
- UI/UX design influenced by modern terminal aesthetics and monitoring dashboards
- Educational methodology based on evidence-based learning principles

## 📞 Support

For questions, issues, or feature requests:
- Open an issue on GitHub
- Contact: [iqbalinggil@gmail.com]

---

**NetWatch** — Stop reading about network failures. Learn to diagnose them.
