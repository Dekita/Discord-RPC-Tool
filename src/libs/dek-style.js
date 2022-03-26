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
(async $ => {"use strict";

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
    $.DekCheckBox = DekCheckBox;
    // $.setupDekCheckBox = (id, handler) => {
    //     return new DekCheckBox(id, handler);
    // };
})(window);
/**
* ■ ENDOF: dek-style.js
*/