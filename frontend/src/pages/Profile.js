import React, { useState, useEffect } from 'react';
import { Container, Paper, Typography, Box, Divider, List, ListItem, ListItemText, Chip } from '@mui/material';
import axios from 'axios';

const Profile = ({ userEmail }) => {
    const [profileData, setProfileData] = useState({ milesBalance: 0, membershipType: 'Classic', bookings: [] });

 useEffect(() => {
    const fetchProfile = async () => {
        // Buradaki kontrol çok kritik
        if (!userEmail || userEmail === "" || userEmail === "undefined") {
            return;
        }

        try {
            const response = await axios.get(`http://localhost:5000/api/user/profile/${userEmail}`);
            setProfileData(response.data);
            console.log("Veriler başarıyla çekildi:", response.data);
        } catch (error) {
            console.error("Profil yüklenemedi", error);
        }
    };

    fetchProfile();
}, [userEmail]);
    return (
        <Container maxWidth="md" sx={{ mt: 5 }}>
            {/* Sadakat Kartı */}
            <Paper elevation={6} sx={{ p: 4, borderRadius: 4, background: 'linear-gradient(45deg, #1a237e 30%, #283593 90%)', color: 'white', mb: 4 }}>
                <Typography variant="h4">Miles & Smiles</Typography>
                <Typography variant="h6" sx={{ opacity: 0.8 }}>{profileData.membershipType} Member</Typography>
                <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <Box>
                        <Typography variant="body2">TOPLAM MİL</Typography>
                        <Typography variant="h3" sx={{ fontWeight: 'bold' }}>{profileData.milesBalance}</Typography>
                    </Box>
                    <Typography variant="h6">{userEmail}</Typography>
                </Box>
            </Paper>

            {/* Geçmiş Biletler */}
            <Typography variant="h5" gutterBottom>✈️ Seyahatlerim</Typography>
            <Paper sx={{ borderRadius: 3 }}>
                <List>
                    {profileData.bookings.length > 0 ? profileData.bookings.map((booking, index) => (
                        <React.Fragment key={booking.id}>
                            <ListItem sx={{ py: 2 }}>
                                <ListItemText 
                                    primary={`${booking.Flight.fromCity} ➔ ${booking.Flight.toCity}`}
                                    secondary={`Tarih: ${booking.Flight.flightDate} | Uçuş Kodu: ${booking.Flight.flightCode}`}
                                />
                                <Chip label={booking.status} color={booking.status === 'COMPLETED' ? 'success' : 'primary'} />
                            </ListItem>
                            {index < profileData.bookings.length - 1 && <Divider />}
                        </React.Fragment>
                    )) : (
                        <Typography sx={{ p: 3, textAlign: 'center' }}>Henüz bir biletiniz bulunmuyor.</Typography>
                    )}
                </List>
            </Paper>
        </Container>
    );
};

export default Profile;