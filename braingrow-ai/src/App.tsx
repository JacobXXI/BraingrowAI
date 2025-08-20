import { Routes, Route } from 'react-router-dom';
import './App.css';
import Header from './structures/Header';
import Footer from './structures/Footer';
import { HomePage } from './HomePage';
import SearchPage from './SearchPage';
import LoginPage from './LoginPage';
import WatchPage from './WatchPage';
import ProfilePage from './ProfilePage';

function App() {
  return (
    <div className="app-container">
      <Header />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/watch/:id" element={<WatchPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App;