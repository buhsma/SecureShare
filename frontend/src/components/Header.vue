<template>
    <header>
        <RouterLink v-if="userIsAuthenticated" to="dashboard">Dashboard</RouterLink>
        <RouterLink v-else to="/">Home</RouterLink>
        <RouterLink v-if="!userIsAuthenticated" to="register">+ Create account</RouterLink>
        <RouterLink v-if="!userIsAuthenticated" to="login">Login</RouterLink>
        <RouterLink to="about">About</RouterLink>
        <RouterLink to="faq">FAQ</RouterLink>
        <button v-if="userIsAuthenticated" @click="logout">Logout</button>
    </header>
    <BluePortal />
</template>

<script>

import { useRouter, RouterLink } from 'vue-router'
import axios from 'axios'
import authState from '@/tools/authState'
import BluePortal from '@/components/BluePortal.vue'



export default {
    components: {
        BluePortal,
        RouterLink
    },
    setup() {
        const { userIsAuthenticated, setAuthState } = authState();
        const router = useRouter()
        const logout = () => {
            console.log('logout')
            axios.post('/api/token/blacklist/', {
                refresh: localStorage.getItem('refresh')
            })
                .then(function (response) {
                    localStorage.removeItem('access');
                    localStorage.removeItem('refresh');
                    setAuthState(false);
                    router.push('/');
                })
                .catch(function (error) {
                    console.error(error)
                });
        };
        return {
            logout,
            userIsAuthenticated
        };

    }
};
</script>