<template>
    <section>
        <p>This is a message:</p>
        <p>{{message}}</p>
    </section>
</template>

<script>
export default {
    props: {
        message: {
            type: String,
            default: '',
            required: true,
        },
    },
};
</script>