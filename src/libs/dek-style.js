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

class DekCheckBox {
    constructor(html_id, on_click_handler) {
        this.id = html_id;
        this.element = document.getElementById(this.id);
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
        let handler_value = this.chinput.value;
        if (this.ismulti) return handler_value.split(',');
        else if (this.idcheck) return Number(handler_value);
        return handler_value;
    }
    get enabled() {
        return this.ismulti && this.getValue()[0] === '0';
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
        this._ul.classList.add('thin-scroller', 'primary-scroller');
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
            if (event.target.nodeName === 'LI') this.set(event.target.innerText);
        });
    }
    set(value) {
        this._value.value = value;
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
    setOptions(options, id=0) {
        this.clearOptions();
        for (const option of options) {
            this.addOption(option);
        }
        this.setToID(id);
    }
    addOption(option) {
        const item = document.createElement('li');
        item.innerText = option;
        this._ul.append(item);
    }
    setToID(option_id) {
        const elements = this._ul.querySelectorAll('li');
        const item = [].slice.call(elements)[option_id];
        if (item) this.set(item.innerText);
    }
}

DekSelect.cache = {};

// helper function for loading theme data from local storage
function loadCustomthemeFromStorage(css_string) {
    // const css_sheet = document.getElementById('theme-style-css');
    const css_properties = css_string || localStorage.getItem('dek-theme').split(';');
    for (const property of css_properties) {
        const trimmed = property.trim();
        if (!trimmed.startsWith('--dek-')) continue;
        const [prop, val] = trimmed.split(':');
        document.documentElement.style.setProperty(prop, val);
    }
}
/**
* Events:
*/
document.addEventListener('DOMContentLoaded', async event => {
    const selectors = document.getElementsByClassName('dekselect');
    for (const element of [...selectors]) new DekSelect(element);
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