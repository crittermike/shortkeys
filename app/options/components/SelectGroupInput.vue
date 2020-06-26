<template>
    <div>
        <b-field :label="label">
            <b-select :id="id" @input.native="e => $emit('input', e.target.value)" :aria-labelledby="label" :value="value">
                <optgroup v-for="(group, name) in options" :label="name">
                    <option v-for="option in group" :value="option.value">{{ option.label }}</option>
                </optgroup>
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
                type: Object,
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