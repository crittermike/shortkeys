<template>
    <div>
        <label>Keyboard shortcut (<a href="https://github.com/mikecrittenden/shortkeys/wiki/How-To-Use-Shortkeys#supported-keyboard-shortcuts">Help</a>)</label>
        <input :value="value" @input="$emit('input', $event.target.value)" />
    </div>
</template>

<script>
    export default {
        props: ['value']
    };
</script>