<template>
    <div>
        <label>(Optional) Label</label>
        <input v-model="value" />
        <p>Message is: {{ value }}</p>
    </div>
</template>

<script>
    export default {
        props: {
            value: {
                type: String,
                default: '',
                required: true,
            },
        },
        watch: {
            value() {
                this.$emit('input', this.value);
            }
        }
    };
</script>