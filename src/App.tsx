import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MinimalHomepage, MinimalReadingView } from './screens';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MinimalHomepage />} />
        <Route path="/reading" element={<MinimalReadingView />} />
        {/* Support the Vietnamese path from original stitch design links */}
        <Route path="/doc-sach-tap-trung" element={<Navigate to="/reading" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
