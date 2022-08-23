// Template js file for new pages/windows
// trigger by calling dekita_rpc.openChildWindow('template')
document.addEventListener('DOMContentLoaded', async (event) => {
    updateTheme(await app_config.get('gui-theme'));
    updateThemeColors(await app_config.get('gui-color'));
    
    const options = {delay: 150, trigger: 'hover', container: 'body'};
    const tooltips = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltips_list = tooltips.map(e => new bootstrap.Tooltip(e, options));

    // app/child window wont display until this event is received.  
    dekita_rpc.sendReadyEvent('template');
});