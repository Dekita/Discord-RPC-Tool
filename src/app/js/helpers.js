/**
* module: helpers
* system: Discord RPC Tool
* author: dekitarpg@gmail.com
* detail: contains commonly used helper functions
*/
export const getElement = id => document.getElementById(id);
export const getModal = id => new bootstrap.Modal(getElement(id), {});
export const queryAll = query => [...document.querySelectorAll(query)];
export const getValue = id => getElement(id)?.value || '';
export const setValue = (id, v, e=getElement(id)) => e.value = v;
export const getText = id => getElement(id)?.innerText || '';
export const setText = (id, v, e=getElement(id)) => e.innerText = v;
export const getImage = id => getElement(id)?.src || '';
export const setImage = (id, v, e=getElement(id)) => e.src = v;
export const getElementIndex = element => {
    return [...element.parentNode.children].indexOf(element);
}