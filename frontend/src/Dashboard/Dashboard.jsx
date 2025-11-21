const Dashboard = ({ user, onLogout }) => {
  return (
    <div className="dashboard">
      <nav className="sidebar">
        <div className="user-info">
          <h3>Bem-vindo,</h3>
          <p>{user.name}</p>
        </div>
        <button onClick={onLogout} className="logout-btn">Sair</button>
      </nav>
      <main className="content">
        <h1>Dashboard</h1>
        <p>Login efetuado com sucesso.</p>
      </main>
    </div>
  );
};

export default Dashboard;