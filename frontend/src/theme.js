import { createTheme } from '@mui/material/styles';

const theme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#000000',
            light: '#333333',
            dark: '#000000',
        },
        secondary: {
            main: '#ffffff',
            light: '#ffffff',
            dark: '#e0e0e0',
        },
        success: {
            main: '#4caf50',
            light: '#81c784',
            dark: '#388e3c',
        },
        warning: {
            main: '#ff9800',
        },
        error: {
            main: '#f44336',
        },
        background: {
            default: '#0a0a0a',
            paper: '#141414',
        },
        text: {
            primary: '#f5f5f5',
            secondary: '#888888',
        },
    },
    typography: {
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        h4: {
            fontWeight: 700,
            letterSpacing: '-0.02em',
        },
        h5: {
            fontWeight: 600,
        },
        h6: {
            fontWeight: 600,
        },
        button: {
            textTransform: 'none',
            fontWeight: 600,
        },
    },
    shape: {
        borderRadius: 16,
    },
    components: {
        MuiCard: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                    border: '1px solid #222222',
                    backgroundColor: '#141414',
                },
            },
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 12,
                    padding: '10px 24px',
                    fontSize: '0.95rem',
                },
                containedPrimary: {
                    backgroundColor: '#000000',
                    color: '#ffffff',
                    border: '1px solid #333333',
                    boxShadow: 'none',
                    '&:hover': {
                        backgroundColor: '#1a1a1a',
                        boxShadow: 'none',
                    },
                },
                containedSecondary: {
                    backgroundColor: '#ffffff',
                    color: '#000000',
                    boxShadow: 'none',
                    '&:hover': {
                        backgroundColor: '#e0e0e0',
                        boxShadow: 'none',
                    },
                },
            },
        },
        MuiAppBar: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                    backgroundColor: 'rgba(10, 10, 10, 0.9)',
                    backdropFilter: 'blur(20px)',
                    borderBottom: '1px solid #222222',
                },
            },
        },
        MuiChip: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                },
            },
        },
    },
});

export default theme;
