'''
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
'''

from __future__ import unicode_literals
import frappe
from frappe import _
import json


@frappe.whitelist()
def submit_sales_invoice(cart, amount=0, company=''):
    settings = frappe.get_doc('Simple POS Settings')
    defaults = frappe.defaults.get_defaults()

    if not company:
        company = defaults.get('company')

    cart = json.loads(cart)
    # items doctype: Sales Invoice Item
    items = [{'qty': qty, 'item_code': code} for code, qty in cart.items()]
    sinv = frappe.get_doc({
        'doctype': 'Sales Invoice',
        'company': company,
        # 'selling_price_list': defaults.get('selling_price_list'),
        'is_pos': 1,
        'pos_profile': settings.get('pos_profile'),
        'items': items,
        'payments': [
            # doctype: Sales Invoice Payment
            {
                'mode_of_payment': _('Cash'),
                'amount': amount
            }
        ]
    })

    sinv.set_missing_values()

    try:
        sinv.insert()
        sinv.submit()
        frappe.db.commit()
    except Exception:
        if frappe.message_log:
            frappe.message_log.pop()
        frappe.db.rollback()
        frappe.log_error(frappe.get_traceback())

    return sinv.name

@frappe.whitelist()
def get_items():
    settings = frappe.get_doc('Simple POS Settings')
    pos_profile = frappe.get_doc('POS Profile', settings.get('pos_profile'))
    item_groups = [ig.item_group for ig in pos_profile.item_groups]

    fields = ['item_code', 'item_name', 'thumbnail', 'standard_rate']
    filters = {
        'item_group': ['in', item_groups], 
        'has_variants': 0 
    }

    if settings.display_free_items:
        filters['standard_rate'] = ['>', 0]

    items = frappe.get_list('Item', filters=filters, fields=fields)
    return {item.item_code : item for item in items}
