$(document).ready(function() {

    if($('.roomContent').length > 0) {
        
        var url = window.location.href;
        $('.qrCode').qrcode({
            "size": 150,
            "text": url
        });

    }

});