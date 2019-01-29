# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from . import __version__ as app_version

app_name = "vue_simple_pos"
app_title = "Vue Simple POS"
app_publisher = "Raffael Meyer"
app_description = "Simplified POS based on Vue"
app_icon = "octicon octicon-file-directory"
app_color = "grey"
app_email = "raffael@alyf.de"
app_license = "MIT"

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
## app_include_css = "/assets/simple_pos/css/simple_pos.css"
# app_include_js = "/assets/simple_pos/js/simple_pos.js"
app_include_js = "/assets/vue_simple_pos/js/vue.js"

# include js, css files in header of web template
# web_include_css = "/assets/simple_pos/css/simple_pos.css"
# web_include_js = "/assets/simple_pos/js/simple_pos.js"
# web_include_js = "https://unpkg.com/vue"

# include js in page
# page_js = {"page" : "public/js/file.js"}
# page_js = {"vue-simple-pos": "public/js/vue.js"}

# include js in doctype views
# doctype_js = {"doctype" : "public/js/doctype.js"}
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
#	"Role": "home_page"
# }

# Website user home page (by function)
# get_website_user_home_page = "simple_pos.utils.get_home_page"

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# Installation
# ------------

# before_install = "simple_pos.install.before_install"
# after_install = "simple_pos.install.after_install"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "simple_pos.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
# 	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }
#
# has_permission = {
# 	"Event": "frappe.desk.doctype.event.event.has_permission",
# }

# Document Events
# ---------------
# Hook on document methods and events

# doc_events = {
# 	"*": {
# 		"on_update": "method",
# 		"on_cancel": "method",
# 		"on_trash": "method"
#	}
# }

# Scheduled Tasks
# ---------------

# scheduler_events = {
# 	"all": [
# 		"simple_pos.tasks.all"
# 	],
# 	"daily": [
# 		"simple_pos.tasks.daily"
# 	],
# 	"hourly": [
# 		"simple_pos.tasks.hourly"
# 	],
# 	"weekly": [
# 		"simple_pos.tasks.weekly"
# 	]
# 	"monthly": [
# 		"simple_pos.tasks.monthly"
# 	]
# }

# Testing
# -------

# before_tests = "simple_pos.install.before_tests"

# Overriding Whitelisted Methods
# ------------------------------
#
# override_whitelisted_methods = {
# 	"frappe.desk.doctype.event.event.get_events": "simple_pos.event.get_events"
# }
