var timer
  , trace_queue    = []
	, identify_queue = []
	;

function identify() {
	identify_queue.push(function (identity) {
		if (identity) {
			postMessage({type: "log", message: "identified "+identity.type+" "+identity.name});
			evade(search);
		} else {
			timer = setTimeout(search, 250);
		}
	});

	postMessage({type: "identify"});
}

function evade(then) {
	postMessage({type: "update", vx: 0, vy: -40, va: Math.PI/6});

	setTimeout(then, 1000);
}

var sc = 0;

function changeSearchRoute() {
	postMessage({type: "update", vx: 40, vy: 0, va: Math.PI*(Math.random()-0.5)});
}

function continueSearch() {
	trace_queue.push(function (distance) {
		if (distance) {
			identify();
		} else {
			if (++sc >= 3) { sc = 0; changeSearchRoute(); }

			timer = setTimeout(continueSearch, 250);
		}
	});

	postMessage({type: "trace"});
}

function search() {
	sc = 0;
	changeSearchRoute();
	continueSearch();
}

function stop() {
	clearTimeout(timer);
	timer = null;
	trace_queue    = [];
	identify_queue = [];
}

function identifiedBy(angle, direction) {
	stop();

	var sign = 1;
	if (angle < 0) sign = -1;

	postMessage({type: "update", vx: 0, vy: 0, va: Math.PI * sign});

	timer = setTimeout(function () {
		identify();
	}, angle/Math.PI*sign*1000);
}

function collision() {
	stop();

	postMessage({type: "update", vx: 0, vy: 40, va: Math.PI/8});

	timer = setTimeout(search, 1000);
}

onmessage = function (event) {
	var message = event.data;

	switch (message.type) {
		case "trace_hit":
			if (trace_queue.length > 0)
				trace_queue.shift()(message.distance);
			break;
		case "trace_miss":
			if (trace_queue.length > 0)
				trace_queue.shift()(null);
			break;
		case "identified":
			if (identify_queue.length > 0)
				identify_queue.shift()(message.identity);
			break;
		case "no_identity":
			if (identify_queue.length > 0)
				identify_queue.shift()(null);
			break;
		case "identified_by":
			identifiedBy(message.angle, message.direction);
			break;
		case "collision":
			collision();
			break;
	}
};

search();
