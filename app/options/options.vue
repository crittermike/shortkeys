<template>
    <section>
        <LinkBar /><br /><br />
        <table class="table w-full">
            <thead>
                <th>Active</th>
                <th>Shortcut (<a target='_blank' href='https://github.com/mikecrittenden/shortkeys/wiki/How-To-Use-Shortkeys#supported-keyboard-shortcuts'>Help</a>)</th>
                <th>Label (optional)</th>
                <th>Behavior (<a href='https://github.com/mikecrittenden/shortkeys/wiki/How-To-Use-Shortkeys#full-list-of-commands'>Help</a>)</th>
                <th>Settings</th>
            </thead>
            <tbody>
                <tr v-for="(key, index) in keys">
                    <td>
                        <b-switch></b-switch>
                    </td>
                    <td>
                        <b-field>
                            <b-input placeholder="Example: ctrl+a" v-model="key.key"/>
                        </b-field>
                    </td>
                    <td>
                        <b-field>
                            <b-input v-model="key.label"/>
                        </b-field>
                    </td>
                    <td>
                        <b-field>
                            <b-select v-model="key.action">
                                <optgroup v-for="(group, name) in actions" :label="name">
                                    <option v-for="option in group" :value="option.value">{{ option.label }}</option>
                                </optgroup>
                            </b-select>
                        </b-field>
                    </td>
                    <td>
                        <b-button @click="key.sidebarOpen = true">Configure</b-button>
                    </td>
                </tr>
            </tbody>

        </table>

        <div v-for="(key, index) in keys">
            <b-sidebar
            type="is-light"
            right
            fullheight
            :open.sync="key.sidebarOpen">
                <b-field>
                    <b-select v-model="key.blacklist">
                        <option v-for="option in websites" :value="option.value">{{ option.label }}</option>
                    </b-select>
                </b-field>
                <b-field>
                    <b-input type="textarea" v-show="key.blacklist && key.blacklist != 'false'" v-model="key.sites" />
                </b-field>
            </b-sidebar>
        </div>

        <b-field>
            <b-button @click="keys.push({})">Add shortcut</b-button>
            <b-button @click="saveShortcuts">Save shortcuts</b-button>
        </b-field>
        <br /><br />
        <pre>{{ keys }}</pre>
    </section>
</template>

<script>
import TextInput from "./components/TextInput";
import LinkBar from "./components/LinkBar";
import SelectInput from "./components/SelectInput";
import TextareaInput from "./components/TextareaInput";
import SelectGroupInput from "./components/SelectGroupInput";

export default {
    components: {
        SelectGroupInput,
        TextareaInput,
        SelectInput,
        LinkBar,
        TextInput,
    },
    methods: {
        saveShortcuts: function () {
            this.keys.forEach(key => delete key.sidebarOpen);
            localStorage.shortkeys = JSON.stringify({keys: this.keys});
            this.$buefy.snackbar.open(`Shortcuts have been saved!`);
        }
    },
    data() {
        return {
            keys: localStorage.shortkeys ? JSON.parse(localStorage.shortkeys).keys : [{}],
            websites: [
                {value: false, label: 'All sites'},
                {value: true, label: 'All sites except...'},
                {value: 'whitelist', label: 'Only on specific sites'}
            ],
            actions: {
                'Scrolling': [
                    {value: 'top', label: 'Scroll to top', builtin: true},
                    {value: 'bottom', label: 'Scroll to bottom', builtin: true},
                    {value: 'scrolldown', label: 'Scroll down', builtin: true},
                    {value: 'scrolldownmore', label: 'Scroll down more', builtin: true},
                    {value: 'pagedown', label: 'Page down', builtin: true},
                    {value: 'scrollup', label: 'Scroll up', builtin: true},
                    {value: 'scrollupmore', label: 'Scroll up more', builtin: true},
                    {value: 'pageup', label: 'Page up', builtin: true},
                    {value: 'scrollright', label: 'Scroll right', builtin: true},
                    {value: 'scrollrightmore', label: 'Scroll right more', builtin: true},
                    {value: 'scrollleft', label: 'Scroll left', builtin: true},
                    {value: 'scrollleftmore', label: 'Scroll left more', builtin: true},
                ],
                'Location': [
                    {value: 'back', label: 'Go back', builtin: true},
                    {value: 'forward', label: 'Go forward', builtin: true},
                    {value: 'reload', label: 'Reload page', builtin: true},
                    {value: 'hardreload', label: 'Hard reload page (bypass cache)', builtin: true},
                    {value: 'copyurl', label: 'Copy URL', builtin: true},
                    {value: 'opensettings', label: 'Open Settings Page', builtin: true},
                    {value: 'openextensions', label: 'Open Extensions Page', builtin: true},
                    {value: 'openshortcuts', label: 'Open Keyboard Shortcuts Page', builtin: true},
                    {value: 'searchgoogle', label: 'Search Google for selected text', builtin: true},
                ],
                'Bookmarks': [
                    {value: 'openbookmark', label: 'Open bookmark/bookmarklet in current tab'},
                    {value: 'openbookmarknewtab', label: 'Open bookmark/bookmarklet in new tab'},
                    {value: 'openbookmarkbackgroundtab', label: 'Open bookmark/bookmarklet in new background tab'},
                    {
                        value: 'openbookmarkbackgroundtabandclose',
                        label: 'Open bookmark/bookmarklet in new background tab and close immediately after load'
                    },
                ],
                'Tabs': [
                    {value: 'gototab', label: 'Jump to tab by URL'},
                    {value: 'gototabbytitle', label: 'Jump to tab by title'},
                    {value: 'gototabbyindex', label: 'Jump to tab by index'},
                    {value: 'newtab', label: 'New tab', builtin: true},
                    {value: 'closetab', label: 'Close tab', builtin: true},
                    {value: 'onlytab', label: 'Close other tabs', builtin: true},
                    {value: 'closelefttabs', label: 'Close tabs to the left', builtin: true},
                    {value: 'closerighttabs', label: 'Close tabs to the right', builtin: true},
                    {value: 'clonetab', label: 'Duplicate tab', builtin: true},
                    {value: 'movetabtonewwindow', label: 'Move tab to new window', builtin: false},
                    {value: 'reopentab', label: 'Reopen last closed tab', builtin: true},
                    {value: 'nexttab', label: 'Next tab', builtin: true},
                    {value: 'prevtab', label: 'Previous tab', builtin: true},
                    {value: 'firsttab', label: 'First tab', builtin: true},
                    {value: 'lasttab', label: 'Last tab', builtin: true},
                    {value: 'togglepin', label: 'Pin/unpin tab', builtin: true},
                    {value: 'togglemute', label: 'Mute/unmute tab', builtin: true},
                    {value: 'movetableft', label: 'Move tab left', builtin: true},
                    {value: 'movetabright', label: 'Move tab right', builtin: true},
                    {value: 'movetabtofirst', label: 'Move tab to first position', builtin: true},
                    {value: 'movetabtolast', label: 'Move tab to last position', builtin: true},
                ],
                'Windows': [
                    {value: 'newwindow', label: 'New window', builtin: true},
                    {value: 'newprivatewindow', label: 'New private window', builtin: true},
                    {value: 'closewindow', label: 'Close window', builtin: true},
                    {value: 'fullscreen', label: 'Toggle fullscreen', builtin: true},
                ],
                'Zooming': [
                    {value: 'zoomin', label: 'Zoom In', builtin: true},
                    {value: 'zoomout', label: 'Zoom Out', builtin: true},
                    {value: 'zoomreset', label: 'Reset Zoom', builtin: true},
                ],
                'Miscellaneous': [
                    {value: 'javascript', label: 'Run JavaScript'},
                    {value: 'showlatestdownload', label: 'Show latest download', builtin: true},
                    {value: 'cleardownloads', label: 'Clear downloads', builtin: true},
                    {value: 'viewsource', label: 'View source', builtin: true},
                    {value: 'disable', label: 'Do nothing (disable browser shortcut)', builtin: true},
                    {value: 'trigger', label: 'Trigger another shortcut'},
                    {value: 'print', label: 'Print page', builtin: true},
                    {value: 'buttonnexttab', label: 'Click button and switch to next tab (for Tribal Wars players)'},
                    {value: 'openapp', label: 'Open App'}
                ]
            }
        }
    }
};
</script>