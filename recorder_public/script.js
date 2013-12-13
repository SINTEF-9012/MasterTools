$(document).ready(function() {
	var record = $('<div class="record"></div>'),
		timeline = $('#timeline'),
		jwindow = $(window);

	//$('#wrapper').on('touchstart', function(event){});

	var time = $('#time'),
		precisetime = $('#precisetime'),
		currentTime = 0;

	$('#time').text('Loading');

	function updateTime() {
		var m = moment(currentTime);
		time.text(m.fromNow());
		precisetime.text(m.format("H:mm:ss - Do MMMM YYYY"));
	}

	var	oldRecord = null;

	function WatchScroll() {
		var record = document.elementFromPoint(jwindow.width()/2, jwindow.height()-50);

		if (record && record.className.indexOf("record") >= 0 && oldRecord != record) {
			$(oldRecord).removeClass('selected');
			currentTime = $(record).addClass('selected').data('time');
			updateTime();
			oldRecord = record;
			// console.log($(record).data('time'));
		} 
	}

	$.get('/history/10000', function(data){
		if (!data.length) {
			return;
		}
		var previousTime = data[0].d;
			maxSize = Number.MIN_VALUE,
			minSize = Number.MAX_VALUE;

		data.forEach(function(d) {
			if (d.s > maxSize) {
				maxSize = d.s;
			}
			if (d.s < minSize) {
				minSize = d.s;
			}
		});

		var diffSize = maxSize-minSize
			widthSum = 0;

		data.forEach(function(d) {
			var r = record.clone();
		
			var width = Math.max(Math.min(parseInt((d.d-previousTime)/1000), 99),3);

			r.css('height', parseInt(((d.s-minSize)/diffSize*90+10))+'%')
			 .css('width',width) 
			 .data('time',d.d);

			previousTime = d.d;
			timeline.append(r);

			widthSum += width;

		});

		timeline.children(':first').width(jwindow.width()/2).height('99%');
		timeline.children(':last, :first').css('margin-right', jwindow.width()/2-1);

		var wrapper = $('#wrapper');
		wrapper.scrollLeft(widthSum+jwindow.width());

		currentTime = data[data.length-1].d;

		updateTime();
		WatchScroll();


		wrapper.on('scroll touchmove', WatchScroll);

		window.setInterval(function() {
			updateTime();
		}, 1000);

	});

});

