/*: ==========================================================================
* ############################################################################
*
* Author: DekitaRPG [dekitarpg.com] (dekitarpg@gmail.com)
*
* ############################################################################
* ============================================================================
*
* Usage:
* Add 'dekcheckbox' class to a div. (optional multicheck and idcheck)
* Add ul (optional 'radio' class to show round radio buttons)
* Add li items (give 'checked' class to check item by default)
*
* NOTE:
* add 'd-block mx-auto' to 'dekcheckbox' div to center content in page.
* add 'list-inline' to 'ul' to display inline
* --- also add 'list-inline-item' to each 'li' within
*
* <div class="dekcheckbox multicheck idcheck" id="">
*   <ul class="dekcheckradio">
*     <li class="checked">Option 1</li>
*     <li class="checked">Option 2</li>
*     <li class="">Other...</li>
*   </ul>
* </div>
*
* Example JS to setup checkboxes:
* const dekcheckboxes = {};
* for (const dekcheck of document.getElementsByClassName('dekcheckbox')) {
*     dekcheckboxes[dekcheck.id] = new DekCheckBox(dekcheck.id, value => {
*         console.log('clicked checkbox', value);
*     });
* };
* dekcheckboxes['some-id'].setActive(2);
* console.log('dekcheckboxes:', dekcheckboxes)
*
* ============================================================================
* Visit www.dekitarpg.com for more!
* ============================================================================
*/

const DEKCHECKICONS = {
    check:{ on: ["far","fa-check-square"], off: ["far","fa-square"] },
    radio:{ on: ["far","fa-times-circle"], off: ["far","fa-circle"] },
};

class DekCheckBox extends EventTarget {
    constructor(element, on_click_handler) {
        super();

        this.element = element;//document.getElementById(id);
        this._id = this.element.id;
        DekCheckBox.cache[this._id] = this;

        this.checkul = this.element.getElementsByTagName("UL")[0];
        this.chinput = this.element.getElementsByTagName("INPUT")[0];
        if (!this.chinput) this.chinput = document.createElement('input');
        this.options = this.element.getElementsByTagName("LI");
        this.idcheck = this.element.classList.contains('idcheck');
        this.ismulti = this.element.classList.contains('multicheck');
        this.isradio = this.checkul.classList.contains("radio");
        this.handler = on_click_handler;
        for (const li of this.options) {
            const icon = document.createElement("i");
            const span = document.createElement("span");
            span.innerHTML = li.innerHTML;
            li.innerHTML = "";
            li.appendChild(icon);
            li.appendChild(span);
            li.onclick = click_event => {
                this.updateSyblings(li);
                this.updateValue();
                this.updateIcon(li);
                this.dispatchEvent(new Event('click'));
                if (this.handler) {
                    this.handler(this.getValue());
                }
            }
            this.updateIcon(li);
        }
        this.updateValue();
    }
    updateSyblings(li) {
        if (this.ismulti && li) {
            if (li.classList.contains('checked')){
                li.classList.remove('checked');
            } else {
                li.classList.add('checked');
            }
            this.updateIcon(li);
        } else {
            for (const sibling of this.options) {
                if (sibling !== li) {
                    sibling.classList.remove("checked");
                    this.updateIcon(sibling);
                }
            }
            if (li) li.classList.add('checked');
        }
    };
    updateIcon(li) {
        li = li || this.options[0];
        const icon = li.getElementsByTagName("i")[0];
        const icon_type = this.isradio ? "radio" : "check";
        const icon_data = DEKCHECKICONS[icon_type];
        if (li.classList.contains('checked')){
            icon.classList.remove(...icon_data.off);
            icon.classList.add(...icon_data.on);
        } else {
            icon.classList.remove(...icon_data.on);
            icon.classList.add(...icon_data.off);
        };
    };
    updateValue(){
        this.chinput.value = this.getLiNumVal();
        if (!this.ismulti && !this.idcheck){
            const checked_val = this.checkul.getElementsByClassName('checked')[0];
            const checked_span = checked_val.getElementsByTagName("span")[0];
            this.chinput.value = checked_span.innerHTML;
        };
    };
    getLiNumVal() {
        let value = [];
        for (var i = this.options.length - 1; i >= 0; i--) {
            if (this.options[i].classList.contains('checked')){
                this.ismulti ? value.push(i) : value = i;
            };
        }
        return this.ismulti ? value.reverse().join(',') : value;
    };
    setActive(index) {
        this.updateSyblings();
        this.updateValue();
        this.updateIcon();
        if (this.options[index]) {
            this.options[index].click();
        } else if (this.handler) {
            this.handler(this.getValue());
        }
    }
    getValue() {
        const handler_value = this.chinput.value;
        if (this.ismulti) return handler_value.split(',');
        else if (this.idcheck) return Number(handler_value);
        return handler_value;
    }
    get enabled() {
        return this.ismulti && this.getValue()[0] === '0';
    }
    set enabled(boolean) {
        if (!this.ismulti) return;
        this.setActive(boolean ? 0 : null);
    }
}

/**
// Syntax:
<select class="dekselect sel-blue" id="image-select-one">
    <option> Option 1 </option>
    <option> Option 2 </option>
    <option> Option 3 </option>
</select>

// Creates: (and hides select element)
<a class="btn btn-select sel-blue">
  <span class="btn-select-value"></span>
  <span class="btn-select-arrow"></span>
  <ul>
    <li>Option 1</li>
    <li>Option 2</li>
    <li>Option 3</li>
  </ul>
</a>

*/
class DekSelect extends EventTarget {
    constructor() { super(); this.initialize(...arguments) };
    get visible() { return this._ul?.classList.contains('d-block') };
    get value() { return this._value?.value };
    get area() { return this._a };

    initialize(element) {
        this._element = element;//document.getElementById(id);
        this._id = this._element.id;
        DekSelect.cache[this._id] = this;

        const klass_filter = klass => !['dekselect'].includes(klass);
        const classlist = [...this._element.classList].filter(klass_filter);
        this._element.classList.add('d-none');
        this._a = document.createElement('a');
        this._a.classList.add('form-control', 'form-control-sm', 'btn-select', ...classlist);
        this._value = document.createElement('input');
        this._value.classList.add('form-control', 'btn-select-value');
        this._value.setAttribute('disabled', true);

        this._arrow = document.createElement('span');
        this._arrow.classList.add('btn-select-arrow');

        this._i = document.createElement('i');
        this._i.classList.add('fas', 'fa-fw', 'fa-arrow-down');
        this._arrow.append(this._i);

        this._ul = document.createElement('ul');
        this._ul.classList.add('thin-scroller');
        this._a.append(this._value, this._arrow, this._ul);

        this._element.parentElement.insertBefore(this._a, this._element.nextSibling);

        // set initial options:
        const options = [...this._element.options];
        this.setOptions(options.map(e=>e.text));
        this._initListener();
    }
    _initListener(){
        this._a.addEventListener('click', async event => {
            this._ul.classList.contains('d-block') ? this.hide() : this.show();
            const item = event.target.closest('li');
            if (item) this.set(item.dataset.value);
        });
    }
    set(value) {
        this._value.value = value;
        // show the options thumbnail (if it has one) beside the value
        const image = this._images?.[value];
        this._value.style.backgroundImage = image ? `url("${image}")` : '';
        this._value.classList.toggle('has-thumb', !!image);
        for (const item of this._ul.children) {
            item.classList.toggle('selected', item.dataset.value === value);
        }
        this.dispatchEvent(new Event('change'));
    }
    hide() {
        this._a.classList.remove('active');
        this._ul.classList.remove('d-block');
        this._ul.classList.add('d-none');
        this.dispatchEvent(new Event('hide'));
    }
    show() {
        this._a.classList.add('active');
        this._ul.classList.remove('d-none');
        this._ul.classList.add('d-block');
        this.dispatchEvent(new Event('show'));
    }
    clearOptions(){
        while (this._ul.firstChild) {
            this._ul.removeChild(this._ul.firstChild);
        }
    }
    // images: optional {option: image_url} shown as thumbnails
    setOptions(options, id=0, images={}) {
        this.clearOptions();
        this._images = images;
        for (const option of options) {
            this.addOption(option, images[option]);
        }
        this.setToID(id);
    }
    addOption(option, image=null) {
        const item = document.createElement('li');
        item.dataset.value = option;
        if (image) {
            const thumb = document.createElement('img');
            thumb.classList.add('btn-select-thumb');
            thumb.setAttribute('loading', 'lazy');
            thumb.setAttribute('draggable', false);
            thumb.src = image;
            item.append(thumb);
        }
        const label = document.createElement('span');
        label.innerText = option;
        item.append(label);
        this._ul.append(item);
    }
    setToID(option_id) {
        if (option_id < 0) option_id = 0;
        const elements = [...this._ul.querySelectorAll('li')];
        if (elements[option_id]) this.set(elements[option_id].dataset.value);
    }
    setToValue(value) {
        const elements = [...this._ul.querySelectorAll('li')];
        const id = elements.findIndex(item => item.dataset.value === value);
        if (id >= 0) this.setToID(id);
    }
}

DekCheckBox.cache = {};
DekSelect.cache = {};

/**
* Events:
*/
document.addEventListener('DOMContentLoaded', async event => {
    const selectors = document.getElementsByClassName('dekselect');
    for (const element of [...selectors]) new DekSelect(element);

    const checkers = document.getElementsByClassName('dekcheckbox');
    for (const element of [...checkers]) new DekCheckBox(element, (handler)=>{});
});

// listen for, and intercept clicks out of dekselect areas
// and then hide any area currently showing;
document.addEventListener('click', async event => {
    for (const dekselect of Object.values(DekSelect.cache)) {
        const in_area = dekselect.area.contains(event.target);
        if (!in_area && dekselect.visible) dekselect.hide();
    }
});
/**
* ■ ENDOF: dek-style.js
*/