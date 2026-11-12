



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
    note.addEventListener('error', error => console.error('notification error:', error));
    setTimeout(() => note.close(), 10 * 1000);
}
