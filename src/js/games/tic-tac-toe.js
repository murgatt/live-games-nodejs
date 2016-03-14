$(document).ready(function() {
   
    if($('#tic-tac-toe').length > 0) {

        function resizeBoard() {
            var boardWidth = $('.board').width();
            var cellSize = boardWidth/3;
            $('.cell').height(cellSize);
            $('.cell').css('line-height', cellSize+'px');
        }

        resizeBoard();
        $(window).resize(function() {
            resizeBoard();
        });

    }
    
});