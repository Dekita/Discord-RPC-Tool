/**
* system: Discord RPC Tool
* author: dekitarpg@gmail.com
*/
document.addEventListener('DOMContentLoaded', async (event) => {
    const options = {delay: 150, trigger: 'hover', container: 'body'};
    const tooltips = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    const tooltips_list = tooltips.map(e => new bootstrap.Tooltip(e, options));
    try {
        const converter = new showdown.Converter();
        // converter.setOption('tasklists', true);
        converter.setFlavor('github');
        const markdown  = await dekita_rpc.tryReadFile('../readme.md');
        const mark_area = document.getElementById('mark-area');
        mark_area.innerHTML = converter.makeHtml(markdown);
        const links = [].slice.call(mark_area.querySelectorAll('a'));
        for (const link of links) {
            if (link.querySelectorAll('img').length) continue;
            link.classList.add('hover-dark','hover-secondary')
            if (link.id.startsWith('how-to-install')) {
                link.classList.add('d-none');
            }
        }
    } catch (error) {
        console.error(error);
    }
    dekita_rpc.sendReadyEvent('child');
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

window.removeSRC = function(element) {
    element.src = element.src.replace('/src','');
}
