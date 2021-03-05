<template>
    <section>
        <LinkBar /><br /><br />

        <b-sidebar
                type="is-light"
                right
                fullheight
                :open.sync="showShortcutHelp">
            <div class="content p-1">
                <h3 class="subtitle">Supported keyboard shortcuts</h3>
                <p>Key combos are zero or more modifiers (<code>ctrl</code>, <code>shift</code>, etc.) plus one regular key (letter keys, number keys, arrow keys, etc), all joined with <code>+</code> signs (for keys to be pressed at the same time) or spaces (for keys to be pressed one after another.</p>
                <p><strong>Note that you have to use <code>+</code> rather than <code>-</code> to signify pressing keys at the same time. Example: <code>ctrl+b</code> will work but <code>ctrl-b</code> will not.</strong></p>
                <p>Here are a couple examples:</p>
                <ul>
                    <li><code>t</code></li>
                    <li><code>ctrl+l</code> (hold ctrl and press l)</li>
                    <li><code>t g</code> (press t then g)</li>
                    <li><code>shift+h</code></li>
                    <li><code>ctrl+shift+⇑+pageup</code></li>
                    <li><code>alt+f7 r</code> (hold alt and press F7, release, then press r)</li>
                </ul>
                <p>The following modifiers are available: <code>⇑</code>, <code>shift</code>, <code>option</code>, <code>⌥</code>, <code>alt</code>, <code>ctrl</code>, <code>control</code>, <code>command</code>, and <code>⌘</code>.</p>
                <p>In addition to regular letters, numbers, and punctuation, the following special keys can be used for shortcuts: <code>backspace</code>, <code>tab</code>, <code>clear</code>, <code>enter</code>, <code>return</code>, <code>esc</code>, <code>escape</code>, <code>space</code>, <code>up</code>, <code>down</code>, <code>left</code>, <code>right</code>, <code>home</code>, <code>end</code>, <code>pageup</code>, <code>pagedown</code>, <code>del</code>, <code>delete</code> and <code>f1</code> through <code>f19</code>.</p>
            </div>
        </b-sidebar>

        <b-sidebar
                type="is-light"
                right
                fullheight
                :open.sync="showBehaviorHelp">
            <div class="content p-1">
                <h3 class="subtitle">Behaviors</h3>
                <p>Here is a <a href="https://github.com/mikecrittenden/shortkeys/wiki/How-To-Use-Shortkeys#full-list-of-commands">full list of commands</a> with explanations of what each one does.</p>
                <p>Note that Shortkeys makes some behaviors are available in the browser's built in Keyboard Shortcuts UI. Here's some <a href="https://github.com/mikecrittenden/shortkeys/wiki/FAQs-and-Troubleshooting#Do_I_use_the_browsers_Keyboard_Shortcuts_settings_or_the_Shortkeys_options_page">more info about that</a>.</p>
            </div>
        </b-sidebar>

        <b-tabs v-model="activeTab" type="is-toggle" expanded>
            <b-tab-item label="Shortcuts">
                <b-table
                        :data="keys"
                        ref="table"
                        detailed
                        detail-key="key"
                        :show-detail-icon="showDetailIcon">

                    <template slot-scope="props">
                        <b-table-column field="key" label="Shortcut" sortable>
                            <b-field>
                                <b-input placeholder="Example: ctrl+a" v-model="props.row.key"/>
                            </b-field>
                        </b-table-column>

                        <b-table-column field="label" label="Label" sortable>
                            <b-field>
                                <b-input v-model="props.row.label"/>
                            </b-field>
                        </b-table-column>

                        <b-table-column field="action" label="Behavior" sortable>
                            <b-field>
                                <b-select v-model="props.row.action">
                                    <optgroup v-for="(group, name) in actions" :label="name">
                                        <option v-for="option in group" :value="option.value">{{ option.label }}</option>
                                    </optgroup>
                                </b-select>
                            </b-field>
                        </b-table-column>

                        <b-table-column field="delete">
                            <b-button rounded icon-right="delete" @click="deleteShortcut(props.row)" />
                        </b-table-column>
                    </template>

                    <template slot="detail" slot-scope="props">
                        <b-message title="Try the browser's keyboard shortcut settings" type="is-info" v-show="isBuiltIn(props.row.action)" aria-close-label="Close message">
                            This action is supported from the browser's keyboard shortcuts settings, which
                            will allow it to run on the new tab page and when the address bar is focused, etc. The downside is that the browser
                            is more restrictive about which shortcuts are supported, and you can't enable or disable on certain websites or
                            when typing in form fields.<br /><br />To try it, <strong>go back to the extensions page, click the menu icon
                            at the top left, then click "Keyboard Shortcuts"</strong>. You can still add it here as well.
                            <a href="https://github.com/mikecrittenden/shortkeys/wiki/FAQs-and-Troubleshooting#Do_I_use_the_browsers_Keyboard_Shortcuts_settings_or_the_Shortkeys_options_page">More information...</a>
                        </b-message>
                        <div class="columns">
                            <div class="column">
                                <h5 class="title is-5">Shortcut settings</h5>

                                <b-switch
                                        v-model="props.row.smoothScrolling"
                                        v-show="props.row.action === 'scrolldown' || props.row.action === 'scrolldownmore' || props.row.action === 'pagedown' || props.row.action === 'scrollup' || props.row.action === 'scrollupmore' || props.row.action === 'pageup' || props.row.action === 'scrollright' || props.row.action === 'scrollrightmore' || props.row.action === 'scrollleft' || props.row.action === 'scrollleftmore' || props.row.action === 'top' || props.row.action === 'bottom'"
                                >
                                    Smooth scrolling
                                </b-switch>

                                <b-switch
                                        v-model="props.row.currentWindow"
                                        v-show="props.row.action === 'gototab' || props.row.action === 'gototabbytitle'"
                                >
                                    Search in current window only
                                </b-switch>

                                <b-field label="Bookmark" v-show="props.row.action === 'openbookmark' || props.row.action === 'openbookmarknewtab' || props.row.action === 'openbookmarkbackgroundtab' || props.row.action === 'openbookmarkbackgroundtabandclose'">
                                    <b-select v-model="props.row.bookmark" >
                                        <option v-for="bookmark in bookmarks" :value="bookmark">{{ bookmark }}</option>
                                    </b-select>
                                </b-field>

                                <b-field label="Javascript code" v-show="props.row.action === 'javascript'">
                                    <b-input type="textarea" v-model="props.row.code"></b-input>
                                </b-field>

                                <b-field label="Text to match (wildcards accepted)" v-show="props.row.action === 'gototabbytitle'">
                                    <b-input type="textarea" v-model="props.row.matchtitle"></b-input>
                                </b-field>

                                <b-field v-show="props.row.action === 'gototab'">
                                    <template slot="label">
                                        URL to match (<a target="_blank" href="https://developer.chrome.com/extensions/match_patterns">Examples</a>)
                                    </template>
                                    <b-input type="textarea" v-model="props.row.matchurl"></b-input>
                                </b-field>

                                <b-field label="URL to open if no matching tab found" v-show="props.row.action === 'gototab'">
                                    <b-input type="textarea" v-model="props.row.openurl"></b-input>
                                </b-field>

                                <b-field label="Tab index (starts from 1)" v-show="props.row.action === 'gototabbyindex'">
                                    <b-input type="number" v-model="props.row.matchindex"></b-input>
                                </b-field>

                                <b-field label="Button selector (example: #troop_confirm_go or .button_class_123)" v-show="props.row.action === 'buttonnexttab'">
                                    <b-input type="text" v-model="props.row.button"></b-input>
                                </b-field>

                                <b-field label="App ID to open (Can be found on extensions management page)" v-show="props.row.action === 'openapp'">
                                    <b-input type="text" v-model="props.row.openappid"></b-input>
                                </b-field>

                                <b-field label="Keyboard shortcut to trigger" v-show="props.row.action === 'trigger'">
                                    <b-input type="text" v-model="props.row.trigger"></b-input>
                                </b-field>
                            </div>
                            <div class="column">
                                <h5 class="title is-5">Activation settings</h5>
                                <b-field>
                                    <b-switch v-model="props.row.activeInInputs">
                                        Active while in inputs
                                    </b-switch>
                                </b-field>
                                <b-field>
                                    <b-select v-model="props.row.blacklist">
                                        <option v-for="option in websites" :value="option.value | false">{{ option.label }}</option>
                                    </b-select>
                                </b-field>
                                <b-field>
                                    <b-input type="textarea" v-show="props.row.blacklist && props.row.blacklist != 'false'" v-model="props.row.sites" />
                                </b-field>
                            </div>
                        </div>
                    </template>
                </b-table>
                <br /><br />
                <div class="level">
                    <div class="level-left">
                        <b-field>
                            <b-button @click="keys.push({})">Add shortcut</b-button>
                        </b-field>
                    </div>
                    <div class="level-right">
                        <b-field>
                            <b-button @click="saveShortcuts">Save shortcuts</b-button>
                        </b-field>
                    </div>
                </div>
            </b-tab-item>
            <b-tab-item label="Import">
                <b-field>
                    <b-input type="textarea" v-model="importJson" />
                </b-field>
                <div class="level">
                    <div class="level-left"></div>
                    <div class="level-right">
                        <b-field>
                            <b-button @click="importKeys">Import</b-button>
                        </b-field>
                    </div>
                </div>
            </b-tab-item>
            <b-tab-item label="Export">
                <pre>{{ keys }}</pre>
            </b-tab-item>
        </b-tabs>
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
        saveShortcuts: function() {
            this.keys.forEach((key) => {
                key.sites = key.sites || "";
                key.sitesArray = key.sites.split('\n');
                delete key.sidebarOpen;
            });
            localStorage.shortkeys = JSON.stringify({keys: this.keys});
            this.$buefy.snackbar.open(`Shortcuts have been saved!`);
        },
        importKeys: function() {
            this.keys = this.keys.concat(JSON.parse(this.importJson));
            this.$buefy.snackbar.open(`Imported successfully!`);
        },
        deleteShortcut: function (key) {
            this.$buefy.dialog.confirm({
                message: 'Delete this shortcut?',
                onConfirm: () => this.keys = this.keys.filter(curKey => key.key !== curKey.key)
            });
        },
        isBuiltIn: function (action) {
            let builtIn = false;
            for (const category in this.actions) {
                this.actions[category].forEach(actionType => {
                    if (actionType.value === action) {
                        builtIn = actionType.builtin;
                    }
                });
            }
            return builtIn;
        },
    },
    data() {
        return {
            activeTab: 0,
            importJson: "",
            showDetailIcon: true,
            showShortcutHelp: false,
            showBehaviorHelp: false,
            keys: localStorage.shortkeys ? JSON.parse(localStorage.shortkeys).keys : [{}],
            websites: [
                {value: false, label: 'All sites'},
                {value: true, label: 'All sites except...'},
                {value: 'whitelist', label: 'Only on specific sites'}
            ],
            bookmarks: [],
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
                    {value: 'lastusedtab', label: 'Switch to last used tab'},
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
                    {value: 'openapp', label: 'Open App'},
                    {value: 'capturescreenshot', label: 'Capture current viewport screenshot'},
                    {value: 'capturefullsizescreenshot', label: 'Capture full size screenshot (max height is 16,348px due to browser limitation)'},
                    {value: 'forcecapturefullsizescreenshot', label: 'Force capture full size screenshot (when window is not scrollable)'}
                ]
            }
        }
    },
    async created() {
        const processBookmarks = (bookmarks) => {
            for (let i = 0; i < bookmarks.length; i++) {
                let bookmark = bookmarks[i];
                if (bookmark.url) {
                    this.bookmarks.push(bookmark.title)
                }
                if (bookmark.children) {
                    processBookmarks(bookmark.children);
                }
            }
        };
        chrome.bookmarks.getTree(processBookmarks)
    },
};
</script>