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
		this.wrapper = $(wrapper).find('.layout-main-section');
		this.page = wrapper.page;
		// TODO: get item_group from POS Profile
		this.item_group = 'Stadionkarten';

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
			() => frappe.dom.freeze(),
			() => {
				this.prepare_dom();
				this.set_online_status();
			},
			() => this.get_items(),
			() => this.setup_company(),
			() => this.get_pos_profile(), // depends on company
			() => this.set_pos_values(),
			() => this.init_vue(), // depends on POS Values
			() => this.prepare_menu(), // depends on vue
			() => frappe.dom.unfreeze(),
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
				item_group: this.item_group,
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
								me.submit_sales_invoice(this.cart, amount);
								this.resetCart();
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

	prepare_dom() {
		this.wrapper.append(`<div id="app"></div>`);
	}

	get_pos_profile() {
		const args = {
			fields: "*",
			filters: { 'company': this.company }
		};
		return frappe.db.get_list('POS Profile', args).then(profiles => {
			if (profiles) {
				this.pos_profile = profiles[0];
			} else {
				msgprint(__('Please create a POS Profile'));
			}
		});
	}

	set_pos_values() {
		if (this.pos_profile) {
			this.currency = this.pos_profile.currency;
		} else {
			this.currency = frappe.sys_defaults.currency;
		}
	}

	submit_sales_invoice(cart, amount) {
		frappe.call({
			method: "vue_simple_pos.vue_simple_pos.page.vue_simple_pos.vue_simple_pos.submit_sales_invoice",
			args: {
				company: this.company || frappe.sys_defaults.company,
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

	get_promopt_fields() {
		return [{
			fieldtype: 'Link',
			label: __('POS Profile'),
			options: 'POS Profile',
			reqd: 1,
			get_query: () => {
				return {
					query: 'erpnext.accounts.doctype.pos_profile.pos_profile.pos_profile_query',
					filters: {
						company: this.company
					}
				};
			}
		}, {
			fieldtype: 'Check',
			label: __('Set as default')
		}];
	}

	setup_company() {
		const num_companies = frappe.get_list('Company').length;

		if (num_companies == 1) {
			this.company = frappe.sys_defaults.company;
			return;
		}

		return new Promise(resolve => {
			frappe.prompt({
				fieldname: "company",
				options: "Company",
				default: frappe.sys_defaults.company,
				fieldtype: "Link",
				label: __("Select Company"),
				reqd: 1
			}, (data) => {
				this.company = data.company;
				resolve(this.company);
			}, __("Select Company"));
		});
	}

	prepare_menu() {
		this.page.clear_menu();

		this.page.add_menu_item(__('POS Profile'), 
			() => frappe
				.set_route('Form', 'POS Profile', this.pos_profile.pos_profile_name)
		);

		this.page.add_menu_item(__('POS Settings'),
			() => frappe.set_route('Form', 'POS Settings')
		);
	}

	get_items() {
		const args = {
			fields: ['item_code', 'item_name', 'thumbnail', 'standard_rate'],
			filters: { 'item_group': this.item_group, 'has_variants': 0 }
		};
		return frappe.db.get_list('Item', args).then(items => {
			if (items) {
				this.items = items
					// show item only if it costs something 
					.filter(item => item.standard_rate > 0)
					// transform [ item_map, ... ] into { item_code : item_map , ... }
					.reduce((map, obj) => {
						map[obj.item_code] = obj;
						return map;
					}, {});
			} else {
				this.items = {};
			}
		});
	}
};

// --------------------------------- Payment --------------------------------- //

class Payment {
	constructor({ currency, events, amount, cart, items }) {
		this.currency = currency;
		this.amount = amount;
		this.mode_of_payment = __('Cash');
		this.events = events;
		this.cart = cart;
		this.items = {};

		// Assign items and format price
		for (var item in items) {
			this.items[item] = items[item];
			this.items[item].standard_rate = format_currency(items[item].standard_rate, this.currency);
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
					fieldtype: 'Currency',
					label: __('Paid'),
					options: this.currency,
					fieldname: 'amount_paid',
					default: this.amount,
					onchange: () => this.update_change_amount(),
				},
				{
					fieldtype: 'Column Break',
				},
				{
					fieldtype: 'Currency',
					label: __('Rückgeld'),
					options: this.currency,
					fieldname: "change_amount",
					default: 0,
					read_only: 1
				},
				{
					fieldtype: 'Section Break',
				},
				{
					fieldtype: 'HTML',
					fieldname: 'overview',
				},
			],
		});
	}

	init_vue() {
		const me = this;
		this.vue = new Vue({
			el: '#payment-items',
			data: {
				currency: this.currency,
				items: this.items,
				cart: this.cart,
			},
			template: frappe.templates["modal"],
			methods: {
				formatCurrency(amount) {
					return format_currency(amount, this.currency);
				},
				noItems() {
					return $.isEmptyObject(this.items);
				},
				__(msg) {
					/* Return translation of msg or msg, 
					  if there is no translation */
					return frappe._messages[msg] || msg;
				}
			}
		});
	}

	set_item_overview() {
		const html = frappe.render_template(frappe.templates["modal"], {
			currency: this.currency,
			items: this.items,
			cart: this.cart,
		});
		this.dialog.fields_dict.overview.$wrapper.html(html);
	}

	set_primary_action() {
		var me = this;

		this.dialog.set_primary_action(__("Submit"), function() {
			const amount = me.dialog.get_value('amount_paid');
			me.dialog.hide();
			me.events.submit_form(amount);
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

	update_change_amount() {
		let chng = this.amount - this.dialog.get_value('amount_paid');
		const change_amount = chng > 0 ? 0 : -chng;
		this.dialog.set_value("change_amount", change_amount);
	}
}
