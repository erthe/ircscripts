var expandClassList, classList;
var common = openFile(userScriptFilePath + '\\common.js');
eval(common.readAll());
common.close();

function load() {
	expandClassList = readFile('\\grimdawn_expandClassList.txt');
	classList = readFile('\\grimdawn_classList.txt');
    print('grim loaded');
}

function event::onLoad(){
	load();
}

function event::onChannelText(prefix, channel, text) {
	var number;
	if(isMatch(channel, text, 'grim_class')) {
		number = Math.floor(Math.random() * (expandClassList.length));
		say(prefix, channel, expandClassList[number], 'grim_class');
	} else if(isMatch(channel, text, 'grim_original_class')) {
		number = Math.floor(Math.random() * (classList.length));
		say(prefix, channel, classList[number], 'grim_class');
	} else if(isMatch(channel, text, 'load') && prefix.nick === myNick) {
		load();
	}
}
