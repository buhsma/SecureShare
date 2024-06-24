<template>
    <form @submit.prevent="register">
        <h1>Register</h1>
        <label for="email">Email</label>
        <input type="email" id="email" v-model="email" required>
        <label for="password">Password</label>
        <input type="password" id="password" v-model="password" required>
        <label for="confirmPassword">Confirm Password</label>
        <input type="password" id="confirmPassword" v-model="confirmPassword" required>
        <button type="submit">Register</button>
        <p>{{ serverResponse }}</p>
    </form>
</template>

<script>
import { ref } from 'vue'
import axios from 'axios'

export default {
    setup() {
        const email = ref('')
        const password = ref('')
        const confirmPassword = ref('')
        const serverResponse = ref('')

        const register = () => {
            if (password.value !== confirmPassword.value) {
                serverResponse.value = 'Passwords do not match'
                return
            }

            axios.post('/api/register', {
                email: email.value,
                password: password.value
            })
                .then(function (response) {
                    console.log(response)
                    serverResponse.value = 'Registration successful: ' + response.status
                    localStorage.setItem('access', response.data.access)
                    localStorage.setItem('refresh', response.data.refresh)
                })
                .catch(error => {
                    if (error.response) {
                        serverResponse.value = 'Registration failed with status code: ' + error.response.status + ' ' + error.response.data.error
                    } else if (error.request) {
                        serverResponse.value = 'Registration failed: No response from server'
                    } else {
                        serverResponse.value = 'Registration failed: ' + error.message
                    }
                    console.error(error)
                })
        }

        return {
            email,
            password,
            confirmPassword,
            register,
            serverResponse
        }
    }
}
</script>