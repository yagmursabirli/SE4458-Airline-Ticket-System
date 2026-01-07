import React, { useState } from 'react';
import { 
    Container, TextField, Button, Grid, Paper, Typography, 
    Card, Box, FormControlLabel, Checkbox, Switch 
} from '@mui/material';
import axios from 'axios';

const SearchFlights = ({ userEmail }) => { 
    const [searchParams, setSearchParams] = useState({ from: '', to: '', date: '' });
    const [results, setResults] = useState([]);
    const [isMemberRequest, setIsMemberRequest] = useState(false);
    const [useMiles, setUseMiles] = useState(false);

    const handleSearch = async () => {
        try {
            const response = await axios.get('http://localhost:5000/api/flights/search', { params: searchParams });
            setResults(response.data);
        } catch (error) {
            alert("Uçuşlar listelenemedi!");
        }
    };

    const handleBooking = async (flightId) => {
        // Debug: Eğer hata alırsan tarayıcı konsolunda burayı kontrol et
        console.log("Booking denemesi yapılıyor. Kullanıcı:", userEmail);

        if (!userEmail || userEmail === "undefined") {
            alert("Oturum bilgisi alınamadı, lütfen sayfayı yenileyip tekrar giriş yapın.");
            return;
        }

        try {
            const response = await axios.post(`http://localhost:5000/api/flights/book/${flightId}`, {
                email: userEmail,
                useMiles: useMiles,
                isMemberRequest: isMemberRequest
            });
            alert(response.data.message);
            // Başarılı işlemden sonra arama sonuçlarını tazele (Kapasite güncellensin)
            handleSearch();
        } catch (error) {
            alert("Hata: " + (error.response?.data?.error || error.message));
        }
    };

    return (
        <Container maxWidth="md" sx={{ mt: 5 }}>
            <Paper elevation={3} sx={{ p: 4, mb: 4, borderRadius: 3, textAlign: 'center', backgroundColor: '#f5f5f5' }}>
                <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: '#1a237e' }}>✈️ Uçuş Ara</Typography>
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                        <TextField fullWidth label="Nereden" variant="outlined" onChange={(e) => setSearchParams({...searchParams, from: e.target.value})} />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <TextField fullWidth label="Nereye" variant="outlined" onChange={(e) => setSearchParams({...searchParams, to: e.target.value})} />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <TextField fullWidth type="date" InputLabelProps={{ shrink: true }} label="Tarih" onChange={(e) => setSearchParams({...searchParams, date: e.target.value})} />
                    </Grid>
                    <Grid item xs={12}>
                        <Button fullWidth variant="contained" size="large" onClick={handleSearch} sx={{ mt: 2, py: 1.5, backgroundColor: '#1a237e' }}>UÇUŞLARI GÖSTER</Button>
                    </Grid>
                </Grid>
            </Paper>

            <Grid container spacing={2}>
                {results.map((flight) => (
                    <Grid item xs={12} key={flight.id}>
                        <Card sx={{ borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 3, boxShadow: 2 }}>
                            <Box>
                                <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold' }}>{flight.flightCode}</Typography>
                                <Typography variant="h5">{flight.fromCity} ➔ {flight.toCity}</Typography>
                                <Typography variant="body2" color="textSecondary">Tarih: {flight.flightDate} | Süre: {flight.duration}</Typography>
                                <Typography variant="h6" sx={{ mt: 1, color: '#2e7d32' }}>{flight.price} TRY</Typography>
                                <Typography variant="caption" display="block">Kalan Kapasite: {flight.capacity} Koltuk</Typography>
                            </Box>
                            
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: '200px' }}>
                                
                                
                                {/* PDF Kuralı: Mil ile ödeme */}
                                <FormControlLabel
                                    control={<Switch size="small" checked={useMiles} onChange={(e) => setUseMiles(e.target.checked)} />}
                                    label={<Typography variant="caption">Millerimle Öde</Typography>}
                                />

                                <Button 
                                    variant="contained" 
                                    fullWidth 
                                    onClick={() => handleBooking(flight.id)}
                                    color={useMiles ? "secondary" : "primary"}
                                    disabled={flight.capacity <= 0}
                                >
                                    {flight.capacity <= 0 ? "Tükendi" : (useMiles ? "Mil İle Satın Al" : "Bilet Al")}
                                </Button>
                            </Box>
                        </Card>
                    </Grid>
                ))}
                {results.length === 0 && (
                    <Typography sx={{ width: '100%', textAlign: 'center', mt: 4, color: 'gray' }}>Aramanıza uygun uçuş bulunamadı.</Typography>
                )}
            </Grid>
        </Container>
    );
};

export default SearchFlights;