from __future__ import unicode_literals
from frappe import _


def get_data():
    return[
        {
            "label": _("POS"),
            "icon": "octicon octicon-git-compare",
            "items": [
                {
                    "type": "page",
                    "name": "vue_simple_pos",
                    "label": _("Vue Simple POS"),
                    "description": _("Simple Point of Sale based on Vue")
                }
            ]
        },
    ]
