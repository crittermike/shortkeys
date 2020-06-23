<div class="form-group">
    <label>Websites</label>
    <select ng-model="key.blacklist" class="form-control">
        <option value="false">All sites</option>
        <option value="true">All sites except...</option>
        <option value="whitelist">Only on specific sites</option>
    </select>
</div>
<div ng-show="key.blacklist && key.blacklist !== 'false'" class="form-group">
    <label>URLs (one per line)</label>
    <textarea ng-model="key.sites" class="form-control"></textarea>
</div>

<template>

</template>