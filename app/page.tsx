"use client";

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  MessageSquare,
  Clock,
  Shield,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="landing-container">
      {/* Hero Section */}
      <nav className="nav glass">
        <div className="nav-content">
          <span className="logo gradient-text">Colab</span>
          <div className="nav-links">
            <Link href="/login" className="nav-link">
              Sign In
            </Link>
            <Link href="/register" className="primary-btn">
              Join Now
            </Link>
          </div>
        </div>
      </nav>

      <main>
        <section className="hero">
          <div className="hero-content">
            <h1 className="hero-title">
              The Next Generation of <br />
              <span className="gradient-text">Collaborative Execution</span>
            </h1>
            <p className="hero-subtitle">
              Manage tasks, track time, and communicate with your team in one
              beautiful, unified workspace. Built for high-performance teams.
            </p>
            <div className="hero-actions">
              <Link href="/app" className="hero-primary-btn">
                Launch Workspace <ArrowRight size={20} />
              </Link>
              <button className="hero-secondary-btn">View Demo</button>
            </div>
          </div>

          <div className="hero-preview glass">
            <div className="preview-header">
              <div className="dots">
                <div className="dot red" />
                <div className="dot yellow" />
                <div className="dot green" />
              </div>
              <div className="url-bar">colab-manager.io/app/engineering</div>
            </div>
            <div className="preview-body">
              <div className="preview-sidebar" />
              <div className="preview-content">
                <div className="preview-card" />
                <div className="preview-card" />
                <div className="preview-card" />
              </div>
            </div>
          </div>
        </section>

        <section className="features">
          <div className="feature-grid">
            <div className="feature-card glass">
              <div className="feature-icon">
                <CheckCircle2 />
              </div>
              <h3>Smart Tasks</h3>
              <p>
                Kanban boards with real-time updates and smart prioritization.
              </p>
            </div>
            <div className="feature-card glass">
              <div className="feature-icon">
                <MessageSquare />
              </div>
              <h3>Team Chat</h3>
              <p>Contextual messaging built directly into your workflow.</p>
            </div>
            <div className="feature-card glass">
              <div className="feature-icon">
                <Clock />
              </div>
              <h3>Time Tracking</h3>
              <p>Seamlessly track time spent on every task and project.</p>
            </div>
            <div className="feature-card glass">
              <div className="feature-icon">
                <Shield />
              </div>
              <h3>Secure Files</h3>
              <p>
                Enterprise-grade file management with local or cloud storage.
              </p>
            </div>
          </div>
        </section>
      </main>

      <style jsx>{`
        .landing-container {
          min-height: 100vh;
          background: #0f172a;
          color: white;
          overflow-x: hidden;
        }
        .nav {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 100;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        .nav-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 1rem 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .logo {
          font-size: 1.5rem;
          font-weight: 800;
        }
        .nav-links {
          display: flex;
          align-items: center;
          gap: 2rem;
        }
        .nav-link {
          color: #94a3b8;
          transition: color 0.2s;
        }
        .nav-link:hover {
          color: white;
        }
        .hero {
          padding: 10rem 2rem 5rem;
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 4rem;
        }
        .hero-title {
          font-size: 4.5rem;
          font-weight: 800;
          line-height: 1.1;
          margin-bottom: 1.5rem;
        }
        .hero-subtitle {
          font-size: 1.25rem;
          color: #94a3b8;
          max-width: 700px;
          margin: 0 auto 2.5rem;
        }
        .hero-actions {
          display: flex;
          gap: 1rem;
          justify-content: center;
        }
        .hero-primary-btn {
          padding: 1rem 2rem;
          background: var(--primary);
          color: white;
          border-radius: 0.5rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          transition: transform 0.2s;
        }
        .hero-primary-btn:hover {
          transform: translateY(-2px);
        }
        .hero-secondary-btn {
          padding: 1rem 2rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: white;
          border-radius: 0.5rem;
          font-weight: 600;
        }
        .hero-preview {
          width: 100%;
          max-width: 1000px;
          aspect-ratio: 16/10;
          border-radius: 1rem;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          display: flex;
          flex-direction: column;
        }
        .preview-header {
          padding: 0.75rem 1rem;
          background: rgba(255, 255, 255, 0.05);
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }
        .dots {
          display: flex;
          gap: 0.5rem;
        }
        .dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }
        .red {
          background: #ef4444;
        }
        .yellow {
          background: #f59e0b;
        }
        .green {
          background: #22c55e;
        }
        .url-bar {
          background: rgba(0, 0, 0, 0.2);
          padding: 0.25rem 1rem;
          border-radius: 0.25rem;
          font-size: 0.75rem;
          color: #64748b;
          flex: 1;
          max-width: 400px;
        }
        .preview-body {
          flex: 1;
          display: flex;
        }
        .preview-sidebar {
          width: 200px;
          background: rgba(255, 255, 255, 0.02);
          border-right: 1px solid rgba(255, 255, 255, 0.05);
        }
        .preview-content {
          flex: 1;
          padding: 2rem;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
        }
        .preview-card {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 0.5rem;
          height: 200px;
        }
        .features {
          padding: 5rem 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }
        .feature-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 2rem;
        }
        .feature-card {
          padding: 2.5rem;
          border-radius: 1rem;
          transition: transform 0.2s;
        }
        .feature-card:hover {
          transform: translateY(-5px);
        }
        .feature-icon {
          width: 48px;
          height: 48px;
          background: rgba(139, 92, 246, 0.1);
          color: var(--primary);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.5rem;
        }
        .feature-card h3 {
          font-size: 1.25rem;
          font-weight: 700;
          margin-bottom: 1rem;
        }
        .feature-card p {
          color: #94a3b8;
          line-height: 1.6;
        }
        .primary-btn {
          padding: 0.625rem 1.25rem;
          background: var(--primary);
          color: white;
          border-radius: 0.5rem;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}
