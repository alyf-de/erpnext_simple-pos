/*
Copyright (C) 2019  Raffael Meyer
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.
You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

frappe.provide('erpnext.vue_simple_pos');

frappe.pages['vue-simple-pos'].on_page_load = function(wrapper) {
	frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Vue Simple POS',
		single_column: true
	});

	frappe.db.get_value('POS Settings', { name: 'POS Settings' }, 'is_online', (r) => {
		if (r && r.use_pos_in_offline_mode && !cint(r.use_pos_in_offline_mode)) {
			// online
			wrapper.vue_simple_pos = new erpnext['vue_simple_pos'].PointOfSale(wrapper);
			window.cur_pos = wrapper.vue_simple_pos;
		}
	});
};

frappe.pages['vue-simple-pos'].refresh = function(wrapper) {
	if (wrapper.vue_simple_pos) {
		cur_frm = wrapper.vue_simple_pos.frm;
	}
};

erpnext['vue_simple_pos'].PointOfSale = class PointOfSale {
	constructor(wrapper) {
		this.wrapper = $(wrapper)
			.find('.layout-main-section')
			.append(`<div id="app"></div>`);
		this.page = wrapper.page;
		this.currency = 'EUR';
		this.items = {};
		this.item_groups = [];

		const assets = [
			'assets/erpnext/js/pos/clusterize.js',
			'assets/vue_simple_pos/css/pos.css',
			'assets/vue_simple_pos/js/vue.js'
		];

		frappe.require(assets, () => {
			this.make();
		});
	}

	make() {
		return frappe.run_serially([
			() => this.set_online_status(),
			() => this.get_pos_settings(),
			() => this.get_items(),
			() => this.init_vue(),
			() => this.prepare_menu(),
			() => this.page.set_title(__('Simple Point of Sale')),
		]);
	}

	init_vue() {
		const me = this;
		this.vue = new Vue({
			el: '#app',
			data: {
				total: 0,
				currency: this.currency,
				items: this.items,
				item_groups: this.item_groups,
				cart: {}
			},
			template: frappe.templates["vue_simple_pos"],
			methods: {
				addToCart(item_code) {
					if (this.cart.hasOwnProperty(item_code)) {
						this.cart[item_code] += 1;
					} else {
						this.cart[item_code] = 1;
					}
					this.total += this.items[item_code].standard_rate;
				},
				removeFromCart(item_code) {
					if (this.cart[item_code] == 1) {
						delete this.cart[item_code];
					} else {
						this.cart[item_code] -= 1;
					}
					this.total -= this.items[item_code].standard_rate;
				},
				makePayment() {
					// make payment modal
					me.payment = new Payment({
						currency: this.currency,
						events: {
							submit_form: (amount) => {
								me.submit_sales_invoice(this.cart, amount)
									.then(() => this.resetCart());
							},
							make_new_cart: () => {
								this.resetCart();
							},
						},
						amount: this.total,
						cart: this.cart,
						items: this.items
					});
					me.payment.open_modal();
				},
				formatCurrency(amount) {
					return format_currency(amount, this.currency);
				},
				cartIsEmpty() {
					return $.isEmptyObject(this.cart);
				},
				noItems() {
					return $.isEmptyObject(this.items);
				},
				resetCart() {
					this.cart = {};
					this.total = 0;
				},
				__(msg) {
					/* Return translation of msg or msg, 
					  if there is no translation */
					return frappe._messages[msg] || msg;
				}
			}
		});
	}

	set_online_status() {
		this.connection_status = false;
		this.page.set_indicator(__("Offline"), "grey");
		frappe.call({
			method: "frappe.handler.ping",
			callback: r => {
				if (r.message) {
					this.connection_status = true;
					this.page.set_indicator(__("Online"), "green");
				}
			}
		});
	}

	get_pos_settings() {
		const me = this;
		return frappe.call({
			method: "frappe.client.get",
			args: {
				doctype: "Simple POS Settings"
			},
			callback(r) {
				if (r.message) {
					var pos_settings = r.message;
					me.display_free_items = pos_settings.display_free_items;
					return me.get_pos_profile(pos_settings.pos_profile);
				}
			}
		});
	}

	get_pos_profile(pos_profile) {
		const me = this;
		return frappe.call({
			method: "frappe.client.get",
			args: {
				doctype: "POS Profile",
				name: pos_profile
			},
			callback(r) {
				if (r.message) {
					var pos_profile = r.message;
					me.pos_profile = pos_profile;
					me.currency = pos_profile.currency;
					me.item_groups = pos_profile.item_groups.map(a => a.item_group);
				}
			}
		});
	}

	submit_sales_invoice(cart, amount) {
		return frappe.call({
			method: "vue_simple_pos.vue_simple_pos.page.vue_simple_pos.vue_simple_pos.submit_sales_invoice",
			args: {
				cart: cart || {},
				amount: amount || 0,
			},
			callback: (data) => {
				const sinv_name = data.message;
				frappe.show_alert({
					indicator: 'green',
					message: __(`Sales invoice ${sinv_name} created succesfully`)
				});
			}
		});
	}

	get_items() {
		const me = this;
		return frappe.call({
			method: "vue_simple_pos.vue_simple_pos.page.vue_simple_pos.vue_simple_pos.get_items",
			callback: (response) => {
				me.items = response.message;
			}
		});
	}

	prepare_menu() {
		this.page.clear_menu();

		this.page.add_menu_item(__('POS Profile'),
			() => frappe
				.set_route('Form', 'POS Profile', this.pos_profile.name)
		);

		this.page.add_menu_item(__('Settings'),
			() => frappe.set_route('Form', 'Simple POS Settings')
		);
	}
};

// --------------------------------- Payment --------------------------------- //

class Payment {
	constructor({ currency, events, amount, cart, items }) {
		this.currency = currency;
		this.amount = amount;
		this.mode_of_payment = __('Cash');
		this.events = events;
		this.cart = [];

		for (let cart_item in cart) {
			let list_el = {
				code: cart_item,
				qty: cart[cart_item],
				name: items[cart_item].item_name,
				rate: format_currency(items[cart_item].standard_rate, this.currency),
				thumbnail: items[cart_item].thumbnail
			};
			this.cart.push(list_el);
		}

		frappe.run_serially([
			this.make(),
			this.set_item_overview(),
			this.set_primary_action(),
			this.set_secondary_action(),
		]);
	}

	open_modal() {
		this.dialog.show();
	}

	make() {
		frappe.flags.change_amount = true;
		this.dialog = new frappe.ui.Dialog({
			title: __('Total Amount {0}', [format_currency(this.amount, this.currency)]),
			width: 800,
			fields: [
				{
					fieldtype: 'HTML',
					fieldname: 'overview',
				},
			],
		});
	}

	set_item_overview() {
		const html = frappe.render_template(frappe.templates["modal"], {
			currency: this.currency,
			cart: this.cart,
			no_items: frappe._("No items in cart.")
		});
		this.dialog.fields_dict.overview.$wrapper.html(html);
	}

	set_primary_action() {
		var me = this;

		this.dialog.set_primary_action(__("Submit"), function() {
			me.dialog.hide();
			me.events.submit_form(me.amount);
		})
			.removeClass('btn-sm')
			.addClass('btn-lg');
	}

	set_secondary_action() {
		this.dialog.get_close_btn()
			.removeClass('btn-sm')
			.addClass('btn-lg');
	}

	set_reset_action() {
		const me = this;
		const btn = $(`<button>${__('Reset')}</button>`)
			.addClass('btn btn-default btn-lg')
			.on('click', function() {
				me.dialog.hide();
				me.events.make_new_cart();
			});

		this.dialog.header.append(btn);
	}
}
