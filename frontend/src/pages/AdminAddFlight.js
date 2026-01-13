import React, { useState } from 'react';
import { 
  Box, TextField, Button, Grid, Typography, Paper, Container, MenuItem 
} from '@mui/material';
import axios from 'axios';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

const AdminAddFlight = () => {
  const [flightData, setFlightData] = useState({
    fromCity: '', toCity: '', flightDate: null,
    flightCode: '', duration: '', price: '', capacity: '',
    airline: 'Air_India',
    departure_time: 'Morning',
    stops: 'one'
  });

  const handleChange = (e) => {
    setFlightData({ ...flightData, [e.target.name]: e.target.value });
  };

 const handleSave = async () => {

    const formattedDate = flightData.flightDate && flightData.flightDate.isValid() 
      ? flightData.flightDate.format('YYYY-MM-DD') 
      : null;

    if (!formattedDate) {
      alert("Lütfen geçerli bir uçuş tarihi seçin!");
      return;
    }


    const dataToSend = {
      fromCity: String(flightData.fromCity).trim(),
      toCity: String(flightData.toCity).trim(),
      flightDate: formattedDate,
      flightCode: String(flightData.flightCode).trim(),
      duration: String(flightData.duration), 
      price: parseFloat(flightData.price),
      capacity: parseInt(flightData.capacity),
      predictedPrice: flightData.price ? parseFloat(flightData.price) : null,
      stops: flightData.stops || 'zero'
    };

    if (!dataToSend.fromCity || !dataToSend.toCity || !dataToSend.flightCode) {
      alert("Lütfen Nereden, Nereye ve Uçuş Kodu alanlarını doldurun!");
      return;
    }

    try {
      const response = await axios.post('http://localhost:8080/api/v1/flights', dataToSend, {
        headers: { 
          'x-user-role': 'ADMIN',
          'Content-Type': 'application/json'
        } 
      });
      alert("✅ Uçuş AWS RDS veritabanına başarıyla kaydedildi!");
    } catch (error) {
      console.error("Kaydetme Hatası Detayı:", error.response?.data);
      const detail = error.response?.data?.error || "Veri formatı modelle uyuşmuyor.";
      alert("❌ Kayıt başarısız! \nDetay: " + detail);
    }
};

  const handlePredict = async () => {
    try {
      const response = await axios.post('http://localhost:5001/predict', {
        duration: flightData.duration,
        fromCity: flightData.fromCity,
        toCity: flightData.toCity,
        airline: flightData.airline,
        departure_time: flightData.departure_time,
        stops: flightData.stops
      });

      if (response.data.predicted_price) {
        setFlightData(prevState => ({ 
          ...prevState, 
          price: String(response.data.predicted_price) 
        }));
      }
    } catch (error) {
      console.error("Tahmin Hatası:", error);
      alert("Tahmin alınamadı! Python servisinin 5001'de çalıştığından emin olun.");
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 5 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          ✈️ Flight Entry (Admin)
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <TextField fullWidth label="From City" name="fromCity" placeholder="Delhi, Mumbai..." onChange={handleChange} />
          </Grid>
          <Grid item xs={6}>
            <TextField fullWidth label="To City" name="toCity" placeholder="Kolkata, Hyderabad..." onChange={handleChange} />
          </Grid>
          
          <Grid item xs={6}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker 
                label="Flight Date" 
                onChange={(newValue) => setFlightData({...flightData, flightDate: newValue})}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </LocalizationProvider>
          </Grid>
          <Grid item xs={6}>
            <TextField fullWidth label="Flight Code" name="flightCode" placeholder="eg, TK123" onChange={handleChange} />
          </Grid>

          {/* ML İÇİN KRİTİK ALANLAR  */}
          <Grid item xs={4}>
            <TextField select fullWidth label="Airline" name="airline" value={flightData.airline} onChange={handleChange}>
              <MenuItem value="Air_India">Air India</MenuItem>
              <MenuItem value="Indigo">Indigo</MenuItem>
              <MenuItem value="Vistara">Vistara</MenuItem>
              <MenuItem value="SpiceJet">SpiceJet</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={4}>
            <TextField select fullWidth label="Time" name="departure_time" value={flightData.departure_time} onChange={handleChange}>
              <MenuItem value="Early_Morning">Early Morning</MenuItem>
              <MenuItem value="Morning">Morning</MenuItem>
              <MenuItem value="Evening">Evening</MenuItem>
              <MenuItem value="Night">Night</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={4}>
            <TextField select fullWidth label="Stops" name="stops" value={flightData.stops} onChange={handleChange}>
              <MenuItem value="zero">Direct</MenuItem>
              <MenuItem value="one">1 Stop</MenuItem>
              <MenuItem value="two_or_more">2+ Stops</MenuItem>
            </TextField>
          </Grid>

          <Grid item xs={6}>
            <TextField fullWidth label="Duration (Hours)" name="duration" placeholder="e.g. 2.5" onChange={handleChange} />
          </Grid>

          <Grid item xs={6} sx={{ display: 'flex', gap: 1 }}>
            <TextField 
              fullWidth 
              label="Price" 
              name="price" 
              value={flightData.price} 
              onChange={handleChange} 
            />
            <Button variant="contained" color="primary" onClick={handlePredict} sx={{ minWidth: '100px' }}>
              Predict
            </Button>
          </Grid>

          <Grid item xs={12}>
            <TextField fullWidth label="Capacity" name="capacity" placeholder="e.g. 180" onChange={handleChange} />
          </Grid>

          <Grid item xs={12} sx={{ mt: 2 }}>
            <Button fullWidth variant="contained" onClick={handleSave} color="primary" sx={{ p: 1.5, fontWeight: 'bold' }}>
              SAVE FLIGHT
            </Button>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default AdminAddFlight;