<template>
    <main>
        <h1>Home</h1>
    </main>
</template>

<script>
import authState from '@/tools/authState';

export default {
    setup() {
        const { userIsAuthenticated } = authState();
        return { userIsAuthenticated };
    },
};
</script>