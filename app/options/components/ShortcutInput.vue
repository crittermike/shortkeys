<template>
    <div>
        <label>Keyboard shortcut (<a href="https://github.com/mikecrittenden/shortkeys/wiki/How-To-Use-Shortkeys#supported-keyboard-shortcuts">Help</a>)</label>
        <input v-model="value" />
        <p>Shortcut is: {{ value }}</p>
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