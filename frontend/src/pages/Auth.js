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
                elevation={8} 
                sx={{ 
                    p: 5, 
                    mt: 8, 
                    borderRadius: 5,
                    background: 'linear-gradient(to bottom, #ffffff 0%, #F0F9FF 100%)',
                    border: isAdminPart ? '3px solid #66BB6A' : '3px solid #4FC3F7',
                    boxShadow: isAdminPart 
                        ? '0 10px 40px rgba(102, 187, 106, 0.3)' 
                        : '0 10px 40px rgba(79, 195, 247, 0.3)'
                }}
            >
                <Box 
                    sx={{ 
                        textAlign: 'center', 
                        mb: 4,
                        pb: 3,
                        borderBottom: isAdminPart ? '2px solid #A5D6A7' : '2px solid #B3E5FC'
                    }}
                >
                    <Typography 
                        variant="h4" 
                        sx={{ 
                            fontWeight: 'bold',
                            background: isAdminPart 
                                ? 'linear-gradient(135deg, #66BB6A 0%, #81C784 100%)' 
                                : 'linear-gradient(135deg, #4FC3F7 0%, #29B6F6 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            mb: 1
                        }}
                    >
                        {isSignUp ? (step === 1 ? "Yeni Hesap Oluştur" : "Kodu Onayla") : 
                        (isAdminPart ? "✈️ Airline Admin Login" : "✈️ Üye Girişi")}
                    </Typography>
                    {!isSignUp && (
                        <Typography variant="body2" sx={{ color: '#546E7A', mt: 1 }}>
                            {isAdminPart ? "Yönetici paneline hoş geldiniz" : "Hesabınıza giriş yapın"}
                        </Typography>
                    )}
                </Box>

                <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
                    {step === 1 && (
                        <>
                            {isSignUp && (
                                <TextField 
                                    label="İsim Soyisim" 
                                    variant="outlined"
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: 2,
                                            '&:hover fieldset': { 
                                                borderColor: isAdminPart ? '#66BB6A' : '#4FC3F7',
                                                borderWidth: 2
                                            },
                                            '&.Mui-focused fieldset': { 
                                                borderColor: isAdminPart ? '#66BB6A' : '#4FC3F7',
                                                borderWidth: 2
                                            }
                                        },
                                        '& label.Mui-focused': { 
                                            color: isAdminPart ? '#66BB6A' : '#4FC3F7',
                                            fontWeight: 600
                                        }
                                    }}
                                />
                            )}
                            <TextField 
                                label="E-posta Adresi" 
                                variant="outlined"
                                onChange={(e) => setFormData({...formData, email: e.target.value})}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 2,
                                        '&:hover fieldset': { 
                                            borderColor: isAdminPart ? '#66BB6A' : '#4FC3F7',
                                            borderWidth: 2
                                        },
                                        '&.Mui-focused fieldset': { 
                                            borderColor: isAdminPart ? '#66BB6A' : '#4FC3F7',
                                            borderWidth: 2
                                        }
                                    },
                                    '& label.Mui-focused': { 
                                        color: isAdminPart ? '#66BB6A' : '#4FC3F7',
                                        fontWeight: 600
                                    }
                                }}
                            />
                            <TextField 
                                label="Şifre" 
                                type="password" 
                                variant="outlined"
                                onChange={(e) => setFormData({...formData, password: e.target.value})}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 2,
                                        '&:hover fieldset': { 
                                            borderColor: isAdminPart ? '#66BB6A' : '#4FC3F7',
                                            borderWidth: 2
                                        },
                                        '&.Mui-focused fieldset': { 
                                            borderColor: isAdminPart ? '#66BB6A' : '#4FC3F7',
                                            borderWidth: 2
                                        }
                                    },
                                    '& label.Mui-focused': { 
                                        color: isAdminPart ? '#66BB6A' : '#4FC3F7',
                                        fontWeight: 600
                                    }
                                }}
                            />
                            
                            {isSignUp && (
                                <FormControlLabel
                                    control={
                                        <Checkbox 
                                            checked={isMilesSmilesChecked} 
                                            onChange={(e) => setIsMilesSmilesChecked(e.target.checked)}
                                            sx={{
                                                color: '#4FC3F7',
                                                '&.Mui-checked': { color: '#66BB6A' }
                                            }}
                                        />
                                    }
                                    label={
                                        <Typography sx={{ color: '#00838F', fontWeight: 500 }}>
                                            Miles & Smiles üyesi olmak istiyorum
                                        </Typography>
                                    }
                                />
                            )}
                        </>
                    )}

                    {step === 2 && (
                        <TextField 
                            label="Doğrulama Kodu" 
                            variant="outlined"
                            onChange={(e) => setFormData({...formData, code: e.target.value})}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                    '&:hover fieldset': { 
                                        borderColor: '#4FC3F7',
                                        borderWidth: 2
                                    },
                                    '&.Mui-focused fieldset': { 
                                        borderColor: '#66BB6A',
                                        borderWidth: 2
                                    }
                                },
                                '& label.Mui-focused': { 
                                    color: '#66BB6A',
                                    fontWeight: 600
                                }
                            }}
                        />
                    )}

                    <Button 
                        variant="contained" 
                        size="large"
                        onClick={handleAuth}
                        sx={{ 
                            py: 2, 
                            fontWeight: 'bold',
                            fontSize: '1.1rem',
                            borderRadius: 3,
                            background: isAdminPart 
                                ? 'linear-gradient(135deg, #66BB6A 0%, #81C784 100%)' 
                                : 'linear-gradient(135deg, #4FC3F7 0%, #29B6F6 100%)',
                            boxShadow: isAdminPart 
                                ? '0 6px 20px rgba(102, 187, 106, 0.4)' 
                                : '0 6px 20px rgba(79, 195, 247, 0.4)',
                            '&:hover': {
                                background: isAdminPart 
                                    ? 'linear-gradient(135deg, #43A047 0%, #66BB6A 100%)' 
                                    : 'linear-gradient(135deg, #0288D1 0%, #039BE5 100%)',
                                boxShadow: isAdminPart 
                                    ? '0 8px 25px rgba(102, 187, 106, 0.5)' 
                                    : '0 8px 25px rgba(79, 195, 247, 0.5)',
                                transform: 'translateY(-2px)'
                            }
                        }}
                    >
                        {isSignUp ? (step === 1 ? "Kayıt Ol" : "Onayla") : "LOGIN"}
                    </Button>

                    {!isAdminPart && (
                        <Button 
                            variant="text" 
                            onClick={() => { setIsSignUp(!isSignUp); setStep(1); }}
                            sx={{
                                color: '#00838F',
                                fontWeight: 600,
                                '&:hover': {
                                    background: 'rgba(79, 195, 247, 0.1)'
                                }
                            }}
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
