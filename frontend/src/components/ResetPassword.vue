<template>
    <form @submit.prevent="resetPassword">
        <h1>Reset Password</h1>
        <label for="email">Email</label>
        <input type="email" id="email" v-model="email" required>
        <label for="password">New Password</label>
        <input type="password" id="password" v-model="password" required>
        <p>
            Attention: Messages and files encrypted with the old password will be lost.
        </p>
        <button type="submit">Reset Password</button>
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
        const serverResponse = ref('')

        const resetPassword = () => {
            axios.post('/api/reset_password', {
                email: email.value,
                password: password.value
            })
                .then(function (response) {
                    console.log(response)
                    serverResponse.value = 'Password reset successful: ' + response.status
                })
                .catch(error => {
                    if (error.response) {
                        serverResponse.value = 'Password reset failed with status code: ' + error.response.status + ' ' + error.response.data.error
                    } else if (error.request) {
                        serverResponse.value = 'Password reset failed: No response from server'
                    } else {
                        serverResponse.value = 'Password reset failed: ' + error.message
                    }
                    console.error(error)
                })
        }

        return {
            email,
            password,
            resetPassword,
            serverResponse
        }
    }
}
</script>