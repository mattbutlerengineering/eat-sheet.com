import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Container } from '@mantine/core';
import RestaurantPage from '@/pages/RestaurantPage';
import MenuPage from '@/pages/MenuPage';
import HomePage from '@/pages/HomePage';

function App() {
  return (
    <BrowserRouter>
      <Container size="xl" p="md">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/:restaurantSlug" element={<RestaurantPage />} />
          <Route path="/:restaurantSlug/:menuSlug" element={<MenuPage />} />
        </Routes>
      </Container>
    </BrowserRouter>
  );
}

export default App;
