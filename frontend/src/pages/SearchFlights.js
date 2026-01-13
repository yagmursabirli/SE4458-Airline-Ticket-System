import React, { useState } from 'react';
import { Grid, Card, Box, Typography, FormControlLabel, Switch, Button, Divider, Chip, Pagination } from '@mui/material';
import axios from 'axios';

const FlightRow = ({ flight, userEmail, passengers, onBookingSuccess }) => {
    const [useMiles, setUseMiles] = useState(false);

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
            <Card sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: 3, width: '1050px', mb: '20px' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Box sx={{ textAlign: 'center', minWidth: '100px' }}>
                        <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold' }}>{flight.flightCode}</Typography>
                        <Chip label={getStopsLabel(flight.stops)} size="small" color={flight.stops === 'zero' ? "success" : "warning"} variant="outlined" />
                    </Box>
                    <Divider orientation="vertical" flexItem />
                    <Box>
                        <Typography variant="h5">{flight.fromCity} ➔ {flight.toCity}</Typography>
                        <Typography variant="body2" color="textSecondary">
                            Tarih: {flight.flightDate} | Süre: {flight.duration}s | Kapasite: {flight.capacity}
                        </Typography>
                    </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="h5" sx={{ color: '#2e7d32', fontWeight: 'bold' }}>{flight.price} TRY</Typography>
                        <FormControlLabel control={<Switch size="small" checked={useMiles} onChange={(e) => setUseMiles(e.target.checked)} />} label="Mil" />
                    </Box>
                    <Button variant="contained" onClick={handleBooking} disabled={flight.capacity <= 0}>Bilet Al</Button>
                </Box>
            </Card>
        </Grid>
    );
};

const SearchFlights = ({ results, userEmail, passengers, onBookingSuccess }) => {
    const flightList = results && results.flights
        ? results.flights
        : (Array.isArray(results) ? results : []);

    const sortedResults = [...flightList].sort((a, b) => a.id - b.id);

    // 🔢 Pagination ayarları
    const ITEMS_PER_PAGE = 3;
    const [page, setPage] = useState(1);

    const pageCount = Math.ceil(sortedResults.length / ITEMS_PER_PAGE);

    const paginatedFlights = sortedResults.slice(
        (page - 1) * ITEMS_PER_PAGE,
        page * ITEMS_PER_PAGE
    );

    return (
        <Box sx={{ width: '100%' }}>
            <Grid container spacing={2} sx={{ mt: 2 }}>
                {paginatedFlights.length > 0 ? (
                    paginatedFlights.map((flight) => (
                        <FlightRow
                            key={flight.id}
                            flight={flight}
                            userEmail={userEmail}
                            passengers={passengers}
                            onBookingSuccess={onBookingSuccess}
                        />
                    ))
                ) : (
                    <Typography sx={{ p: 4, width: '100%', textAlign: 'center' }}>
                        Uçuş bulunamadı.
                    </Typography>
                )}
            </Grid>

            {/* 🔽 Pagination sadece 3'ten fazla varsa */}
            {sortedResults.length > ITEMS_PER_PAGE && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                    <Pagination
                        count={pageCount}
                        page={page}
                        onChange={(e, value) => setPage(value)}
                        color="primary"
                    />
                </Box>
            )}
        </Box>
    );
};
export default SearchFlights;