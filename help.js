var grimFunctionList, aoeFunctionList, streamFunctionList, helpFunctionList;
var common = openFile(userScriptFilePath + '\\common.js');
eval(common.readAll());
common.close();

function concatMessage(value) {
	return ' 【' + value.name + '】 ' + value.description;
}

function sayHelp(channel, list) {
	var msg = '';
	forEach(list, function (row) {
		msg = msg + concatMessage(row);
	});
	send(channel, msg);
}

function load() {
	var file = openFile(userScriptFilePath + '\\helpList.js');
	eval(file.readAll());
	file.close();
    print('help loaded.');
}

function event::onLoad(){
	load();
}

function event::onChannelText(prefix, channel, text) {
	if(isMatch(channel, text, 'help')) {
		sayHelp(channel, grimFunctionList);
		sayHelp(channel, aoeFunctionList);
		sayHelp(channel, streamFunctionList);
		sayHelp(channel, helpFunctionList);
	} else if(isMatch(channel, text, 'grim_help')) {
		sayHelp(channel, grimFunctionList);
	} else if(isMatch(channel, text, 'aoe_help')) {
		sayHelp(channel, aoeFunctionList);
	} else if(isMatch(channel, text, 'stream_help')) {
		sayHelp(channel, streamFunctionList);
	} else if(isMatch(channel, text, 'help_help')) {
		sayHelp(channel, helpFunctionList);
	} else if(isMatch(channel, text, 'load') && prefix.nick === myNick) {
		load();
		send(channel, 'load completed.');
	}
}
