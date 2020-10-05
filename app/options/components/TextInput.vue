<template>
    <div>
        <b-field :label="label">
            <b-input
                :placeholder="placeholder"
                @input.native="e => $emit('input', e.target.value)"
                :aria-labelledby="label"
                v-model="value"
            />
        </b-field>
    </div>
</template>

<script>
    export default {
        props: {
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