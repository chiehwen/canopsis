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
Ext.define('widgets.stepeue.feature' , {
	alias: 'widget.stepeue.feature',
	logAuthor: '[widget][stepeue][feature]',
	scroll: true,
	useScreenShot: true,
	node: null,
	init: function(node, widget, element ) {
		log.debug('Initialization of feature ['+ node + ']', this.logAuthor);
		this.node = node;
		this.widget = widget;
		this.elementContainer = element;
		var filter = { '$and' : [{ '_id': this.node }] };
                this.model = Ext.ModelManager.getModel('canopsis.model.Event');
		this.featureEvent = Ext.create('canopsis.lib.store.cstore', {
			model: this.model,
			pageSize: 30,
			proxy: {
				type: 'rest',
				url: '/rest/events/event',
				reader: {
					type: 'json',
					root: 'data',
					totalProperty: 'total',
					successProperty: 'success'
				}
                                }
			});
		this.featureEvent.setFilter(filter);
		this.scenarios = { };
		var me = this;
		this.featureEvent.load({ callback: function(records, operation, success) {
			if (success) {
				log.debug('feature is loaded', me.logAuthor);
				me.record = records[0];
				me.findScenario();
                        } else {
				log.error("Problem during the load of scenarios' records of the feature", me.logAuthor);
                                return false;
			}

		} });
	},
	findScenario: function() {
		var filter = { '$and' : [{ 'child': this.node }, { 'type_message' : 'scenario'}] };
		this.storeEvent = Ext.create('canopsis.lib.store.cstore', {
			model: this.model,
			pageSize: 30,
			proxy: {
				type: 'rest',
				url: '/rest/events/event',
				reader: {
					type: 'json',
					root: 'data',
					totalProperty: 'total',
					successProperty: 'success'
				}
                                }
			});
		this.storeEvent.setFilter(filter);
		this.storeEvent.sort({ property: 'timestamp', direction: 'DESC' });
		me = this;
		this.storeEvent.load({ callback: function(records, operation, success) {
			if (success) {
				log.debug("feature's Scenario are  loaded", me.logAuthor);
				cntxtBrowser = records[0].raw.cntxt_browser;
				cntxtLoc = records[0].raw.cntxt_localization;
				cntxtOS = records[0].raw.cntxt_os;
				scenariosNameArray = new Array();
				for (i in records) {
					infoScenario = records[i].raw.resource.split('.');
					scenario_name = infoScenario[2];
					if (me.scenarios.hasOwnProperty(scenario_name) && me.scenarios[scenario_name] != undefined)
						me.scenarios[scenario_name].addScenario(records[i]);
					else {
						var scenario = Ext.create('widgets.stepeue.scenario');
						scenario.init(me.node, scenario_name, me.widget);
						scenario.putMainScenario(records[i]);
						me.scenarios[scenario_name] = scenario;
						scenariosNameArray.push(scenario_name);
					}
				}
				me.getFeatureViewObject();
                        } else {
				log.error("Problem during the load of scenarios' records of the feature", me.logAuthor);
                                return false;
			}

		} });
	},
	destroyFeature: function() {
                for (i in this.scenarios)
                        this.scenarios[i].destroy();

        },
	getFeatureViewObject: function() {
		log.debug('Listing the scenario of the feature', this.logAuthor);
		var me = this;
		var listScenarios = new Array();
		for (i in this.scenarios) {
			listScenarios.push(this.scenarios[i].buildMainView());
		}
		listScenarios.reverse();
		var storeScenar = Ext.create('Ext.data.Store', {
			fields: ['cps_state', 'date', 'scenario', 'localization', 'os', 'browser', 'dur'],
    			data: listScenarios
		});
		var grid = Ext.create('Ext.grid.Panel', {
			height: '100%',
			columns: [
				{ header: 'Status', dataIndex: 'cps_state', flex: 1 , sortable: false},
				{ header: 'Date', dataIndex: 'date', flex: 2, sortable: false, align: 'center' },
				{ header: 'Duration', dataIndex: 'dur', flex: 1, sortable: false, align: 'center'},
				{ header: 'Graph', dataIndex: 'scenario', renderer: function(value) {
					var component = me.scenarios[value].mainScenario.raw.component;
					var resource = me.scenarios[value].mainScenario.raw.resource;
					var metric = 'duration';
					return '<span class=\"line-graph\" id=\"'+ me.widget.wcontainer.id + 'eue-'+ getMetaId(component, resource, metric) + '\"></span>';
				}, flex: 3, sortable: false },
				{ header: 'Screenshot', dataIndex: 'scenario', renderer: function(value ) {
					return me.scenarios[value].getScreenShotLogo();
				}, flex: 2, sortable: false, align: 'center' },
				{ header: 'Scenario Name', dataIndex: 'scenario', flex: 2, sortable: false, align: 'center'},
				{ header: 'Localization', dataIndex: 'localization', flex: 1, sortable: false},
				{ header: 'OS', dataIndex: 'os', flex: 1, sortable: false},
				{ header: 'Browser', dataIndex: 'browser', flex: 1, sortable: false}
			],
			store: storeScenar,
			listeners: {
				itemclick: function(view, record, htmlEl, index, e ) {
					var scen_name = record.data.scenario;
					var gwidth = Ext.getBody().getWidth() * .6;
					var gheight = Ext.getBody().getHeight() * .8;
					if (me.scenarios[scen_name].scenarios.length > 0) {
						Ext.create('Ext.window.Window', {
							xtype: 'panel',
							layout: 'fit',
							id: 'window-screenshot',
							autoScroll: true,
							width: gwidth,
							height: gheight,
							items: me.scenarios[scen_name].buildDetailsView(),
							renderTo: Ext.getBody(),
							modal: true
						}).show().center();
					}

				},
				viewready: function() {
					for (i in me.scenarios)
						me.scenarios[i].getPerfData();
/*					$(".line-graph").each ( function( ) {
						var value = $(this).attr('id').split(':')[0] ;
						var mapgraph = me.scenarios[value].mapGraph ;
						$(this).sparkline({
							template : "line_basic_5",
							defaultSeries: {
								type: "bar",
							}
							width:gWidth,
							tooltipClassname : "tooltip",
							tooltipFormat: '[{{value:date}}]<br />{{value}}',
							tooltipValueLookups: {
								date: $.range_map( mapgraph )
							} } ) ;
					} ) ;*/
					//$(".line-graph").sparkline("html", { type: "bar", width:gWidth,  tooltipClassname : "tooltip" } ) ;
					var picwidth = Ext.getBody().getWidth() * .6;
					var picheight = Ext.getBody().getHeight() * .92;
					$('a.image-zoom').lightBox({
						imageBtnNext: '/static/canopsis/themes/canopsis/resources/images/icons/lightbox/lightbox-btn-next.gif',
						imageBtnPrev: '/static/canopsis/themes/canopsis/resources/images/icons/lightbox/lightbox-btn-prev.gif',
						imageBtnClose: '/static/canopsis/themes/canopsis/resources/images/icons/lightbox/lightbox-btn-close.gif',
						imageLoading: '/static/canopsis/themes/canopsis/resources/images/icons/lightbox/lightbox-ico-loading.gif',
						imageBlank: '/static/canopsis/themes/canopsis/resources/images/icons/lightbox/lightbox-blank.gif',
						maxHeight: picheight,
						top: 0,
						fixedNavigation: true


					 });

				}
			},
			autoScroll: true,
			border: false
		});
		var card1 = Ext.create('Ext.Panel' , {
                        layout: 'fit',
			xtype: 'panel',
			title: this.record.raw.description,
			tools: [{
				type: 'next',
				tooltip: 'play the video',
				handler: function() {
                                        var gwidth = Ext.getBody().getWidth() * .8;
                                        var gheight = Ext.getBody().getHeight() * .95;
					var object = {
						description: me.record.raw.description,
						src: '/rest/media/events/'+ me.record.raw._id,
						alt: 'The feature video can not be played',
						className: 'title-feature',
						videoWidth: '60%',
						timestamp: rdr_tstodate(me.record.raw.timestamp)
					};
					var tpl = new Ext.XTemplate(
						'<div class="{className}">{description}</div>',
						'<div class="align-center">',
						'<video autoplay="autoplay" controls="controls" width="{videoWidth}" src="{src}">{alt}</video>',
						'<div class="align-center video-date">{timestamp}</div>',
						'</div>'
					);
					var oHtml = tpl.apply(object);
                                        Ext.create('Ext.window.Window', {
                                                xtype: 'xpanel',
                                                layout: 'fit',
                                                autoScroll: false,
						height: gheight,
                                                html: oHtml,
                                                renderTo: Ext.getBody(),
                                                modal: true,
						width: gwidth,
						height: gheight
                                        }).show().center();
				}
			}],
                        items: [grid],
                        border: false,
                        height: '100%',
			autoScroll: true
		});
		this.content = card1;
		console.log(this.elementContainer);
		this.elementContainer.removeAll();
		this.elementContainer.add(this.content);

	}
});
