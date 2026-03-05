import { HashRouter, Routes, Route } from 'react-router-dom';
import RsvpPage from './pages/RsvpPage';
import AdminPage from './pages/AdminPage';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<RsvpPage />} />
        <Route path="/admin-for-sam" element={<AdminPage />} />
      </Routes>
    </HashRouter>
  );
}
