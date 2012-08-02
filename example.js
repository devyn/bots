// vim:ts=2:sw=2:et

var timer
  , trace_queue    = []
  , identify_queue = []
  ;

function stop() {
  clearTimeout(timer);
  timer = null;
  trace_queue    = [];
  identify_queue = [];
}

function log(message) {
  postMessage({type: "log", message: message});
}

function identify() {
  identify_queue.push(function (identity) {
    if (identity) {
      log("I've identified the "+identity.type+", "+identity.name);
      evade(search);
    } else {
      log("I don't know what that is. Continuing search.");
      timer = setTimeout(search, 250);
    }
  });

  postMessage({type: "identify"});
}

function evade(then) {
  stop();

  postMessage({type: "update", vx: 0, vy: -60, va: Math.PI/6});

  timer = setTimeout(then, 1000);
}

var sc = 0;

function changeSearchRoute() {
  postMessage({type: "update", vx: 40, vy: 0, va: Math.PI*(Math.random()-0.5)});
}

function continueSearch() {
  trace_queue.push(function (distance) {
    if (distance) {
      log("I saw something " + distance.toFixed(2) + " pixels away. Checking it out.");
      postMessage({type: "update", vx: 0, vy: 0, va: 0});
      identify();
    } else {
      if (++sc >= 3) { sc = 0; changeSearchRoute(); }

      timer = setTimeout(continueSearch, 250);
    }
  });

  postMessage({type: "trace"});
}

function search() {
  stop();

  sc = 0;
  changeSearchRoute();
  continueSearch();
}

function identifiedBy(angle, distance) {
  stop();

  log("I've been discovered! Returning fire, " + (angle*(180/Math.PI)).toFixed(2) +
      " degrees and " + distance.toFixed(2) + " pixels away.");

  var sign = 1;
  if (angle < 0) sign = -1;

  postMessage({type: "update", vx: 0, vy: 0, va: Math.PI * sign});

  sc = 0;
  continueSearch();
}

function collision() {
  stop();

  postMessage({type: "update", vx: 0, vy: 40, va: Math.PI*2});

  timer = setTimeout(search, 500);
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
      identifiedBy(message.angle, message.distance);
      break;
    case "collision":
      collision();
      break;
  }
};

search();
