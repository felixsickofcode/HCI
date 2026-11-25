import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MinimalHomepage, MinimalReadingView, Auth, Vocabulary, PhonicsPracticeView, Library } from './screens';
import { PdfReview } from './dev/pdf-review/PdfReview';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MinimalHomepage />} />
        <Route path="/vocabulary" element={<Vocabulary />} />
        <Route path="/library" element={<Library />} />
        <Route path="/reading" element={<MinimalReadingView />} />
        <Route path="/phonics" element={<PhonicsPracticeView />} />
        <Route path="/phonics/:lessonId" element={<PhonicsPracticeView />} />
        {import.meta.env.DEV && <Route path="/dev/pdf-review" element={<PdfReview />} />}
        <Route path="/auth" element={<Auth key="auth" initialMode="login" />} />
        <Route path="/login" element={<Auth key="login" initialMode="login" />} />
        <Route path="/register" element={<Auth key="register" initialMode="register" />} />
        {/* Support the Vietnamese paths from design links */}
        <Route path="/doc-sach-tap-trung" element={<Navigate to="/reading" replace />} />
        <Route path="/hoc-da-giac-quan" element={<Navigate to="/phonics" replace />} />
        <Route path="/hoc-am" element={<Navigate to="/phonics" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
