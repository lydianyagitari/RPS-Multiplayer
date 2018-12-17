var player1Connected = false;
var player2Connected = false;
var player = 0;
var turn = 0;
var player1Name = "";
var player2Name = "";
var rWins = "Scissors";
var pWins = "Rock";
var sWins = "Paper";
var images = {
    Rock: "./assets/images/icons8-rock-filled-100.png",
    Paper: "./assets/images/icons8-powerpoint-100.png",
    Scissors: "./assets/images/icons8-cutting-100.png"
};
var timerId = 0;
var chat = [];
var statusRef1;
var statusRef2;

$(document).ready(function() {

    //Hide choices.
    $(".choices").hide();
    $(".chosen").hide();

    // Initialize Firebase.
    var config = {
        apiKey: "AIzaSyCGedS-eXOY3alApgtMk_cWyFlaxtsEuwA",
        authDomain: "rockpaper-611cc.firebaseapp.com",
        databaseURL: "https://rockpaper-611cc.firebaseio.com",
        projectId: "rockpaper-611cc",
        storageBucket: "",
        messagingSenderId: "284046562557"
    };

    firebase.initializeApp(config);

    var database = firebase.database();

    //Get a reference to the chat element.
    var chatRef = database.ref("multi-rps/chat");
    chatRef.onDisconnect().remove();

    //Handle updates to chat.
    chatRef.on("child_added", function(data) {

        var text = data.val().message;
        $("#chatLog").val($("#chatLog").val() + String.fromCharCode(13, 10) + text);

        $("#chatLog").scrollTop($("#chatLog")[0].scrollHeight);
    });

    var currentTurnRef = database.ref("multi-rps/turn");

    database.ref().on("value", function(snapshot) {

        if (snapshot.child("multi-rps/players/1").exists()) {

            player1Connected = true;
            var name = snapshot.child("multi-rps/players/1").val().name;
            var player1Wins = snapshot.child("multi-rps/players/1").val().wins;
            var player1Losses = snapshot.child("multi-rps/players/1").val().losses;
            $("#box1row1").text(name);
            player1Name = name;
            $("#box1row3").text(`Wins: ${player1Wins} Losses: ${player1Losses}`);
        } else {
            player1Connected = false;
            $("#box1row1").text("Waiting for Player 1");
        }

        if (snapshot.child("multi-rps/players/2").exists()) {

            player2Connected = true;
            var name = snapshot.child("multi-rps/players/2").val().name;
            var player2Wins = snapshot.child("multi-rps/players/2").val().wins;
            var player2Losses = snapshot.child("multi-rps/players/2").val().losses;
            $("#box3row1").text(name);
            player2Name = name;
            $("#box3row3").text(`Wins: ${player2Wins} Losses: ${player2Losses}`);
        } else {
            player2Connected = false;
            $("#box3row1").text("Waiting for Player 2");
        }

        if (snapshot.child("multi-rps/turn").exists()) {

            var updatedTurn = parseInt(snapshot.child("multi-rps/turn").val());

            if (turn !== 3 && updatedTurn === 3) {

                turn = 3;

                compareResults(snapshot);

                timerId = setTimeout(nextRound, 5000);

            } else if (turn !== 1 && updatedTurn === 1) {

                turn = 1;

                $("#box3border").css({
                    "border-color": "black"
                });
                $("#box1border").css({
                    "border-color": "lightgreen"
                });

                if (player === 1) {

                    $("#systemMessage2").html(`<h5>It's your turn!</h5>`);

                    $("#box1row2").children(".choices").show();
                    $("#box1row2").children(".chosen").hide();
                } else {
                    $("#systemMessage2").html(`<h5>Waiting for ${player1Name} to choose.</h5>`);
                }

            } else if (turn !== 2 && updatedTurn === 2) {

                turn = 2;

                $("#box1border").css({
                    "border-color": "black"
                });
                $("#box3border").css({
                    "border-color": "lightgreen"
                });

                if (player === 2) {

                    $("#systemMessage2").html(`<h5>It's your turn!</h5>`);

                    $("#box3row2").children(".choices").show();
                    $("#box3row2").children(".chosen").hide();
                } else {
                    $("#systemMessage2").html(`<h5>Waiting for ${player2Name} to choose.</h5>`);
                }
            }
        }

    }, function(errorObject) {

        console.log("Errors handled: " + errorObject.code);
    });

    $("#startButton").on("click", function(event) {

        event.preventDefault();

        var userName = $("#userName").val().trim();

        if (userName === undefined || userName === "") {

            alert("Please type your name and then click start.");

        } else {

            $("#userName").val("");
            $("#userName").hide();
            $("#startButton").hide();

            if (player1Connected && player2Connected) {

                alert("Sorry, Game Full! Try Again Later!");

            } else if (!player1Connected) {

                player1Connected = true;
                player = 1;
                statusRef1 = database.ref("multi-rps/players/1");
                statusRef1.set({
                    'losses': 0,
                    'name': userName,
                    'wins': 0,
                    'choice': null
                });
                statusRef1.onDisconnect().remove();

                if (player2Connected) {
                    database.ref("multi-rps").update({
                        'turn': 1
                    });
                }

                $("#systemMessage1").html(`<h5>Hi ${userName}! You are Player 1</h5>`);

            } else if (!player2Connected) {

                player2Connected = true;
                player = 2;
                statusRef2 = database.ref("multi-rps/players/2");
                statusRef2.set({
                    'losses': 0,
                    'name': userName,
                    'wins': 0
                });
                statusRef2.onDisconnect().remove();

                database.ref("multi-rps").update({
                    'turn': 1
                });

                $("#systemMessage1").html(`<h5>Hi ${userName}! You are Player 2</h5>`);

            }
            currentTurnRef.onDisconnect().remove();
        }

    });

    $(".choices").on("click", function(event) {

        var val = $(this).attr("value");

        database.ref("multi-rps/players/" + player).update({
            'choice': val
        });

        var boxRow = "";
        if (player === 1) {
            boxRow = "#box1row2";
        } else if (player === 2) {
            boxRow = "#box3row2";
        }
        $(boxRow).children(".choices").hide();

        var chosen = $(boxRow).children(".chosen");
        var img = $("<img>");
        img.attr("src", images[val]);
        img.css({
            alt: val,
            height: "75px",
            width: "75px"
        });
        if (val === "Paper") {
            img.addClass("animated flipInY");
        } else if (val === "Rock") {
            img.addClass("animated bounce");
        } else if (val === "Scissors") {
            img.addClass("animated shake");
        }
        chosen.empty();
        var par = $("<p>");
        par.text(val);
        chosen.append(par);
        chosen.append(img);
        chosen.show();

        database.ref("multi-rps").update({
            'turn': turn + 1
        });

    });

    $("#chat").on("click", function(event) {

        event.preventDefault();

        if (player1Connected && player2Connected) {

            var text = $("#text").val();
            $("#text").val("");
            if (player === 1) {
                text = player1Name + ": " + text;
            } else {
                text = player2Name + ": " + text;
            }

            var newKey = database.ref().child("multi-rps/chat").push().key;
            var updates = {};
            updates["multi-rps/chat/" + newKey] = {
                message: text
            };

            database.ref().update(updates);
        }
    });

    function compareResults(snapshot) {

        var choice1 = snapshot.child("multi-rps/players/1").val().choice;
        var choice2 = snapshot.child("multi-rps/players/2").val().choice;
        var wins1 = parseInt(snapshot.child("multi-rps/players/1").val().wins);
        var wins2 = parseInt(snapshot.child("multi-rps/players/2").val().wins);
        var losses1 = parseInt(snapshot.child("multi-rps/players/1").val().losses);
        var losses2 = parseInt(snapshot.child("multi-rps/players/2").val().losses);

        if (choice1 === choice2) {

            // Tie game.
            $("#result").html("<p class='mx-auto animated swing'>Tie Game!</p>");

        } else if ((choice1 === "Rock" && choice2 === rWins) ||
            (choice1 === "Paper" && choice2 === pWins) ||
            (choice1 === "Scissors" && choice2 === sWins)) {

            $("#result").html("<p class='mx-auto animated zoomInDown'>" +
                player1Name + " Wins!</p>");
            wins1++;
            losses2++;

        } else if ((choice2 === "Rock" && choice1 === rWins) ||
            (choice2 === "Paper" && choice1 === pWins) ||
            (choice2 === "Scissors" && choice1 === sWins)) {

            $("#result").html("<p class='mx-auto animated zoomInDown'>" +
                player2Name + " Wins!</p>");
            wins2++;
            losses1++;
        }

        var boxRow = "";
        var val = "";
        if (player === 1) {
            boxRow = "#box3row2";
            val = choice2;
        } else if (player === 2) {
            boxRow = "#box1row2";
            val = choice1;
        }

        var chosen = $(boxRow).children(".chosen");
        var img = $("<img>");
        img.attr("src", images[val]);
        img.css({
            alt: val,
            height: "75px",
            width: "75px"
        });
        if (val === "Paper") {
            img.addClass("animated flipInY");
        } else if (val === "Rock") {
            img.addClass("animated bounce");
        } else if (val === "Scissors") {
            img.addClass("animated shake");
        }
        chosen.empty();
        var par = $("<p>");
        par.text(val);
        chosen.append(par);
        chosen.append(img);
        chosen.show();

        database.ref("multi-rps/players/1").update({
            'wins': wins1,
            'losses': losses1
        });
        database.ref("multi-rps/players/2").update({
            'wins': wins2,
            'losses': losses2
        });
    }

    function nextRound() {

        $(".chosen").hide();
        $("#result").empty();

        database.ref("multi-rps").update({
            'turn': 1
        });
    }
});
