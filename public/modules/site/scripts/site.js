// jshint ignore: start

$(document).ready(function() {

	// Resize Window Changes
	function onResize() {
		var windowHeight = $(window).height(),
			headerHeight = $('#nav-main').height(),
			introHeight = $('#heading-intro').height();

		if(introHeight) {
			$('#heading-intro').css('padding-top', windowHeight/2-headerHeight/2-introHeight/2);
			$('#heading-intro').css('padding-bottom', windowHeight/2-introHeight/2);
		}
	}
	onResize();
	$(window).resize(function() {
		onResize();
	});

	// Scroll Action
	$(window).scroll(function(){
		if($(window).scrollTop() > 60){
			$('.navbar').css({'padding-top': '0px', 'background-color': '#333'});
			$('.navbar .navbar-nav>li>a.btn-nav').css('background-color', '#333');
		} else {
			$('.navbar').css({'padding-top': '20px','background-color': 'transparent'});
			$('.navbar .navbar-nav>li>a.btn-nav').css('background-color', '#00aff0');
		}
	});

	// See Why its Cool Action
	$('#see-why').click(function(e) {
  		$("html, body").animate({ 
  			scrollTop: $('#why-its-awesome').offset().top - $('#why-its-awesome').css('padding-top').replace("px", "")
  		}, 1000);
  		e.preventDefault();
  	});

});