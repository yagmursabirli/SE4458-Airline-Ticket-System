import React, { useState } from 'react';
import { Grid, Card, Box, Typography, FormControlLabel, Switch, Button, Divider, Chip } from '@mui/material';
import axios from 'axios';

// Her bir uçuş satırı için ayrı bir bileşen oluşturuyoruz
const FlightRow = ({ flight, userEmail, passengers, onBookingSuccess }) => {
    const [useMiles, setUseMiles] = useState(false);

    // Veritabanındaki 'stops' değerini kullanıcı dostu metne çeviren fonksiyon
    const getStopsLabel = (stops) => {
        switch (stops) {
            case 'zero': return 'Aktarmasız';
            case 'one': return '1 Aktarma';
            case 'two_or_more': return '2+ Aktarma';
            default: return 'Direkt';
        }
    };

    const handleBooking = async () => {
        if (!userEmail || userEmail === "undefined") {
            alert("Lütfen giriş yapın.");
            return;
        }

        try {
            const response = await axios.post(`http://localhost:8080/api/v1/flights/book/${flight.id}`, {
                email: userEmail,
                useMiles: useMiles,
                isMemberRequest: false,
                passengers: passengers 
            });
            alert(response.data.message);
            onBookingSuccess(); 
        } catch (error) {
            alert("Hata: " + (error.response?.data?.error || error.message));
        }
    };

    return (
        <Grid item xs={12}>
            <Card sx={{ 
                p: 3, 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                borderRadius: 3,
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                border: '1px solid #eee'
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Box sx={{ textAlign: 'center', minWidth: '100px' }}>
                        <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold' }}>{flight.flightCode}</Typography>
                        {/* AKTARMA BİLGİSİ BURAYA EKLENDİ */}
                        <Chip 
                            label={getStopsLabel(flight.stops)} 
                            size="small" 
                            color={flight.stops === 'zero' ? "success" : "warning"}
                            variant="outlined"
                            sx={{ mt: 0.5, fontWeight: 'bold', fontSize: '0.7rem' }}
                        />
                    </Box>
                    
                    <Divider orientation="vertical" flexItem />
                    
                    <Box>
                        <Typography variant="h5" sx={{ fontWeight: '500' }}>{flight.fromCity} ➔ {flight.toCity}</Typography>
                        <Typography variant="body2" color="textSecondary">
                            Tarih: {flight.flightDate} | Süre: <strong>{flight.duration}s</strong> | Kapasite: <strong>{flight.capacity} Koltuk</strong>
                        </Typography>
                    </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="h5" sx={{ color: '#2e7d32', fontWeight: 'bold' }}>{flight.price} TRY</Typography>
                        <FormControlLabel
                            control={<Switch size="small" checked={useMiles} onChange={(e) => setUseMiles(e.target.checked)} />}
                            label={<Typography variant="caption">Mil Kullan</Typography>}
                        />
                    </Box>
                    
                    <Button 
                        variant="contained" 
                        size="large"
                        onClick={handleBooking} 
                        disabled={flight.capacity <= 0}
                        color={useMiles ? "secondary" : "primary"}
                        sx={{ minWidth: '140px', borderRadius: 2 }}
                    >
                        {flight.capacity <= 0 ? "Tükendi" : (useMiles ? "Mil İle Al" : "Bilet Al")}
                    </Button>
                </Box>
            </Card>
        </Grid>
    );
};

// Ana Arama Sonuçları Bileşeni
const SearchFlights = ({ results, userEmail, passengers, onBookingSuccess }) => {
    const sortedResults = [...results].sort((a, b) => a.id - b.id);

    return (
        <Grid container spacing={2} sx={{ mt: 2 }}>
            {sortedResults.map((flight) => (
                <FlightRow 
                    key={flight.id} 
                    flight={flight} 
                    userEmail={userEmail} 
                    passengers={passengers} 
                    onBookingSuccess={onBookingSuccess} 
                />
            ))}
        </Grid>
    );
};

export default SearchFlights;