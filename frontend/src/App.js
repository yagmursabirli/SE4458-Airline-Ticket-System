import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Amplify } from 'aws-amplify';
import { getCurrentUser, fetchUserAttributes, fetchAuthSession } from 'aws-amplify/auth';
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
  const [isAdmin, setIsAdmin] = useState(false); // Admin durumu için state
  const [loading, setLoading] = useState(true);

  const isAdminDomain = window.location.port === "3001";

  useEffect(() => {
    const checkUser = async () => {
      try {
        const currentUser = await getCurrentUser();
        const attributes = await fetchUserAttributes();
        
        // Rol Kontrolü: Sayfa yenilendiğinde Cognito gruplarına tekrar bakıyoruz
        const session = await fetchAuthSession();
        const groups = session.tokens?.accessToken?.payload['cognito:groups'] || [];
        
        setUser(currentUser);
        setUserEmail(attributes.email || currentUser.username);
        setIsAdmin(groups.includes('Admins')); // 'Admins' grubundaysa true
      } catch (err) {
        console.log("Oturum yok");
      } finally {
        setLoading(false);
      }
    };
    checkUser();
  }, []);

  const handleLoginSuccess = async (userData) => {
    try {
      const attributes = await fetchUserAttributes();
      const email = attributes.email || userData?.signInDetails?.loginId || userData?.username;
      
      // Auth.js'den gelen isAdmin verisini kullanıyoruz
      setUser(userData);
      setUserEmail(email);
      setIsAdmin(userData.isAdmin || false); 
      
      console.log("Giriş başarılı. Admin Yetkisi:", userData.isAdmin);
    } catch (error) {
      setUser(userData);
      setIsAdmin(userData.isAdmin || false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setUserEmail("");
    setIsAdmin(false);
    window.location.reload(); 
  };

  if (loading) return null;

  // --- ADMIN DOMAIN (PORT 3001) MANTIĞI ---
  if (isAdminDomain) {
    return (
      <Router>
        <Routes>
          <Route path="/" element={
            !user ? (
              <Auth onLoginSuccess={handleLoginSuccess} />
            ) : (
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
                <Box sx={{ p: 5, textAlign: 'center' }}>
                  <Typography variant="h5" color="error" gutterBottom>
                    YETKİSİZ ERİŞİM
                  </Typography>
                  <Typography sx={{ mb: 2 }}>
                    Bu alan sadece yönetici yetkisine sahip kullanıcılar içindir.
                  </Typography>
                  <Button variant="contained" onClick={handleLogout}>Çıkış Yap ve Geri Dön</Button>
                </Box>
              )
            )
          } />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    );
  }

  // --- USER DOMAIN (PORT 3000) MANTIĞI ---
  return (
    <Router>
      <Routes>
        <Route path="/" element={
          !user ? (
            <Auth onLoginSuccess={handleLoginSuccess} />
          ) : (
            <>
              <Navbar onLogout={handleLogout} userEmail={userEmail} />
              <Container sx={{ mt: 4 }}>
                <Profile userEmail={userEmail} />
                <Box sx={{ my: 4 }} />
                <SearchFlights userEmail={userEmail} />
              </Container>
            </>
          )
        } />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;