import React from 'react';
import LoginForm from './LoginForm';
import '../../styles/pages/login.css';

const LoginPage: React.FC = () => {
  return (
    <main className="login-page">
      <section className="login-panel" aria-label="Đăng nhập quản trị">
        <header className="login-brand">
          <img className="login-brand__logo" src="/tutora-logo.png" alt="" />
          <p className="login-brand__name">Cổng quản trị viên Tutora</p>
        </header>

        <div className="login-card">
          <LoginForm />
        </div>
      </section>
    </main>
  );
};

export default LoginPage;
