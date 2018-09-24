var streamList = [];
var streamListName = '\\streamList.txt';
var streamProviderList = ['twitch', 'youtube', 'cavetube'];
var streamingListFile = '\\streamingList.txt';
var twitchUrl = 'https://www.twitch.tv/';
var youtubeUrl = 'https://www.youtube.com/channel/';
var cavetubeUrl = 'https://www.cavelis.net/live/';
var nicoUrl = 'http://live.nicovideo.jp/watch/';
var INTERVAL = 1 * 60 * 1000;  // 分 * 秒 * ミリ秒
var STREAM_OUTPUT = '#UO_AOE';
var TWITCH_CLIENT_ID = 'jzkbprff40iqj646a697cyrvl0zt2m6';
var YOUTUBE_API_KEY = 'AIzaSyDTk8iUJCpMU1n6kdfeBlOMgkNOfaWSto0';
var common = openFile(userScriptFilePath + '\\common.js');
eval(common.readAll());
common.close();

function csv2Dictionary(item) {
    var line = item.split('\t');
    var temp = [];
    temp.username = line[0];
    temp.address = line[1];
    temp.streamtype = line[2];
    temp.streamId = line[3];
    return temp;
}

function csv2Streamer(item) {
    var line = item.split('\t');
    var temp = [];
    temp.serviceName = line[0];
    temp.streamerName = line[1];
    temp.title = line[2];
    temp.streamId = line[3];
    temp.timestamp = line[4];
    return temp;
}

function indexOfStream (list, search) {
    for(var i = 0; i < list.length; ++i) {
        if(list[i].streamId === search) {
            return i;
        }
    }

    return -1;
}

function concatMessage(line) {
    var msg =  ' 【' + line.username + '】 ' + line.streamtype;
    switch(line.streamtype) {
        case 'twitch':
            msg = msg + ' ' + twitchUrl + line.streamId;
            break;

        case 'youtube':
            msg = msg + ' ' + youtubeUrl + line.streamId + '/live';
            break;

        case 'cavetube':
            msg = msg + ' ' + cavetubeUrl + line.streamId;
            break;
    }

    return msg;
}

function getLivers(providerType) {
    var thisLivers = [];
    forEach(streamList, function (row) {
        var line = csv2Dictionary(row);
        if(line.streamtype === providerType) {
            thisLivers.push(line);
        }
    });

    return thisLivers;
}

function checkNewStreamer(channel, service, list) {
    var streamingList1 = openFile(userScriptFilePath + streamingListFile, false);
    var targetList = [];
    var timestamp = new Date();
    var row;
    while((row = streamingList1.readLine()) != null) {
        var dict = csv2Streamer(row);
        if(dict.serviceName === service) {
            targetList.push(dict);
        }
    }

    // 配信開始を検出｡配信中のリストの中に告知済みリストのメンバーがいるか確認し､居なければ告知して配信済みリストに追加
    forEach(list, function(currentLiver) {
        var isMatched = false;
        forEach(targetList, function (noticed) {
            if(currentLiver.streamId === noticed.streamId) {
                isMatched = true;
            }
        });

        if(!isMatched) {
            // ニコ生はオーナー(配信主)情報が取得できない
            if(service != 'niconico') {
                send(channel, currentLiver.name + 'さんが' + service + 'で配信を開始しました｡ ' + ' ' + currentLiver.title + ' ' + currentLiver.url);
            } else {
                send(channel, 'ニコニコ生放送の配信が開始されました｡ ' + ' ' + currentLiver.title + ' ' + currentLiver.url);
            }

            var line = {
                serviceName: service,
                streamerName: currentLiver.name,
                title: currentLiver.title,
                streamId: currentLiver.streamId,
                timestamp: timestamp
            };

            var insert = '';
            if(streamingList1.size > 0) {
                insert = '\n';
            }

            insert = insert + line.serviceName + '\t' + line.streamerName + '\t' + line.title + '\t' + line.streamId + '\t' + line.timestamp;
            streamingList1.seekToEnd();
            streamingList1.write(insert);
            targetList.push(line);
        }
    });
    streamingList1.close();

    // 配信終了を検出｡告知済みリストの中に配信中のリストのメンバーがいるか確認し､居なければ告知して配信済みリストから削除
    var unMatchedList = [];
    forEach(targetList, function(noticed) {
        if(list.length > 0){
            var index = indexOfStream(list, noticed.streamId);
            if(index === -1) {
                unMatchedList.push(noticed);
            }
        } else if(noticed.timestamp != timestamp) {
            // 対象のリストに1件もデータがなければ全員配信終了
            unMatchedList.push(noticed);
        }
    });

    forEach(unMatchedList, function (unMatched) {
        for (var i = 0; i < targetList.length; ++i) {
            if(targetList[i].streamId === unMatched.streamId && targetList[i].timestamp != timestamp) {
                if(service != 'niconico') {
                    send(channel, unMatched.streamerName + 'さんが' + service + 'の配信を終了しました｡ ');
                } else {
                    send(channel, 'ニコニコ生放送の配信が終了しました｡ ' + ' ' + unMatched.title);
                }

                targetList.splice(i, 1);
                var streamingList2 = openFile(userScriptFilePath + streamingListFile);
                var insert = '';
                var isFirst = true;
                var row;
                while((row = streamingList2.readLine()) != null) {
                    var dict = csv2Streamer(row);
                    if(dict.serviceName != service || dict.streamId != unMatched.streamId) {
                        if(isFirst) {
                            insert = insert + row;
                            isFirst = false;
                        } else {
                            insert = insert + '\n' + row;
                        }

                    }
                }

                streamingList2.close();
                var streamingList3 = openFile(userScriptFilePath + streamingListFile, false);
                streamingList3.truncate();
                if(insert) {
                    streamingList3.write(insert);
                }

                streamingList3.close();
            }
        }
    });

}

function getTwitchInfo(channel, where) {
    var twitchStreamerList = [];
    var twitchLivers = getLivers('twitch');
    if(twitchLivers.length <= 0 && where === 'channel') {
        return 'twitchの一覧がありません｡';
    }

    var urlBase = 'https://api.twitch.tv/kraken/streams?channel=';
    var concatIds = '';
    var isFirst = true;
    var returnMsg = '';
    forEach(twitchLivers, function (row) {
        if(isFirst) {
            concatIds = row.streamId;
            isFirst = false;
        } else {
            concatIds = concatIds +',' + row.streamId;
        }
    });

    var xhr = new XMLHttpRequest();
    if(xhr) {
        xhr.setTimeouts(5*1000,5*1000,15*1000,15*1000);
        xhr.onreadystatechange = function() {
            if(xhr.readyState == 4 && xhr.responseText.length ) {
                var s = xhr.responseText;
                eval('var response = ' + s);
                if(response == null) {
                    return
                }
                var streamResult = response.streams;
                for(var i = 0; i < streamResult.length; ++i) {
                    var line = {
                        name: streamResult[i].channel.display_name,
                        url: streamResult[i].channel.url,
                        views: streamResult[i].viewers,
                        title: streamResult[i].channel.status,
                        streamId: streamResult[i].channel.display_name
                    };
                    twitchStreamerList.push(line);

                    if(where === 'channel') {
                        var msg = line.name + ' ' + line.url + ' 視聴者: ' + line.views + '人 ' + line.title;
                        send(channel, msg);
                    }
                }

                if(where === 'detector') {
                    checkNewStreamer(channel, 'twitch', twitchStreamerList);
                } else if(twitchStreamerList.length <= 0 && where === 'channel') {
                    returnMsg = '現在twitchで配信中の一覧がありません｡';
                }
            }
        };
        xhr.open('GET', urlBase + concatIds, false);
        xhr.setRequestHeader('Client-ID', TWITCH_CLIENT_ID);
        xhr.send('');
    }

    return returnMsg;
}

function getYoutubeInfo(channel, where) {
    var youtubeStreamerList = [];
    var youtubeLivers = getLivers('youtube');
    if(youtubeLivers.length <= 0 && where === 'channel') {
        return 'youtubeの一覧がありません｡';
    }

    var urlBase = 'https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=';
    var paramsBase = '&type=video&eventType=live&key=' + YOUTUBE_API_KEY;
    forEach(youtubeLivers, function (row) {
        var xhr = new XMLHttpRequest();
        if(xhr) {
            xhr.setTimeouts(5*1000,5*1000,15*1000,15*1000);
            xhr.onreadystatechange = function() {
                if(xhr.readyState == 4 && xhr.responseText.length ) {
                    var s = xhr.responseText;
                    eval('var response = ' + s);
                    var firstResult = response.items;
                    if(firstResult.length > 0) {
                        // youtubeは視聴者情報取得にもう1回APIを叩かなければならない
                        var xhr2 = new XMLHttpRequest();
                        if(xhr2) {
                            xhr2.setTimeouts(5*1000,5*1000,15*1000,15*1000);
                            xhr2.onreadystatechange = function() {
                                if(xhr2.readyState == 4 && xhr2.responseText.length ) {
                                    var name = row.username;
                                    var url = 'https://www.youtube.com/channel/' + row.streamId + '/live';
                                    var views = xhr2.responseText;
                                    var title = firstResult[0].snippet.title;
                                    var line = {
                                        name: name,
                                        url: url,
                                        views: views,
                                        title: title,
                                        streamId: row.streamId
                                    };
                                    youtubeStreamerList.push(line);
                                    if(where === 'channel') {
                                        var msg = name + ' ' + url + ' 視聴者: ' + views + '人 ' + title;
                                        send(channel, msg);
                                    }
                                }
                            };
                            var viewerUrl = 'https://www.youtube.com/live_stats?v=' + firstResult[0].id.videoId;
                            xhr2.open("GET", viewerUrl , false);
                            xhr2.send('');
                        }
                    }
                }
            };
            xhr.open("GET", urlBase + row.streamId + paramsBase , false);
            xhr.setRequestHeader('user_agent', 'AoCHD.jp');
            xhr.send('');
        }
    });

    if(where === 'detector') {
        checkNewStreamer(channel, 'youtube', youtubeStreamerList);
    } else if(youtubeStreamerList.length <= 0 && where === 'channel') {
        return '現在youtubeで配信中の一覧がありません｡';
    } else {
        return '';
    }
}

function getCavetubeInfo(channel, where) {
    var cavetubeStreamerList = [];
    var cavetubeLivers = getLivers('cavetube');
    if(cavetubeLivers.length <= 0 && where === 'channel') {
        return 'cavetubeの一覧がありません｡';
    }

    var liveListUrl = 'https://rss.cavelis.net/index_live.xml';
    var returnMsg = '';

    var xhr = new XMLHttpRequest();
    if(xhr) {
        xhr.setTimeouts(5*1000,5*1000,15*1000,15*1000);
        xhr.onreadystatechange = function() {
            if(xhr.readyState == 4 && xhr.responseText.length ) {
                var streamResult = xhr.responseText.match(/<entry>([\r\n]|.)*?<\/entry>/g);
                for(var i = 0; i < streamResult.length; ++i) {
                    var nameResult = streamResult[i].match(/<author>([\r\n]\s|.)*?<name>([\r\n]|.)*?\<!\[CDATA\[(.*?)]]>/);
                    var index = indexOfStream(cavetubeLivers, nameResult[3].toString());
                    if(index == -1) {
                        continue;
                    }
                    var name = nameResult[3].toString();
                    var titleResult = streamResult[i].match(/<title>([\r\n]|.)*?<!\[CDATA\[(.*?)]]>/);
                    var title = titleResult[2].toString();
                    var viewerResult = streamResult[i].match(/<ct:listener>(.*?)<\/ct:listener>/);
                    var views = viewerResult[1].toString();
                    var line = {
                        name: name,
                        url: cavetubeUrl + cavetubeLivers[index].streamId,
                        views: views,
                        title: title,
                        streamId: cavetubeLivers[index].streamId
                    };
                    cavetubeStreamerList.push(line);
                    if(where === 'channel') {
                        var msg = line.name + ' ' + line.url + ' 視聴者: ' + line.views + '人 ' + line.title;
                        send(channel, msg);
                    }
                }

                if(where === 'detector') {
                    checkNewStreamer(channel, 'cavetube', cavetubeStreamerList);
                } else if(cavetubeStreamerList.length <= 0 && where === 'channel') {
                    returnMsg = '現在cavetubeで配信中の一覧がありません｡';
                }
            }
        };
        xhr.open('GET', liveListUrl, false);
        xhr.send('');
    }

    return returnMsg;
}

function getNicoInfo(channel, where) {
    var nicoStreamerList = [];
    var endpoint = 'http://api.search.nicovideo.jp/api/v2/live/contents/search?targets=title&filters[liveStatus][0]=onair&fields=contentId,title,liveStatus,viewCounter&_sort=-viewCounter&q=';
    var query = 'AoC%20or%20AoE2%20or%20AOE2%20or%20AoE%e2%85%a1%20or%20UO%20or%20UltimaOnline%20or%20Ultima';
    var returnMsg = '';

    var xhr = new XMLHttpRequest();
    if(xhr) {
        xhr.setTimeouts(5*1000,5*1000,15*1000,15*1000);
        xhr.onreadystatechange = function() {
            if(xhr.readyState == 4 && xhr.responseText.length ) {
                var s = xhr.responseText;
                eval('var response = ' + s);
                if(response == null) {
                    return;
                }

                var streamResult = response.data;
                for(var i = 0; i < streamResult.length; ++i) {
                    var line = {
                        name: streamResult[i].title,
                        url: nicoUrl + streamResult[i].contentId,
                        views: streamResult[i].viewCounter,
                        title: streamResult[i].title,
                        streamId: streamResult[i].contentId
                    };
                    nicoStreamerList.push(line);

                    if(where === 'channel') {
                        var msg = line.title + ' ' + line.url + ' 視聴者: ' + line.views + '人 ';
                        send(channel, msg);
                    }
                }

                if(where === 'detector') {
                    checkNewStreamer(channel, 'niconico', nicoStreamerList);
                } else if(nicoStreamerList.length <= 0 && where === 'channel') {
                    returnMsg = '現在ニコ生配信はありません。';
                } else {
                    returnMsg = '';
                }
            }
        };
        xhr.open('GET', endpoint + query, false);
        xhr.send('');
    }

    return returnMsg;
}

function getStreamingInfo(channel, where) {
    var twitch = getTwitchInfo(channel, where);
    var youtube = getYoutubeInfo(channel, where);
    var cavetube = getCavetubeInfo(channel, where);
    var nico = getNicoInfo(channel, where);

    // 配信が無いものは1行にまとめてフィードバックする
    if(where === 'channel') {
        var msg = twitch + youtube + cavetube + nico;
        if(msg != '') {
            send(channel, msg);
        }
    }

}

function load(channel, target, where) {
    streamList = [];
    streamList = readFile(streamListName);
    if(target === 'status') {
        getStreamingInfo(channel, where);
    }
}

function streamDetector() {
    load(STREAM_OUTPUT, 'status', 'detector');
}

function messageConvert(prefix, channel, text) {
    var nck = prefix.nick;
    var cmd = text.split(' ');
    if(!cmd[1]) {
        send(channel, nck + 'さん､配信サービスを指定してください｡');
        return null;
    }

    if(!cmd[2]) {
        send(channel, nck + 'さん､配信者IDを指定してください｡');
        return null;
    }

    var isMatch = false;
    forEach(streamProviderList, function (row) {
        if(row === cmd[1].toLowerCase()) {
            isMatch = true;
        }
    });

    if(!isMatch) {
        send(channel, nck + 'さん､配信サービスがstreamコマンドに対応していません｡');
        return null;
    }

    return {username: nck, address: prefix.address, command: cmd};
}

function write(prefix, channel, text, fileName) {
    var message = messageConvert(prefix, channel, text);
    if(!message) {
        return;
    }

    var input = openFile(userScriptFilePath + fileName, false);
    // 同じニックネーム､IP､配信タイプ､配信IDのものは登録させない
    var line;
    while((line = input.readLine()) != null) {
        var dict = csv2Dictionary(line);
        if(dict.username === message.username && dict.address === message.address
            && dict.streamtype === message.command[1].toLowerCase() && dict.streamId === message.command[2].toLowerCase()) {
            send(channel, message.username + 'さん､'+ message.command[1] +'の配信情報はすでに登録されています｡再登録の場合は先にstream_unregisterで配信情報を削除してください｡');
            input.close();
            return;
        }
    }
    var insert = '';
    if(input.size > 0) {
        insert = '\n';
    }
    insert = insert + message.username + '\t' + message.address + '\t' + message.command[1].toLowerCase() + '\t' + message.command[2];
    input.seekToEnd();
    input.write(insert);
    input.close();
    send(channel, message.username + 'さんの配信情報を登録しました｡');
}

function remove(prefix, channel, text, fileName) {
    var message = messageConvert(prefix, channel, text);
    if(!message) {
        return;
    }

    // まずはファイル全体を走査して出力に必要な一時streamを作成する
    var input = openFile(userScriptFilePath + fileName);
    var isMatch = false;
    // 一致する配信情報以外は一時streamに保存しファイル全体を書き直す
    var line;
    var insert = '';
    var isFirst = true;
    while((line = input.readLine()) != null) {
        var dict = csv2Dictionary(line);
        if(dict.username === message.username && dict.address === message.address
            && dict.streamtype === message.command[1].toLowerCase() && dict.streamId === message.command[2]) {
            isMatch = true;

        } else {
            if(isFirst) {
                insert = line;
                isFirst = false;
            } else {
                insert = insert + '\n' + line;
            }
        }
    }

    if(!isMatch) {
        send(channel, message.username + 'さんの配信情報はありませんでした｡');
        input.close();
        return;
    }

    input.close();
    var targetFile = openFile(userScriptFilePath + fileName, false);
    targetFile.truncate();
    if(insert) {
        targetFile.write(insert);
    }

    targetFile.close();
    send(channel, message.username + 'さんの配信情報を削除しました｡');
}

function event::onLoad() {
    streamList = readFile(streamListName);
    setInterval(streamDetector, INTERVAL);
    print('stream loaded');
}

function event::onChannelText(prefix, channel, text) {
    if(isMatch(channel, text, 'stream')) {
        load(channel, 'status', 'channel');
    } else if(isMatch(channel, text, 'stream_list')) {
        load(channel, 'list', 'channel');
        if(streamList.length <= 0) {
            send(channel, '配信の一覧がありません｡');
        }

        forEach(streamList, function (row) {
            send(channel, concatMessage(csv2Dictionary(row)));
        });
        checkNewStreamer
    } else if(isForwardMatch(channel, text, 'stream_register')) {
        write(prefix, channel, text, streamListName);
    } else if(isForwardMatch(channel, text, 'stream_unregister')) {
        remove(prefix, channel, text, streamListName);
    } else if(isForwardMatch(channel, text, 'stream_handle')) {
        var streamingList = openFile(userScriptFilePath + streamingListFile, false);
        var twitchList = [];
        var cavetubeList = [];
        var youtubeList = [];
        var niconicoList = [];
        var row;
        while((row = streamingList.readLine()) != null) {
            var dict = csv2Streamer(row);
            if(dict.serviceName === 'twitch') {
                twitchList.push(dict);
            } else if(dict.serviceName === 'cavetubeList') {
                cavetubeList.push(dict);
            } else if(dict.serviceName === 'youtubeList') {
                youtubeList.push(dict);
            } else if(dict.serviceName === 'niconico') {
                niconicoList.push(dict);
            }
        }
        streamingList.close();

        checkNewStreamer(channel, 'twitch', twitchList);
        checkNewStreamer(channel, 'cavetubeList', cavetubeList);
        checkNewStreamer(channel, 'youtubeList', youtubeList);
        checkNewStreamer(channel, 'niconico', niconicoList);
    }
}
