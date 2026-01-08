import React, { useState } from 'react';
import { 
  Box, TextField, Button, Grid, Typography, Paper, Container 
} from '@mui/material';
import axios from 'axios';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { signOut } from 'aws-amplify/auth';

const AdminAddFlight = () => {
  const [flightData, setFlightData] = useState({
    fromCity: '', toCity: '', flightDate: null,
    flightCode: '', duration: '', price: '', capacity: ''
  });

  const handleChange = (e) => {
    setFlightData({ ...flightData, [e.target.name]: e.target.value });
  };

 const handleSave = async () => {
    try {
        const response = await axios.post('http://localhost:8080/api/flights', flightData, {
            headers: { 'x-user-role': 'ADMIN' } // Backend güvenliği için
        });
        alert(response.data.message);
    } catch (error) {
        alert("Yetkisiz işlem veya hata!");
    }
};

 const handlePredict = async () => {
  try {
    const response = await axios.post('http://localhost:5001/predict', {
      duration: flightData.duration,
      fromCity: flightData.fromCity,
      toCity: flightData.toCity
    });

    console.log("Python'dan gelen veri:", response.data);

    if (response.data.predicted_price) {
      // price alanını string'e çevirerek set ediyoruz (input için daha sağlıklı)
      setFlightData(prevState => ({ 
        ...prevState, 
        price: String(response.data.predicted_price) 
      }));
    }
  } catch (error) {
    console.error("Tahmin Hatası:", error);
    alert("Tahmin alınamadı!");
  }
};
  return (
    <Container maxWidth="sm" sx={{ mt: 5 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          ✈️ Flight Entry
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <TextField fullWidth label="From City" name="fromCity" placeholder="Enter departure city" onChange={handleChange} />
          </Grid>
          <Grid item xs={6}>
            <TextField fullWidth label="To City" name="toCity" placeholder="Enter destination city" onChange={handleChange} />
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

          <Grid item xs={6}>
            <TextField fullWidth label="Duration" name="duration" placeholder="e.g. 2h 30m" onChange={handleChange} />
          </Grid>
          {/* Price ve Predict Butonu Kısmı */}
<Grid item xs={6} sx={{ display: 'flex', gap: 1 }}>
  <TextField 
    fullWidth 
    label="Price" 
    name="price" 
    placeholder="$299" 
    value={flightData.price} // KRİTİK: State'deki değeri buraya bağlıyoruz
    onChange={handleChange} 
  />
  <Button variant="contained" color="primary" onClick={handlePredict}>
    Predict
  </Button>
</Grid>
          <Grid item xs={12}>
            <TextField fullWidth label="Capacity" name="capacity" placeholder="e.g. 180" onChange={handleChange} />
          </Grid>

          <Grid item xs={12} sx={{ mt: 2 }}>
            <Button fullWidth variant="contained" color="inherit" onClick={handleSave} sx={{ bgcolor: '#f5f5f5', color: '#000' }}>
              SAVE
            </Button>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default AdminAddFlight;