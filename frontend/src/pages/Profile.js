import React, { useState, useEffect } from 'react';
import { 
    Container, Paper, Typography, Box, Divider, List, ListItem, 
    ListItemText, Chip, Button, Grid, TextField, MenuItem, 
    FormControlLabel, Checkbox 
} from '@mui/material';
import axios from 'axios';
import SearchFlights from './SearchFlights'; // Dosyayı import ediyoruz

const Profile = ({ userEmail }) => {
    const [profileData, setProfileData] = useState({ milesBalance: 0, membershipType: null, bookings: [] });
    const [searchParams, setSearchParams] = useState({
        from: '', to: '', date: '', passengers: 1, flexible: false, directOnly: false
    });
    const [results, setResults] = useState([]);

    const fetchProfile = async () => {
        if (!userEmail || userEmail === "" || userEmail === "undefined") return;
        try {
            const response = await axios.get(`http://localhost:8080/api/v1/user/profile/${userEmail}`);
            setProfileData(response.data);
        } catch (error) {
            console.error("Profil yüklenemedi", error);
        }
    };

    useEffect(() => {
        fetchProfile();
    }, [userEmail]);

    const handleSearch = async () => {
        if (!searchParams.from || !searchParams.to) {
            alert("Lütfen kalkış ve varış noktalarını giriniz.");
            return;
        }
        try {
            const response = await axios.get('http://localhost:8080/api/v1/flights/search', { params: searchParams });
            setResults(response.data);
        } catch (error) {
            alert("Uçuşlar listelenemedi!");
        }
    };

    const isMilesSmilesMember = profileData.membershipType && profileData.membershipType !== 'Misafir';

    return (
        <Container maxWidth="lg" sx={{ mt: 2 }}>
            {/* ÜST ROW: KART VE GEÇMİŞ */}
            <Grid container spacing={4} sx={{ mb: 4 }}>
                <Grid item xs={12} md={8}>
                    {isMilesSmilesMember ? (
                        <Paper elevation={6} sx={{ p: 4, height: '220px',  borderRadius: 4, background: 'linear-gradient(45deg, #1a237e 30%, #283593 90%)', color: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                            <Box><Typography variant="h5">Skyline Miles & Smiles</Typography><Typography variant="body2">{profileData.membershipType} Member</Typography></Box>
                            <Box><Typography variant="caption">MİL BAKİYESİ</Typography><Typography variant="h3" sx={{ fontWeight: 'bold' }}>{profileData.milesBalance}</Typography></Box>
                        </Paper>
                    ) : (
                        <Paper elevation={2} sx={{ p: 4, height: '220px',  borderRadius: 4, textAlign: 'center', bgcolor: '#f5f5f5', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <Typography variant="h6">Sadakat Programına Katılın</Typography>
                            <Button variant="contained" color="secondary" sx={{ mt: 2 }}>ÜYE OL</Button>
                        </Paper>
                    )}
                </Grid>
                <Grid item xs={12} md={8}>
                    <Paper sx={{ p: 2, height: '250px', width:'700px', borderRadius: 4, overflowY: 'auto' }}>
                        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>✈️ Seyahatlerim</Typography>
                        <List dense>
                            {profileData.bookings.length > 0 ? profileData.bookings.map((booking) => (
                                <ListItem key={booking.id} divider>
                                    <ListItemText primary={`${booking.Flight.fromCity} ➔ ${booking.Flight.toCity}`} secondary={booking.Flight.flightDate} />
                                    <Chip size="small" label={booking.status} color="success" />
                                </ListItem>
                            )) : <Typography variant="body2">Kayıt yok.</Typography>}
                        </List>
                    </Paper>
                </Grid>
            </Grid>

            {/* ARAMA FORMU */}
            <Paper elevation={3} sx={{ p: 4, borderRadius: 4 }}>
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>🔍 Uçuş Planla</Typography>
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={3}><TextField fullWidth label="Nereden" onChange={(e) => setSearchParams({...searchParams, from: e.target.value})} /></Grid>
                    <Grid item xs={12} sm={3}><TextField fullWidth label="Nereye" onChange={(e) => setSearchParams({...searchParams, to: e.target.value})} /></Grid>
                    <Grid item xs={12} sm={2}><TextField fullWidth type="date" InputLabelProps={{ shrink: true }} label="Tarih" onChange={(e) => setSearchParams({...searchParams, date: e.target.value})} /></Grid>
                    <Grid item xs={12} sm={2}>
                        <TextField fullWidth select label="Yolcu" value={searchParams.passengers} onChange={(e) => setSearchParams({...searchParams, passengers: e.target.value})}>
                            {[1,2,3,4,5].map(n => <MenuItem key={n} value={n}>{n} Yolcu</MenuItem>)}
                        </TextField>
                    </Grid>
                    <Grid item xs={12} sm={2}><Button fullWidth variant="contained" size="large" onClick={handleSearch} sx={{ height: '56px', bgcolor: '#1a237e' }}>ARA</Button></Grid>
                    <Grid item xs={12}>
                        <FormControlLabel control={<Checkbox onChange={(e) => setSearchParams({...searchParams, flexible: e.target.checked})} />} label="Esnek Tarihler (+/- 3 gün)" />
                        <FormControlLabel control={<Checkbox onChange={(e) => setSearchParams({...searchParams, directOnly: e.target.checked})} />} label="Direkt Uçuşlar" />
                    </Grid>
                </Grid>
            </Paper>

            {/* ARAMA SONUÇLARI (SearchFlights Bileşeni) */}
            <SearchFlights 
                results={results} 
                userEmail={userEmail} 
                passengers={searchParams.passengers} 
                onBookingSuccess={() => { handleSearch(); fetchProfile(); }} 
            />
        </Container>
    );
};

export default Profile;