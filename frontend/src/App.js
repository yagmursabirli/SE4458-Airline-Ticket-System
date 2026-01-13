import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Amplify } from 'aws-amplify';
import { getCurrentUser, fetchUserAttributes, fetchAuthSession, signOut } from 'aws-amplify/auth';
import awsConfig from './aws-config';

// Sayfalar
import Auth from './pages/Auth';
import SearchFlights from './pages/SearchFlights';
import Profile from './pages/Profile';
import AdminAddFlight from './pages/AdminAddFlight';
import Navbar from './components/Navbar';
import { Container, Box, Typography, Button } from '@mui/material';

Amplify.configure(awsConfig);

function App() {
  const [user, setUser] = useState(null);
  const [userEmail, setUserEmail] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const isAdminDomain = window.location.port === "3001";

  useEffect(() => {
    const checkUser = async () => {
      try {
        const currentUser = await getCurrentUser();
        const session = await fetchAuthSession();
        const attributes = await fetchUserAttributes();
        const groups = session.tokens?.accessToken?.payload['cognito:groups'] || [];
        const userIsAdmin = groups.includes('Admins');

        // KRİTİK KONTROL: Eğer admin portundaysak ama kullanıcı admin değilse logout yap
        if (isAdminDomain && !userIsAdmin) {
          console.warn("Admin olmayan kullanıcı admin portuna erişemez.");
          await handleLogout();
          return;
        }

        setUser(currentUser);
        setUserEmail(attributes.email || currentUser.username);
        setIsAdmin(userIsAdmin);
      } catch (err) {
        console.log("Oturum bulunamadı veya geçersiz.");
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkUser();
  }, [isAdminDomain]);

  const handleLoginSuccess = async (userData) => {
    try {
      const attributes = await fetchUserAttributes();
      const session = await fetchAuthSession();
      const groups = session.tokens?.accessToken?.payload['cognito:groups'] || [];
      const userIsAdmin = groups.includes('Admins');

      // Admin portunda giriş yapılıyorsa ama kullanıcı admin değilse engelle
      if (isAdminDomain && !userIsAdmin) {
        alert("Bu hesap yönetici yetkisine sahip değil!");
        await signOut();
        return;
      }

      setUser(userData);
      setUserEmail(attributes.email || userData.username);
      setIsAdmin(userIsAdmin);
    } catch (error) {
      console.error("Login attribute hatası:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      setUser(null);
      setUserEmail("");
      setIsAdmin(false);
      window.location.href = window.location.origin;
    } catch (error) {
      console.error("Çıkış hatası:", error);
    }
  };

  if (loading) return null;

  return (
    <Router>
      <Routes>
        {/* LOGIN KONTROLÜ: Eğer kullanıcı yoksa her zaman Auth (Login) sayfasını göster */}
        <Route path="/" element={
          !user ? (
            <Auth onLoginSuccess={handleLoginSuccess} />
          ) : (
            isAdminDomain ? (
              // ADMIN PORTU (3001) İÇERİĞİ
              isAdmin ? (
                <>
                  <Navbar onLogout={handleLogout} userEmail={userEmail} />
                  <Container sx={{ mt: 4 }}>
                    <Typography variant="h4" align="center" gutterBottom sx={{ fontWeight: 'bold' }}>
                      ADMIN FLIGHT MANAGEMENT
                    </Typography>
                    <AdminAddFlight />
                  </Container>
                </>
              ) : (
                <Navigate to="/" /> // Yetkisizse login'e at
              )
            ) : (
              // USER PORTU (3000) İÇERİĞİ
              <>
                <Navbar onLogout={handleLogout} userEmail={userEmail} />
                <Container sx={{ mt: 4 }}>
                  <Profile userEmail={userEmail} />
                  {/* Buraya SearchFlights bileşenini ekleyebilirsin */}
                </Container>
              </>
            )
          )
        } />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;