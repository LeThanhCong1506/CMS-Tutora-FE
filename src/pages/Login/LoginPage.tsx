import React from "react";
import LoginForm from "./LoginForm";

/**
 * Admin login page — centered card layout.
 * Không dùng login.css của repo gốc (vốn dành cho 2-column hero+form marketing).
 */
const LoginPage: React.FC = () => {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background:
          "radial-gradient(ellipse at top, #f2f0e4 0%, #fafaf5 45%, #ffffff 100%)",
        fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Subtle decorative accent — top left */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: "-120px",
          left: "-120px",
          width: "320px",
          height: "320px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(212, 180, 131, 0.18) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      {/* Subtle decorative accent — bottom right */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          bottom: "-140px",
          right: "-140px",
          width: "360px",
          height: "360px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(61, 74, 62, 0.12) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          width: "100%",
          maxWidth: "440px",
          display: "flex",
          flexDirection: "column",
          gap: "28px",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Brand header */}
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "72px",
              height: "72px",
              borderRadius: "20px",
              background: "#1a2238",
              marginBottom: "16px",
              boxShadow: "0 8px 24px rgba(26, 34, 56, 0.18)",
            }}
          >
            <img
              src="/tutora-logo.png"
              alt="Tutora"
              style={{ width: "40px", height: "40px" }}
            />
          </div>
          <h1
            style={{
              fontSize: "28px",
              fontFamily: "'Bricolage Grotesque', 'IBM Plex Sans', sans-serif",
              fontWeight: 700,
              color: "#1a2238",
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            Tutora Admin
          </h1>
          <p
            style={{
              fontSize: "14px",
              color: "#6b6b6b",
              margin: "6px 0 0",
              fontWeight: 400,
            }}
          >
            Cổng quản trị nội bộ
          </p>
        </div>

        {/* Login form card */}
        <div
          style={{
            background: "white",
            borderRadius: "16px",
            boxShadow:
              "0 4px 6px rgba(26, 34, 56, 0.04), 0 12px 32px rgba(26, 34, 56, 0.08)",
            padding: "32px",
            border: "1px solid rgba(26, 34, 56, 0.06)",
          }}
        >
          <LoginForm />
        </div>

        {/* Footer */}
        <p
          style={{
            textAlign: "center",
            fontSize: "12px",
            color: "#8a8a8a",
            margin: 0,
            fontWeight: 400,
          }}
        >
          © {new Date().getFullYear()} Tutora — Tutor Booking Platform
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
