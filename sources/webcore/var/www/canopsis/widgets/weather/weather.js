/*
#--------------------------------
# Copyright (c) 2011 "Capensis" [http://www.capensis.com]
#
# This file is part of Canopsis.
#
# Canopsis is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# Canopsis is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU Affero General Public License for more details.
#
# You should have received a copy of the GNU Affero General Public License
# along with Canopsis.  If not, see <http://www.gnu.org/licenses/>.
# ---------------------------------
*/

Ext.define('widgets.weather.weather' , {
	extend: 'canopsis.lib.view.cwidget',

	alias: 'widget.weather',
	logAuthor: '[widget][weather]',
	border: false,

	cls: 'widget-weather',

	wcontainer_autoScroll: true,
	wcontainer_layout: 'anchor',

	selector_record: undefined,
	sla_id: undefined,

	//brick options
	iconSet: '01',
	icon_on_left: false,
	defaultHeight: undefined,
	defaultPadding: undefined,
	defaultMargin: undefined,
	bg_impair_color: undefined,
	bg_pair_color: '#FFFFFF',

	base_config: undefined,

	simple_display: false,
	title_font_size: 14,
	display_report_button: false,
	display_derogation_icon: true,
	external_link: undefined,
	linked_view: undefined,
	helpdesk: undefined,
	icon_state_source: 'default',

	initComponent: function() {
		this.firstNodeIds = [];
		this.nodeDict = {};
		this.matchingDict = {};
		this.secondNodeIds = [];
		this.external_link_dict = {};

		this.list_meta_id = [];
		this.matchingDictMeta = {};

		log.debug('Initialize weather widget', this.logAuthor);
		if (this.exportMode || this.simple_display)
			this.wcontainer_autoScroll = false;

		this.configure();

		//---------------------Process nodes---------------
		for (var i = 0; i < this.nodes.length; i++) {
			var node = this.nodes[i];
			if (node._id)
				this.firstNodeIds.push(node._id);
			else
				this.firstNodeIds.push(node.id);
			if (node.link)
				this.external_link_dict[node.id] = node.link;
		}

		this.callParent(arguments);
	},

	doRefresh: function(from, to) {
		this.from = to
		this.to = to

		// Mode Live
		if (! this.reportMode && ! this.exportMode){
			this.getNodes(this.firstNodeIds, this.firstNodesCallback);
			return
		}

		// Mode Reporting/Exporting
		if (Ext.Object.getSize(this.nodeDict) == 0){
			this.getNodes(this.firstNodeIds, this.firstNodesCallback);
			return
		}

		// Mode Reporting
		if (this.reportMode){
			this.populateCheck()
			return
		}

	},

	getNodes: function(node_ids,callback) {
		log.debug('+ Get nodes', this.logAuthor);
		Ext.Ajax.request({
			url: this.uri,
			scope: this,
			method: 'GET',
			params: {ids: Ext.encode(node_ids)},
			success: callback,
			failure: function(result, request) {
				log.error('Impossible to get Node', this.logAuthor);
				global.notify.notify(_('Issue'), _("The selected selector can't be found"), 'info');
			}
		});
	},

	firstNodesCallback: function(response) {
		var nodes = Ext.JSON.decode(response.responseText).data;
		log.debug('Received '+nodes.length+' nodes from webserver',this.logAuthor)

		//create node dict
		for (var i = 0; i < nodes.length; i++) {
			var node = nodes[i];
			this.nodeDict[node['_id']] = {
											rk: node['_id'],
											_event: node
											};
		}

		if (this.icon_state_source != 'default')
			this.secondNodeCheck();
		else
			this.populateCheck();
	},

	secondNodeCheck: function() {
		//build list of second node ids if not already did
		if (this.secondNodeIds.length == 0) {
			log.debug('Building List of second ids to fetch', this.logAuthor);
			for (var i = 0; i < this.firstNodeIds.length; i++) {
				log.debug(' + Check if second node need for: ' + this.nodes[i]._id, this.logAuthor);

				var _id = this.firstNodeIds[i];
				var node_event = this.nodeDict[_id]._event;
				var event_type = node_event.event_type;

				if (event_type != this.icon_state_source) {
					log.debug('  +  event type different from icon state source', this.logAuthor);
					if (event_type == 'selector') {
						if (node_event.sla_rk) {
							this.secondNodeIds.push(node_event.sla_rk);
							this.nodeDict[_id].srk = node_event.sla_rk;
							this.matchingDict[node_event.sla_rk] = _id;
						}
					}else {
						if (node_event.selector_rk) {
							this.secondNodeIds.push(node_event.selector_rk);
							this.matchingDict[node_event.selector_rk] = _id;
							this.nodeDict[_id].srk = node_event.selector_rk;
						}
					}
				}
			}
		}

		if (this.secondNodeIds.length > 0) {
			log.debug(' + Fetch secondary nodes', this.logAuthor);
			this.getNodes(this.secondNodeIds, this.secondNodesCallback);
		}else {
			log.debug(' + No need to fetch more nodes, populating', this.logAuthor);
			this.populateCheck();
		}
	},

	secondNodesCallback: function(response) {
		var nodes = Ext.JSON.decode(response.responseText).data;

		for (var i = 0; i < nodes.length; i++) {
			var node = nodes[i];
			var _id = node._id;
			this.nodeDict[this.matchingDict[_id]].sevent = node;
		}

		this.populateCheck();
	},

	getPastNode: function(node_ids,from,to) {
		log.debug('+ Get perfstore values', this.logAuthor);

		//process meta_id to perfstore format
		var post_params = [];
		var list_meta = Ext.Object.getValues(this.matchingDictMeta);
		for (var i = 0; i < list_meta.length; i++)
			post_params.push({id: this.list_meta_id[i]});

		Ext.Ajax.request({
			url: '/perfstore/values/' + parseInt(from/1000) + '/' + parseInt(to/1000),
			scope: this,
			params: {'nodes': Ext.JSON.encode(post_params)},
			success: function(response) {
				var data = Ext.JSON.decode(response.responseText).data;
				var metric_dict = {};

				for (var i = 0; i < data.length; i++) {
					//console.log(data)
					var metric = data[i];
					var node_id = this.matchingDictMeta[metric.node];
					var node = this.nodeDict[node_id];
					var last_value = metric.values[metric.values.length - 1];

					if (metric.metric == 'cps_pct_by_state_0') {
						//for percent in sla
						if (node.metaIdPct && node.metaIdPct == metric.node) {
							var new_value = last_value[1];
							if (node._event.event_type == 'sla')
								node._event.perf_data_array[0].value = new_value;

							if (node.sevent && node.sevent.event_type == 'sla')
								node.sevent.perf_data_array[0].value = new_value;
						}
					}else {
						if (last_value && last_value[1]) {
							if (node.smetaId && node.smetaId == metric.node) {
								node.sevent.state = demultiplex_cps_state(last_value[1]).state;
								node.sevent.timestamp = undefined;
								node.sevent.last_state_change = undefined;
								if (node.sevent.event_type == 'selector')
									node.sevent.output = _('State on') + ' ' + rdr_tstodate(last_value[0]);
								else
									node.sevent.output = _('SLA on') + ' ' + rdr_tstodate(last_value[0]);
							}else {
								node._event.state = demultiplex_cps_state(last_value[1]).state;
								node._event.timestamp = undefined;
								node._event.last_state_change = undefined;
								if (node._event.event_type == 'selector')
									node._event.output = _('State on') + ' ' + rdr_tstodate(last_value[0]);
								else
									node._event.output = _('SLA on') + ' ' + rdr_tstodate(last_value[0]);
							}
						}else {
							log.debug('No perfdata returned for: ' + node_id, this.logAuthor);
							node._event.output('No state available on this period');
							if (node.sevent)
								node.sevent.state = undefined;
							else
								node._event.state = undefined;
						}
					}
				}

				this.populate();
			},
			failure: function(result, request) {
				log.error('Impossible to get Node', this.logAuthor);
				global.notify.notify(_('Issue'), _("The selected selector can't be found"), 'info');
			}
		});
	},

	populateCheck: function() {
		if (this.reportMode || this.exportMode){
			if (this.list_meta_id.length == 0)
				this.generate_all_meta_ids();
			this.getPastNode(this.list_meta_id, this.from, this.to);
		} else {
			this.populate()
		}
	},

	populate: function() {
		log.debug('Populate widget with ' + this.nodeId.length + ' elements.', this.logAuthor);
		this.wcontainer.removeAll();

		log.debug('There is '+ Ext.Object.getSize(this.nodeDict) +' nodes for ' + this.firstNodeIds.length +' requested node',this.logAuthor)

		for (var i = 0; i < this.firstNodeIds.length; i++) {
			var _id = this.firstNodeIds[i];

			var node = Ext.clone(this.nodeDict[_id]);

			//-----------------overload values----------------
			if (this.icon_state_source != 'default') {
				log.debug('Attempt to overide values with second node', this.logAuthor);
				if (node && node.sevent) {
					node._event.state = node.sevent.state;
					node._event.last_state_change = node.sevent.last_state_change;
				}
			}

			//------------------create config----------------
			if(node && node._event){
				var config = {
					data: node._event,
					link: this.external_link_dict[_id],
					bg_color: (i % 2) ? this.bg_impair_color : this.bg_pair_color
				};
				var weather = Ext.create('widgets.weather.brick', Ext.Object.merge(config, this.base_config));
				this.wcontainer.add(weather);
				log.debug('Widget populated',this.logAuthor)
			}
		}
	},

	configure: function() {
		//-------------------define base config-------------------
		this.base_config = {
				iconSet: this.iconSet,
				state_as_icon_value: this.state_as_icon_value,
				icon_on_left: this.icon_on_left,
				exportMode: this.exportMode,
				display_report_button: this.display_report_button,
				display_derogation_icon: this.display_derogation_icon,
				external_link: this.external_link, //<-- helpdesk, change var name
				linked_view: this.linked_view,
				title_font_size: this.title_font_size,
				simple_display: this.simple_display,
				icon_state_source: this.icon_state_source,
				fullscreenMode: this.fullscreenMode,
				helpdesk: this.helpdesk
			};

		if (this.defaultPadding)
			this.base_config.padding = this.defaultPadding;

		if (this.defaultMargin)
			this.base_config.margin = this.defaultMargin;

		if (this.nodes.length == 1)
			this.base_config.anchor = '100% 100%';

	},

	generate_all_meta_ids: function() {
		Ext.Object.each(this.nodeDict, function(key, node, myself) {
			if (node.sevent) {
				var active_event = node.sevent;
				var metaId = this.generate_meta_id(node.sevent);
				node.smetaId = metaId;
			}else {
				var active_event = node._event;
				var metaId = this.generate_meta_id(node._event);
				node.metaId = metaId;
			}

			this.list_meta_id.push(metaId);
			this.matchingDictMeta[metaId] = key;

			//check if needed to retrieve sla pct
			if (node._event.event_type == 'sla') {
				node.metaIdPct = this.generate_meta_id(node._event, 'cps_pct_by_state_0');
				this.list_meta_id.push(node.metaIdPct);
				this.matchingDictMeta[node.metaIdPct] = key;
			}
			/*
			if(node.sevent && node.sevent.event_type == 'sla'){
				node.metaIdPct = this.generate_meta_id(node.sevent, 'cps_pct_by_state_0');
				this.list_meta_id.push(node.metaIdPct);
				this.matchingDictMeta[node.metaIdPct] = key
			}*/
		},this);
	},

	generate_meta_id: function(node, metric) {
		var component = node.component;
		var resource = node.resource;
		var metric = (metric) ? metric : 'cps_state';

		return getMetaId(component, resource, metric);
	}

});
