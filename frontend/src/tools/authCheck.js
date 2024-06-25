import axios from 'axios';

export async function isAuthenticated() {
    const token = localStorage.getItem('access');
    if (!token) {
        return false;
    }

    try {
        console.log('Checking token');
        const response = await axios.post('/api/token/verify/', {
            token: token
        });
        console.log('Token response', response);
        return response.status === 200;
    } catch (error) {
        console.error('Token verify error', error);
        if (error.response.status === 401) {
            console.log('Refreshing token');
            const refresh = localStorage.getItem('refresh');
            try {
                const response = await axios.post('/api/token/refresh/', {
                    refresh: refresh
                });
                console.log('Refresh response', response);
                localStorage.setItem('access', response.data.access);
                return true;
            } catch (error) {
                console.error('Token refresh error', error);
                return false;
            }
        }
        return false;
    }
}