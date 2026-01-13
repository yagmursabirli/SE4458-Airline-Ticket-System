import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { signOut } from 'aws-amplify/auth';

const Navbar = ({ onLogout, userEmail }) => {
    const handleSignOut = async () => {
        try {
            await signOut();
            onLogout(); 
            alert("Başarıyla çıkış yapıldı.");
        } catch (error) {
            console.error('Çıkış yapılırken hata:', error);
        }
    };

    return (
        <AppBar position="static" sx={{ backgroundColor: '#1a237e' }}>
            <Toolbar>
                <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
                    SKYLINE AIRWAYS
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="body2" sx={{ opacity: 0.8 }}>
                        {userEmail}
                    </Typography>
                    <Button color="inherit" onClick={handleSignOut} sx={{ border: '1px solid white' }}>
                        Log out
                    </Button>
                </Box>
            </Toolbar>
        </AppBar>
    );
};

export default Navbar;