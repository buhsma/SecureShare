<template>
    <Header/>
    <h1>Test View</h1>
    <p>{{ answer }}</p>
</template>

<script>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import Header from '../components/Header.vue'

export default {
    components: {
        Header
    },
    setup() {
        const answer = ref('')

        onMounted(() => {
            axios.get('/api/test')
                .then(response => {
                    answer.value = response.data.answer
                })
                .catch(error => {
                    console.error(error)
                })
        })

        return {
            answer
        }
    }
}

</script>