//------------- Setup ----------------


//init firebase
var config = {
    apiKey: "AIzaSyDz7TigPbAyO6h-8FY7268OjEG09BN1tZc",
    authDomain: "lydianyproject.firebaseapp.com",
    databaseURL: "https://lydianyproject.firebaseio.com",
    projectId: "lydianyproject",
    storageBucket: "lydianyproject.appspot.com",
    messagingSenderId: "547175406524"
  };
firebase.initializeApp(config);

// Create a variable to reference the database.
const database = firebase.database();

//------------- DB listeners ------------

//listen for state changes, if resolving game win, do tons of stuff
database.ref('/curGame/state').on('value', function(snap) {
    //localize state for sync ref
    go.localState = snap.val();
    if (go.localState === 'playerSelect') {
        $('#info p').html('Waiting for players...')
    } else if (go.localState === 'play') {
        $('#info p').html('Waiting for each player to select a throw.')
    } else if (go.localState === 'reveal'){
        database.ref('/curGame').once('value', function(snap){
            //grab both player objs
            let p1 = snap.val().player1;
            let p2 = snap.val().player2;
            //reveal choices to players (dom)
            go.revealChoices(p1.choice, p2.choice);
            //figure out who won and lost return an obj, unless its a tie
            let result = go.determineWinner(p1.choice, p2.choice)
            //reveal to players the results (dom)
            go.revealWinner(result);
            //if the game is not a tie, update db with scores, db event will trigger page update
            if (result !== 'Tie' && go.playerID === 1) {
                go.updateScore(result)
            }
            //set brief timeout, then move to next round
            setTimeout(go.resetRound, 4000);
        })
    }
});

//listen for player connections, then update page with names
database.ref('/player1Conn').on('value', function(snap){
    console.log(snap.val())
    if (snap.val()) {
        let header = $('#player1 h5');
        database.ref('/curGame/player1').once("value", function(snap){
            header.text(snap.val().name);
        })
    }
})

//listen for player connections, then update page with names
database.ref('/player2Conn').on('value', function(snap){
    if (snap.val()) {
        let header = $('#player2 h5');
        database.ref('/curGame/player2').once("value", function(snap){
            header.text(snap.val().name);
        })
    }
})

//score listeners to update page, an experiment with verbosity vs specificity :)
database.ref('/curGame/player1/wins').on('value', function(snap){
    $('#player1w').text(snap.val())
})

database.ref('/curGame/player1/losses').on('value', function(snap){
    $('#player1l').text(snap.val())
})

database.ref('/curGame/player2/wins').on('value', function(snap){
    $('#player2w').text(snap.val())
})

database.ref('/curGame/player2/losses').on('value', function(snap){
    $('#player2l').text(snap.val())
})

//------------- Main Object -----------

let go = {
    playerID: 0,
    localState: 'playerSelect',
    choices: ['Rock', 'Paper', 'Scissors'],
    winList : {
        //phrases to display after results
        rock : {
            scissors : "Rock crushes Scissors.",
            
        },
        paper : {
            rock : "Paper covers Rock.",
        },
        scissors : {
            paper : "Scissors cuts Paper.",
        },
        
    },
    revealChoices: function (ply1, ply2) {
        let players = {
            '#player1': ply1,
            '#player2': ply2
        };
        Object.keys(players).forEach(function (key, value) {
            let div = $(key+' .subCont');
            //clear before adding anything
            div.empty();
            //make elements
            let divChoice = $('<i>').addClass('fa fa-hand-'+players[key].toLowerCase()+'-o revealIcon').attr('aria-hidden','true');
            div.append(divChoice)
        })
    },
    determineWinner: function (ply1, ply2) {
        //func to compare and get result
        let p1 = this.choices.indexOf(ply1);
        let p2 = this.choices.indexOf(ply2);
        let n = this.choices.length;
        let res = (n + p1 - p2) % n;
        let message;
        if (res === 0) {
            return 'Tie'
        } else if (res % 2 === 1) {
            //player 1 wins
            message = this.winList[ply1.toLowerCase()][ply2.toLowerCase()];
            console.log(message)
            return {winner:'player1', loser: 'player2', msg: message}
        } else if (res % 2 === 0) {
            //player 2 wins
            message = this.winList[ply2.toLowerCase()][ply1.toLowerCase()];
            console.log(message)
            return {winner: 'player2', loser: 'player1', msg: message}
        }
    },
    revealWinner: function (result) {
        if (result.winner === 'player1') {
            $('#info p').html("Player 1 wins!</br>"+result.msg)
        } else if (result.winner === 'player2') {
            $('#info p').html("Player 2 wins!</br>"+result.msg)
        } else {
            $('#info p').html("Tie!")
        }
    },
    updateScore: function (result) {
        function pushUpdate (winner, w, loser, l) {
            database.ref('/curGame/'+winner).update({
                wins: w
            })
            database.ref('/curGame/'+loser).update({
                losses: l
            })
        }
        database.ref('/curGame').once('value', function(snap){
            let w = snap.val()[result.winner].wins + 1;
            let l = snap.val()[result.loser].losses + 1;
            console.log('update db')
            console.log('-winner',result.winner, w)
            console.log('-loser',result.loser, l)
            pushUpdate(result.winner, w, result.loser, l);
        })
    },
    resetRound: function () {
        database.ref('/curGame').update({
            state : 'play',
            choices : 0
        })
        // empty play area, remake buttons for right player
        $('.playerSection .subCont').empty();
        buildButtons('player'+go.playerID);
    }
}

function changeState(state) {
    database.ref('/curGame').update({
        state : state
    })
}

//------------- button for player join and initial state logic pattern
// its a mess, I would have refactored this given more time and no group project

$('#addPlayer').on('click', function(){
    event.preventDefault();

    function choosePlayerNumber (callback) {
        database.ref().once("value").then(function(snap){
            if (!snap.val().player1Conn){
                callback("player1")
                go.playerID = 1;
            } else if (!snap.val().player2Conn){
                callback("player2")
                go.playerID = 2;
                changeState('play')      
            } else {
                callback("max");
            }
        });
    }

    function setEnv (playerNumber) {
        console.log('callback', playerNumber);
        addPlayerToDB(playerNumber);
        setPlayerElems(playerNumber);
    }

    function addPlayerToDB (plyNum) {
        if (plyNum !== 'max') {
            let player = database.ref("/curGame/"+plyNum).set({
                name: name,
                wins: 0,
                losses: 0,
                choice: ""
            })

            plyerDBUpdate = {};
            plyerDBUpdate['/'+plyNum+'Conn'] = true;
            playerID = database.ref().update(plyerDBUpdate);

            plyerDBUpdate['/'+plyNum+'Conn'] = false;
            database.ref().onDisconnect().update(plyerDBUpdate);
            database.ref('/curGame').onDisconnect(function(){
                go.playerID = 0;
            }).update({
                state : "playerSelect",
                choices : 0
            })
            database.ref("/curGame/"+plyNum).onDisconnect().remove()
        }
    }

    function setPlayerElems (playNum) {
        $('#subHead').empty();
        let newElem = $('<div>').addClass('center');
        newElem.append($('<h5>').text('Welcome, ' + name + '!'));
        
        //determine text for sub header
        let welcomeText;
        if (playNum === 'player1') {
            welcomeText = 'You are player 1.'
        } else if (playNum === 'player2') {
            welcomeText = 'You are player 2.'
        } else {
            welcomeText = "Sorry, maximum players reached. Multiple game instances not yet implemented."
        }

        newElem.append($('<p>').text(welcomeText));
        $('#subHead').append(newElem);
        $('#'+playNum+' h5').text(name);
        buildButtons(playNum,name);
    }

    let name = $('#playerNameInput').val().trim();
    if (name !== '') {
        choosePlayerNumber(setEnv);
    }
})

function buildButtons (playerNum) {
    //set up some aliases
    let btnClasses = 'waves-effect waves-light btn col s6 offset-s3';
    let btnDiv = $('#'+playerNum+' .subCont');
    //clear before adding anything
    btnDiv.empty();

    go.choices.forEach(function(value, index){
        //make a row and button, then append both to main
        let curRow = $('<div>').addClass('row');
        let icon = $('<i>').addClass('fa fa-hand-'+value.toLowerCase()+'-o').attr('aria-hidden','true');
        let curBtn = $('<button>').addClass(btnClasses).attr('type',value).text(value+' ');
        curBtn.on('click', function(){
            let ancestor = $(this).closest('.card-panel');
            console.log('click', ancestor.attr('player') )
            if (go.localState === 'play') {
                manageChoice(ancestor.attr('player'), $(this).attr('type'))
                $('#'+playerNum+' .subCont').empty();
            }
        })
        btnDiv.append(curRow.append(curBtn.append(icon)));
    })
}

function manageChoice (plyNum, plyChoice) {
    function updateChoice (c) {
        database.ref('/curGame/'+plyNum).update({
            choice : plyChoice
        })
        database.ref('/curGame').update({
            choices : c + 1
        })
    }

    database.ref('/curGame/choices').once('value', function(snap){
        let choices = snap.val();
        if (choices === 0 ) {
            updateChoice(choices);
        } else if (choices === 1 ) {
            updateChoice(choices);
            changeState('reveal');
        }
    })
}

//chat stuff
$('#sendChat').on('click', function(){
    event.preventDefault();
    let msg = $('#chatInput').val().trim();
    $('#chatInput').val('')
    if (go.playerID !== 0 && msg !== ''){
        database.ref('/curGame/player'+go.playerID).once('value', function(snap){
            let name = snap.val().name;
            let chat = database.ref('/chat').push()
            chat.set({
                name : name,
                msg : msg
            })
        })
    }
})

database.ref('/chat').on('child_added', function (snap) {
    $('#chatBox').prepend($('<div>').text(snap.val().name+': '+snap.val().msg));
    database.ref('/chat').onDisconnect().remove();
})
