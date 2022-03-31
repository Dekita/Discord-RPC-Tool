/**
* system: Discord RPCTool
* author: dekitarpg@gmail.com
*/
document.addEventListener('DOMContentLoaded', async (event) => {
    updateTheme(await app_config.get('gui-theme'));
    updateThemeColors(await app_config.get('gui-color'));

    const options = {delay: 150, trigger: 'hover', container: 'body'};
    const tooltips = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltips_list = tooltips.map(e => new bootstrap.Tooltip(e, options));
    try {
        const converter = new showdown.Converter();
        // converter.setOption('tasklists', true);
        converter.setFlavor('github');
        const markdown  = await dekita_rpc.tryReadFile('../readme.md');
        const mark_area = document.getElementById('mark-area');
        mark_area.innerHTML = converter.makeHtml(markdown);
        const links = [].slice.call(mark_area.querySelectorAll('a'));
        for (const link of links) {
            link.classList.add('hover-dark','hover-secondary')
            if (link.id.startsWith('how-to-install')) {
                link.classList.add('d-none');
            }
        }
        dekita_rpc.sendReadyEvent('child');
    } catch (error) {
        console.error(error);
    }
});
document.addEventListener('click', e => {
    let href;  const tag = e.target.tagName.toUpperCase();
    if (tag === 'A') href = e.target.getAttribute('href');
    if (['I','IMG'].includes(tag)) {
        href = e.target.parentElement.getAttribute('href');
    }
    if (!!href && !href.startsWith('#')) {
        dekita_rpc.openExternal(href);
        e.preventDefault();
    }
});

function removeSRC(element) {
    element.src = element.src.replace('/src','');
}
