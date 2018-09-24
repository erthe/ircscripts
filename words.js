var melList;
var common = openFile(userScriptFilePath + '\\common.js');
eval(common.readAll());
common.close();

function concatMessage(value) {
    return ' 【' + value.name + '】 ' + value.description;
}

function saySingleComplexWord(channel, list) {
    var message = '';
    for(var n = 0; n <= Math.floor(Math.random() * 3); ++n){
        if(n != 0) {
            message + ' ';
        }

        message = message + list[Math.floor(Math.random() * list.length)].description;
    }

    send(channel, message);
}

function sayWord(channel, list) {
    number = Math.floor(Math.random() * (list.length));
    send(channel, concatMessage(list[number]));
}

function load() {
    var file = openFile(userScriptFilePath + '\\wordList.js');
    eval(file.readAll());
    file.close();
    print('word loaded.');
}

function event::onLoad() {
    load();
}

function event::onChannelText(prefix, channel, text) {
    if((channel.match(/^#UO_AOE$/) || channel.match(/マクロ実験室/)) && text.match(/^めるぽ$/)) {
        sayWord(channel, melList);
    }if((channel.match(/^#UO_AOE$/) || channel.match(/マクロ実験室/)) && text.match(/^めるめる$/)) {
        saySingleComplexWord(channel, melList);
    } else if((channel.match(/^#UO_AOE$/) || channel.match(/マクロ実験室/)) && text.match(/^ゴート$/)) {
        send(channel, 'https://gyazo.com/f533a794010bb07c8df9fdb105bc031b');
    } else if(isMatch(channel, text, 'load') && prefix.nick === myNick) {
        load();
    }
}

function event::onJoin(prefix, channel) {
    if((channel.match(/^#UO_AOE$/) || channel.match(/マクロ実験室/)) && prefix.nick.match(/^Mel$/)) {
        sayWord(channel, melList);
    }
}
