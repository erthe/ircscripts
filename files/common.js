// チャンネル名や発言内容が正規表現に完全一致するか
function isMatch(channel, text, strRegex) {
	return ((channel.match(/^#UO_AOE$/) || channel.match(/マクロ実験室/)) && text.match(new RegExp("^" + strRegex + '$', 'i')));
}

// チャンネル名や発言内容が正規表現に前方一致するか
function isForwardMatch(channel, text, strRegex) {
	return ((channel.match(/^#UO_AOE$/) || channel.match(/マクロ実験室/)) && text.match(new RegExp("^" + strRegex, 'i')));
}

// 入力されたURLのバリデーションを行う
function urlValidate(value) {
	return value.match(/^(https?|ftp)(:\/\/[-_.!~*\'()a-zA-Z0-9;\/?:\@&=+\$,%#]+)$/);
}

// テキストファイルの入力を1行ずつ配列に挿入したものを返す
function convertArray(input) {
	var output = [];
	var line;
	while((line = input.readLine()) != null) {
		output.push(line);
	}
	return output;
}

// 発言を加工して最終的な送信メッセージを作成する
function say(prefix, channel, message, from) {
	var func;
	switch(from) {
		case 'aoe_civ':
			func = '文明';
			break;
			
		case 'grim_class':
			func = 'クラス';
			break;
	}
	
	send(channel, prefix.nick + 'さんの' + func + 'は' + message + 'です｡');
}

// 配列の終わりまで関数を実行する
function forEach(a, d){
	for(var e=new Enumerator(a); !e.atEnd(); e.moveNext()){
		d(e.item());
	}
}

// 入力ファイルを読み込んで配列として返す
function readFile(fileName) {
	var input = openFile(userScriptFilePath + fileName);
	var inputList = convertArray(input);
	input.close();
	return inputList;
}

// XMLHttpRequestを使えるようにする
function XMLHttpRequest(){
	try {
		return new ActiveXObject("Msxml2.ServerXMLHTTP.6.0");
	} catch(e) {}
	try {
		return new ActiveXObject("Msxml2.ServerXMLHTTP.5.0");
	} catch(e) {}
	try {
		return new ActiveXObject("Msxml2.ServerXMLHTTP.4.0");
	} catch(e) {}
	try {
		return new ActiveXObject("Msxml2.ServerXMLHTTP.3.0");
	} catch(e) {}
	try {
		return new ActiveXObject("Msxml2.ServerXMLHTTP");
	} catch(e) {}
}

// commonファイルが読み込まれているかテストする
function test() {
	log('test');
}