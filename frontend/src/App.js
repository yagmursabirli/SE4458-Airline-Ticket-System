import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Amplify } from 'aws-amplify';
import { fetchUserAttributes, fetchAuthSession, signOut } from 'aws-amplify/auth';
import awsConfig from './aws-config';

import Auth from './pages/Auth';
import Profile from './pages/Profile';
import AdminAddFlight from './pages/AdminAddFlight';
import Navbar from './components/Navbar';

import { Container, Typography } from '@mui/material';

Amplify.configure(awsConfig);

function App() {
  const [user, setUser] = useState(null);
  const [userEmail, setUserEmail] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const isAdminDomain = window.location.port === "3001";

 useEffect(() => {
  const forceLogoutOnLoad = async () => {
    try {
      await signOut({ global: true });
    } catch (e) {

    } finally {
      setLoading(false);
    }
  };

  forceLogoutOnLoad();
}, []);


  const handleLoginSuccess = async (userData) => {
    try {
      const attributes = await fetchUserAttributes();
      const session = await fetchAuthSession();
      const groups = session.tokens?.accessToken?.payload['cognito:groups'] || [];
      const userIsAdmin = groups.includes('Admins');

      if (isAdminDomain && !userIsAdmin) {
        alert("Bu hesap yönetici yetkisine sahip değil!");
        await signOut({ global: true });
        return;
      }

      setUser(userData);
      setUserEmail(attributes.email || userData.username);
      setIsAdmin(userIsAdmin);
    } catch (error) {
      console.error("Login sonrası hata:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut({ global: true });
      setUser(null);
      setUserEmail("");
      setIsAdmin(false);
      window.location.reload();
    } catch (error) {
      console.error("Çıkış hatası:", error);
    }
  };

  if (loading) return null;

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            !user ? (

              <Auth onLoginSuccess={handleLoginSuccess} />
            ) : isAdminDomain ? (

              isAdmin ? (
                <>
                  <Navbar onLogout={handleLogout} userEmail={userEmail} />
                  <Container sx={{ mt: 4 }}>
                    <Typography
                      variant="h4"
                      align="center"
                      gutterBottom
                      sx={{ fontWeight: 'bold' }}
                    >
                      ADMIN FLIGHT MANAGEMENT
                    </Typography>
                    <AdminAddFlight />
                  </Container>
                </>
              ) : (
                <Navigate to="/" />
              )
            ) : (

              <>
                <Navbar onLogout={handleLogout} userEmail={userEmail} />
                <Container sx={{ mt: 4 }}>
                  <Profile userEmail={userEmail} />
                </Container>
              </>
            )
          }
        />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
