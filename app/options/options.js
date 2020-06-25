import Vue from 'vue';
import Buefy from 'buefy'
import 'buefy/dist/buefy.css'
import Options from './options.vue';
Vue.use(Buefy);
new Vue({
    el: '#app',
    render: (h) => h(Options),
});