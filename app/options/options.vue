<template>
    <section>
        <LinkBar />
        <div v-for="key in keys" :key="key.key">
            <ShortcutInput v-model="key.shortcut" />
            <LabelInput v-model="key.label" />
            <ActionSelect v-model="key.action" :options="actions" />
        </div>
        <AddButton v-on:add-shortcut="keys.push({})" />
        {{ keys }}
    </section>
</template>

<script>
import LabelInput from "./components/LabelInput";
import ShortcutInput from "./components/ShortcutInput";
import AddButton from "./components/AddButton";
import LinkBar from "./components/LinkBar";
import ActionSelect from "./components/ActionSelect";

export default {
    components: {
        ActionSelect,
        ShortcutInput,
        LinkBar,
        LabelInput,
        AddButton,
    },
    data() {
        return {
            keys: [{shortcut: '123', label: '456'}],
            actions: [
                {value: 'top', label: 'Scroll to top', group: 'Scrolling', builtin: true},
                {value: 'bottom', label: 'Scroll to bottom', group: 'Scrolling', builtin: true},
                {value: 'scrolldown', label: 'Scroll down', group: 'Scrolling', builtin: true},
                {value: 'scrolldownmore', label: 'Scroll down more', group: 'Scrolling', builtin: true},
                {value: 'pagedown', label: 'Page down', group: 'Scrolling', builtin: true},
                {value: 'scrollup', label: 'Scroll up', group: 'Scrolling', builtin: true},
                {value: 'scrollupmore', label: 'Scroll up more', group: 'Scrolling', builtin: true},
                {value: 'pageup', label: 'Page up', group: 'Scrolling', builtin: true},
                {value: 'scrollright', label: 'Scroll right', group: 'Scrolling', builtin: true},
                {value: 'scrollrightmore', label: 'Scroll right more', group: 'Scrolling', builtin: true},
                {value: 'scrollleft', label: 'Scroll left', group: 'Scrolling', builtin: true},
                {value: 'scrollleftmore', label: 'Scroll left more', group: 'Scrolling', builtin: true},
                {value: 'back', label: 'Go back', group: 'Location', builtin: true},
                {value: 'forward', label: 'Go forward', group: 'Location', builtin: true},
                {value: 'reload', label: 'Reload page', group: 'Location', builtin: true},
                {value: 'hardreload', label: 'Hard reload page (bypass cache)', group: 'Location', builtin: true},
                {value: 'copyurl', label: 'Copy URL', group: 'Location', builtin: true },
                {value: 'opensettings', label: 'Open Settings Page', group: 'Location', builtin: true },
                {value: 'openextensions', label: 'Open Extensions Page', group: 'Location', builtin: true },
                {value: 'openshortcuts', label: 'Open Keyboard Shortcuts Page', group: 'Location', builtin: true },
                {value: 'searchgoogle', label: 'Search Google for selected text', group: 'Location', builtin: true},
                {value: 'openbookmark', label: 'Open bookmark/bookmarklet in current tab', group: 'Bookmarks'},
                {value: 'openbookmarknewtab', label: 'Open bookmark/bookmarklet in new tab', group: 'Bookmarks'},
                {value: 'openbookmarkbackgroundtab', label: 'Open bookmark/bookmarklet in new background tab', group: 'Bookmarks'},
                {value: 'openbookmarkbackgroundtabandclose', label: 'Open bookmark/bookmarklet in new background tab and close immediately after load', group: 'Bookmarks'},
                {value: 'gototab', label: 'Jump to tab by URL', group: 'Tabs'},
                {value: 'gototabbytitle', label: 'Jump to tab by title', group: 'Tabs'},
                {value: 'gototabbyindex', label: 'Jump to tab by index', group: 'Tabs'},
                {value: 'newtab', label: 'New tab', group: 'Tabs', builtin: true},
                {value: 'closetab', label: 'Close tab', group: 'Tabs', builtin: true},
                {value: 'onlytab', label: 'Close other tabs', group: 'Tabs', builtin: true},
                {value: 'closelefttabs', label: 'Close tabs to the left', group: 'Tabs', builtin: true},
                {value: 'closerighttabs', label: 'Close tabs to the right', group: 'Tabs', builtin: true},
                {value: 'clonetab', label: 'Duplicate tab', group: 'Tabs', builtin: true},
                {value: 'movetabtonewwindow', label: 'Move tab to new window', group: 'Tabs', builtin: false},
                {value: 'reopentab', label: 'Reopen last closed tab', group: 'Tabs', builtin: true},
                {value: 'nexttab', label: 'Next tab', group: 'Tabs', builtin: true},
                {value: 'prevtab', label: 'Previous tab', group: 'Tabs', builtin: true},
                {value: 'firsttab', label: 'First tab', group: 'Tabs', builtin: true},
                {value: 'lasttab', label: 'Last tab', group: 'Tabs', builtin: true},
                {value: 'togglepin', label: 'Pin/unpin tab', group: 'Tabs', builtin: true},
                {value: 'togglemute', label: 'Mute/unmute tab', group: 'Tabs', builtin: true},
                {value: 'movetableft', label: 'Move tab left', group: 'Tabs', builtin: true},
                {value: 'movetabright', label: 'Move tab right', group: 'Tabs', builtin: true},
                {value: 'movetabtofirst', label: 'Move tab to first position', group: 'Tabs', builtin: true},
                {value: 'movetabtolast', label: 'Move tab to last position', group: 'Tabs', builtin: true},
                {value: 'newwindow', label: 'New window', group: 'Windows', builtin: true},
                {value: 'newprivatewindow', label: 'New private window', group: 'Windows', builtin: true},
                {value: 'closewindow', label: 'Close window', group: 'Windows', builtin: true},
                {value: 'fullscreen', label: 'Toggle fullscreen', group: 'Windows', builtin: true},
                {value: 'zoomin', label: 'Zoom In', group: 'Zooming', builtin: true},
                {value: 'zoomout', label: 'Zoom Out', group: 'Zooming', builtin: true},
                {value: 'zoomreset', label: 'Reset Zoom', group: 'Zooming', builtin: true},
                {value: 'javascript', label: 'Run JavaScript', group: 'Other'},
                {value: 'showlatestdownload', label: 'Show latest download', group: 'Other', builtin: true},
                {value: 'cleardownloads', label: 'Clear downloads', group: 'Other', builtin: true},
                {value: 'viewsource', label: 'View source', group: 'Other', builtin: true},
                {value: 'disable', label: 'Do nothing (disable browser shortcut)', group: 'Other', builtin: true},
                {value: 'trigger', label: 'Trigger another shortcut', group: 'Other'},
                {value: 'print', label: 'Print page', group: 'Other', builtin: true},
                {value: 'buttonnexttab', label: 'Click button and switch to next tab (for Tribal Wars players)', group: 'Other'},
                {value: 'openapp', label: 'Open App', group: 'Management'}
            ]
        }
    }
};
</script>