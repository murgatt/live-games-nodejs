$(document).ready(function() {
    
    if($('.gameContent').length > 0) {  

    }
    
});

function backToRoom(e) {
    if(e != undefined) {
        e.preventDefault();
    }
    if($('.gameContent').length > 0) {
        var roomUrl = window.location.pathname;
        if(roomUrl.indexOf('/game/') > -1) {
            roomUrl = roomUrl.replace(/game.*/, '');
            window.location.href = roomUrl;
            return roomUrl;
        }
    }
}