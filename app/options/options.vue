<template>
    <section>
        <a v-on:click="counter = counter + 1">{{counter}}</a>
        <Message message="testing" />
    </section>
</template>


<script>
import Message from './components/Message.vue';

export default {
    components: {
        Message,
    },
    data: function() {
        return {
            counter: 0
        }
    }
};
</script>