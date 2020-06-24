<template>
    <div>
        <label>Behavior (<a href="https://github.com/mikecrittenden/shortkeys/wiki/How-To-Use-Shortkeys#full-list-of-commands">Help</a>)</label>
        <select v-model="value">
            <option v-for="option in options" :value="option.value">{{ option.label }}</option>
        </select>
    </div>
</template>

<script>
    export default {
        props: {
            value: {
                type: String,
                default: '',
                required: false,
            },
            options: {
                type: Array,
                default: [],
                required: true
            }
        },
        watch: {
            value() {
                this.$emit('input', this.value);
            }
        }
    };
</script>