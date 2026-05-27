import { BrowserRouter, Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";
import SpyGame from "./games/spy/SpyGame";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/spy" element={<SpyGame />} />
      </Routes>
    </BrowserRouter>
  );
}
