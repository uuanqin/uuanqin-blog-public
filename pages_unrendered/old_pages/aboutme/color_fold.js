$(document).ready(function(){
    activeItem = $("#accordion > li:first");
    $(activeItem).addClass('active');
    $("#accordion > li").click(function(e){
		if (activeItem !=null){
			$(activeItem).removeClass('active');
		}
        if (activeItem!=this){
			activeItem = this;
			$(activeItem).animate({width: "76%"}, {duration:300, queue:false}).addClass('active');
			$(activeItem).children( ".icon" ).animate({width: "20%"}, {duration:400, queue:false});
			$(activeItem).children( ".article" ).animate({width: "79%"}, {duration:500, queue:false});
			$(activeItem).children( ".icon" ).children("h1").animate({fontSize: "5.8em"}, {duration:400, queue:false});
			$("#accordion > li:not(.active)").animate({width: "6%"}, {duration:300, queue:false});
			$("#accordion > li:not(.active)").children( ".icon" ).animate({width: "100%"}, {duration:400, queue:false});
			$("#accordion > li:not(.active)").children( ".icon" ).children("h1").animate({fontSize: "2em"}, {duration:400, queue:false});
			$("#accordion > li:not(.active)").children( ".article" ).animate({width: "0%"}, {duration:500, queue:false});
		}else{
			$(activeItem).children( ".icon" ).animate({width: "100%"}, {duration:400, queue:false});
			$(activeItem).children( ".article" ).animate({width: "0%"}, {duration:500, queue:false});
			activeItem=null;
			$("#accordion > li:not(.active)").animate({width: "20%"}, {duration:300, queue:false});
			$("#accordion > li:not(.active)").children( ".icon" ).children("h1").animate({fontSize: "5.8em"}, {duration:400, queue:false});
        }
    });	
	$("#accordion > li .article ").click(function(e) {
		e.stopPropagation();
	});
});