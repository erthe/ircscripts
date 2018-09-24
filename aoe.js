var originalCivList, forgottenCivList, africaCivList, rajaCivList;
var gameListFile = '\\gameList.txt';
var playerListFile = '\\aoeMember.txt';
var aiListFile = '\\aiRate.txt'
var INTERVAL = 5 * 60 * 1000;  // 分 * 秒 * ミリ秒
var gameInterval;
common = openFile(userScriptFilePath + '\\common.js');
eval(common.readAll());
common.close();

function csv2Player(item) {
    var line = item.split('\t');
    var temp = [];
    temp.playerId = line[0];
    temp.playerName = line[1];
    temp.playerRate = line[2];
    temp.win = line[3];
    temp.lose = line[4];
    return temp;
}

function csv2Ai(item) {
    var line = item.split('\t');
    var temp = [];
    temp.aiId = line[0];
    temp.aiName = line[1];
    temp.aiRate = line[2];
    temp.team = 2;
    return temp;
}

function indexOfStream (list, search) {
    for (var i = 0; i < list.length; ++i) {
        if(list[i].playerName.match(new RegExp("^" + search, 'i'))) {
            return i;
        }
    }

    return -1;
}

function load() {
    originalCivList = readFile('\\aoe2_civList.txt');
    forgottenCivList = readFile('\\aoe2_forgottenCivList.txt');
    africaCivList = readFile('\\aoe2_africaCivList.txt');
    rajaCivList = readFile('\\aoe2_rajaCivList.txt');
    print('aoe loaded.');
}

function write(list) {
    if(!list.length <= 0) {
        return 'さんのゲーム情報を登録できませんでした｡';
    }

    var input = openFile(userScriptFilePath + gameListFile, false);
    var insert = '';
    if(input.size > 0) {
        insert = '\n';
    }
    insert = insert + list.player + '\tgameRule\t' + list.gameRule + '\tcreateTime\t' + list.createTime + '\tupdateTime\t' + list.updateTime;
    input.seekToEnd();
    input.write(insert);
    input.close();
    return 'さんがゲーム情報を登録しました｡';
}

function deleteGame() {
    var input = openFile(userScriptFilePath + gameListFile, false);
    input.truncate();
    input.close();
}

function _deleteGame(channel) {
    deleteGame();
    send(channel, 'ゲーム情報が破損しています｡ゲーム情報を初期化したのでお手数ですがゲーム募集しなおしてください｡' );
}

function makeGame(prefix, channel, text) {
    var gameList = readFile(gameListFile);
    if(gameList.length > 0) {
        send(channel, 'すでにあるゲームに参加してください｡');
        return;
    }

    var cmd = text.replace(/！/g,"!").split('!');
    if(!cmd[1]) {
        send(channel, prefix.nick + 'さん､データセット(オリジナル/拡張)を選択してください｡');
        return;
    }

    var rule;
    if(cmd[1] === 'original' || cmd[1] === 'オリジナル' || cmd[1].toLowerCase() === 'aoc') {
        rule = 'original';
    } else if(cmd[1] === 'expand' || cmd[1] === '拡張' || cmd[1].toLowerCase() === 'aof' || cmd[1].toLowerCase() === 'aoak' || cmd[1].toLowerCase() === 'aorr') {
        rule = 'expand';
    } else {
        send(channel, prefix.nick + 'さん､｢' + cmd[1] + 'はデータセット(オリジナル/拡張)が特定のキーワードではありません｡');
        return;
    }

    var now = new Date();
    var writeList = [];
    writeList.player = 'player1\t' + prefix.nick;
    writeList.gameRule = rule;
    writeList.createTime = now;
    writeList.updateTime = now;
    gameInterval = setInterval(checkGame, INTERVAL);

    send(channel, prefix.nick + write(writeList));
}

function checkGame(prefix, channel) {
    if(!prefix) {
        var prefix = {};
        prefix.nick = '皆';
    }

    if(!channel) {
        channel = '#UO_AOE';
    }

    var input = readFile(gameListFile);
    if(input.length <= 0) {
        send(channel, prefix.nick + 'さん､現在募集中のゲームはありません｡');
        return;
    } else if(input.length > 1) {
        _deleteGame(channel);
        return;
    }

    var gameList = input[0].split('\t');
    var creator = '';
    var participants = '';
    var playerNumber = 0;
    var gameRule = '';
    var latestPlayerIndex = -1;
    var createIndex = -1;
    var updateIndex = -1;

    for (var i = 0; i < gameList.length; ++i) {
        if(gameList[i].match(/^player/)) {
            i++;
            if(gameList.length < i) {
                _deleteGame(channel);
                return;
            }

            if(playerNumber === 0) {
                creator = gameList[i];
            } else {
                participants = participants + ', ';
            }

            playerNumber++;
            participants = participants + gameList[i];
            latestPlayerIndex = i;
        } else if(gameList[i].match(/gameRule/)) {
            i++;
            if(gameList.length < i) {
                _deleteGame(channel);
                return;
            }

            if(gameList[i] === 'original') {
                gameRule = 'オリジナル';
            } else if(gameList[i] === 'expand') {
                gameRule = '拡張';
            } else {
                _deleteGame(channel);
                return;
            }
        } else if(gameList[i].match(/createTime/)) {
            createIndex = i + 1;
            if(gameList.length < createIndex) {
                _deleteGame(channel);
                return;
            }

        }  else if(gameList[i].match(/updateTime/)) {
            updateIndex = i + 1;
            if(gameList.length < createIndex) {
                _deleteGame(channel);
                return;
            }
        }
    }

    if(!creator || !playerNumber || !participants || latestPlayerIndex == -1 || !gameRule || createIndex == -1 || updateIndex == -1) {
        _deleteGame(channel);
        return;
    }

    var now = new Date();
    var createTime = new Date(gameList[createIndex]);
    var updateTime = new Date(gameList[updateIndex]);
    var diffCreate = now.getTime() - createTime.getTime();
    var createFrom = '';
    var createHour = Math.floor(diffCreate / (1000 * 60 * 60));
    var createMinute = 0;
    if(createHour > 0) {
        createMinute = Math.floor(diffCreate / (1000 * 60)) - createHour * 60;
        if(createHour > 24) {
            createFrom = '【1日以上募集しています】 ';
        }

        createFrom = createFrom + createHour;
    } else {
        createMinute = Math.floor(diffCreate / (1000 * 60));
    }

    var createSecond = 0;
    if(createMinute > 0 && createHour > 0) {
        createSecond = Math.floor(diffCreate / (1000)) - createMinute * 60 - createHour * 60 * 60;
        if(createMinute > 10) {
            createFrom = createFrom + ':' + createMinute;
        } else {
            createFrom = createFrom + ':0' + createMinute;
        }

    } else if(createMinute > 0) {
        createSecond = Math.floor(diffCreate / (1000)) - createMinute * 60;
        createFrom = createMinute;

    } else {
        createSecond = Math.floor(diffCreate / (1000));
    }

    if(createFrom != '') {
        if(createSecond > 10) {
            createFrom = createFrom + ':' + createSecond;
        } else {
            createFrom = createFrom + ':0' + createSecond;
        }

    } else {
        createFrom = createSecond + '秒';
    }

    var diffUpdate = now.getTime() - updateTime.getTime();
    var updateFrom = '';
    var updateHour = Math.floor(diffUpdate / (1000 * 60 * 60));
    var updateMinute = 0;
    if(updateHour > 0) {
        updateMinute = Math.floor(diffUpdate / (1000 * 60)) - updateHour * 60;
        if(updateHour > 24) {
            updateFrom = '【1日以上募集しています】 ';
        }

        updateFrom = updateFrom + updateHour;
    } else {
        updateMinute = Math.floor(diffUpdate / (1000 * 60));
    }

    var updateSecond = 0;
    if(updateMinute > 0 && updateHour > 0) {
        updateSecond = Math.floor(diffUpdate / (1000)) - updateMinute * 60 - updateHour * 60 * 60;
        if(updateMinute > 10) {
            updateFrom = updateFrom + ':' + updateMinute;
        } else {
            updateFrom = updateFrom + ':0' + updateMinute;
        }

    } else if(updateMinute > 0) {
        updateSecond = Math.floor(diffUpdate / (1000)) - updateMinute * 60;
        updateFrom = updateMinute;

    } else {
        updateSecond = Math.floor(diffUpdate / (1000));
    }

    if(updateFrom != '') {
        if(updateSecond > 10) {
            updateFrom = updateFrom + ':' + updateSecond;
        } else {
            updateFrom = updateFrom + ':0' + updateSecond;
        }

    } else {
        updateFrom = updateSecond + '秒';
    }

    send(channel, creator + 'さんの【' + gameRule + '】ゲーム参加者('+ playerNumber + '人): ' + participants + ' 募集時間: ' + createFrom + ' ' + gameList[latestPlayerIndex] + 'さんが参加表明してから: ' + updateFrom);
}

function joinGame(prefix, channel) {
    var input = readFile(gameListFile);
    if(input.length <= 0) {
        send(channel, prefix.nick + 'さん､現在募集中のゲームはありません｡');
        return;
    } else if(input.length > 1) {
        _deleteGame(channel);
        return;
    }

    var gameList = input[0].split('\t');
    var number = 0;
    var players = [];
    var gameRule = '';
    var createIndex = -1;

    for (var i = 0; i < gameList.length; ++i) {
        if(gameList[i].match(/^player/)) {
            i++;
            if(number >= 7) {
                send(channel, prefix.nick + 'さん､ゲーム参加希望者が多すぎます｡ごめんなさい次の機会によろしくです｡');
                return;
            }
            if(gameList.length < i) {
                _deleteGame(channel);
                return;
            }
            if(gameList[i] === prefix.nick) {
                send(channel, prefix.nick + 'さんは既にこのゲームに参加表明しています｡');
                return;
            }

            players[number] = gameList[i];
            number++;
        } else if(gameList[i].match(/gameRule/)) {
            i++;
            if(gameList.length < i) {
                _deleteGame(channel);
                return;
            }

            gameRule = gameList[i];
        } else if(gameList[i].match(/createTime/)) {
            createIndex = i + 1;
            if(gameList.length < createIndex) {
                _deleteGame(channel);
                return;
            }
        }
    }

    if(players.length <= 0 || !gameRule || createIndex == -1) {
        _deleteGame(channel);
        return;
    }

    var now = new Date();
    var writeList = [];
    var playersString = '';
    for (var j = 0; j < players.length; ++j) {
        if(j != 0) {
            playersString = playersString + '\t';
        }

        var number = j + 1;
        playersString = playersString + 'player' + number + '\t' + players[j];
    }

    var number = players.length + 1;
    writeList.player = playersString + '\tplayer' + number + '\t' +  prefix.nick;
    writeList.gameRule = gameRule;
    writeList.createTime = gameList[createIndex];
    writeList.updateTime = now;
    deleteGame();
    send(channel, prefix.nick + write(writeList));
}

function closeGame(channel) {
    deleteGame();
    clearInterval(gameInterval);
    send(channel,'ゲームを解散しました｡' );
}

function combination(n, r) {
    if(n < r) {
        return [];
    }

    if(!r) {
        return [[]];
    }

    if(n === r) {
        var value = [];
        for (var i = 0; i < n; i++){
            value.push(i);
        }
        return [value];
    }

    var value = [];
    var n2 = n - 1;

    forEach(combination(n2, r), function(row) {
        var tmp = [];
        tmp.push(row);
        value.push(tmp);
    });

    forEach(combination(n2, r-1), function(row) {
        var tmp = [];
        tmp.push(n2);
        tmp.push(row);
        value.push(tmp);
    });

    return value;
}

function calculateRate(list, teamNumber) {
    var teamRate = 0;

    forEach(list, function(child) {
        if(child.teamNumber === teamNumber) {
            teamRate = teamRate + child.playerRate;
        }
    });

    return teamRate;
}

function startGame(prefix, channel) {
    var input1 = readFile(gameListFile);
    if(input1.length <= 0) {
        send(channel, prefix.nick + 'さん､現在募集中のゲームはありません｡');
        return;
    } else if(input1.length > 1) {
        _deleteGame(channel);
        return;
    }

    var gameList = input1[0].split('\t');
    var input2 = readFile(playerListFile);
    var playerList = [];
    forEach(input2, function (row) {
        playerList.push(csv2Player(row));
    });
    var players = [];
    for (var i = 0; i < gameList.length; ++i) {
        if(gameList[i].match(/^player/)) {
            i++;
            if(gameList.length < i) {
                _deleteGame(channel);
                return;
            }

            var player = [];
            var playerIndex = indexOfStream(playerList, gameList[i]);
            if(playerIndex === -1) {
                deleteGame();
                clearInterval(gameInterval);
                send(channel, gameList[i] + 'さんのプレイヤーデータが存在しません｡手動でAIの難易度を決めてください｡');
                return;
            }

            player.playerName = gameList[i];
            player.playerRate = playerList[playerIndex].playerRate;
            player.teamNumber = 1;
            players.push(player);
        }
    }

    if(players.length < 2) {
        send(channel, prefix.nick + 'さん､シングルプレイをおすすめします');
        return;
    }

    // var totalRate = 0;
    // var maxMember = 8;
    // var playerNumber = players.length;
    // var remainingNumber = maxMember - playerNumber;
    // forEach(players, function(player) {
    //     totalRate = totalRate + player.playerRate;
    // });
    //
    // var input3 = readFile(aiListFile);
    // var aiList = [];
    // var aiId = 0;
    // forEach(input3, function (row) {
    //     var currentAi = csv2Ai(row);
    //     currentAi.id = aiId;
    //     aiId++;
    //     aiList.push(currentAi);
    // });
    //
    // // Brute force comparison
    // var playerRate = calculateRate(players, 1);
    // var aiCombinationList = [];
    // var number = 0;
    // var concatinate = '';
    // // 組み合わせの配列を作成する
    // for(var i = 0; i < aiList.length; ++i) {
    //     var combiList = [];
    //     var concat = '';
    //     for(var j = 0; j < remainingNumber; ++j) {
    //         combiList[j] = aiList[i];
    //         combiList[j].combiId = number;
    //         var conc = '';
    //         for(var k = 0; k < aiList.length; ++k) {
    //             conc = conc + aiList[k].aiId;
    //             log('conc: '+conc);
    //         }
    //         concat = concat + aiList[i].aiId + conc;
    //         log('concat: '+concat);
    //         // log('aiId: '+combiList[j].aiId);
    //         // log('aiName: '+combiList[j].aiName);
    //         // log('aiRate: '+combiList[j].aiRate);
    //         // log('team: '+combiList[j].team);
    //         // log('combiId: '+combiList[j].combiId);
    //     }
    //
    //     concatinate = concatinate + concat;
    //     log('concatinate: '+concatinate);
    //
    //     aiCombinationList.push(combiList);
    //     number++;
    // }

    // 組み合わせのレートを合計していく
    // var caseNumber = 0;
    // for(var n = 0; n < remainingNumber; ++n) {
    //
    //     for(var m = 0; m < aiList.length; ++m) {
    //         concat = concat + aiCombinationList[n][m].aiId;
    //     }
    //     var totalRate = 0;
    //     forEach(combiList, function(combi) {
    //         //totalRate = totalRate + parseInt(combi.aiRate);
    //     });
    //
    //     log(totalRate);
    // }
    // log(aiCombinationList[1][2].aiName);
    // log(aiCombinationList[0].length);
    //var combinations = combination(remainingNumber, remainingNumber);
    //var combinations = combination(4, 2);

    // forEach(aiCombinationList, function(combination) {
    //     log('result: '+combination);
    //     forEach(combination, function(value) {
    //         log('each: '+value);
    //     });
    // });
    //var tempList = list;
    // forEach(combinations, function(combination) {
    //     foreach ($combination as $value) {
    //         $temp_list[$value]['team_number'] = 1;
    //     }
    //
    //     $team1_rate = $this->calcurate_rate($temp_list, 1);
    //     $team2_rate = $this->calcurate_rate($temp_list, 2);
    //     if(abs($rate_diff) > abs($team1_rate - $team2_rate)) {
    //         $list = $temp_list;
    //         $rate_diff = $team1_rate - $team2_rate;
    //     }
    //
    //     foreach($temp_list as &$temp) {
    //         $temp['team_number'] = 2;
    //     }
    //
    // }
    //
    // $team1_rate = $this->calcurate_rate($list, 1);
    // $team2_rate = $this->calcurate_rate($list, 2);
    //
    // for ($o=0; $o<$player_number;$o++){
    //     if($list[$o]['team_number'] == 1){
    //         $team1_list[] = array($list[$o]['player_id'], $list[$o]['player_name'], $list[$o]['player_rate'], $list[$o]['team_number']);
    //     } else {
    //         $team2_list[] = array($list[$o]['player_id'], $list[$o]['player_name'], $list[$o]['player_rate'], $list[$o]['team_number']);
    //     }
    // }

    deleteGame();
    clearInterval(gameInterval);
    send(channel,'Good Luck Have Fun(機能拡張予定)' );
}

function event::onLoad() {
    load();
}

function event::onChannelText(prefix, channel, text) {
    var number;

    if(isMatch(channel, text, 'civ')) {
        number = Math.floor(Math.random() * (originalCivList.length));
        say(prefix, channel, originalCivList[number], 'aoe_civ');
    } else if(isMatch(channel, text, 'fciv')) {
        number = Math.floor(Math.random() * (forgottenCivList.length));
        say(prefix, channel, forgottenCivList[number], 'aoe_civ');
    } else if(isMatch(channel, text, 'akciv')) {
        number = Math.floor(Math.random() * (africaCivList.length));
        say(prefix, channel, africaCivList[number], 'aoe_civ');
    } else if(isMatch(channel, text, 'rrciv')) {
        number = Math.floor(Math.random() * (rajaCivList.length));
        say(prefix, channel, rajaCivList[number], 'aoe_civ');
    } else if(isMatch(channel, text, 'allciv')) {
        var civList = originalCivList.concat(forgottenCivList, africaCivList, rajaCivList);
        number = Math.floor(Math.random() * (civList.length));
        say(prefix, channel, civList[number], 'aoe_civ');
    } else if(isForwardMatch(channel, text, 'make_game') || ((channel.match(/^#UO_AOE$/) || channel.match(/マクロ実験室/)) && text.match(/^イク（「゜A゜）「　シャー/))) {
        makeGame(prefix, channel, text);
    } else if(isMatch(channel, text, 'game') || ((channel.match(/^#UO_AOE$/) || channel.match(/マクロ実験室/)) && text.match(/^（「゜A゜；）「　シャ？$/))) {
        checkGame(prefix, channel);
    } else if(isMatch(channel, text, 'join_game') || isMatch(channel, text, 'no') || ((channel.match(/^#UO_AOE$/) || channel.match(/マクロ実験室/)) && text.match(/^の$/)) || ((channel.match(/^#UO_AOE$/) || channel.match(/マクロ実験室/)) && text.match(/^ノ$/))) {
        joinGame(prefix, channel);
    } else if(isMatch(channel, text, 'start_game') || ((channel.match(/^#UO_AOE$/) || channel.match(/マクロ実験室/)) && text.match(/^開始$/))) {
        startGame(prefix, channel);
    } else if(isMatch(channel, text, 'close_game') || ((channel.match(/^#UO_AOE$/) || channel.match(/マクロ実験室/)) && text.match(/^解散$/))) {
        closeGame(channel);
    } else if  (isMatch(channel, text, 'load') && prefix.nick === myNick) {
        load();
    }
}
