<template>
    <header>
        <RouterLink to="/">Home</RouterLink>
        <RouterLink to="register">+ Create account</RouterLink>
        <RouterLink to="login">Login</RouterLink>
        <button @click="logout">Logout</button>
    </header>
</template>

<script>

import { ref } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import axios from 'axios'


export default {
    setup() {
        const router = useRouter()
        const logout = () => {
            console.log('logout')
            axios.post('/api/token/blacklist/', {
                refresh: localStorage.getItem('refresh')
            })
                .then(function (response) {
                    localStorage.removeItem('access');
                    localStorage.removeItem('refresh');
                    router.push('/');
                })
                .catch(function (error) {
                    console.error(error)
                });
        };
        return {
            logout
        };

    }
};
</script>