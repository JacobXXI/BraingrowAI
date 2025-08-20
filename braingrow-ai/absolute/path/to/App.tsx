import { Routes, Route } from 'react-router-dom';
import WatchPage from './WatchPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/search" element={<SearchPage />} />
      <Route path="/watch" element={<WatchPage />} />
    </Routes>
  );
}