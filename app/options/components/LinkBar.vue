<template>
    <b-navbar>
        <template slot="brand">
            <b-navbar-item :to="{ path: '/' }">
                SHORTKEYS
            </b-navbar-item>
        </template>
        <template slot="start">
            <b-navbar-item href="https://chrome.google.com/webstore/detail/shortkeys-custom-keyboard/logpjaacgmcbpdkdchjiaagddngobkck/reviews?hl=en-US&gl=US">
                Review
            </b-navbar-item>
            <b-navbar-item href="https://github.com/mikecrittenden/shortkeys/wiki/How-To-Use-Shortkeys">
                Documentation
            </b-navbar-item>
            <b-navbar-item href="https://github.com/mikecrittenden/shortkeys/issues">
                Support
            </b-navbar-item>
            <b-navbar-item href="https://github.com/mikecrittenden/shortkeys">
                GitHub
            </b-navbar-item>
        </template>
    </b-navbar>
</template>

