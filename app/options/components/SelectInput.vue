<template>
    <div>
        <b-field :label="label">
            <b-select :id="id" @input.native="e => $emit('input', e.target.value)" :aria-labelledby="label" :value="value">
                <option v-for="option in options" :value="option.value">{{ option.label }}</option>
            </b-select>
        </b-field>
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
            options: {
                type: Array,
                required: true,
            },
            value: {
                type: String,
                required: false,
                default: '',
            },
        }
    };
</script>