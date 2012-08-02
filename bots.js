var colors = {
  0: ["#fff", "#000"],
  1: ["#0ff", "#f00"],
  2: ["#00f", "#ff0"],
  3: ["#f0f", "#0f0"],
  4: ["#ff0", "#00f"],
  5: ["#f00", "#0ff"],
  6: ["#0f0", "#f0f"],
  7: ["#000", "#fff"]
};

function Bot(name, script) {
  this.name   = name;
  this.color  = colors[Math.floor(Math.random() * 8)];
  this.radius = 10;

  this.neighbors = [];

  this.x    = 160 + Math.random() * 320;
  this.y    = 120 + Math.random() * 240;
  this.a    = 0;

  this.vx   = 0; // pixels per second, relative to angle
  this.vy   = 0;
  this.va   = 0; // radians per second

  this.target = this.trace();

  this.script = new Worker(script);

  var bot = this;
  script.onmessage = function (event) {
    bot.processMessage(event.data);
  };
}

Bot.prototype.processMessage = function (message) {
  switch (message.type) {
    case "log":
      console.log("<"+this.name+"> "+msg[1]);
      break;
    case "update":
      if (message.hasOwnProperty("vx")) this.vx = parseFloat(message.vx);
      if (message.hasOwnProperty("vy")) this.vy = parseFloat(message.vy);
      if (message.hasOwnProperty("va")) this.va = parseFloat(message.va);
      break;
    case "trace":
      if (this.target) {
        this.script.postMessage({type: "trace_hit", distance: this.target.distance});
      } else {
        this.script.postMessage({type: "trace_miss"});
      }
      break;
    case "identify":
      if (this.target && typeof this.target.identify === "function") {
        this.script.postMessage({type: "identified", identity: this.target.identify(this)});
      } else {
        this.script.postMessage({type: "no_identity"});
      }
      break;
  }
};

Bot.prototype.identify = function (from) {
  var d_x      = from.x - this.x
    , d_y      = from.y - this.y
    , origin_a = this.angle - Math.atan2(d_x, d_y) - Math.PI/2
    , origin_d = Math.sqrt(d_x*d_x + d_y*d_y)
    ;

  this.script.postMessage({type: "identified_by", angle: origin_a, distance: origin_d});

  return {type: "bot", name: this.name};
};

Bot.prototype.trace = function () {
  var ne           = this.neighbors
    , nearest_dist = 1/0
    , nearest
    ;

  for (var i = 0; i < ne.length; i++) {
    ne[i].rayIntersections(this.x, this.y, this.a, function (t) {
      if (t < nearest_dist) {
        nearest      = ne[i];
        nearest_dist = t;
      }
    });
  }

  if (typeof nearest === 'undefined') {
    return null;
  } else {
    return {object: nearest, distance: nearest_dist};
  }
};

Bot.prototype.rayIntersections = function (origin_x, origin_y, angle, callback) {
  var c_x = this.x - origin_x
    , c_y = this.y - origin_y
    , l_x = Math.cos(angle+Math.PI/2)
    , l_y = Math.sin(angle+Math.PI/2)
    , ldc = l_x*c_x + l_y*c_y
    , s   = ldc*ldc - (c_x*c_x + c_y*c_y) + this.radius*this.radius
    ;

  if (s >= 0) {
    var s_s = Math.sqrt(s)
      , t_1 = ldc + s_s
      , t_2 = ldc - s_s
      ;

    if (t_1 >= 0) callback(t_1);

    if (t_2 >= 0) callback(t_2);
  }
};

Bot.prototype.step = function (dt) {
  var s = dt / 1000;

  this.a += this.va*s;

  var sin_a = Math.sin(this.a), cos_a = Math.cos(this.a);

  this.x += (cos_a*this.vx - sin_a*this.vy)*s;
  this.y += (cos_a*this.vy - sin_a*this.vx)*s;

  this.target = this.trace();
};

Bot.prototype.draw = function (g) {
  g.save();

  g.translate(this.x, this.y);

  g.fillStyle = "#fff";

  g.textAlign    = "center";
  g.textBaseline = "middle";
  g.font         = "10px sans-serif";

  g.fillText(this.name, 0, 20);

  g.strokeStyle  = this.color[0];
  g.fillStyle    = this.color[1];

  g.lineWidth    = 2;

  g.beginPath();
  g.arc(0, 0, this.radius, 0, Math.PI*2);
  g.closePath();
  g.fill();
  g.stroke();

  g.rotate(this.a);

  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(0, 20);
  g.closePath();
  g.stroke();

  if (this.target) {
    g.lineWidth = 1;

    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(0, this.target.distance);
    g.closePath();
    g.stroke();
  }

  g.restore();
};

window.requestAnimationFrame = window.requestAnimationFrame
                            || window.webkitRequestAnimationFrame
                            || window.mozRequestAnimationFrame
                            || window.msRequestAnimationFrame;

var g
  , bots
  , anim
  , frameRate = 30
  ;

function step() {
  var dt = 1000/frameRate; // temporary

  g.fillStyle = "#333";
  g.fillRect(0,0,g.canvas.width,g.canvas.height);

  for (var i = 0; i < bots.length; i++) {
    bots[i].step(dt);
    bots[i].draw(g);
  }

  anim = requestAnimationFrame(step, frameRate);
}

window.onload = function () {
  g = document.getElementsByTagName("canvas")[0].getContext('2d');

  var bot1 = new Bot("Henry", "example.js")
    , bot2 = new Bot("Charlie", "example.js")
    , bot3 = new Bot("Vicky", "example.js")
    ;

  bot1.neighbors = [bot2, bot3];
  bot2.neighbors = [bot1, bot3];
  bot3.neighbors = [bot1, bot2];

  bots = [bot1, bot2, bot3];

  anim = requestAnimationFrame(step, frameRate);
}
