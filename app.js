// Required modules
var express = require('express.io');
var app = express().http().io();
var bodyParser = require('body-parser');
var url = require('url');

// Sessions setup
app.use(express.cookieParser());
app.use(express.session({
    genid: function(req) {
        return genuuid()
    },
    cookie: { 
        maxAge: null 
    },
    secret: 'secret-lolcat'
}));

// Serving static files
app.use(express.static(__dirname));

app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

// Start server
var port = process.env.PORT || 8080;
app.listen(port);

// Middleware to check the room before render
app.param('roomId', function(req, res, next) {
    var roomId = req.param('roomId');
    var roomIndex = indexOf(rooms, 'id', roomId);
    if(roomIndex == -1 ) {
        res.redirect('/');
    }
    else {
        if(req.session.host) {
            rooms[roomIndex].currentUrl = req.originalUrl;
        }
        else {
            req.session.host = false;
        }
        if(rooms[roomIndex].currentUrl != req.originalUrl) {
            res.redirect(rooms[roomIndex].currentUrl);
        }
        next();
    }
});

// Routes
app.get('/', function (req, res) {
    var publicRooms = [];
    for (var i = 0; i < rooms.length; i++) {
        if(!rooms[i].private) {
            publicRooms.push(rooms[i]);
        }
    }
    res.render('index.ejs', {publicRooms : publicRooms});
});

app.get('/newRoom/', function(req, res){
    res.render('newRoom.ejs');
});

app.post('/createRoom/', function(req, res) {
    var useBoard = parseInt(req.param('useBoard'));
    useBoard = isNaN(useBoard) ? 0 : useBoard;
    var private = parseInt(req.param('private'));
    private = isNaN(private) ? 1 : private;
    var roomId;
    var exist = false;
    do {
        roomId = Math.floor(Math.random()*900000) + 100000;
        for (var i = 0; i < rooms.length; i++) {
            if(rooms[i].id == roomId) {
                exist = true;
            }
            else {
                exist = false;
            }
        }
    }
    while (exist);
    req.session.host = roomId;
    var name = req.param('name') || roomId;
    var room = new Room(roomId, name, private, useBoard, "currentUrl");
    if(!room.private) {
        app.io.broadcast('new-room', room);
    }
    rooms.push(room);
    console.log('Room ' + room.id + ' created');
    res.redirect('/room/' + room.id + '/');
});

app.post('/joinRoom/', function(req, res) {
    var roomId = parseInt(req.param('roomId'));
    var roomIndex = indexOf(rooms, 'id', roomId);
    if(roomIndex == -1) {
        res.redirect('/');
    }
    else {
        var room = rooms[roomIndex];
        res.redirect('/room/' + room.id + '/');
    }
});

app.get('/room/:roomId/', function (req, res) {
    var roomId = req.params.roomId;
    var roomIndex = indexOf(rooms, 'id', roomId);
    if(roomIndex != -1 ) {
        var room = rooms[roomIndex];
        res.render('room.ejs', {room : room, host : req.session.host});
    }
});

app.get('/room/:roomId/game/:game/', function (req, res) {
    var roomId = req.params.roomId;
    var roomIndex = indexOf(rooms, 'id', roomId);
    if(roomIndex != -1 ) {
        var room = rooms[roomIndex];
        res.render('games/'+req.params.game+'/index.ejs', {room : room, host : req.session.host});
    }
});

// List all the rooms
var rooms = [];

app.io.on('connection', function(socket){
    
    app.io.route('join-room', function(req) {
        var room = req.data;
        var roomIndex = indexOf(rooms, 'id', room.id);
        if(roomIndex != -1 ) {
            socket.join(room.id);
            var player = new Player(socket.id, room.id, req.session.host, rooms[roomIndex].players.length+1, '');
            socket.player = player;
            rooms[roomIndex].players.push(player);
            console.log(socket.id + ' joined the ' + room.id + ' room');
            socket.emit('connected', player);
            socket.to(room.id).broadcast.emit('new-player');
        }
    });
    
    app.io.route('disconnect', function(req) {
        if(typeof socket.player !== "undefined") {
            var roomIndex = indexOf(rooms, 'id', socket.player.roomId);
            if(roomIndex != -1 ) {
                var room = rooms[roomIndex];
                room.players.splice(socket.player, 1);
                console.log(socket.id + ' is disconnected');
                var playerUrl = req.handshake.headers.referer;
                var siteUrl = 'http://' + req.handshake.headers.host;
                playerUrl = playerUrl.replace(siteUrl, '');
                if(playerUrl == room.currentUrl || req.session.host) {
                    socket.to(room.id).broadcast.emit('player-disconnected');
                }
            }
        }
    });
    
    socket.on('redirect', function (url) {
        socket.to(socket.player.roomId).broadcast.emit('redirect', url);
    });
    
    socket.on('action', function (action) {
        socket.to(socket.player.roomId).broadcast.emit('action', action);
    });
    
    socket.on('init-game', function() {
        socket.to(socket.player.roomId).broadcast.emit('init-game');
    });
    
    socket.on('game-result', function(result) {
        socket.to(socket.player.roomId).broadcast.emit('game-result', result);
    });
    
    app.io.route('destroy-room', function (req) {
        var roomIndex = indexOf(rooms, 'id', socket.player.roomId);
        if(socket.player.host && roomIndex != -1) {
            req.session.destroy();
            var room = rooms[roomIndex];
            rooms.splice(roomIndex, 1);
            socket.to(room.id).broadcast.emit('room-destroyed');
            app.io.broadcast('room-deleted', room);
        }
    });
    
});

// Check & delete empty rooms
setInterval(function(){
    for (var i = 0; i < rooms.length; i++) {
        if(rooms[i].players.length == 0) {
            console.log('Room ' + rooms[i].id + ' deleted');
            app.io.broadcast('room-deleted', rooms[i]);
            rooms.splice(i, 1);
        }
    }
}, 60000);


// Return the index of an array where key == value
function indexOf(array, key, value) {
    for (var i = 0; i < array.length; i++) {
        if (array[i][key] == value) {
            return i;
        }
    }
    return -1;
}

/**
* Room object
* @param {integer} id Room identifier
* @param {string} name Room name
* @param {boolean} private Define if room is private or public
* @param {string} currentUrl Save the current url of the room
*/
function Room(id, name, private, board, currentUrl) {
    this.id = id;
    this.name = name;
    this.private = private;
    this.board = board;
    this.currentUrl = currentUrl;
    this.players = [];
}

/**
* Player object
* @param {integer} id Player identifier
* @param {integer} roomId Save the player room
* @param {boolean} host Define if the player is the host
* @param {integer} number The number of the player
* @param {string} number The player name
*/
function Player(id, roomId, host, number, name) {
    this.id = id;
    this.roomId = roomId;
    this.host = host;
    this.number = number;
    this.name = name;
}