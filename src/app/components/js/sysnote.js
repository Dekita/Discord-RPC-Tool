



// System Notifications:
async function getNotifyPermission() {
    if (Notification.permission === "denied") return false;
    if (Notification.permission === "granted") return true;
    const permission = await Notification.requestPermission();
    return permission === "granted";
}

export async function popNotification(title, body, icon='img/icon.png') {
    if (!(await getNotifyPermission())) return; // check perms

    //! todo: add more functionality

    const note = new Notification(title, {body, icon});
    note.addEventListener('click', async () => {
        console.log('clicked notificator!');
    });
    note.addEventListener('close', async () => {
        console.log('closed notificator!');
    });
    note.addEventListener('error', async (error) => {
        console.log('notificator error:', error);
    });
    note.addEventListener('show', async () => {
        console.log('notificator shown!');
    });
    // RPCGUI.showAlert(body, 'danger', true);
    setTimeout(note.close(), 10 * 1000);
}
