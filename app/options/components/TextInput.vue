<template>
    <div>
        <label :for="id">{{ label }}</label>
        <input
            :id="id"
            @input="e => $emit('input', e.target.value)"
            :placeholder="placeholder"
            :aria-labelledby="label"
            :value="value"
        />
    </div>
</template>

<script>
    export default {
        props: {
            id: {
                type: String,
                required: true,
            },
            label: {
                type: String,
                required: false,
            },
            placeholder: {
                type: String,
                required: false,
            },
            value: {
                type: String,
                required: false,
                default: '',
            },
        }
    };
</script>