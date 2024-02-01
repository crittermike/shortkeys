document.addEventListener('shortkeys_js_run', function(e) {
    let script = document.createElement('script')
    script.textContent = e.detail
    document.body.appendChild(script)
    document.body.removeChild(script)
});

