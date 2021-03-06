//#################
//# Configs
//#################
//var url = 					'http://127.0.0.1:8082/en/static/canopsis/index.debug.html';
var url = 					'http://demo-devel.canopsis.org/';
var timeout =				5000;

var casper_verbose =		false;
var casper_logLevel =		'debug';
var viewportSize = 			{width: 1366, height: 768};
var capture_interval = 		500;

//#################
//# Casper
//#################
var fs = require('fs');

var casper = require('casper').create({
    verbose: casper_verbose,
    logLevel: casper_logLevel,
    viewportSize: viewportSize,
    onStepComplete: function(){
    	capture();
    }
});

casper.on('remote.message', function(msg){
	if (casper_verbose)
		console.log(msg);
});

casper.test.on('fail', function(result){
	casper.test.done();
	casper.test.renderResults(true, 0, 'log.xml');
});

//#################
//# Utils
//#################

var step = 0;
var capture = function(){
	var capturePath = 'captures/step-'+step+'.png'
	casper.capture(capturePath);
	step += 1;
}

var capturer = undefined

var fill_field = function(selector, name, value){
	var options = {};
	options[name] = value;

	casper.test.assertExists('input[name="'+name+'"]', 'Check if field "'+name+'" exist');
	casper.fill(selector, options, false);
	casper.test.assertField(name, value);
}

var click = function(selector){
	casper.waitForSelector(selector, function() {
		
		casper.test.assertExists(selector, 'Check if '+selector+' exist');

		//casper.mouseEvent('mousemove', selector);
		//casper.mouseEvent('mouseover', selector);
		//casper.mouseEvent('mousedown', selector);

		casper.thenClick(selector, function(){
			casper.test.pass(" + Clicked");
		});

	});/*,function() {
		casper.test.fail("'"+selector+"' not found.");

	}, timeout);*/
}

var clickRowLabel = function(label, dbl){
	if (dbl == undefined || dbl != true)
		dbl = false;

	var selector = {
		type: 'xpath',
		path: '//*[text()="'+label+'"]'
	}

	casper.waitForText(label, function() {
		casper.mouseEvent('mouseover', selector);
		if (dbl)
			casper.mouseEvent('dblclick', selector);
		else
			casper.mouseEvent('mousedown', selector);
		wait("tr.x-grid-row-selected");
	}, timeout)
}

var fillGridEditableField = function(selector,text){
	casper.sendKeys('.x-editor input', text);
	casper.sendKeys('.x-editor input', '\n');
}

var selectComboValue = function(comboName,comboValue){
	casper.then(function(){
		casper.test.assertExists('input[name="'+comboName+'"]', 'Check if field "'+comboName+'" exist')
		//because trigger is in the parent sibling
		var trigger_id = casper.evaluate(function(comboName) {
			return $('input[name="'+comboName+'"]').parent().next()[0].id},comboName
			)
		click('#'+trigger_id+' > div')
	})
	casper.then(function(){
		casper.waitForText(comboValue, function() {
			casper.clickLabel(comboValue,'li');
		}, timeout)
	})
}

var clickLabel = function(label){
	casper.waitForText(label, function() {
		casper.clickLabel(label);
	}, timeout)
}

var clickMenu = function(name){
	var menu = {
		build:  "span.icon-mainbar-build",
		run:    "span.icon-mainbar-run", 
		report: "span.icon-mainbar-report",
	}
	click(menu[name]);
}

var openMenu = function(menu_name,sub_menu_name,textToWait){
	var sub_menu = {
		buildAccount: "img.icon-mainbar-edit-account",
		buildGroup: "img.icon-mainbar-edit-group",
		buildCurve:  "img.icon-mainbar-colors",
		buildSelector: "img.icon-mainbar-selector",
		buildSchedule: "img.icon-mainbar-edit-task",
		buildConsolidation: "img.icon-mainbar-consolidation",
		buildNewView: "img.icon-mainbar-new-view",
		runViewManager: "img.icon-mainbar-run"
	}

	casper.echo('> Click on '+ menu_name + ' then ' + sub_menu_name, 'COMMENT');
	clickMenu(menu_name);
	click(sub_menu[sub_menu_name]);

	if(textToWait)
		waitText(textToWait)
}

var wait = function(selector, timeout, str_onSuccess, str_onFailed){
	if (str_onSuccess == undefined)  str_onSuccess	= selector + " found";
	if (str_onFailed == undefined)	str_onFailed	= "Impossible to find "+selector;

	casper.waitForSelector(selector, function() {
		casper.test.pass(str_onSuccess);
	});/*, function() {
		casper.test.fail(str_onFailed);
	}, timeout);*/
}

var waitWhile = function(selector, timeout, str_onSuccess, str_onFailed){
	if (str_onSuccess == undefined)  str_onSuccess	= selector + " is not found";
	if (str_onFailed == undefined)	str_onFailed	= selector + " found";

	if (casper.exists(selector)) {
		casper.test.pass("Wait for '"+selector+"' to disappear");
		casper.waitWhileSelector(selector, function() {
			casper.test.pass(str_onSuccess);
		});/*, function() {
			casper.test.fail(str_onFailed);
		}, timeout);*/
	}else{
		casper.test.pass("'"+selector+"' already disappeared.");
	}
}

var waitText = function(text){
	casper.waitForText(text, function() {
		casper.test.pass("'"+text+"' found.");
	});/*, function(){
		casper.test.fail("'"+text+"' not found.");
	}, timeout)*/
}

var closeTab = function(){
	click("a.x-tab-close-btn");
}

//#################
//# cgrid utils
//#################

var cgridOpen = function(menu_name,sub_menu_name,textToWait){
	casper.then(function() {
		casper.echo('> Open menu record', 'COMMENT');
		openMenu(menu_name,sub_menu_name,textToWait)
	});

	casper.then(function() {
		casper.echo('> Reload record', 'COMMENT');
		click("span.icon-reload");
	});

	casper.then(function() {
		casper.echo('> Check if record exist', 'COMMENT');
		casper.waitForText("Casper", function() {
			casper.test.fail("record already in store !");
		}, function(){
			casper.test.pass("Ok");
		}, 500);
	});

	casper.then(function() {
		casper.echo('> Open Add form', 'COMMENT');
		click("span.icon-add");
		wait("span.icon-save");
	});
}

var cgridEditRecord = function(selector_form,fieldToEdit,ModifiedValue){
	casper.then(function() {
		casper.echo('> Select created record', 'COMMENT');
		clickRowLabel('Casper');
	});

	casper.then(function() {
		casper.echo('> Edit record', 'COMMENT');
		clickRowLabel('Casper', true);
		wait("span.icon-save");
	});

	casper.then(function() {
		fill_field(selector_form, fieldToEdit, ModifiedValue);
		click("span.icon-save");
		waitWhile("span.icon-save");
		waitText(ModifiedValue);
		//casper.waitUntilVisible("div.ui-pnotify-container");
	});

}

var cgridRemoveRecord = function(rowLabelText,deleteLabel){
	if(!rowLabelText)rowLabelText = 'Casper';
	if(!deleteLabel)deleteLabel = 'Yes';

	casper.then(function() {
		casper.echo('> Select created record', 'COMMENT');
		clickRowLabel(rowLabelText);
	});

	casper.then(function() {
		casper.echo('> Remove created record', 'COMMENT');
		click("span.icon-delete");
		clickLabel(deleteLabel);
		casper.waitUntilVisible("div.ui-pnotify-container");
	});

	casper.then(function() {
		casper.echo('> Reload record', 'COMMENT');
		click("span.icon-reload");
	});

	casper.then(function() {
		casper.echo('> Check if record is really deleted', 'COMMENT');

		casper.waitForText("Casper", function() {
			casper.test.fail("record not deleted");
		}, function(){
			casper.test.pass("Ok");
		}, 2000);

	});
}

//#################
//# Load page
//#################
casper.echo('> Load page "'+url+'"', 'COMMENT');
casper.start(url, function() {
	casper.test.assertTitle('Canopsis', 'Check page title');

	casper.evaluate(function() {
		localStorage.clear();
		$('body').append('<div id="div-click" style="z-index: 99999999999; position:absolute; overflow:hidden; border-radius:10px; width:10px; height:10px; background-color: #FF0000;"></div>');
		$('#div-click').hide();

		$('body').click(function(event) {
			if (global.divClickTimeout)
				clearTimeout(global.divClickTimeout);

			$('#div-click').css("top", event.pageY);
			$('#div-click').css("left", event.pageX);
			$('#div-click').show();

			global.divClickTimeout = setTimeout(function(){
				$('#div-click').hide();
			}, 300);
		});

	});

	capturer = setInterval(function(){
		capture();
	}, capture_interval);

});

//#################
//# Exit casper at end
//#################
casper.run(function() {
	if(capturer)
		clearInterval(capturer);
	capture();

	casper.echo('\n########### END ###########', 'COMMENT');
	casper.echo('> Quit Casper', 'COMMENT');
	casper.test.done();
	casper.test.renderResults(true, 0, 'log.xml');
});


//#################
//# All tests
//#################

