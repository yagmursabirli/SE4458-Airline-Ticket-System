import React, { useState } from 'react';
import { signUp, signIn, confirmSignUp, fetchAuthSession } from 'aws-amplify/auth'; // fetchAuthSession eklendi
import { 
    Container, TextField, Button, Typography, Paper, Box, 
    Checkbox, FormControlLabel 
} from '@mui/material';
import axios from 'axios';

const Auth = ({ onLoginSuccess }) => {
    // Port 3001 ise Admin domaini kabul edilir
    const isAdminPart = window.location.port === "3001";
    
    const [isSignUp, setIsSignUp] = useState(false);
    const [step, setStep] = useState(1); 
    const [formData, setFormData] = useState({ email: '', password: '', code: '', name: '' });
    const [isMilesSmilesChecked, setIsMilesSmilesChecked] = useState(false);

    const handleAuth = async () => {
        try {
            if (isSignUp && step === 1) {
                await signUp({
                    username: formData.email,
                    password: formData.password,
                    options: { userAttributes: { name: formData.name } }
                });
                setStep(2);
                alert("Doğrulama kodu mailinize gönderildi!");
            } 
            else if (isSignUp && step === 2) {
                await confirmSignUp({ username: formData.email, confirmationCode: formData.code });

                if (isMilesSmilesChecked) {
                    try {
                        await axios.post('http://localhost:8080/api/v1/user/register-loyalty', {
                            email: formData.email,
                            wantsMembership: true
                        });
                    } catch (err) {
                        console.error("Backend üyelik kaydı başarısız:", err);
                    }
                }
                alert("Kayıt başarılı! Şimdi giriş yapabilirsiniz.");
                setIsSignUp(false);
                setStep(1);
            } else {
                // 1. Giriş İşlemi
                const user = await signIn({ username: formData.email, password: formData.password });
                
                // 2. AWS Cognito'dan Kullanıcı Gruplarını (Rolleri) Çekme
                const session = await fetchAuthSession();
                const groups = session.tokens?.accessToken?.payload['cognito:groups'] || [];
                
                // PDF Kuralı: "Users who can use this screen will be in ADMIN role"
                const isUserAdmin = groups.includes('Admins');

                // 3. Yetki Kontrolü
                if (isAdminPart && !isUserAdmin) {
                    alert("YETKİ HATASI: Bu domain sadece 'Admins' grubundaki kullanıcılar içindir.");
                    return;
                }

                alert(isAdminPart ? "Admin Paneline Hoş Geldiniz!" : "Giriş Başarılı!");
                
                // user nesnesine isAdmin bilgisini ekleyerek App.js'e gönderiyoruz
                onLoginSuccess({ ...user, isAdmin: isUserAdmin });
            }
        } catch (error) {
            alert("Hata: " + error.message);
        }
    };

    return (
        <Container maxWidth="sm">
            <Paper 
                elevation={3} 
                sx={{ 
                    p: 4, 
                    mt: 10, 
                    borderRadius: 3, 
                    borderTop: isAdminPart ? '5px solid #9c27b0' : '5px solid #1976d2' 
                }}
            >
                <Typography variant="h5" align="center" gutterBottom sx={{ fontWeight: 'bold' }}>
                    {isSignUp ? (step === 1 ? "Yeni Hesap Oluştur" : "Kodu Onayla") : 
                    (isAdminPart ? "✈️ Airline Admin Login" : "Üye Girişi")}
                </Typography>

                <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                    {step === 1 && (
                        <>
                            {isSignUp && (
                                <TextField 
                                    label="İsim Soyisim" 
                                    variant="outlined"
                                    onChange={(e) => setFormData({...formData, name: e.target.value})} 
                                />
                            )}
                            <TextField 
                                label="E-posta Adresi" 
                                variant="outlined"
                                onChange={(e) => setFormData({...formData, email: e.target.value})} 
                            />
                            <TextField 
                                label="Şifre" 
                                type="password" 
                                variant="outlined"
                                onChange={(e) => setFormData({...formData, password: e.target.value})} 
                            />
                            
                            {isSignUp && (
                                <FormControlLabel
                                    control={
                                        <Checkbox 
                                            checked={isMilesSmilesChecked} 
                                            onChange={(e) => setIsMilesSmilesChecked(e.target.checked)} 
                                        />
                                    }
                                    label="Miles & Smiles üyesi olmak istiyorum"
                                />
                            )}
                        </>
                    )}

                    {step === 2 && (
                        <TextField 
                            label="Doğrulama Kodu" 
                            variant="outlined"
                            onChange={(e) => setFormData({...formData, code: e.target.value})} 
                        />
                    )}

                    <Button 
                        variant="contained" 
                        size="large"
                        onClick={handleAuth}
                        color={isAdminPart ? "secondary" : "primary"}
                        sx={{ py: 1.5, fontWeight: 'bold' }}
                    >
                        {isSignUp ? (step === 1 ? "Kayıt Ol" : "Onayla") : "LOGIN"}
                    </Button>

                    {!isAdminPart && (
                        <Button 
                            variant="text" 
                            onClick={() => { setIsSignUp(!isSignUp); setStep(1); }}
                        >
                            {isSignUp ? "Zaten hesabım var, giriş yap" : "Henüz hesabın yok mu? Kayıt Ol"}
                        </Button>
                    )}
                </Box>
            </Paper>
        </Container>
    );
};

export default Auth;