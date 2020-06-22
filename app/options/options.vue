<template>
    <section>
        <div v-for="key in keys" :key="key.key">
            <ShortcutInput v-model="key.shortcut" />
            <LabelInput v-model="key.label" />
        </div>
        <AddButton v-on:add-shortcut="keys.push({})" />
        {{ keys }}
    </section>
</template>

<script>
import LabelInput from "./components/LabelInput";
import ShortcutInput from "./components/ShortcutInput";
import AddButton from "./components/AddButton";

export default {
    components: {
        ShortcutInput,
        LabelInput,
        AddButton,
    },
    data() {
        return {
            keys: [{shortcut: '123', label: '456'}]
        }
    }
};
</script>