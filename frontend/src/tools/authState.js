// authState.js
import { ref } from 'vue';
import { isAuthenticated } from '@/tools/authCheck.js';

const userIsAuthenticated = ref(false);

export default function authState() {
    const checkAuth = async () => {
        userIsAuthenticated.value = await isAuthenticated();
    };

    const setAuthState = (value) => {
        userIsAuthenticated.value = value;
    };

    return { userIsAuthenticated, checkAuth, setAuthState };
}