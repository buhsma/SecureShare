<template>
    <form @submit.prevent="login">
        <h1>Login</h1>
        <label for="email">Email</label>
        <input type="email" id="email" v-model="email" required>
        <label for="password">Password</label>
        <input type="password" id="password" v-model="password" required>
        <button type="submit">Login</button>
        <p>{{ serverResponse }}</p>
    </form>
</template>

<script>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import authState from '@/tools/authState'

export default {
    setup() {
        const email = ref('')
        const password = ref('')
        const serverResponse = ref('')
        const router = useRouter()

        const { setAuthState } = authState()

        const login = () => {
            axios.post('/api/token/', {
                username: email.value,
                password: password.value
            })
                .then(function (response) {
                    console.log(response)
                    serverResponse.value = 'Login successful: ' + response.status
                    localStorage.setItem('access', response.data.access)
                    localStorage.setItem('refresh', response.data.refresh)
                    setAuthState(true);
                    router.push({ name: 'dashboard' })
                })
                .catch(error => {
                    if (error.response) {
                        serverResponse.value = 'Login failed with status code: ' + error.response.status + ' ' + error.response.data.detail
                    } else if (error.request) {
                        serverResponse.value = 'Login failed: No response from server'
                    } else {
                        serverResponse.value = 'Login failed: ' + error.message
                    }
                    console.error(error)
                })
        }

        return {
            email,
            password,
            login,
            serverResponse
        }
    }
}
</script>